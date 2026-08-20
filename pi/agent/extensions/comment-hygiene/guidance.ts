// Prompt text injected into the model context by the comment-hygiene hook.

const POLICY = `Audit the comments in this change.

1. Default to none. Delete comments that restate code, banner or divide sections, address the
   diff reader ("// added X", "// fixed"), repeat a signature, or hold commented-out code.
2. Keep one only if it explains WHY and that reason is not recoverable from the code. Keep it
   to a line.
3. A comment explaining surprising or fragile behaviour usually marks a hack. Annotating a hack
   just makes the debt permanent. Find the root cause and fix it, then delete the comment. If
   you cannot fix it now, say so explicitly instead of papering over it.

Report in one line: what you removed, what you kept and why, and any hack still needing a fix.`;

export function commitGuidance(): string {
	return `[COMMENT HYGIENE GATE] Commit blocked once for review. Nothing was committed.

${POLICY}

Then run the same commit command again; it will not be blocked twice.`;
}

export function finishGuidance(): string {
	return `[COMMENT HYGIENE CHECK] You changed code and finished without committing.

${POLICY}

Fix what needs fixing, or confirm in one line that the comments already comply.`;
}

export function manualGuidance(): string {
	return `[COMMENT HYGIENE REVIEW] Requested manually.

${POLICY}`;
}
