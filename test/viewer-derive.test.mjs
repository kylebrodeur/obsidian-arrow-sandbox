import assert from "node:assert/strict";
import { test } from "node:test";
import {
	buildStoryTree,
	kebabCase,
	storyMetaFromGlobKey,
	titleFromSlug,
} from "../src/viewer/derive.ts";

test("kebabCase converts PascalCase and spaces/underscores", () => {
	assert.equal(kebabCase("SettingsPanel"), "settings-panel");
	assert.equal(kebabCase("Toggle"), "toggle");
	assert.equal(kebabCase("message_feed thing"), "message-feed-thing");
});

test("titleFromSlug start-cases", () => {
	assert.equal(titleFromSlug("settings-panel"), "Settings Panel");
	assert.equal(titleFromSlug("toggle"), "Toggle");
});

test("storyMetaFromGlobKey derives slug + repo-relative paths", () => {
	const meta = storyMetaFromGlobKey("../components/SettingsPanel.stories.ts");
	assert.equal(meta.slug, "settings-panel");
	assert.equal(meta.storiesPath, "src/components/SettingsPanel.stories.ts");
	assert.equal(meta.componentPath, "src/components/SettingsPanel.ts");
});

test("storyMetaFromGlobKey handles nested directories", () => {
	const meta = storyMetaFromGlobKey("../components/chat/MessageFeed.stories.ts");
	assert.equal(meta.slug, "message-feed");
	assert.equal(meta.storiesPath, "src/components/chat/MessageFeed.stories.ts");
	assert.equal(meta.componentPath, "src/components/chat/MessageFeed.ts");
});

test("buildStoryTree nests children under parents", () => {
	const { roots, unknownChildren } = buildStoryTree([
		{ slug: "settings-panel", children: ["toggle"] },
		{ slug: "toggle" },
	]);
	assert.equal(unknownChildren.length, 0);
	assert.equal(roots.length, 1);
	assert.equal(roots[0].slug, "settings-panel");
	assert.equal(roots[0].children[0].slug, "toggle");
});

test("buildStoryTree reports unknown children and keeps them out of the tree", () => {
	const { roots, unknownChildren } = buildStoryTree([{ slug: "a", children: ["ghost"] }]);
	assert.deepEqual(unknownChildren, [{ parent: "a", child: "ghost" }]);
	assert.equal(roots[0].children.length, 0);
});

test("buildStoryTree guards cycles: mutual refs fall back to flat roots", () => {
	const { roots } = buildStoryTree([
		{ slug: "a", children: ["b"] },
		{ slug: "b", children: ["a"] },
	]);
	// both are referenced, so no natural roots — fall back to all items flat
	assert.deepEqual(
		roots.map((r) => r.slug),
		["a", "b"]
	);
	// and recursion must not loop forever: nested child stops at the cycle
	assert.equal(roots[0].children[0].slug, "b");
	assert.equal(roots[0].children[0].children.length, 0);
});
