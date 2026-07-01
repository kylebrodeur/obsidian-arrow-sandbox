import assert from "node:assert/strict";
import { test } from "node:test";
import { defineStories, normalizeVariants, validateStoryDef } from "../src/viewer/stories.ts";

test("defineStories is an identity that preserves the def", () => {
	const def = { variants: { default: () => "x" } };
	assert.equal(defineStories(def), def);
});

test("validateStoryDef accepts a minimal valid def", () => {
	assert.deepEqual(validateStoryDef({ variants: { default: () => "x" } }), { ok: true });
});

test("validateStoryDef accepts full metadata incl. componentPath override", () => {
	const def = {
		title: "Toggle",
		description: "d",
		componentPath: "src/components/SettingsPanel.ts",
		variants: { on: { render: () => "x", notes: "n" } },
		children: ["other"],
	};
	assert.deepEqual(validateStoryDef(def), { ok: true });
});

test("validateStoryDef rejects non-objects and missing/empty variants", () => {
	assert.equal(validateStoryDef(undefined).ok, false);
	assert.equal(validateStoryDef(null).ok, false);
	assert.equal(validateStoryDef({}).ok, false);
	assert.equal(validateStoryDef({ variants: {} }).ok, false);
});

test("validateStoryDef rejects bad variant values and bad children", () => {
	assert.equal(validateStoryDef({ variants: { a: 42 } }).ok, false);
	assert.equal(validateStoryDef({ variants: { a: { notes: "no render" } } }).ok, false);
	assert.equal(validateStoryDef({ variants: { a: () => "x" }, children: [1] }).ok, false);
});

test("normalizeVariants wraps bare functions and passes objects through", () => {
	const fn = () => "x";
	const out = normalizeVariants({ bare: fn, full: { render: fn, notes: "n" } });
	assert.deepEqual(out.bare, { render: fn });
	assert.equal(out.full.render, fn);
	assert.equal(out.full.notes, "n");
});
