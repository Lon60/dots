const COMMAND_SEPARATORS = /\|\||&&|[;\n|&]/;

const TRANSPARENT_PREFIXES = new Set(["sudo", "command", "nice", "nohup", "time", "env", "exec", "builtin"]);

const GIT_OPTS_WITH_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path", "--config-env"]);

const COMMIT_DRY_FLAGS = new Set(["--dry-run", "-n", "--short", "--porcelain", "--long", "--null", "-z"]);

const NON_CODE_EXTENSIONS = new Set([
	"md", "markdown", "mdx", "txt", "rst", "adoc", "org", "tex",
	"json", "lock", "csv", "tsv", "xml", "plist",
	"png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "pdf",
	"zip", "tar", "gz", "bz2", "xz", "7z", "woff", "woff2", "ttf", "otf",
	"log", "snap", "map", "min",
]);

const GENERATED_PATH_SEGMENTS = ["node_modules/", "/.git/", "dist/", "build/", "out/", "vendor/", "target/", "__pycache__/", ".venv/", "coverage/"];

/**
 * Drops heredoc bodies so their contents are never parsed as commands. A file
 * written via `cat <<EOF` routinely contains command text that is data, not
 * execution.
 */
function stripHeredocBodies(command: string): string {
	const lines = command.split("\n");
	const kept: string[] = [];
	let delimiter: string | undefined;

	for (const line of lines) {
		if (delimiter !== undefined) {
			if (line.trim() === delimiter) delimiter = undefined;
			continue;
		}

		kept.push(line);
		const opener = /<<-?\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))/.exec(line);
		if (opener) delimiter = opener[1] ?? opener[2] ?? opener[3];
	}

	return kept.join("\n");
}

/**
 * Blanks quoted spans so text inside them is data, not a command. Keeps the
 * quotes themselves so surrounding argument structure is preserved.
 */
function blankQuotedSpans(command: string): string {
	return command.replace(/'[^']*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

function stripWrapping(token: string): string {
	return token.replace(/^[({!]+/, "").replace(/^["']|["']$/g, "");
}

function isGitBinary(token: string): boolean {
	const base = token.split("/").pop() ?? token;
	return base === "git";
}

function gitSubcommand(segment: string): { subcommand: string; args: string[] } | undefined {
	const tokens = segment.trim().split(/\s+/).filter(Boolean);
	let i = 0;

	while (i < tokens.length) {
		const token = stripWrapping(tokens[i] ?? "");
		if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token) || TRANSPARENT_PREFIXES.has(token)) {
			i++;
			continue;
		}
		break;
	}

	const binary = stripWrapping(tokens[i] ?? "");
	if (!isGitBinary(binary)) return undefined;
	i++;

	while (i < tokens.length) {
		const token = tokens[i] ?? "";
		if (!token.startsWith("-")) break;
		const name = token.includes("=") ? token.slice(0, token.indexOf("=")) : token;
		if (GIT_OPTS_WITH_VALUE.has(name) && !token.includes("=")) i += 2;
		else i += 1;
	}

	const subcommand = tokens[i];
	if (!subcommand) return undefined;
	return { subcommand, args: tokens.slice(i + 1) };
}

/** True for git invocations that write a commit. Dry runs are excluded. */
export function isGitCommitCommand(command: string): boolean {
	if (!command.includes("commit")) return false;

	return blankQuotedSpans(stripHeredocBodies(command))
		.split(COMMAND_SEPARATORS)
		.some((segment) => {
			const parsed = gitSubcommand(segment);
			if (parsed?.subcommand !== "commit") return false;
			return !parsed.args.some((arg) => COMMIT_DRY_FLAGS.has(arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg));
		});
}

/** True for source files whose comments are worth auditing. Docs, data and generated trees are excluded. */
export function isCodePath(rawPath: string): boolean {
	if (!rawPath) return false;

	const path = rawPath.replace(/^@/, "").replaceAll("\\", "/");
	const normalized = path.startsWith("/") ? path : `/${path}`;
	if (GENERATED_PATH_SEGMENTS.some((segment) => normalized.includes(segment))) return false;

	const file = path.split("/").pop() ?? path;
	const dotIndex = file.lastIndexOf(".");
	// Rejects extensionless files and dotfiles such as .gitignore.
	if (dotIndex <= 0) return false;

	return !NON_CODE_EXTENSIONS.has(file.slice(dotIndex + 1).toLowerCase());
}
