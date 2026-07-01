import assert from "node:assert/strict";
import { test } from "node:test";
import {
	classifyValue,
	filterTokens,
	groupTokens,
	parseCustomProps,
} from "../src/viewer/token-utils.ts";

test("parseCustomProps extracts custom property declarations from rule text", () => {
	const css = "body.theme-dark { --text-accent: #a288ff; --size-4-2: 8px; color: red; }";
	assert.deepEqual(parseCustomProps(css), [
		{ name: "--text-accent", value: "#a288ff" },
		{ name: "--size-4-2", value: "8px" },
	]);
});

test("parseCustomProps does not false-match var() references in values", () => {
	const css = ".x { --a: var(--b); background: var(--c); }";
	assert.deepEqual(parseCustomProps(css), [{ name: "--a", value: "var(--b)" }]);
});

test("groupTokens groups by prefix in stable order, dedupes last-wins, sorts names", () => {
	const groups = groupTokens([
		{ name: "--zeta-thing", value: "1" },
		{ name: "--size-4-4", value: "16px" },
		{ name: "--size-4-2", value: "8px" },
		{ name: "--size-4-2", value: "9px" },
		{ name: "--color-red", value: "#e11" },
	]);
	assert.deepEqual(
		groups.map((g) => g.label),
		["Size & spacing", "Colors", "Other"]
	);
	const size = groups[0];
	assert.deepEqual(size.tokens, [
		{ name: "--size-4-2", value: "9px" },
		{ name: "--size-4-4", value: "16px" },
	]);
});

test("classifyValue detects colors, lengths, other", () => {
	assert.equal(classifyValue("#fff"), "color");
	assert.equal(classifyValue("#a288ffcc"), "color");
	assert.equal(classifyValue("rgba(0, 0, 0, 0.3)"), "color");
	assert.equal(classifyValue("hsl(254, 80%, 68%)"), "color");
	assert.equal(classifyValue("16px"), "length");
	assert.equal(classifyValue("0.875em"), "length");
	assert.equal(classifyValue("inherit"), "other");
	assert.equal(classifyValue("var(--x)"), "other");
});

test("filterTokens is a case-insensitive substring match; blank query passes all", () => {
	const decls = [
		{ name: "--text-accent", value: "x" },
		{ name: "--size-4-2", value: "y" },
	];
	assert.deepEqual(filterTokens(decls, "ACCENT"), [decls[0]]);
	assert.deepEqual(filterTokens(decls, "  "), decls);
});
