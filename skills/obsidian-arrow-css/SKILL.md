---
name: obsidian-arrow-css
description: Use when styling Arrow.js components for an Obsidian plugin — deciding between Obsidian's semantic classes, oas-* utility classes, and custom CSS; reading the live token and class references; writing scoped rules that win the specificity battle without leaking; using CSS custom properties for overrides; and auditing components to minimize hand-written CSS.
---

# Obsidian Arrow CSS

Practical guide to styling components so they look native in Obsidian with the
minimum amount of custom CSS. The goal: every rule you write is load-bearing —
nothing exists that could have been replaced by an Obsidian class or a utility.

## The decision hierarchy

**Always go in this order:**

```
1. Obsidian semantic class  →  /reference/classes in the running sandbox
2. oas-* utility class      →  src/utilities.css (ships with every scaffold)
3. Custom CSS               →  last resort, must be scoped
```

If you find yourself writing `display: flex` in a `style=""` attribute or a CSS
rule, stop — use `oas-flex`. If you're writing `.my-thing { padding: 8px }`,
stop — use `oas-p-2`. If Obsidian already has a class for the pattern, use it and
skip both.

## 1. Obsidian semantic classes — `/reference/classes`

Open `/reference/classes` in the running sandbox for a live, theme-aware catalog.
Key classes that cover most plugin UI:

| Pattern | Class(es) |
|---------|-----------|
| Settings row (label + control) | `.setting-item` + `.setting-item-info` + `.setting-item-control` |
| Section heading | `.setting-item.setting-item-heading` |
| Primary button | `button.mod-cta` |
| Danger button | `button.mod-destructive` |
| Warning button | `button.mod-warning` |
| Icon button | `button.clickable-icon` |
| Toggle | `.checkbox-container` (+ `.is-enabled`) |
| Vertical tab nav | `.vertical-tab-nav-item` (+ `.is-active`) |
| Modal card | `.modal` → `.modal-title` + `.modal-content` |
| Fuzzy-finder row | `.suggestion-item` (+ `.is-selected`) |
| Callout block | `.callout[data-callout="info|warning|tip|…"]` |
| Inline tag | `.tag` |
| Counter badge | `.badge` |
| File tree row | `.nav-file-title` (+ `.is-active`) |
| Folder row | `.nav-folder-title` |
| Frontmatter property | `.metadata-container` → `.metadata-property` |
| Pane header | `.view-header` → `.view-header-title` |

This is a **sample** — browse `/reference/classes` for the full catalog with live
previews and `whenToUse` notes.

## 2. oas-* utility classes — `src/utilities.css`

When layout/spacing is needed that Obsidian has no semantic class for, use these.
All values pull from Obsidian's CSS custom property scale:

**Layout**
```
oas-flex  oas-inline-flex  oas-flex-col  oas-flex-wrap
oas-items-start  oas-items-center  oas-items-end  oas-items-baseline
oas-justify-start  oas-justify-center  oas-justify-end  oas-justify-between
oas-grow  oas-shrink-0
```

**Spacing** (Obsidian's 4-px step scale: 1=4px, 2=8px, 3=12px, 4=16px)
```
oas-gap-{1–4}
oas-p-{1–4}   oas-px-{2–3}   oas-py-{1–3}
oas-mt-{1–3}  oas-mb-{1–3}   oas-ml-auto
```

**Sizing**
```
oas-w-full  oas-min-w-0  oas-min-h-0
```

**Typography**
```
oas-text-xs  oas-text-sm  oas-text-md
oas-font-medium  oas-font-semibold  oas-font-mono  oas-leading-1
oas-text-normal  oas-text-muted  oas-text-faint
oas-text-accent  oas-text-success  oas-text-error
```

**Overflow**
```
oas-truncate  oas-overflow-hidden  oas-overflow-auto
```

**Border**
```
oas-border  oas-border-b  oas-border-t  oas-rounded-s  oas-rounded-m
```

**Interaction**
```
oas-cursor-pointer  oas-select-none
```

Common compositions:

```ts
// Flex row with gap, centered, truncated label
html`<div class="oas-flex oas-items-center oas-gap-2 oas-min-w-0">
    <span class="oas-truncate oas-text-muted">${label}</span>
    <span class="badge oas-shrink-0">${count}</span>
</div>`

// Full-width column with spacing
html`<div class="oas-flex oas-flex-col oas-gap-3 oas-p-3">
    ${rows}
</div>`
```

## 3. Tokens — `/reference` (the live token table)

Open `/reference` to see every `var(--)` property parsed live from `app.css`,
grouped by category (Size & spacing, Radius, Colors, Typography, …) with color
swatches, size bars, resolved values, and a filter. Use the filter to find the
right token before reaching for a hardcoded value.

**Common tokens by category:**

| Category | Key tokens |
|----------|-----------|
| Spacing | `--size-4-1` (4px) → `--size-4-8` (32px) |
| Radius | `--radius-s`, `--radius-m`, `--radius-xl` |
| Background | `--background-primary`, `--background-secondary`, `--background-modifier-border`, `--background-modifier-hover` |
| Text | `--text-normal`, `--text-muted`, `--text-faint`, `--text-accent`, `--text-error`, `--text-success` |
| Interactive | `--interactive-accent`, `--interactive-normal`, `--interactive-hover` |
| Font size | `--font-ui-smaller`, `--font-ui-small`, `--font-ui-medium` |
| Font weight | `--font-medium`, `--font-semibold`, `--font-bold` |
| Font family | `--font-interface`, `--font-monospace` |

Always use tokens in custom CSS — never hardcode colors, sizes, or font values.
Token values are resolved at runtime against the active theme:

```css
/* ❌ hardcoded — wrong theme, wrong density */
.my-thing { color: #888; padding: 8px; font-size: 12px; }

/* ✓ token-resolved — correct for the active theme */
.my-frame .my-thing { color: var(--text-muted); padding: var(--size-4-2); font-size: var(--font-ui-small); }
```

## 4. Writing scoped custom CSS (when you must)

Obsidian's global rules have specificity **(0,1,1)** — e.g.
`button:not(.clickable-icon)` beats a plain `.my-btn` **(0,1,0)**.

**Always scope under container class + element type:**

```css
/* (0,1,0) — LOSES to Obsidian's button rule */
.my-action { background: var(--interactive-accent); }

/* (0,2,1) — WINS, and can't leak */
.my-panel button.my-action { background: var(--interactive-accent); }
```

Rules:
- Sandbox-only chrome (toolbar, frame, sidebar) → `src/sandbox/sandbox.css`
- Component-specific overrides → a co-located `MyThing.css` imported in `main.ts`,
  or scoped rules in `sandbox.css`
- Never add rules that target unscoped element types — they will leak

## 5. Overrides and variables

If a group of components shares a visual parameter that might change (e.g. a panel
width, an accent color variant, a custom border radius), define it as a CSS custom
property on a container, not as a magic number scattered across rules:

```css
/* Define on the container */
.my-panel {
    --my-panel-width: 280px;
    --my-panel-accent: var(--interactive-accent);
}

/* Use in descendants */
.my-panel .my-panel-header {
    width: var(--my-panel-width);
    border-left: 3px solid var(--my-panel-accent);
}
```

To override for a variant, add a modifier class and redefine the variable — no
duplicate rules:

```css
.my-panel.is-wide { --my-panel-width: 480px; }
```

## 6. Auditing for excess custom CSS

Before calling a component done, ask for each custom rule:

1. **Could an Obsidian semantic class replace this?** Check `/reference/classes`.
2. **Could an `oas-*` utility replace this?** Check the list in §2.
3. **Is this value a hardcoded number or color?** Replace with an Obsidian token.
4. **Does this rule use a bare element selector?** Add a container prefix.
5. **Is this rule duplicated?** Extract a shared variable or a common utility.

If all five pass, the rule belongs.

## Keeping `utilities.css` in sync across ports

When you update `src/utilities.css` in the sandbox (add a utility, rename a
class), any plugin that has already ported it needs the new version. Track this
the same way as component drift: use the `arrow-js-obsidian-porting` skill's
parity-check approach, or include `utilities.css` in the project's
`port-parity.json` manifest so CI catches divergence.
