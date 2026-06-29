# Obsidian Arrow Sandbox

A client-only prototyping environment for building [Arrow.js](https://arrow-js.com/)
UI that drops into an Obsidian plugin with near-zero refactoring. Components are
written with `@arrow-js/core` (+ `@arrow-js/framework` for async boundaries) and
styled entirely by Obsidian's real `app.css`, so what you see here is what you
get inside a plugin view.

See the design + decision record in
[`docs/superpowers/specs`](docs/superpowers/specs/2026-06-29-obsidian-arrow-sandbox-design.md).

## Quick start

```sh
pnpm install
pnpm pull-css     # extract Obsidian's app.css from the local install (committed)
pnpm dev          # Vite dev server with HMR
```

`pull-css` reads `app.css` out of `Obsidian.app/.../obsidian.asar` (macOS) and
writes `public/app.css`. Override the location with `--path <obsidian.asar|app.css>`
or `OBSIDIAN_ASAR=<path>`. The output is committed, so `pnpm dev` works without a
local Obsidian present.

> **Platform note:** automatic Obsidian discovery is currently **macOS-only** —
> `pull-css` knows where `Obsidian.app` lives on macOS. Windows and WSL paths are
> not auto-detected yet (planned). On those platforms, point the script at the
> file explicitly via `--path <obsidian.asar|app.css>` or `OBSIDIAN_ASAR=<path>`,
> or just rely on the committed `public/app.css`.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Vite dev server (client-only, HMR) |
| `pnpm build` / `pnpm preview` | Production build / preview |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Node built-in test runner (`test/*.test.mjs`) |
| `pnpm lint` / `pnpm format` | Biome check / check-and-write |
| `pnpm check` | format + typecheck + test (local pre-flight) |
| `pnpm ci` | Biome CI + typecheck + test + build (what CI runs) |
| `pnpm pull-css` | refresh `public/app.css` from the local Obsidian install |

A husky `pre-commit` hook runs `lint-staged` (Biome on staged files) + a full
typecheck. CI (`.github/workflows/ci.yml`) runs the `ci` script on push/PR.

## Bundled agent skills

This repo ships [`skills`](https://github.com/vercel-labs/skills)-compatible skills
under [`skills/`](skills/) — it doubles as a local skill marketplace:

- `obsidian-arrow-sandbox` — running and using this sandbox, and porting to a plugin.
- `arrow-js-obsidian-templates` — Arrow v1.0.6 template rules + footguns.

Install them into your agent via the interactive TUI:

```sh
pnpm skills:install      # = npx skills add .  (pick skills in the TUI)
```

`postinstall` offers this automatically after `pnpm install`, but only in an
interactive terminal — it skips in CI / non-TTY (set `SKIP_SKILLS_INSTALL=1` to
opt out entirely). You can also add this repo from anywhere with
`npx skills add <git-url-or-path>`.

## Porting a component into the plugin

Components use only Obsidian classes + `var(--…)` tokens and mount via
`template(container)` — the same call an `ItemView.onOpen()` makes. To port:
copy the component file into the plugin's view directory and mount it from
`onOpen()`. If it uses `boundary()`/async components, add `@arrow-js/framework`
to the plugin and the `import '@arrow-js/framework'` side-effect import.

## Arrow v1.0.6 footguns (learned the hard way)

These are enforced/encoded so they don't regress:

1. **No literal HTML comments inside `html\`\`` templates.** Arrow uses HTML
   comments as expression-slot markers; a literal `<!-- … -->` inflates the slot
   count and throws `Invalid HTML position`. Use JS `//` comments outside the
   template. Guarded by `test/template-footguns.test.mjs`.
2. **An attribute expression must be the *entire* value.** `class="${() => '…'}"`
   works; `class="static ${() => '…'}"` (partial) does not register as a
   placeholder and throws. Build the full string inside one expression.
3. **Reactive vs static:** `${data.x}` renders once; `${() => data.x}` is tracked
   and updates only that slot. Returning `false` from an attribute expression
   removes the attribute.
