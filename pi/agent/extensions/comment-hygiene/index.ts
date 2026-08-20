import { type ExtensionAPI, type ExtensionContext, isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { isCodePath, isGitCommitCommand } from "./detect.ts";
import { commitGuidance, finishGuidance, manualGuidance } from "./guidance.ts";

const STATE_ENTRY = "comment-hygiene";
const GUIDANCE_MESSAGE = "comment-hygiene-guidance";
const GIT_TIMEOUT_MS = 5_000;
const MUTATING_TOOLS = new Set(["edit", "write"]);

/**
 * Print and JSON modes dispose the session runtime as soon as the final turn
 * ends, so a queued follow-up has nothing left to run on. The commit gate still
 * works there because blocking happens while the session is alive.
 */
function canInjectFollowUp(ctx: ExtensionContext): boolean {
	return ctx.hasUI;
}

interface HygieneState {
	changeCount: number;
	reviewedAtChangeCount: number;
	allowNextCommit: boolean;
	awaitingReviewTurn: boolean;
	enabled: boolean;
}

function initialState(): HygieneState {
	return { changeCount: 0, reviewedAtChangeCount: 0, allowNextCommit: false, awaitingReviewTurn: false, enabled: true };
}

export default function commentHygieneExtension(pi: ExtensionAPI): void {
	let state = initialState();
	let sessionLive = true;

	pi.registerFlag("no-comment-hygiene", {
		description: "Disable the comment hygiene commit/finish hook for this session",
		type: "boolean",
		default: false,
	});

	function hasUnreviewedChanges(): boolean {
		return state.changeCount > state.reviewedAtChangeCount;
	}

	function markReviewed(): void {
		state.reviewedAtChangeCount = state.changeCount;
	}

	function persist(): void {
		pi.appendEntry<HygieneState>(STATE_ENTRY, { ...state });
	}

	/** Undefined when the answer is unknown: not a repo, git missing, or timed out. */
	async function hasUncommittedChanges(ctx: ExtensionContext): Promise<boolean | undefined> {
		try {
			const result = await pi.exec("git", ["status", "--porcelain"], {
				cwd: ctx.cwd,
				timeout: GIT_TIMEOUT_MS,
			});
			if (result.code !== 0 || result.killed) return undefined;
			return result.stdout.trim().length > 0;
		} catch {
			return undefined;
		}
	}

	function isActive(): boolean {
		return state.enabled && pi.getFlag("no-comment-hygiene") !== true;
	}

	// Counted on tool_result, not tool_call, so blocked or failed edits do not arm the hook.
	pi.on("tool_result", async (event) => {
		if (!isActive()) return;
		if (event.isError || !MUTATING_TOOLS.has(event.toolName)) return;

		const path = event.input.path;
		if (typeof path !== "string" || !isCodePath(path)) return;

		state.changeCount++;
		persist();
	});

	pi.on("tool_call", async (event) => {
		if (!isActive()) return;
		if (!isToolCallEventType("bash", event)) return;
		if (!isGitCommitCommand(event.input.command)) return;

		if (state.allowNextCommit) {
			state.allowNextCommit = false;
			markReviewed();
			persist();
			return;
		}

		if (!hasUnreviewedChanges()) return;

		state.allowNextCommit = true;
		markReviewed();
		persist();

		return { block: true, reason: commitGuidance() };
	});

	pi.on("tool_result", async (event) => {
		if (event.toolName !== "bash" || event.isError) return;

		const command = event.input.command;
		if (typeof command !== "string" || !isGitCommitCommand(command)) return;

		markReviewed();
		state.allowNextCommit = false;
		persist();
	});

	pi.on("agent_settled", async (_event, ctx) => {
		if (!isActive() || !canInjectFollowUp(ctx)) return;

		// Stand down after the review turn we asked for, so guidance cannot trigger itself.
		if (state.awaitingReviewTurn) {
			state.awaitingReviewTurn = false;
			markReviewed();
			persist();
			return;
		}

		if (!hasUnreviewedChanges()) return;

		// A clean tree means the work was already committed, and therefore already gated.
		if ((await hasUncommittedChanges(ctx)) === false) {
			markReviewed();
			persist();
			return;
		}

		if (ctx.hasPendingMessages()) return;

		// The probe above yielded; the session may have been torn down since.
		if (!sessionLive) return;

		state.awaitingReviewTurn = true;
		markReviewed();
		persist();

		pi.sendMessage(
			{ customType: GUIDANCE_MESSAGE, content: finishGuidance(), display: true },
			{ triggerTurn: true, deliverAs: "followUp" },
		);
	});

	pi.registerCommand("comment-hygiene", {
		description: "Comment hygiene hook: status | on | off | review",
		getArgumentCompletions: (prefix) => {
			const items = ["status", "on", "off", "review"]
				.filter((value) => value.startsWith(prefix))
				.map((value) => ({ value, label: value }));
			return items.length > 0 ? items : null;
		},
		handler: async (args, ctx) => {
			switch (args.trim()) {
				case "on":
					state.enabled = true;
					persist();
					ctx.ui.notify("Comment hygiene hook enabled.", "info");
					return;

				case "off":
					state.enabled = false;
					persist();
					ctx.ui.notify("Comment hygiene hook disabled for this session.", "warning");
					return;

				case "review":
					state.awaitingReviewTurn = true;
					markReviewed();
					persist();
					pi.sendMessage(
						{ customType: GUIDANCE_MESSAGE, content: manualGuidance(), display: true },
						{ triggerTurn: true, deliverAs: "followUp" },
					);
					return;

				default: {
					const active = isActive();
					const pending = hasUnreviewedChanges()
						? `${state.changeCount - state.reviewedAtChangeCount} unreviewed change(s)`
						: "no unreviewed changes";
					ctx.ui.notify(`Comment hygiene: ${active ? "on" : "off"}, ${pending}.`, "info");
				}
			}
		},
	});

	pi.on("session_shutdown", async () => {
		sessionLive = false;
	});

	pi.on("session_start", async (_event, ctx) => {
		sessionLive = true;
		state = initialState();

		const entries = ctx.sessionManager.getEntries();
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i] as { type: string; customType?: string; data?: Partial<HygieneState> };
			if (entry.type !== "custom" || entry.customType !== STATE_ENTRY || !entry.data) continue;
			state = { ...state, ...entry.data, awaitingReviewTurn: false };
			break;
		}
	});
}
