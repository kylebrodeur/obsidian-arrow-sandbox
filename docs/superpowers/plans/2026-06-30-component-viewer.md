# Component Viewer + Obsidian Reference Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Storybook-style component viewer at `/components` (co-located `.stories.ts` files, variants, drill-in, derived src paths) plus an Obsidian reference index at `/reference` (all tokens parsed live from app.css; curated class catalog with live previews), replacing the examples registry.

**Architecture:** Story files are discovered with `import.meta.glob` (eager); pure derivation/validation/parsing logic lives in DOM-free modules tested with `node:test` via `--experimental-strip-types`. The router gains viewer/reference routes, an optional per-page sidebar, and a redirect mechanism. The existing Shell/Frame stay the preview surface, so width/theme controls apply to every story.

**Tech Stack:** @arrow-js/core + @arrow-js/framework (already installed — **no new dependencies**), Vite `import.meta.glob`, `node:test` with `--experimental-strip-types` (verified working on this repo's Node v22.19).

**Spec:** `docs/superpowers/specs/2026-06-30-component-viewer-design.md`

## Global Constraints

- **No new dependencies.** Everything uses what's installed.
- **Biome style:** tabs, line width 100, double quotes, semicolons. Run `pnpm exec biome check --write <files>` before each commit; the pre-commit hook (lint-staged + `pnpm typecheck`) enforces it.
- **Arrow v1.0.6 footguns (hard runtime errors):** NO literal HTML comments (`<!-- -->`) inside `html\`\`` templates; an attribute expression must be the ENTIRE attribute value (`class="${expr}"`, never `class="static ${expr}"`); `@event` handler params typed `(e: Event)`, never a narrowed subtype; `${x}` renders once vs `${() => x}` reactive.
- **Commit messages:** plain, no Co-Authored-By / AI attribution of any kind.
- **Sandbox chrome vs portable components:** everything under `src/viewer/` and `src/sandbox/` is sandbox-only chrome; custom CSS is scoped under `oas-*` container classes.
- Run all commands from the repo root: `/Users/kylebrodeur/workspace/arrow-ui/obsidian-arrow-sandbox`.

---

### Task 1: Pure derivation helpers (`derive.ts`) + strip-types test pipeline

**Files:**
- Modify: `package.json` (test script)
- Create: `src/viewer/derive.ts`
- Test: `test/viewer-derive.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 3, 5):
  - `kebabCase(name: string): string`
  - `titleFromSlug(slug: string): string`
  - `storyMetaFromGlobKey(globKey: string): { slug: string; storiesPath: string; componentPath: string }`
  - `interface TreeNode { slug: string; children: TreeNode[] }`
  - `buildStoryTree(items: { slug: string; children?: string[] }[]): { roots: TreeNode[]; unknownChildren: { parent: string; child: string }[] }`

- [ ] **Step 1: Point the test script at strip-types**

In `package.json`, change the `test` script:

```json
"test": "node --experimental-strip-types --test test/*.test.mjs",
```

(Existing `.mjs`-only tests are unaffected; the flag lets new test files import `.ts` modules directly. Node prints an ExperimentalWarning — harmless.)

- [ ] **Step 2: Write the failing test**

Create `test/viewer-derive.test.mjs`:

```js
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
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test 2>&1 | grep -E "viewer-derive|# (pass|fail)"`
Expected: FAIL — cannot find module `../src/viewer/derive.ts`.

- [ ] **Step 4: Implement `src/viewer/derive.ts`**

```ts
/**
 * Pure derivation helpers for the component viewer. DOM-free so node:test can
 * cover them directly (via --experimental-strip-types).
 *
 * Glob keys come from import.meta.glob in src/viewer/discovery.ts, so they are
 * relative to src/viewer/ (e.g. "../components/SettingsPanel.stories.ts").
 */

export interface StoryPathMeta {
	slug: string;
	storiesPath: string;
	componentPath: string;
}

export function kebabCase(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.toLowerCase();
}

export function titleFromSlug(slug: string): string {
	return slug
		.split("-")
		.filter(Boolean)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(" ");
}

/** "../components/Foo.stories.ts" → repo-relative paths + slug. */
export function storyMetaFromGlobKey(globKey: string): StoryPathMeta {
	const storiesPath = `src/${globKey.replace(/^(\.\.\/|\.\/)+/, "")}`;
	const componentPath = storiesPath.replace(/\.stories\.ts$/, ".ts");
	const base = storiesPath.split("/").pop() ?? "";
	const slug = kebabCase(base.replace(/\.stories\.ts$/, ""));
	return { slug, storiesPath, componentPath };
}

export interface TreeNode {
	slug: string;
	children: TreeNode[];
}

/**
 * Build the sidebar tree: stories referenced as another story's child nest
 * under it; unreferenced stories are roots. Cycles are guarded (a slug never
 * nests under itself); if a cycle leaves no natural roots, all items become
 * flat roots so nothing disappears from the sidebar.
 */
export function buildStoryTree(items: { slug: string; children?: string[] }[]): {
	roots: TreeNode[];
	unknownChildren: { parent: string; child: string }[];
} {
	const bySlug = new Map(items.map((item) => [item.slug, item]));
	const referenced = new Set<string>();
	const unknownChildren: { parent: string; child: string }[] = [];

	for (const item of items) {
		for (const child of item.children ?? []) {
			if (bySlug.has(child)) {
				referenced.add(child);
			} else {
				unknownChildren.push({ parent: item.slug, child });
			}
		}
	}

	const build = (slug: string, seen: Set<string>): TreeNode => {
		const next = new Set(seen).add(slug);
		const children = (bySlug.get(slug)?.children ?? [])
			.filter((child) => bySlug.has(child) && !next.has(child))
			.map((child) => build(child, next));
		return { slug, children };
	};

	let rootItems = items.filter((item) => !referenced.has(item.slug));
	if (rootItems.length === 0 && items.length > 0) {
		rootItems = items;
	}
	return { roots: rootItems.map((item) => build(item.slug, new Set())), unknownChildren };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test 2>&1 | grep -E "# (tests|pass|fail)"`
Expected: all pass (14 existing + 7 new = `# pass 21`, `# fail 0`).

- [ ] **Step 6: Format, typecheck, commit**

```bash
pnpm exec biome check --write src/viewer/derive.ts test/viewer-derive.test.mjs package.json
pnpm typecheck
git add src/viewer/derive.ts test/viewer-derive.test.mjs package.json
git commit -m "feat(viewer): pure derivation helpers + strip-types test pipeline"
```

---

### Task 2: Story types, `defineStories`, validation (`stories.ts`)

**Files:**
- Create: `src/viewer/stories.ts`
- Test: `test/viewer-stories.test.mjs`

**Interfaces:**
- Consumes: `ArrowExpression` type from `@arrow-js/core` (type-only — erased at runtime, so node tests never load Arrow).
- Produces (used by Tasks 3, 4, 5):
  - `interface StoryVariant { render: () => ArrowExpression; notes?: string }`
  - `type VariantInput = StoryVariant | (() => ArrowExpression)`
  - `interface StoryDef { title?; description?; componentPath?; variants: Record<string, VariantInput>; children?: string[] }`
  - `defineStories(def: StoryDef): StoryDef`
  - `validateStoryDef(def: unknown): { ok: true } | { ok: false; reason: string }`
  - `normalizeVariants(variants: Record<string, VariantInput>): Record<string, StoryVariant>`

- [ ] **Step 1: Write the failing test**

Create `test/viewer-stories.test.mjs`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test 2>&1 | grep -E "viewer-stories|# fail"`
Expected: FAIL — cannot find module `../src/viewer/stories.ts`.

- [ ] **Step 3: Implement `src/viewer/stories.ts`**

```ts
import type { ArrowExpression } from "@arrow-js/core";

/**
 * Single-object story format (see the 2026-06-30 spec's decision record: CSF 3
 * and Ladle were the references; we diverged because no Storybook renderer
 * exists for Arrow, and one validated object is harder to get wrong).
 */

export interface StoryVariant {
	render: () => ArrowExpression;
	notes?: string;
}

export type VariantInput = StoryVariant | (() => ArrowExpression);

export interface StoryDef {
	/** Display name; defaults to the start-cased filename. */
	title?: string;
	/** One-line description shown in the tree and header. */
	description?: string;
	/** Repo-relative override for where the component lives (e.g. a subcomponent
	 * defined inside its parent's file). Defaults to the stories path minus `.stories`. */
	componentPath?: string;
	/** Named variants; keys are human strings ("default", "dev mode off"). */
	variants: Record<string, VariantInput>;
	/** Slugs of subcomponent stories for drill-in nesting. */
	children?: string[];
}

export function defineStories(def: StoryDef): StoryDef {
	return def;
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateStoryDef(def: unknown): ValidationResult {
	if (!isRecord(def)) {
		return { ok: false, reason: "default export is not an object (use defineStories({...}))" };
	}
	for (const field of ["title", "description", "componentPath"] as const) {
		if (field in def && typeof def[field] !== "string") {
			return { ok: false, reason: `"${field}" must be a string` };
		}
	}
	if (!isRecord(def.variants) || Object.keys(def.variants).length === 0) {
		return { ok: false, reason: '"variants" must be a non-empty object' };
	}
	for (const [name, variant] of Object.entries(def.variants)) {
		const valid =
			typeof variant === "function" ||
			(isRecord(variant) && typeof variant.render === "function");
		if (!valid) {
			return { ok: false, reason: `variant "${name}" must be a render fn or { render }` };
		}
	}
	if ("children" in def) {
		const children = def.children;
		if (!Array.isArray(children) || children.some((child) => typeof child !== "string")) {
			return { ok: false, reason: '"children" must be an array of story slugs' };
		}
	}
	return { ok: true };
}

export function normalizeVariants(
	variants: Record<string, VariantInput>
): Record<string, StoryVariant> {
	const out: Record<string, StoryVariant> = {};
	for (const [name, variant] of Object.entries(variants)) {
		out[name] = typeof variant === "function" ? { render: variant } : variant;
	}
	return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test 2>&1 | grep -E "# (tests|pass|fail)"`
Expected: `# fail 0` (27 passing).

- [ ] **Step 5: Format, typecheck, commit**

```bash
pnpm exec biome check --write src/viewer/stories.ts test/viewer-stories.test.mjs
pnpm typecheck
git add src/viewer/stories.ts test/viewer-stories.test.mjs
git commit -m "feat(viewer): story types, defineStories, shape validation"
```

---

### Task 3: Token parsing/grouping utilities (`token-utils.ts`)

**Files:**
- Create: `src/viewer/token-utils.ts`
- Test: `test/token-utils.test.mjs`

**Interfaces:**
- Consumes: nothing (pure).
- Produces (used by Task 6):
  - `interface TokenDecl { name: string; value: string }`
  - `parseCustomProps(cssText: string): TokenDecl[]`
  - `interface TokenGroup { label: string; tokens: TokenDecl[] }`
  - `groupTokens(decls: TokenDecl[]): TokenGroup[]` (dedupes last-wins, groups by prefix, ordered)
  - `classifyValue(resolved: string): "color" | "length" | "other"`
  - `filterTokens(decls: TokenDecl[], query: string): TokenDecl[]`

- [ ] **Step 1: Write the failing test**

Create `test/token-utils.test.mjs`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test 2>&1 | grep -E "token-utils|# fail"`
Expected: FAIL — cannot find module `../src/viewer/token-utils.ts`.

- [ ] **Step 3: Implement `src/viewer/token-utils.ts`**

```ts
/**
 * Pure token parsing/grouping for the reference index. The browser side feeds
 * this CSSOM rule text (rule.cssText); keeping the parser string-in/data-out
 * makes it node:test-able without a DOM.
 */

export interface TokenDecl {
	name: string;
	value: string;
}

export function parseCustomProps(cssText: string): TokenDecl[] {
	const out: TokenDecl[] = [];
	const re = /(--[A-Za-z0-9_-]+)\s*:\s*([^;}]+)/g;
	let match = re.exec(cssText);
	while (match !== null) {
		out.push({ name: match[1], value: match[2].trim() });
		match = re.exec(cssText);
	}
	return out;
}

const GROUP_PREFIXES: [string, string][] = [
	["--size-", "Size & spacing"],
	["--radius-", "Radius"],
	["--color-", "Colors"],
	["--background-", "Backgrounds"],
	["--text-", "Text"],
	["--font-", "Fonts & type"],
	["--shadow-", "Shadows"],
	["--interactive-", "Interactive"],
	["--icon-", "Icons"],
];
const OTHER_LABEL = "Other";

export interface TokenGroup {
	label: string;
	tokens: TokenDecl[];
}

export function groupTokens(decls: TokenDecl[]): TokenGroup[] {
	const latest = new Map<string, string>();
	for (const decl of decls) {
		latest.set(decl.name, decl.value);
	}
	const buckets = new Map<string, TokenDecl[]>();
	for (const [name, value] of latest) {
		const label = GROUP_PREFIXES.find(([prefix]) => name.startsWith(prefix))?.[1] ?? OTHER_LABEL;
		const bucket = buckets.get(label) ?? [];
		bucket.push({ name, value });
		buckets.set(label, bucket);
	}
	const order = [...GROUP_PREFIXES.map(([, label]) => label), OTHER_LABEL];
	return order
		.filter((label) => buckets.has(label))
		.map((label) => ({
			label,
			tokens: (buckets.get(label) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
		}));
}

export type ValueKind = "color" | "length" | "other";

export function classifyValue(resolved: string): ValueKind {
	const value = resolved.trim();
	if (/^#[0-9a-f]{3,8}$/i.test(value) || /^(rgb|rgba|hsl|hsla)\(/i.test(value)) {
		return "color";
	}
	if (/^-?\d+(\.\d+)?(px|em|rem)$/.test(value)) {
		return "length";
	}
	return "other";
}

export function filterTokens(decls: TokenDecl[], query: string): TokenDecl[] {
	const q = query.trim().toLowerCase();
	if (q === "") {
		return decls;
	}
	return decls.filter((decl) => decl.name.toLowerCase().includes(q));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test 2>&1 | grep -E "# (tests|pass|fail)"`
Expected: `# fail 0` (32 passing).

- [ ] **Step 5: Format, typecheck, commit**

```bash
pnpm exec biome check --write src/viewer/token-utils.ts test/token-utils.test.mjs
pnpm typecheck
git add src/viewer/token-utils.ts test/token-utils.test.mjs
git commit -m "feat(viewer): token parsing, grouping, classification utils"
```

---

### Task 4: Discovery module + first story files

**Files:**
- Create: `src/viewer/discovery.ts`
- Modify: `src/components/SettingsPanel.ts` (export `Toggle` — one-word change)
- Create: `src/components/SettingsPanel.stories.ts`
- Create: `src/components/Toggle.stories.ts`

**Interfaces:**
- Consumes: Task 1's `storyMetaFromGlobKey`/`titleFromSlug`/`buildStoryTree`; Task 2's `validateStoryDef`/`normalizeVariants`/`StoryDef`/`StoryVariant`.
- Produces (used by Tasks 5, 7):
  - `interface DiscoveredStory { slug; title; description?; storiesPath; componentPath; variants: Record<string, StoryVariant>; children: string[] }`
  - `stories: DiscoveredStory[]` (title-sorted), `invalidStories: { storiesPath: string; reason: string }[]`
  - `storyTree: { roots: TreeNode[]; unknownChildren: {...}[] }`
  - `findStory(slug: string): DiscoveredStory | undefined`

*(No node test — `import.meta.glob` is Vite-only. The pure pieces are already covered by Tasks 1–2; this task's gate is `pnpm typecheck`, and behavior is verified in the browser in Task 8.)*

- [ ] **Step 1: Export `Toggle` from `src/components/SettingsPanel.ts`**

Find the line:

```ts
const Toggle = (enabled: () => boolean, onToggle: () => void): ArrowTemplate => html`<div
```

Change `const Toggle` to `export const Toggle` (benign, portable change — the porting-parity canonicalizer keeps body semantics; the export ports fine).

- [ ] **Step 2: Create `src/viewer/discovery.ts`**

```ts
import { buildStoryTree, storyMetaFromGlobKey, titleFromSlug } from "./derive";
import type { StoryDef, StoryVariant } from "./stories";
import { normalizeVariants, validateStoryDef } from "./stories";

/**
 * Discovers co-located *.stories.ts files at build time. The glob key IS the
 * file path, so src locations shown in the viewer are derived, never
 * hand-maintained. One malformed story file is skipped (with a console.warn
 * and an entry in invalidStories) — it never blanks the viewer.
 */

export interface DiscoveredStory {
	slug: string;
	title: string;
	description?: string;
	storiesPath: string;
	componentPath: string;
	variants: Record<string, StoryVariant>;
	children: string[];
}

export interface InvalidStory {
	storiesPath: string;
	reason: string;
}

const modules = import.meta.glob("../components/**/*.stories.ts", { eager: true }) as Record<
	string,
	{ default?: unknown }
>;

export const stories: DiscoveredStory[] = [];
export const invalidStories: InvalidStory[] = [];

for (const [globKey, mod] of Object.entries(modules)) {
	const meta = storyMetaFromGlobKey(globKey);
	const check = validateStoryDef(mod.default);
	if (!check.ok) {
		console.warn(`[viewer] skipping ${meta.storiesPath}: ${check.reason}`);
		invalidStories.push({ storiesPath: meta.storiesPath, reason: check.reason });
		continue;
	}
	const def = mod.default as StoryDef;
	stories.push({
		slug: meta.slug,
		title: def.title ?? titleFromSlug(meta.slug),
		description: def.description,
		storiesPath: meta.storiesPath,
		componentPath: def.componentPath ?? meta.componentPath,
		variants: normalizeVariants(def.variants),
		children: def.children ?? [],
	});
}

stories.sort((a, b) => a.title.localeCompare(b.title));

export const storyTree = buildStoryTree(stories);

export function findStory(slug: string): DiscoveredStory | undefined {
	return stories.find((story) => story.slug === slug);
}
```

- [ ] **Step 3: Create `src/components/SettingsPanel.stories.ts`**

```ts
import { defineStories } from "../viewer/stories";
import { SettingsPanel } from "./SettingsPanel";

export default defineStories({
	description: "Vertical tabs, toggles, a keyed list, and an async boundary() section.",
	variants: {
		default: () => SettingsPanel(),
	},
	children: ["toggle"],
});
```

- [ ] **Step 4: Create `src/components/Toggle.stories.ts`**

```ts
import { reactive } from "@arrow-js/core";
import { defineStories } from "../viewer/stories";
import { Toggle } from "./SettingsPanel";

export default defineStories({
	description: "Obsidian checkbox-container toggle used by SettingsPanel.",
	componentPath: "src/components/SettingsPanel.ts",
	variants: {
		interactive: () => {
			const state = reactive({ on: true });
			return Toggle(
				() => state.on,
				() => {
					state.on = !state.on;
				}
			);
		},
		off: {
			render: () => Toggle(() => false, () => {}),
			notes: "Static off state (click does nothing).",
		},
	},
});
```

- [ ] **Step 5: Typecheck + full tests still green**

Run: `pnpm typecheck && pnpm test 2>&1 | grep -E "# (pass|fail)"`
Expected: typecheck clean, `# fail 0`.

- [ ] **Step 6: Format, commit**

```bash
pnpm exec biome check --write src/viewer/discovery.ts src/components/SettingsPanel.ts src/components/SettingsPanel.stories.ts src/components/Toggle.stories.ts
git add src/viewer/discovery.ts src/components/SettingsPanel.ts src/components/SettingsPanel.stories.ts src/components/Toggle.stories.ts
git commit -m "feat(viewer): glob discovery + first story files (SettingsPanel, Toggle)"
```

---

### Task 5: Viewer UI — sidebar + story page

**Files:**
- Create: `src/viewer/sidebar.ts`
- Create: `src/viewer/StoryPage.ts`
- Modify: `src/sandbox/sandbox.css` (append viewer styles)

**Interfaces:**
- Consumes: Task 4's `stories`, `storyTree`, `invalidStories`, `findStory`, `DiscoveredStory`; Task 1's `TreeNode`.
- Produces (used by Task 7):
  - `ViewerSidebar(activePath: string): ArrowExpression` — sidebar for any viewer/reference route; `activePath` is the current pathname (e.g. `/components/toggle`, `/reference`).
  - `StoryPage(story: DiscoveredStory, variantName: string): ArrowExpression` — header + variant selector + meta + rendered variant; renders an inline notice when `variantName` isn't in `story.variants`.
  - `copyText(text: string): void` (exported from `StoryPage.ts` for reuse in Task 6).

*(UI-only Arrow templates — no node test; gate is typecheck + Task 8 browser verification. Remember the footguns: no HTML comments in templates, whole-value attribute expressions only.)*

- [ ] **Step 1: Create `src/viewer/sidebar.ts`**

```ts
import { html } from "@arrow-js/core";
import type { ArrowExpression } from "@arrow-js/core";
import type { TreeNode } from "./derive";
import { findStory, invalidStories, storyTree } from "./discovery";

/**
 * Viewer navigation: component tree (children indented under parents) plus the
 * Reference section. Rendered OUTSIDE the pane, as the first child of the
 * stage. Sandbox chrome — never ports to a plugin.
 */

function navClass(active: boolean): string {
	return active ? "vertical-tab-nav-item oas-nav-item is-active" : "vertical-tab-nav-item oas-nav-item";
}

function nodeRows(node: TreeNode, activePath: string, depth: number): ArrowExpression {
	const story = findStory(node.slug);
	if (!story) {
		return "";
	}
	const href = `/components/${node.slug}`;
	return html`
		<a
			class="${navClass(activePath === href)}"
			style="${`padding-left: calc(var(--size-4-3) * ${depth + 1});`}"
			href="${href}"
		>${story.title}</a>
		${node.children.map((child) => nodeRows(child, activePath, depth + 1))}
	`;
}

export function ViewerSidebar(activePath: string): ArrowExpression {
	return html`
		<nav class="oas-sidebar">
			<div class="vertical-tab-header-group">
				<div class="vertical-tab-header-group-title">Components</div>
				${storyTree.roots.map((node) => nodeRows(node, activePath, 0))}
				${invalidStories.map(
					(bad) =>
						html`<div class="vertical-tab-nav-item oas-nav-invalid" title="${bad.reason}">
							invalid: ${bad.storiesPath}
						</div>`
				)}
			</div>
			<div class="vertical-tab-header-group">
				<div class="vertical-tab-header-group-title">Reference</div>
				<a class="${navClass(activePath === "/reference")}" href="/reference">Tokens</a>
				<a class="${navClass(activePath === "/reference/classes")}" href="/reference/classes">Classes</a>
			</div>
		</nav>
	`;
}
```

- [ ] **Step 2: Create `src/viewer/StoryPage.ts`**

```ts
import { html } from "@arrow-js/core";
import type { ArrowExpression } from "@arrow-js/core";
import type { DiscoveredStory } from "./discovery";
import { findStory } from "./discovery";

/** Copy to clipboard, best-effort (clipboard API needs a secure context). */
export function copyText(text: string): void {
	void navigator.clipboard?.writeText(text);
}

function pathRow(label: string, path: string): ArrowExpression {
	return html`
		<div class="oas-story-path">
			<span class="oas-path-label">${label}</span>
			<code>${path}</code>
			<button class="oas-copy" @click="${() => copyText(path)}">Copy</button>
		</div>
	`;
}

export function StoryPage(story: DiscoveredStory, variantName: string): ArrowExpression {
	const variant = story.variants[variantName];
	const variantNames = Object.keys(story.variants);
	return html`
		<div class="oas-story">
			<div class="setting-item setting-item-heading">
				<div class="setting-item-info">
					<div class="setting-item-name">${story.title}</div>
					${story.description
						? html`<div class="setting-item-description">${story.description}</div>`
						: ""}
				</div>
			</div>
			<div class="oas-story-meta">
				${pathRow("component", story.componentPath)}
				${pathRow("stories", story.storiesPath)}
			</div>
			<div class="oas-variants">
				${variantNames.map((name) => {
					const cls = name === variantName ? "oas-variant is-active" : "oas-variant";
					const href = `/components/${story.slug}?variant=${encodeURIComponent(name)}`;
					return html`<a class="${cls}" href="${href}">${name}</a>`;
				})}
			</div>
			${variant?.notes ? html`<div class="oas-story-notes">${variant.notes}</div>` : ""}
			${story.children.length > 0
				? html`<div class="oas-story-children">
						${story.children.map((slug) => {
							const child = findStory(slug);
							return child
								? html`<a class="oas-child" href="${`/components/${slug}`}">${child.title} →</a>`
								: html`<span class="oas-child-missing">${slug} (missing story)</span>`;
						})}
					</div>`
				: ""}
			<div class="oas-story-canvas">
				${variant
					? variant.render()
					: html`<div class="oas-story-missing">No variant "${variantName}" — pick one above.</div>`}
			</div>
		</div>
	`;
}
```

- [ ] **Step 3: Append viewer styles to `src/sandbox/sandbox.css`**

Append at the end of the file:

```css
/* Component viewer: sidebar (first child of the stage) + story page chrome. */
.oas-shell nav.oas-sidebar {
	flex: 0 0 220px;
	overflow-y: auto;
	padding: var(--size-4-3) 0;
	background: var(--background-secondary);
	border-right: 1px solid var(--background-modifier-border);
}

.oas-shell nav.oas-sidebar a.oas-nav-item {
	display: block;
	text-decoration: none;
}

.oas-shell nav.oas-sidebar .oas-nav-invalid {
	color: var(--text-error);
	font-size: var(--font-ui-smaller);
}

.oas-frame .oas-story-meta {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-1);
	margin: var(--size-4-2) 0;
}

.oas-frame .oas-story-path {
	display: flex;
	align-items: center;
	gap: var(--size-4-2);
	font-size: var(--font-ui-smaller);
	color: var(--text-muted);
}

.oas-frame .oas-story-path code {
	font-family: var(--font-monospace);
	color: var(--text-normal);
}

.oas-frame button.oas-copy {
	height: var(--size-4-5);
	padding: 0 var(--size-4-2);
	font-size: var(--font-ui-smaller);
}

.oas-frame .oas-variants {
	display: flex;
	flex-wrap: wrap;
	gap: var(--size-4-1);
	margin: var(--size-4-2) 0;
}

.oas-frame a.oas-variant {
	padding: var(--size-4-1) var(--size-4-2);
	border-radius: var(--radius-s);
	background: var(--background-modifier-hover);
	color: var(--text-normal);
	font-size: var(--font-ui-smaller);
	text-decoration: none;
}

.oas-frame a.oas-variant.is-active {
	background: var(--interactive-accent);
	color: var(--text-on-accent);
}

.oas-frame .oas-story-notes {
	margin: var(--size-4-2) 0;
	color: var(--text-muted);
	font-size: var(--font-ui-small);
}

.oas-frame .oas-story-children {
	display: flex;
	flex-wrap: wrap;
	gap: var(--size-4-2);
	margin: var(--size-4-2) 0;
}

.oas-frame a.oas-child {
	color: var(--text-accent);
	font-size: var(--font-ui-small);
	text-decoration: none;
}

.oas-frame .oas-child-missing {
	color: var(--text-error);
	font-size: var(--font-ui-small);
}

.oas-frame .oas-story-canvas {
	margin-top: var(--size-4-3);
	padding-top: var(--size-4-3);
	border-top: 1px solid var(--background-modifier-border);
}

.oas-frame .oas-story-missing {
	color: var(--text-error);
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: clean. (Nothing routes to these yet — that's Task 7.)

- [ ] **Step 5: Format, commit**

```bash
pnpm exec biome check --write src/viewer/sidebar.ts src/viewer/StoryPage.ts src/sandbox/sandbox.css
git add src/viewer/sidebar.ts src/viewer/StoryPage.ts src/sandbox/sandbox.css
git commit -m "feat(viewer): sidebar tree and story page UI"
```

---

### Task 6: Reference index — token collection, Tokens page, class catalog, Classes page

**Files:**
- Create: `src/viewer/tokens.ts`
- Create: `src/viewer/obsidian-classes.ts`
- Create: `src/viewer/TokensPage.ts`
- Create: `src/viewer/ClassesPage.ts`
- Modify: `src/sandbox/sandbox.css` (append reference styles)

**Interfaces:**
- Consumes: Task 3's `parseCustomProps`/`groupTokens`/`classifyValue`/`filterTokens`/`TokenDecl`; Task 5's `copyText`; `themeState` from `src/sandbox/theme.ts`.
- Produces (used by Task 7):
  - `TokensPage(): ArrowExpression`
  - `ClassesPage(): ArrowExpression`

- [ ] **Step 1: Create `src/viewer/tokens.ts`** (browser-side collection; the parsing itself is Task 3's tested pure code)

```ts
import type { TokenDecl } from "./token-utils";
import { parseCustomProps } from "./token-utils";

/** Walk every same-origin stylesheet (recursing into @media etc.) and parse
 * custom-property declarations out of each style rule's cssText. */
export function collectTokenDecls(): TokenDecl[] {
	const out: TokenDecl[] = [];
	const walk = (rules: CSSRuleList): void => {
		for (const rule of Array.from(rules)) {
			if (rule instanceof CSSStyleRule) {
				out.push(...parseCustomProps(rule.cssText));
			} else if (rule instanceof CSSGroupingRule) {
				walk(rule.cssRules);
			}
		}
	};
	for (const sheet of Array.from(document.styleSheets)) {
		try {
			walk(sheet.cssRules);
		} catch {
			// cross-origin sheet — skip
		}
	}
	return out;
}

/** Resolved value of a token in the CURRENT theme. */
export function resolveToken(name: string): string {
	return getComputedStyle(document.body).getPropertyValue(name).trim();
}
```

- [ ] **Step 2: Create `src/viewer/obsidian-classes.ts`** (curated catalog)

```ts
import { html, reactive } from "@arrow-js/core";
import type { ArrowExpression } from "@arrow-js/core";

/**
 * Curated catalog of the Obsidian pattern classes worth leveraging, each with
 * a live preview rendered against the real app.css. Curated on purpose:
 * extracting selectors from app.css yields thousands of internal one-offs.
 * When the utility-class layer lands (spec 2), its classes get documented here.
 */

export interface ClassEntry {
	className: string;
	whenToUse: string;
	preview: () => ArrowExpression;
}

export interface ClassGroup {
	label: string;
	entries: ClassEntry[];
}

const toggleState = reactive({ on: true });

export const classGroups: ClassGroup[] = [
	{
		label: "Settings",
		entries: [
			{
				className: ".setting-item",
				whenToUse: "Any labeled row with a control (with .setting-item-info / -control).",
				preview: () => html`
					<div class="setting-item">
						<div class="setting-item-info">
							<div class="setting-item-name">Setting name</div>
							<div class="setting-item-description">One-line description.</div>
						</div>
						<div class="setting-item-control"><button class="mod-cta">Action</button></div>
					</div>
				`,
			},
			{
				className: ".setting-item-heading",
				whenToUse: "Section header row inside a settings-style list.",
				preview: () => html`
					<div class="setting-item setting-item-heading">
						<div class="setting-item-info">
							<div class="setting-item-name">Section heading</div>
						</div>
					</div>
				`,
			},
		],
	},
	{
		label: "Controls",
		entries: [
			{
				className: "button.mod-cta",
				whenToUse: "Primary call-to-action button.",
				preview: () => html`<button class="mod-cta">Primary action</button>`,
			},
			{
				className: ".clickable-icon",
				whenToUse: "Icon button — escapes Obsidian's global button background rule.",
				preview: () => html`<button class="clickable-icon" aria-label="Example">☾</button>`,
			},
			{
				className: ".checkbox-container (.is-enabled)",
				whenToUse: "Obsidian's toggle; flip is-enabled to switch state.",
				preview: () => html`
					<div
						class="${() => (toggleState.on ? "checkbox-container is-enabled" : "checkbox-container")}"
						@click="${() => {
							toggleState.on = !toggleState.on;
						}}"
					>
						<input type="checkbox" tabindex="0" .checked="${() => toggleState.on}" />
					</div>
				`,
			},
		],
	},
	{
		label: "Navigation",
		entries: [
			{
				className: ".vertical-tab-nav-item (.is-active)",
				whenToUse: "Settings-style vertical tab rows (as used by this sidebar).",
				preview: () => html`
					<div class="vertical-tab-nav-item is-active">Active tab</div>
					<div class="vertical-tab-nav-item">Inactive tab</div>
				`,
			},
		],
	},
	{
		label: "Modal & prompt",
		entries: [
			{
				className: ".modal",
				whenToUse: "Dialog card (.modal-title + .modal-content). Preview is contained by a transformed wrapper.",
				preview: () => html`
					<div class="modal oas-modal-preview">
						<div class="modal-title">Modal title</div>
						<div class="modal-content">Modal content goes here.</div>
					</div>
				`,
			},
			{
				className: ".prompt-input",
				whenToUse: "Fuzzy-finder style text input inside prompts.",
				preview: () =>
					html`<input class="prompt-input" type="text" placeholder="Type to filter…" />`,
			},
		],
	},
	{
		label: "Workspace chrome",
		entries: [
			{
				className: ".view-header / .view-header-title",
				whenToUse: "Pane header bar, as used by this sandbox's Frame.",
				preview: () => html`
					<div class="view-header">
						<div class="view-header-title">View title</div>
					</div>
				`,
			},
		],
	},
];
```

- [ ] **Step 3: Create `src/viewer/TokensPage.ts`**

```ts
import { component, html, reactive } from "@arrow-js/core";
import { themeState } from "../sandbox/theme";
import { copyText } from "./StoryPage";
import type { TokenDecl } from "./token-utils";
import { classifyValue, filterTokens, groupTokens } from "./token-utils";
import { collectTokenDecls, resolveToken } from "./tokens";

const state = reactive({ query: "" });

function tokenRow(decl: TokenDecl) {
	// Depend on themeState.theme so rows re-resolve when the theme toggles.
	const resolved = (): string => {
		void themeState.theme;
		return resolveToken(decl.name) || decl.value;
	};
	return html`
		<div class="oas-token-row">
			<code class="oas-token-name">${decl.name}</code>
			<span class="oas-token-value">${() => resolved()}</span>
			${() => {
				const kind = classifyValue(resolved());
				if (kind === "color") {
					return html`<span class="oas-swatch" style="${() => `background: ${resolved()};`}"></span>`;
				}
				if (kind === "length") {
					return html`<span class="oas-sizebar" style="${() => `width: ${resolved()};`}"></span>`;
				}
				return html`<span class="oas-swatch-none"></span>`;
			}}
			<button class="oas-copy" @click="${() => copyText(`var(${decl.name})`)}">Copy</button>
		</div>
	`;
}

export const TokensPage = component(() => {
	const decls = collectTokenDecls();
	return html`
		<div class="oas-reference">
			<div class="setting-item setting-item-heading">
				<div class="setting-item-info">
					<div class="setting-item-name">Obsidian tokens (${String(decls.length)})</div>
					<div class="setting-item-description">
						Parsed live from the loaded app.css; values resolve in the current theme. Copy gives
						you the var() reference.
					</div>
				</div>
			</div>
			${decls.length === 0
				? html`<div class="setting-item">
						<div class="setting-item-info">
							<div class="setting-item-name">No tokens found</div>
							<div class="setting-item-description">
								app.css doesn't appear to be loaded — run \`pnpm pull-css\`, then reload.
							</div>
						</div>
					</div>`
				: ""}
			<input
				class="oas-token-filter"
				type="search"
				placeholder="Filter tokens…"
				.value="${() => state.query}"
				@input="${(e: Event) => {
					state.query = (e.target as HTMLInputElement).value;
				}}"
			/>
			${() =>
				groupTokens(filterTokens(decls, state.query)).map((group) =>
					html`
						<div class="oas-token-group">
							<div class="vertical-tab-header-group-title">
								${group.label} (${String(group.tokens.length)})
							</div>
							${group.tokens.map((decl) => tokenRow(decl))}
						</div>
					`.key(group.label)
				)}
		</div>
	`;
});
```

- [ ] **Step 4: Create `src/viewer/ClassesPage.ts`**

```ts
import { component, html } from "@arrow-js/core";
import { classGroups } from "./obsidian-classes";
import { copyText } from "./StoryPage";

export const ClassesPage = component(() => {
	return html`
		<div class="oas-reference">
			<div class="setting-item setting-item-heading">
				<div class="setting-item-info">
					<div class="setting-item-name">Obsidian classes</div>
					<div class="setting-item-description">
						Curated pattern classes worth leveraging, rendered live against app.css.
					</div>
				</div>
			</div>
			${classGroups.map((group) => html`
				<div class="oas-class-group">
					<div class="vertical-tab-header-group-title">${group.label}</div>
					${group.entries.map((entry) => html`
						<div class="oas-class-entry">
							<div class="oas-class-head">
								<code>${entry.className}</code>
								<button class="oas-copy" @click="${() => copyText(entry.className)}">Copy</button>
							</div>
							<div class="oas-class-when">${entry.whenToUse}</div>
							<div class="oas-class-preview">${entry.preview()}</div>
						</div>
					`)}
				</div>
			`)}
		</div>
	`;
});
```

- [ ] **Step 5: Append reference styles to `src/sandbox/sandbox.css`**

```css
/* Reference index: token rows and class previews. */
.oas-frame input.oas-token-filter {
	width: 100%;
	margin: var(--size-4-2) 0 var(--size-4-3) 0;
}

.oas-frame .oas-token-group {
	margin-bottom: var(--size-4-3);
}

.oas-frame .oas-token-row {
	display: grid;
	grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) 48px auto;
	align-items: center;
	gap: var(--size-4-2);
	padding: var(--size-4-1) 0;
	border-bottom: 1px solid var(--background-modifier-border);
	font-size: var(--font-ui-smaller);
}

.oas-frame .oas-token-name {
	font-family: var(--font-monospace);
	overflow-wrap: anywhere;
}

.oas-frame .oas-token-value {
	color: var(--text-muted);
	overflow-wrap: anywhere;
}

.oas-frame .oas-swatch {
	width: var(--size-4-4);
	height: var(--size-4-4);
	border-radius: var(--radius-s);
	border: 1px solid var(--background-modifier-border);
	justify-self: start;
}

.oas-frame .oas-sizebar {
	height: var(--size-4-2);
	max-width: 48px;
	background: var(--text-accent);
	border-radius: var(--radius-s);
	justify-self: start;
}

.oas-frame .oas-swatch-none {
	width: var(--size-4-4);
}

.oas-frame .oas-class-group {
	margin-bottom: var(--size-4-4);
}

.oas-frame .oas-class-entry {
	margin: var(--size-4-3) 0;
}

.oas-frame .oas-class-head {
	display: flex;
	align-items: center;
	gap: var(--size-4-2);
	font-family: var(--font-monospace);
	font-size: var(--font-ui-small);
}

.oas-frame .oas-class-when {
	margin: var(--size-4-1) 0;
	color: var(--text-muted);
	font-size: var(--font-ui-smaller);
}

/* transform creates a containing block, so position:fixed descendants (e.g.
   .modal) stay inside the preview box instead of covering the viewport. */
.oas-frame .oas-class-preview {
	padding: var(--size-4-3);
	border: 1px dashed var(--background-modifier-border);
	border-radius: var(--radius-m);
	transform: translate(0);
}

.oas-frame .modal.oas-modal-preview {
	position: static;
	width: auto;
	max-width: 100%;
}
```

- [ ] **Step 6: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm exec biome check --write src/viewer/tokens.ts src/viewer/obsidian-classes.ts src/viewer/TokensPage.ts src/viewer/ClassesPage.ts src/sandbox/sandbox.css
git add src/viewer/tokens.ts src/viewer/obsidian-classes.ts src/viewer/TokensPage.ts src/viewer/ClassesPage.ts src/sandbox/sandbox.css
git commit -m "feat(viewer): reference index — live token table + curated class catalog"
```

---

### Task 7: Wire the router, update Home, delete the examples registry

**Files:**
- Modify: `src/router/routeToPage.ts` (rewrite — full content below)
- Modify: `src/router/client.ts` (render function + imports)
- Modify: `src/sandbox/home.ts` (Components section replaces Examples)
- Delete: `src/examples/registry.ts`, `src/examples/ExamplesIndex.ts`

**Interfaces:**
- Consumes: Tasks 4–6 exports (`stories`, `findStory`, `StoryPage`, `ViewerSidebar`, `TokensPage`, `ClassesPage`).
- Produces: `Page` gains optional `sidebar?: ArrowExpression`; `routeToPage(url): Page | Redirect` where `interface Redirect { redirect: string }`.

- [ ] **Step 1: Rewrite `src/router/routeToPage.ts`** (replace the whole file)

```ts
import { html } from "@arrow-js/core";
import type { ArrowExpression } from "@arrow-js/core";
import { Home } from "../sandbox/home";
import { ClassesPage } from "../viewer/ClassesPage";
import { findStory, stories } from "../viewer/discovery";
import { ViewerSidebar } from "../viewer/sidebar";
import { StoryPage } from "../viewer/StoryPage";
import { TokensPage } from "../viewer/TokensPage";

/**
 * Single route resolver, shared by every entry point (Arrow scaffold shape, so
 * a future SSR lane could call it identically). Pages may carry a sidebar
 * (rendered outside the pane) and routes may resolve to a redirect, which the
 * client router applies via history.replaceState.
 */
export interface Page {
	status: number;
	title: string;
	view: ArrowExpression;
	sidebar?: ArrowExpression;
}

export interface Redirect {
	redirect: string;
}

const APP_NAME = "Arrow Sandbox";

function notFound(pathname: string): Page {
	return {
		status: 404,
		title: `Not found · ${APP_NAME}`,
		view: html`
			<div class="oas-settings">
				<div class="setting-item setting-item-heading">
					<div class="setting-item-info">
						<div class="setting-item-name">Not found</div>
						<div class="setting-item-description">
							No route for <code>${pathname}</code>. <a href="/">Back home</a>.
						</div>
					</div>
				</div>
			</div>
		`,
	};
}

export function routeToPage(url: string): Page | Redirect {
	const { pathname, searchParams } = new URL(url, window.location.origin);

	if (pathname === "/" || pathname === "") {
		return { status: 200, title: APP_NAME, view: Home() };
	}

	if (pathname === "/example") {
		return { redirect: "/components/settings-panel" };
	}

	if (pathname === "/components" || pathname === "/components/") {
		const first = stories[0];
		return first ? { redirect: `/components/${first.slug}` } : notFound(pathname);
	}

	const storyMatch = pathname.match(/^\/components\/([^/]+)$/);
	if (storyMatch) {
		const story = findStory(storyMatch[1]);
		if (!story) {
			return { ...notFound(pathname), sidebar: ViewerSidebar(pathname) };
		}
		const requested = searchParams.get("variant");
		const variantName = requested ?? Object.keys(story.variants)[0];
		return {
			status: story.variants[variantName] ? 200 : 404,
			title: `${story.title} · ${APP_NAME}`,
			view: StoryPage(story, variantName),
			sidebar: ViewerSidebar(`/components/${story.slug}`),
		};
	}

	if (pathname === "/reference") {
		return {
			status: 200,
			title: `Tokens · ${APP_NAME}`,
			view: TokensPage(),
			sidebar: ViewerSidebar(pathname),
		};
	}

	if (pathname === "/reference/classes") {
		return {
			status: 200,
			title: `Classes · ${APP_NAME}`,
			view: ClassesPage(),
			sidebar: ViewerSidebar(pathname),
		};
	}

	return notFound(pathname);
}
```

- [ ] **Step 2: Update `src/router/client.ts`**

Replace the import block at the top:

```ts
import { html } from "@arrow-js/core";
import { Frame } from "../sandbox/frame";
import { Shell } from "../sandbox/shell";
import type { Page } from "./routeToPage";
import { routeToPage } from "./routeToPage";
```

Replace the `render` const inside `startRouter` (currently four lines: `const page = …; document.title = …; root.replaceChildren(); Shell(Frame(...))(root);`) with:

```ts
	const render = (url: string): void => {
		let resolved = routeToPage(url);
		for (let hops = 0; "redirect" in resolved && hops < 3; hops++) {
			window.history.replaceState({}, "", resolved.redirect);
			resolved = routeToPage(resolved.redirect);
		}
		if ("redirect" in resolved) {
			return;
		}
		const page: Page = resolved;
		document.title = page.title;
		root.replaceChildren();
		const content = page.sidebar
			? html`${page.sidebar}${Frame(page.title, page.view)}`
			: Frame(page.title, page.view);
		Shell(content)(root);
	};
```

(Everything else in the file — Navigation API interception, History fallback — is unchanged.)

- [ ] **Step 3: Update `src/sandbox/home.ts`**

Replace these two imports:

```ts
import { ExamplesIndex } from "../examples/ExamplesIndex";
import { examples } from "../examples/registry";
```

with:

```ts
import { stories } from "../viewer/discovery";
```

Replace the final `${ExamplesIndex(examples)}` line in the template with:

```ts
		<div class="setting-item setting-item-heading">
			<div class="setting-item-info">
				<div class="setting-item-name">Components</div>
				<div class="setting-item-description">
					Stories rendered with real Obsidian styling — <a href="/reference">token & class reference</a>.
				</div>
			</div>
		</div>
		${stories.map((story) => html`
			<div class="setting-item">
				<div class="setting-item-info">
					<div class="setting-item-name">
						<a href="${`/components/${story.slug}`}">${story.title}</a>
					</div>
					${story.description
						? html`<div class="setting-item-description">${story.description}</div>`
						: ""}
				</div>
				<div class="setting-item-control">
					<a class="mod-cta oas-open-link" href="${`/components/${story.slug}`}">Open</a>
				</div>
			</div>
		`)}
```

(Also update the file's doc comment: "the examples list" → "the components list".)

- [ ] **Step 4: Delete the examples system**

```bash
git rm src/examples/registry.ts src/examples/ExamplesIndex.ts
```

- [ ] **Step 5: Typecheck + full suite**

Run: `pnpm typecheck && pnpm test 2>&1 | grep -E "# (pass|fail)"`
Expected: typecheck clean (nothing imports `src/examples/` anymore), `# fail 0`.

- [ ] **Step 6: Format, commit**

```bash
pnpm exec biome check --write src/router/routeToPage.ts src/router/client.ts src/sandbox/home.ts
git add -A
git commit -m "feat(viewer): route /components + /reference, redirects, sidebar; viewer replaces examples"
```

---

### Task 8: Browser verification, docs, template sync, version bump

**Files:**
- Modify: `README.md`, `AGENTS.md`, `skills/obsidian-arrow-sandbox/SKILL.md`, `docs/prompts/agent-setup.md`
- Modify: `create-obsidian-arrow/package.json` (version)
- Regenerate: `create-obsidian-arrow/template/**` (via `pnpm create:sync`)

**Interfaces:** none — verification + docs.

- [ ] **Step 1: Start the dev server and verify in the browser**

```bash
pnpm dev   # note the printed port
```

Verify each, watching the console for errors (any `Invalid HTML position` means an Arrow footgun in a new template — fix before proceeding):
1. `/` — Home shows the **Components** section listing "Settings Panel" and "Toggle"; readiness rows unchanged.
2. `/components` — redirects to `/components/settings-panel` (URL updates); sidebar shows Components tree with **Toggle nested under Settings Panel**, plus Reference links.
3. `/components/settings-panel` — header, copyable `src/components/SettingsPanel.ts` + `.stories.ts` paths, variant row (`default` active), child link "Toggle →", rendered panel; width slider/presets/drag and theme toggle still work on the story.
4. `/components/toggle` — `interactive` variant toggles on click; switch to `off` variant via the variant links (URL gains `?variant=off`, notes line appears); `componentPath` shows `src/components/SettingsPanel.ts` (the override).
5. `/components/toggle?variant=nope` — inline "No variant" notice, page still renders.
6. `/example` — redirects to `/components/settings-panel`.
7. `/reference` — token count roughly ~1900, groups render, filter narrows live (type `size-4`), copy puts `var(--size-4-2)` on the clipboard, color swatches visible; toggle theme → resolved values/swatches update.
8. `/reference/classes` — groups render with live previews; the checkbox preview toggles; the modal preview stays contained in its box.
9. `/does-not-exist` — 404 page.

- [ ] **Step 2: Update docs**

- `README.md`: in the sandbox feature description, replace the examples mention with the viewer: `/components` (story browser: co-located `*.stories.ts`, variants, drill-in, derived src paths) and `/reference` (live Obsidian token table + curated class catalog). Add a short "Add a story" snippet:

```md
### Add a story

Create `src/components/MyThing.stories.ts` next to the component:

```ts
import { defineStories } from "../viewer/stories";
import { MyThing } from "./MyThing";

export default defineStories({
	description: "What it demonstrates.",
	variants: { default: () => MyThing() },
});
```

It appears in the sidebar and on Home automatically; the src path shown in the
viewer is derived from the file location. Stories are sandbox-only — they never
port to the plugin.
```

- `AGENTS.md`: in the conventions section, replace the "Add a demo by … src/examples/registry.ts" bullet with: "Add a demo by creating a co-located `*.stories.ts` next to the component (see README "Add a story"); it appears at `/components/<slug>` automatically. Browse Obsidian tokens/classes at `/reference`."
- `skills/obsidian-arrow-sandbox/SKILL.md`: in "Build a component", add the same story-authoring snippet (condensed) and mention `/components` + `/reference`.
- `docs/prompts/agent-setup.md`: update the `pnpm dev` line's route description: "/ is home, /components the story viewer, /reference the Obsidian token/class index"; update the "Add a demo" convention bullet the same way as AGENTS.md.

- [ ] **Step 3: Bump the initializer and resync the template**

```bash
sed -i '' 's/"version": "0.2.2"/"version": "0.3.0"/' create-obsidian-arrow/package.json
pnpm create:sync
```

- [ ] **Step 4: Full gate**

Run: `pnpm exec biome check --write . && pnpm run ci`
Expected: biome clean, typecheck clean, all tests pass, build succeeds.

- [ ] **Step 5: Verify a fresh scaffold still works**

```bash
rm -rf /tmp/oas-viewer-check
node create-obsidian-arrow/index.mjs /tmp/oas-viewer-check
cd /tmp/oas-viewer-check && pnpm install >/dev/null 2>&1 && pnpm run ci
cd /Users/kylebrodeur/workspace/arrow-ui/obsidian-arrow-sandbox && rm -rf /tmp/oas-viewer-check
```

Expected: scaffolded project passes `pnpm run ci` out of the box.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "feat: component viewer + Obsidian reference index

Storybook-style viewer at /components: co-located *.stories.ts discovered via
import.meta.glob, variants, drill-in via children slugs, src paths derived from
glob keys. /reference: all tokens parsed live from app.css (grouped, swatches,
filter, theme-aware) + curated class catalog with live previews. Viewer
replaces the examples registry; /example redirects. create-obsidian-arrow -> 0.3.0."
git push origin main
```

---

## Self-review notes

- **Spec coverage:** story model + componentPath override (T2/T4), discovery & derivation (T1/T4), routes incl. redirect + 404-variant behavior (T7), sidebar/StoryPage UI incl. invalid-story rows and missing-child styling (T5), tokens parsed + grouped + theme-aware + filter + pull-css hint (T3/T6), curated classes with live previews (T6), examples replacement + Home update (T7), error handling (validation T2, invalid list T4/T5, cross-origin skip T6), testing (T1–T3 node tests; footgun guards already scan all new `.ts`), template/docs/bump (T8). No gaps found.
- **Type consistency:** `DiscoveredStory`/`findStory`/`stories` names match across T4→T5→T7; `copyText` exported from `StoryPage.ts`, consumed in T6; `Page`/`Redirect` shapes in T7 match client.ts usage.
- **Known judgment calls:** ~1900 reactive token rows may render slowly — acceptable for a dev tool; if browser verification shows lag, the fallback is making rows non-reactive and keying the group list on `themeState.theme` (full remount on theme change). Node's ExperimentalWarning from strip-types is cosmetic.
