---
name: obsidian-arrow-stories
description: Use when creating, updating, testing, or viewing components and stories in obsidian-arrow-sandbox. Covers the full authoring workflow — building Arrow components with Obsidian classes and oas-* utilities, co-locating *.stories.ts files, the complete defineStories API (variants, children, status, notes), viewing the story viewer at /components, keeping code DRY through sub-component extraction, and knowing when to reach for utilities vs. Obsidian's own classes.
---

# Component & Story Authoring

The sandbox has a built-in Storybook-style viewer. Every component gets a
co-located `*.stories.ts` file — no registration, no imports to update — and
it appears at `/components/<slug>` automatically via `import.meta.glob`.

## Workflow in order

```
1. Check /reference/classes → does Obsidian already have a class for your pattern?
2. Write src/components/MyThing.ts (Arrow component)
3. Write src/components/MyThing.stories.ts (story file)
4. pnpm dev → /components → click the story, verify in browser
5. Add variants for meaningful state differences
6. Extract sub-components; link them via children
7. Set status: "live" when ready to port
8. pnpm run ci → clean
```

## 1. Before you write CSS — check the class reference

Open `/reference/classes` in the running sandbox. Obsidian has semantic classes
for most common patterns: settings rows (`.setting-item`), modals (`.modal`),
toggles (`.checkbox-container`), navigation (`.vertical-tab-nav-item`),
callouts, tags, suggestion lists, file tree rows, and more.

**Use Obsidian's class first. Add `oas-*` utilities second. Write custom CSS last.**

If a gap remains after Obsidian's classes and the `oas-*` utilities, add a
single scoped rule to `src/sandbox/sandbox.css` (sandbox chrome) or a
co-located component CSS file, namespaced: `.my-panel button.my-action { … }`.

## 2. Writing the component

`src/components/MyThing.ts` — a plain Arrow export, no sandbox-specific wiring:

```ts
import { component, html, reactive } from "@arrow-js/core";
import type { ArrowTemplate } from "@arrow-js/core";

// Module-level state persists across navigations (fine for simple toggles).
// For state that must reset per-mount, put it inside the component() factory.
const state = reactive({ on: false });

export const MyThing = component((): ArrowTemplate => {
    return html`
        <div class="setting-item">
            <div class="setting-item-info">
                <div class="setting-item-name">My setting</div>
                <div class="setting-item-description">
                    ${() => (state.on ? "Enabled" : "Disabled")}
                </div>
            </div>
            <div class="setting-item-control">
                <div
                    class="${() => (state.on ? "checkbox-container is-enabled" : "checkbox-container")}"
                    @click="${() => { state.on = !state.on; }}"
                >
                    <input type="checkbox" .checked="${() => state.on}" />
                </div>
            </div>
        </div>
    `;
});
```

**Layout and spacing:** reach for `oas-*` utilities before writing inline styles
or custom CSS. Utilities live in `src/utilities.css` and cover flex layout, gaps,
padding, margin, typography, overflow, and borders — all on Obsidian's token scale.

```ts
// Instead of: style="display: flex; align-items: center; gap: 8px;"
html`<div class="oas-flex oas-items-center oas-gap-2">…</div>`
```

**Arrow footguns (always apply):**
- No HTML comments inside `html\`\`` templates (use `//` outside)
- Attribute expressions must be the entire value: `class="${expr}"` not `class="static ${expr}"`
- `${data.x}` is static (renders once); `${() => data.x}` is reactive
- Event handlers type as `(e: Event)`, not narrowed subtypes

## 3. The stories file

Co-locate `src/components/MyThing.stories.ts`:

```ts
import { defineStories } from "../viewer/stories";
import { MyThing } from "./MyThing";

export default defineStories({
    description: "One-line description shown in the viewer and on the Components index.",
    status: "draft",       // "live" when ready to port; "draft" while iterating
    variants: {
        default: () => MyThing(),
    },
});
```

### Full `defineStories` interface

```ts
defineStories({
    /** Display title — defaults to start-cased filename if omitted. */
    title?: string;

    /** One-liner shown in the sidebar, Components index, and story header. */
    description?: string;

    /** "live" = production-ready (ready to port). "draft" = still iterating.
     *  Defaults to "draft". Shown as a badge in the story header and index. */
    status?: "live" | "draft";

    /** Named variants — each renders independently. Keys are human strings.
     *  Bare function shorthand:  variantName: () => MyThing(props)
     *  With notes:              variantName: { render: () => MyThing(props), notes: "…" } */
    variants: Record<string, (() => ArrowExpression) | { render: () => ArrowExpression; notes?: string }>;

    /** Slugs of sub-component stories to drill into. Creates linked navigation
     *  in the viewer and the Components index. */
    children?: string[];

    /** Repo-relative path override — use when the component is defined inside
     *  another file (e.g. a sub-component exported from its parent's file).
     *  Defaults to the stories file path with `.stories` removed. */
    componentPath?: string;
})
```

### Variants — when to add them

Add a variant for each **meaningfully different state** a consumer needs to see:

```ts
variants: {
    "default":   () => Toggle(() => false, () => {}),
    "enabled":   () => Toggle(() => true, () => {}),
    "interactive": () => {
        const s = reactive({ on: false });
        return Toggle(() => s.on, () => { s.on = !s.on; });
    },
},
```

Don't add variants for every prop permutation — only the ones that look
different or expose a real edge case. Notes explain nuance:

```ts
"read-only": {
    render: () => Toggle(() => true, () => {}),
    notes: "Click does nothing — demonstrates static on state for display-only use.",
},
```

### Children — linking sub-components

If `MyThing` internally renders `ToggleRow` and `StatusBadge`, register those
as separate stories and link them:

```ts
// MyThing.stories.ts
export default defineStories({
    variants: { default: () => MyThing() },
    children: ["toggle-row", "status-badge"],  // slugs of the sub-component stories
});

// ToggleRow.stories.ts
export default defineStories({
    componentPath: "src/components/MyThing.ts",  // lives in the same file
    variants: { default: () => ToggleRow(…) },
});
```

The viewer shows child links below the variant tabs; the Components index shows
"Sub-components:" inline.

## 4. Viewing and testing

```sh
pnpm dev
# open http://localhost:5173/components      → Components index (all stories)
# open http://localhost:5173/components/my-thing  → story for MyThing
# open http://localhost:5173/reference       → live Obsidian token reference
# open http://localhost:5173/reference/classes → curated Obsidian class catalog
```

The sidebar lists all stories alphabetically. Click a story → use the variant
tabs to switch states. The file path shown in the viewer is derived from the
stories file location — no hand-maintenance.

**Verify before marking done:**

```sh
pnpm typecheck    # Arrow footguns + type errors
pnpm test         # 32 baseline tests; add your own if the component has logic
pnpm lint         # Biome
```

Then **look at the browser** — typecheck passing is not proof a component works.
Arrow's footguns only surface at render time. Check the console is clean.

## 5. Keeping code DRY

### Extract sub-components early
Any template fragment that's used more than once or has its own state should be
its own exported function (not `component()` unless it needs per-instance
reactive state). Give it a story via `children`.

```ts
// ❌ repeated inline block
html`<div class="oas-flex oas-items-center oas-gap-2">
    <span class="oas-text-muted">${label}</span>
    <span class="badge">${count}</span>
</div>`

// ✓ extracted
export function CountRow(label: string, count: number): ArrowExpression {
    return html`<div class="oas-flex oas-items-center oas-gap-2">
        <span class="oas-text-muted">${label}</span>
        <span class="badge">${count}</span>
    </div>`;
}
```

### Use utilities, not inline styles
`src/utilities.css` covers the common layout needs on Obsidian's token scale.
Prefer class composition over `style="…"` attributes in templates.

```ts
// ❌
html`<div style="display:flex;align-items:center;gap:var(--size-4-2);">`

// ✓
html`<div class="oas-flex oas-items-center oas-gap-2">`
```

### Module-level vs. per-instance state
- **Module-level `reactive()`** — persists across navigations; fine for settings
  panels and simple toggles where reset-on-navigate would be surprising.
- **Inside `component()` factory** — fresh per mount; required when two instances
  of the same component must be independent.

The `TokensPage` search query is intentionally module-level so the filter
survives route changes. A modal open/closed state should be per-instance.

## 6. Setting status

| Value | When | Effect |
|-------|------|--------|
| `"draft"` | Default — still iterating | Gray "draft" badge in viewer + index |
| `"live"` | Ready to port, behavior stable | Green "live" badge; plan screenshot |

Mark `"live"` when: the component passes `pnpm run ci`, looks correct in the
browser in both themes, and you're satisfied with the variant coverage.

## Quick reference

```ts
import { defineStories } from "../viewer/stories";
import { MyThing, MySubThing } from "./MyThing";

export default defineStories({
    description: "Settings row with expandable detail.",
    status: "live",
    variants: {
        collapsed: () => MyThing({ expanded: false }),
        expanded:  () => MyThing({ expanded: true }),
        interactive: () => {
            const s = reactive({ expanded: false });
            return MyThing({ expanded: () => s.expanded, onToggle: () => { s.expanded = !s.expanded; } });
        },
    },
    children: ["my-sub-thing"],
});
```
