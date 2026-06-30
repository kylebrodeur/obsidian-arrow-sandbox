import { createHash } from "node:crypto";

/**
 * Canonical source hashing for sandbox -> plugin porting parity.
 *
 * The sandbox is the source of truth for a component; the plugin gets a
 * near-verbatim copy. This hashes the component's *portable body* so the only
 * thing that can change the hash is meaningful drift in the component — not the
 * bits that legitimately differ on the way into a plugin.
 *
 * Canonical form (define it so both sides agree by construction):
 *   1. Drop `import …;` statements (single- or multi-line). Imports are the main
 *      legit delta: the sandbox imports stub data / no obsidian; the plugin
 *      imports the obsidian API / real data wiring. The component body is what
 *      must match.
 *   2. Normalize line endings to \n, strip trailing whitespace per line, collapse
 *      runs of blank lines to one, trim leading/trailing blank lines.
 *   3. SHA-256 the result.
 *
 * Note: comments are intentionally kept (they're part of the component; the
 * sandbox is the source of truth for them too). To keep parity clean, write
 * portable components that take data via props/getters so the body is identical
 * across sandbox and plugin and only the mount site differs.
 */

// Matches a whole `import …;` statement. `[^;]*` crosses newlines (the negated
// class matches \n) so multi-line imports are captured up to the first semicolon.
const IMPORT_STATEMENT = /^[ \t]*import\b[^;]*;[ \t]*$/gm;

export function canonicalizeSource(text) {
	const withoutImports = text.replace(IMPORT_STATEMENT, "");
	const lines = withoutImports
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => line.replace(/[ \t]+$/, ""));

	// Collapse runs of blank lines to a single blank line.
	const collapsed = [];
	let lastBlank = false;
	for (const line of lines) {
		const blank = line === "";
		if (blank && lastBlank) {
			continue;
		}
		collapsed.push(line);
		lastBlank = blank;
	}

	// Trim leading/trailing blank lines.
	while (collapsed.length > 0 && collapsed[0] === "") {
		collapsed.shift();
	}
	while (collapsed.length > 0 && collapsed[collapsed.length - 1] === "") {
		collapsed.pop();
	}

	return `${collapsed.join("\n")}\n`;
}

/** SHA-256 hex of the canonical source. */
export function hashSource(text) {
	return createHash("sha256").update(canonicalizeSource(text), "utf8").digest("hex");
}
