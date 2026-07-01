---
name: arrow-js-obsidian-patterns
description: Use when building reactive Obsidian plugin UI with @arrow-js/core beyond basic templates — icons (Obsidian uses Lucide; the data-icon sweep since setIcon can't run inside templates), CSS scoping/specificity against Obsidian's global rules, component mount/unmount lifecycle in an ItemView, and organizing shared reactive state. Complements arrow-js-obsidian-templates (syntax) with integration patterns. For the full CSS decision hierarchy (Obsidian classes → oas-* utilities → custom CSS) and token/class reference, see obsidian-arrow-css.
---

# Arrow.js + Obsidian integration patterns

How to build real components (not just template syntax) for an Obsidian plugin
view with `@arrow-js/core`. Pairs with **arrow-js-obsidian-templates** (the
template rules + footguns).

## Mount / unmount lifecycle

A view mounts a component imperatively, the same call the sandbox makes:

```ts
import { html } from "@arrow-js/core"
// in ItemView.onOpen():
this.contentEl.empty()
html`${MyComponent()}`(this.contentEl)
```

- `html\`\`(container)` does **not** reliably return an unmount function — don't
  gate cleanup on its return value. Always `container.empty()` before remounting.
- Re-rendering on route/state change: clear the container, then mount fresh.
  Reactive bindings (`${() => …}`) update in place — don't remount the whole tree
  on every state change; let Arrow patch the slots that read changed state.

## Shared reactive state

One `reactive()` object is the single source of truth; components read it via
getters so they stay in sync without prop-drilling.

```ts
import { reactive } from "@arrow-js/core"
export const state = reactive({ model: "", streaming: false, items: [] })
// pass getters into components: Toggle(() => state.streaming, () => { ... })
```

## Icons (Obsidian uses Lucide)

`setIcon(el, name)` needs a real DOM element, so it **cannot** be called inside
an Arrow template expression (the element doesn't exist yet). Two options:

1. **In-plugin — the data-icon sweep.** Emit a placeholder, then sweep after
   mount:

   ```ts
   html`<span class="svg-icon" data-icon="copy"></span>`
   // after template(container) — scope the query to the container, not document:
   for (const el of Array.from(container.querySelectorAll<HTMLElement>("[data-icon]"))) {
     const name = el.getAttribute("data-icon")
     if (name) setIcon(el, name)  // setIcon from "obsidian"
   }
   ```
   For sections that open after mount (dropdowns/popovers), run the sweep in a
   `nextTick(...)` after they render, scoped to that section's element.

2. **In the sandbox (no `obsidian` module).** Use a Lucide import or inline SVG,
   or plain text/emoji for chrome. The baseline uses text glyphs to stay
   shim-free; add a Lucide-backed `setIcon` shim (aliased as `obsidian`) when you
   port icon-using components in.

## CSS scoping & specificity (the big one)

Obsidian's `app.css` applies global rules like
`button:not(.clickable-icon) { background: var(--interactive-normal) }` at
specificity **(0,1,1)**. A plain `.my-btn` selector is **(0,1,0)** and loses
regardless of cascade order.

```css
/* (0,1,0) — LOSES to Obsidian's global button rule */
.my-action { background: var(--interactive-accent); }

/* (0,2,1) — WINS, and can't leak */
.my-panel button.my-action { background: var(--interactive-accent); }
```

Rules: prefer Obsidian's own classes (`.setting-item`, `.clickable-icon`,
`.workspace-leaf`, `.vertical-tab-*`, `.modal`) and `var(--…)` tokens first; only
add custom CSS where there's no Obsidian class; always scope custom rules under a
container class + element type.

## Common Obsidian layout classes

- `.workspace-leaf` > `.workspace-leaf-content` — a view pane.
- `.view-header` / `.view-content` — pane header + body.
- `.setting-item` (+ `.setting-item-info` / `.setting-item-name` /
  `.setting-item-description` / `.setting-item-control`) — settings rows.
- `.checkbox-container` (+ `.is-enabled`) — toggle.
- `.clickable-icon` — icon button (escapes the global button background rule).
- `.vertical-tab-header` / `.vertical-tab-nav-item` (+ `.is-active`) — tab nav.
- `.modal-container` > `.modal` — modal/popover.
- `.mod-cta` — primary call-to-action button.
