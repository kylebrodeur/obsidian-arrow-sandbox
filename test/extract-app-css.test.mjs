import assert from "node:assert/strict";
import { test } from "node:test";
import {
	assertLooksLikeAppCss,
	extractAppCss,
	findEntry,
	readAsarHeader,
} from "../scripts/lib/extract-app-css.mjs";

/**
 * Build a minimal but format-accurate asar buffer wrapping `css` at a nested
 * path (styles/app.css), to exercise the recursive walk and the data-offset
 * alignment. The value written at byte 8 (inner payload size) is deliberately
 * 4 less than byte 4 (outer pickle size) — mirroring real asars — so a parser
 * that reads offset 8 instead of 4 computes a short dataStart and slices the
 * wrong bytes. That is the alignment regression this fixture guards.
 */
function buildSyntheticAsar(css) {
	const cssLen = Buffer.byteLength(css, "utf8");
	const json = JSON.stringify({
		files: { styles: { files: { "app.css": { offset: "0", size: cssLen } } } },
	});
	const jsonLen = Buffer.byteLength(json, "utf8");
	const dataStart = 16 + jsonLen;
	const headerPickleSize = dataStart - 8; // so dataStart === 8 + readUInt32LE(4)

	const buf = Buffer.alloc(dataStart + cssLen);
	buf.writeUInt32LE(4, 0);
	buf.writeUInt32LE(headerPickleSize, 4); // outer pickle size — the correct one
	buf.writeUInt32LE(headerPickleSize - 4, 8); // inner payload — the wrong one to read
	buf.writeUInt32LE(jsonLen, 12);
	buf.write(json, 16, "utf8");
	buf.write(css, dataStart, "utf8");
	return buf;
}

const SAMPLE_CSS = ":root{--text-accent:#705dcf}\nbody.theme-dark{--background-primary:#1e1e1e}\n";

test("extractAppCss returns the embedded css verbatim", () => {
	const buf = buildSyntheticAsar(SAMPLE_CSS);
	assert.equal(extractAppCss(buf), SAMPLE_CSS);
});

test("readAsarHeader uses the 4-byte-aligned outer offset (byte 4, not 8)", () => {
	const buf = buildSyntheticAsar(SAMPLE_CSS);
	const { dataStart } = readAsarHeader(buf);
	// Reading byte 8 would give dataStart - 4 and corrupt the slice.
	assert.equal(
		buf.toString("utf8", dataStart, dataStart + Buffer.byteLength(SAMPLE_CSS)),
		SAMPLE_CSS
	);
});

test("findEntry walks nested directories", () => {
	const { header } = readAsarHeader(buildSyntheticAsar(SAMPLE_CSS));
	const entry = findEntry(header, "app.css");
	assert.ok(entry);
	assert.equal(entry.offset, "0");
});

test("extractAppCss throws when the file is absent", () => {
	const buf = buildSyntheticAsar(SAMPLE_CSS);
	assert.throws(() => extractAppCss(buf, "missing.css"), /not found/);
});

test("assertLooksLikeAppCss accepts real-looking css and rejects garbage", () => {
	assert.doesNotThrow(() => assertLooksLikeAppCss(SAMPLE_CSS));
	assert.throws(() => assertLooksLikeAppCss("}}}}garbage"), /does not start as expected/);
	assert.throws(() => assertLooksLikeAppCss(":root{--other:1}"), /missing expected Obsidian/);
});
