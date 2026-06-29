# Obsidian-Arrow Sandbox — Design

**Date:** 2026-06-29
**Location:** `/Users/kylebrodeur/workspace/arrow-ui/obsidian-arrow-sandbox`
**Status:** Draft for review

## Purpose

A minimal, Obsidian-styled prototyping environment for building plugin UI with
[Arrow.js](https://arrow-js.com/), so we can iterate on UI/UX fast in the
browser without building/loading into Obsidian on every change. Components are
written so they copy-paste into an Obsidian `ItemView`/`Modal`/settings tab with
near-zero refactoring, and a separate agent later reconciles them into the real
plugin (`pi-vault-mind/packages/obsidian`).

Success = `pnpm dev` opens a browser page that looks like a real Obsidian pane,
rendering **one** working, reactive, Obsidian-styled Arrow component, where the
component source is plugin-ready as-is.

## Scope

**In scope (baseline):**
- Client-only Vite + TypeScript dev environment (`pnpm dev`).
- `@arrow-js/core` only — `html` + `reactive`, mounted via `template(container)`.
  This matches the plugin's current Arrow usage exactly.
- `index.html` wrapped in Obsidian's body classes, loading the extracted
  `app.css` for full fidelity (tokens **and** semantic component classes).
- A puller script that extracts `app.css` from the local Obsidian install.
- One baseline component: a settings panel (vertical tabs + `.setting-item` +
  `.checkbox-container` toggle + token-colored status line) proving the pipeline.
- A light/dark theme toggle for eyeballing both themes.

**Out of scope (deferred, additive later):**
- `@arrow-js/framework` + SSR/hydrate lane (the "should we upgrade the plugin?"
  evaluation). The baseline is intentionally core-only; a framework lane can be
  added later without reworking the baseline.
- Porting the full chat composer (`input.ts`, `message-feed`, `model-select`,
  …). The composer is the *next* component after the baseline proves out.
- An `obsidian` API shim (`setIcon`, `Notice`, …). Not needed until we port a
  component that calls Obsidian APIs; the baseline uses none.
- CDP-based token capture (see "Token sourcing", option B).

## Architecture

Plain client-side single-page sandbox. No server, no SSR. Vite serves
`index.html`, which loads the committed `public/app.css` and a TS entry that
mounts an Arrow component into `#app`.

```
obsidian-arrow-sandbox/
├── index.html                 # Obsidian body-class wrapper + app.css link + #app
├── public/
│   └── app.css                # extracted from Obsidian (committed)
├── src/
│   ├── main.ts                # mounts the baseline component into #app
│   ├── sandbox/
│   │   ├── frame.ts           # workspace-leaf frame + theme toggle chrome
│   │   └── theme.ts           # flip body theme-dark/theme-light
│   └── components/
│       └── SettingsPanel.ts   # the baseline Arrow component
├── scripts/
│   └── pull-app-css.mjs       # extract app.css from local Obsidian install
├── docs/superpowers/specs/    # this spec
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### `index.html`

```html
<body class="theme-dark mod-macos is-frameless is-hidden-frameless obsidian-app
             show-view-header show-inline-title">
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
```

The body classes activate Obsidian's variable scope; without them `var(--…)`
lookups in `app.css` don't resolve. `app.css` is loaded via `<link>` in `<head>`.

### Component model

```ts
import { html, reactive } from '@arrow-js/core'

const state = reactive({ activeTab: 'general', developerMode: true })
export const SettingsPanel = () => html`…`     // returns an Arrow template

// main.ts
import { SettingsPanel } from './components/SettingsPanel'
SettingsPanel()(document.getElementById('app')!)   // == ItemView.onOpen mount
```

Reactive expressions use the `() => …` form per Arrow rules
(`${() => state.activeTab === 'general' ? 'is-active' : ''}`), events via
`@click`, properties via `.checked`, matching the production
`arrow-js-obsidian` skill conventions.

## Token sourcing — extract `app.css`

The sandbox loads the **full** authored `app.css` (not a slimmed token file) so
both `var(--…)` tokens and semantic component rules render faithfully.

**Option A — asar extraction (default, validated):**
On macOS `app.css` is bundled inside
`/Applications/Obsidian.app/Contents/Resources/obsidian.asar`. `pull-app-css.mjs`
parses the asar header (a Chromium Pickle: JSON length at byte 12, JSON header at
byte 16, file data section after the 4-byte-aligned header pickle), locates
`/app.css`, slices its bytes, and writes `public/app.css`. Pure Node, no deps, no
running Obsidian.

*Validated 2026-06-29:* extracted `app.css` = 586KB, ~1948 var declarations,
contains `body.theme-dark`, `.theme-light`, `--text-accent`, `--size-4-4`,
`--interactive-accent`, `--radius-m`. (Implementation note: handle 4-byte
alignment of the data offset so the slice isn't a few bytes off.)

CLI: `pnpm pull-css` (with `--path <asar>` override and an env-var fallback for
non-default install locations). Output is committed so the sandbox runs without a
local Obsidian present and the reconcile agent has the same styles.

**Option B — CDP capture (deferred, optional `--source cdp`):**
Launch/attach to a running Obsidian via Chrome DevTools Protocol
(`--remote-debugging-port`), `Runtime.evaluate` in the renderer to dump the live
stylesheet text or `getComputedStyle` variable set. Captures the user's *active*
community theme / snippets / resolved values rather than stock defaults. Useful
later for testing against a real themed environment; not part of the baseline.

## Dev workflow

- `pnpm pull-css` — refresh `public/app.css` from the local Obsidian install.
- `pnpm dev` — Vite dev server with HMR; open the printed URL.
- Edit `src/components/*.ts`; HMR re-renders instantly.
- `pnpm typecheck` — `tsc --noEmit`.

## Porting / reconcile story

Components are framework-free `@arrow-js/core` + Obsidian CSS classes, so moving
one into the plugin is: copy the file into `src/chat/arrow/` (or appropriate
view dir) and mount it from `ItemView.onOpen()` via `template(this.contentEl)`.
Strip any U-of-D references per project notes. No build-system translation needed
(plugin bundles `@arrow-js/core` via esbuild; sandbox imports the same package).

## Risks / open notes

- `app.css` is ~586KB; fine for a local sandbox loaded once. Not slimming it
  keeps full component-class fidelity.
- asar data-offset alignment must be correct (off-by-a-few-bytes corrupts the
  slice). Validated approach; nail alignment in implementation.
- Exact set of Obsidian body classes may need tweaking to match a real pane;
  start from a known-good set and adjust visually.
- Community-theme fidelity is not captured by asar extraction — that's what the
  optional CDP mode is for, later.
```
