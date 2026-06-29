/**
 * Pure asar parsing for Obsidian's bundled app.css. No filesystem, no deps —
 * takes a Buffer, returns the app.css string. Kept separate from the CLI so it
 * can be unit-tested against a synthetic asar (CI has no Obsidian install).
 *
 * asar = Chromium Pickle header + concatenated data section:
 *   [0,4)   UInt32LE = 4                  (outer pickle length prefix)
 *   [4,8)   UInt32LE = headerPickleSize   (4-byte aligned — includes padding)
 *   [8,12)  UInt32LE = json pickle payload size
 *   [12,16) UInt32LE = json string length
 *   [16, 16+jsonLen) = header JSON
 *   data section starts at 8 + headerPickleSize  ← offset 4, NOT 8
 *
 * Using offset 8 (the inner payload size) instead of 4 yields a data start that
 * is a few bytes short, bleeding bytes from the previous file into the slice —
 * the alignment bug this module's test guards against.
 */

/** Read the header JSON + data-section start from an asar buffer. */
export function readAsarHeader(buf) {
	const jsonLen = buf.readUInt32LE(12);
	const header = JSON.parse(buf.toString("utf8", 16, 16 + jsonLen));
	const dataStart = 8 + buf.readUInt32LE(4);
	return { header, dataStart };
}

/** Find a file entry by name anywhere in the asar header tree. */
export function findEntry(header, fileName) {
	let found = null;
	(function walk(node) {
		if (!node?.files) return;
		for (const [name, child] of Object.entries(node.files)) {
			if (name === fileName && child.offset != null) found = child;
			if (child.files) walk(child);
		}
	})(header);
	return found;
}

/** Extract `app.css` (or `fileName`) from an asar buffer as a string. */
export function extractAppCss(buf, fileName = "app.css") {
	const { header, dataStart } = readAsarHeader(buf);
	const entry = findEntry(header, fileName);
	if (!entry) throw new Error(`${fileName} not found inside the asar header`);
	const start = dataStart + Number.parseInt(entry.offset, 10);
	return buf.toString("utf8", start, start + entry.size);
}

/** Sanity-check that an extracted string is really Obsidian's app.css. */
export function assertLooksLikeAppCss(css) {
	const head = css.trimStart().slice(0, 64);
	if (!head.startsWith("/*") && !head.startsWith(":root") && !head.startsWith("@")) {
		throw new Error(
			`Extracted CSS does not start as expected (got: ${JSON.stringify(head)}). The asar data offset may be misaligned.`
		);
	}
	if (!css.includes("--text-accent") || !css.includes("body.theme-dark")) {
		throw new Error("Extracted CSS is missing expected Obsidian theme variables.");
	}
}
