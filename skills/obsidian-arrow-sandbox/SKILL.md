---
name: obsidian-arrow-sandbox
description: Use when prototyping or building Arrow.js UI for an Obsidian plugin in the obsidian-arrow-sandbox project — covers running the sandbox, pulling Obsidian's real app.css from the local install, the dev/verify workflow, CSS scoping, and porting a finished component into a plugin's ItemView with near-zero refactoring.
---

# Obsidian Arrow Sandbox

A client-only Vite + TypeScript environment for building [Arrow.js](https://arrow-js.com/)
UI that drops into an Obsidian plugin. Components render against Obsidian's real
`app.css`, so what you see in the browser is what you get in a plugin view.

## Mental model

- **Client-only, no SSR.** Components use `@arrow-js/core` (`reactive`, `html`,
  `component`, `watch`) plus `@arrow-js/framework` (`boundary` for async
  sections), mounted via `template(container)` — the exact call an Obsidian
  `ItemView.onOpen()` makes. Do **not** add `@arrow-js/ssr` or `@arrow-js/hydrate`;
  an Obsidian plugin has no server and nothing to hydrate.
- **Styling is Obsidian's, not yours.** `index.html` puts Obsidian body classes
  (`theme-dark mod-macos …`) on `<body>` and loads the extracted `app.css`, which
  defines every `var(--…)` token and semantic class (`.setting-item`,
  `.clickable-icon`, `.vertical-tab-*`).

## Run it

```sh
pnpm install
pnpm pull-css     # extract Obsidian's app.css (macOS auto-detect)
pnpm dev          # Vite + HMR; open the printed URL
```

`pnpm pull-css` reads `app.css` out of `obsidian.asar`. macOS is auto-detected;
elsewhere pass `--path <obsidian.asar|app.css>` or set `OBSIDIAN_ASAR=<path>`.
`public/app.css` is **git-ignored** (Obsidian's proprietary CSS — not
redistributed), so run `pnpm pull-css` once before `pnpm dev`.

## Install the bundled skills

```sh
pnpm skills:install --yes   # non-interactive: install ALL bundled skills (agents/CI)
pnpm skills:install         # interactive picker on a terminal
pnpm skills:update          # update an already-installed setup
```

Scope flags: `--agent <name>`, `--project-dir=<path>` (install into another repo
root — use this when the project is **nested** inside a larger repo), `--global`.
To update an existing project's tooling later, see the **obsidian-arrow-maintenance**
skill (`npx create-obsidian-arrow update`).

## Build a component

Add `src/components/MyThing.ts` exporting an Arrow `component()`, then mount it
from `src/main.ts`. Use Obsidian classes + `var(--…)` tokens first; add custom
CSS only when there's no Obsidian class, and scope it under a container class +
element type (e.g. `.oas-frame button.oas-x`) so it beats Obsidian's global
`button:not(.clickable-icon)` rule. Sandbox-only chrome lives in
`src/sandbox/sandbox.css`.

For the template-writing rules and Arrow's hard footguns, use the companion
skill **arrow-js-obsidian-templates**.

## Verify before claiming done

```sh
pnpm typecheck && pnpm test && pnpm lint   # or: pnpm check
```

Then open the `pnpm dev` URL and confirm the console is clean and the component
looks like a real Obsidian pane. Arrow's footguns only surface at render, so
typecheck passing is **not** proof a component works.

## Port into the plugin

Copy the component file into the plugin's view directory and mount it from
`ItemView.onOpen()` via `template(this.contentEl)`. If it uses `boundary()` /
async components, add `@arrow-js/framework` to the plugin and the side-effect
`import '@arrow-js/framework'`. Leave sandbox chrome (`src/sandbox/*`) behind.
