# Component Viewer + Obsidian Reference Index — Design

**Date:** 2026-06-30
**Status:** Draft for review
**Prior spec:** [2026-06-29-obsidian-arrow-sandbox-design.md](2026-06-29-obsidian-arrow-sandbox-design.md)

## Purpose

A Storybook-style viewer inside the sandbox: browse your Arrow components one at
a time, switch between named variants, drill into subcomponents, and see exactly
where each lives in `src/`. Alongside it, a reference index of the Obsidian
building blocks the sandbox should be leveraging — every `var(--…)` token parsed
live from `app.css`, plus a curated catalog of the pattern classes with live
previews.

Success = `/components` lets you develop and review any component in isolation at
any panel width/theme, `/reference` answers "what token/class should I use?", and
adding a component to the viewer is one small co-located file.

## Decomposition

This is spec 1 of 2:

1. **This spec:** component viewer + Obsidian reference index.
2. **Spec 2 (later):** a lightweight utility-class layer (Tailwind-v4 /
   Bootstrap-v5 spirit) generated from Obsidian tokens, with PostCSS + HMR, to
   standardize away inline styles and unit-based spacing. References gathered:
   [Pico CSS](https://github.com/picocss/pico) (minimal footprint),
   [Backlight: design tokens as CSS custom properties](https://backlight.dev/docs/design-tokens-using-css-custom-properties)
   (validates driving everything from custom properties). The viewer's Classes
   tab is the natural place to document those utilities when they exist.

## Decision record

- **Story format: single-object `defineStories`, not CSF.** We reviewed
  Storybook's [Component Story Format 3](https://storybook.js.org/docs/api/csf)
  and [Ladle](https://github.com/tajo/ladle) as references. CSF's portability is
  worth nothing here — no Storybook/Ladle renderer exists for Arrow.js, so CSF
  files could never run elsewhere. A single default-exported object is simpler to
  validate, types cleanly through one `defineStories` helper, and is harder for
  (mostly agent) authors to get wrong than "every named export is a story"
  conventions. We keep CSF's good ideas: optional `title` auto-derived from the
  filename, spreadable variant maps via plain JS, co-located `.stories.ts` files.
- **Discovery: `import.meta.glob`, eager.** Story files are found by glob; the
  glob key *is* the file path, so src locations shown in the viewer are derived,
  never hand-maintained.
- **The viewer replaces the examples registry.** `src/examples/registry.ts` and
  `ExamplesIndex` are deleted; the Settings panel demo becomes the first story;
  Home's "Examples" section becomes "Components" driven by discovered stories;
  `/example` redirects to the Settings panel story route.
- **Index sourcing: parsed tokens + curated classes.** All custom properties are
  parsed live from the loaded `app.css` (complete, theme-accurate, survives
  Obsidian updates). Classes are a curated catalog — extracting selectors from
  app.css yields thousands of internal one-offs with no guidance.
- **Stories are sandbox-only by construction.** Separate files → they never port
  to the plugin and never affect the porting-parity hash of component files.

## Story model

`src/viewer/stories.ts`:

```ts
export interface StoryVariant {
	render: () => ArrowExpression;
	notes?: string;
}

export interface StoryDef {
	/** Display name; defaults to start-cased filename (settings-panel → Settings Panel). */
	title?: string;
	/** One-line description shown in the tree and header. */
	description?: string;
	/** Named variants; keys are human strings ("default", "dev mode off"). */
	variants: Record<string, StoryVariant | (() => ArrowExpression)>;
	/** Slugs of subcomponent stories for drill-in nesting. */
	children?: string[];
}

export function defineStories(def: StoryDef): StoryDef;
```

Example:

```ts
// src/components/SettingsPanel.stories.ts
import { SettingsPanel } from "./SettingsPanel";

export default defineStories({
	description: "Vertical tabs, toggles, keyed list, async boundary().",
	variants: {
		default: () => SettingsPanel(),
	},
	children: ["toggle"],
});
```

- A variant may be a bare render function (shorthand) or `{ render, notes }`.
- Subcomponents that deserve drill-in are exported from their component file and
  given their own small `.stories.ts` (e.g. `Toggle` gets exported from
  `SettingsPanel.ts` + a `Toggle.stories.ts`). Exporting is a benign, portable
  change to the component file.

## Discovery & derivation

`src/viewer/discovery.ts`:

- `import.meta.glob("../components/**/*.stories.ts", { eager: true })`.
- Per module: **slug** = kebab-cased filename minus `.stories.ts`
  (`SettingsPanel.stories.ts` → `settings-panel`); **title** = `def.title` or
  start-cased slug; **storiesPath** = glob key normalized to repo-relative
  (`src/components/SettingsPanel.stories.ts`); **componentPath** = storiesPath
  minus `.stories`.
- Output: a flat `Story[]` plus a tree (stories referenced by another story's
  `children` nest under it; unreferenced stories are roots).
- Pure derivation helpers (slug/title/path mapping, tree building) live in a
  DOM-free module so `node:test` can cover them.

## Routes

| Route | Renders |
| --- | --- |
| `/components` | viewer with the first root story selected |
| `/components/<slug>` | that story, first variant |
| `/components/<slug>?variant=<name>` | that story, that variant |
| `/reference` | reference index, Tokens tab |
| `/reference/classes` | reference index, Classes tab |
| `/example` | redirect → `/components/settings-panel` |

`routeToPage` gains these; 404 behavior unchanged. Unknown slug/variant → the
viewer with an inline "no such story/variant" notice (status 404).

## Viewer UI

Extends the existing Shell. A new Obsidian-styled **sidebar** (own scoped
`oas-*` chrome, `.vertical-tab-nav-item`-style rows, children indented under
parents) sits left of the stage. The **existing pane remains the preview
surface** — width slider/presets/drag-resize and the theme toggle all apply to
the rendered variant for free.

Above the preview inside the pane: story title, variant selector (row of small
buttons), and a details block: component path + stories path (monospace, copy
buttons), variant notes, and child-component links (drill-in). Selecting a
variant updates the URL (`?variant=`) through the existing router.

The sidebar also carries a "Reference" section linking `/reference` and
`/reference/classes`, and Home gets a "Components" list (replacing "Examples")
driven by discovered stories.

## Reference index

**Tokens tab** (`src/viewer/tokens.ts`):

- Walk `document.styleSheets` → same-origin rules → collect every custom
  property declaration (`--name: value`) with its selector scope.
- Group by prefix (`--size-*`, `--color-*`, `--background-*`, `--text-*`,
  `--font-*`, `--radius-*`, `--shadow-*`, rest under "other").
- Row: token name (monospace, copy button), raw declared value, resolved value
  via `getComputedStyle(document.body)` in the current theme; a color swatch when
  the resolved value parses as a color, a size bar when it's a px/em length.
- Filter input (substring match on name). Re-resolves when the theme toggles
  (reactive tick bumped by the toggle).
- Parser core takes rule text (string in, structured out) so it's `node:test`able.

**Classes tab** (`src/viewer/obsidian-classes.ts`):

- Curated entries: `{ className, whenToUse, preview: () => ArrowExpression }`,
  grouped: settings family (`.setting-item…`), controls (`.mod-cta`,
  `.clickable-icon`, `.checkbox-container`), navigation (`.vertical-tab-*`),
  modal/prompt (`.modal`, `.prompt`), workspace chrome (`.workspace-leaf`,
  `.view-header`).
- Each entry renders its live preview inside the pane styling, with the class
  name copyable.

If `app.css` isn't loaded (tokens come back empty), both tabs show the same
"run `pnpm pull-css`" readiness hint as Home.

## Error handling

- A `.stories.ts` whose default export fails shape validation (no `variants`,
  wrong types) is skipped with a `console.warn` and listed in the sidebar as
  disabled "invalid story: <file>" — one bad file never blanks the viewer.
- `children` slugs that match no story render as plain text with a warning
  styling, not broken links.
- Token parsing try/catches per stylesheet; cross-origin sheets are skipped.

## Testing

- `node:test` (DOM-free): slug/title derivation, glob-key → component-path
  mapping, tree building (children nesting, unknown-child handling, cycles
  guarded), token-parser grouping/classification on synthetic CSS text, and
  story-shape validation accept/reject cases.
- Existing footgun guards automatically cover all new `.ts` template files.
- Browser verification: tree navigation, variant switching + URL sync, drill-in,
  copy buttons, token filter, theme re-resolution, clean console.

## Template & docs impact

- Ships in the scaffold template via `create:sync`; `create-obsidian-arrow`
  version bumps.
- Docs: README + AGENTS.md gain "component viewer" and "add a story" sections;
  the `obsidian-arrow-sandbox` skill gains the story-authoring shape; the
  agent-setup prompt mentions `/components` and `/reference`.
- `src/examples/` is removed; Home links to `/components`.

## Out of scope (this spec)

- Args/controls system (prop knobs, args tables) — components don't take props
  yet; layer on later if needed, CSF's args model is the reference.
- Storybook `play`-style interaction tests, decorators, addons.
- The utility-class layer and inline-style cleanup (spec 2).
- Open-in-editor links from src paths (copy button only for now).
