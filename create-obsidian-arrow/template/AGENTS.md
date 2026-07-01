# AGENTS.md

Operating guide for AI agents working in **obsidian-arrow-sandbox** — a
client-only environment for prototyping [Arrow.js](https://arrow-js.com/) UI that
ports into an Obsidian plugin with near-zero refactoring.

## Docs map (start here)

This file is the hub — everything else is linked from here:

- [`docs/workflow.md`](docs/workflow.md) — fresh-machine → running workflow.
- [`skills/`](skills/) — installable domain skills (`pnpm skills:install`):
  - `obsidian-arrow-sandbox` — running the sandbox, CSS scoping, porting basics.
  - `obsidian-arrow-stories` — **component + story authoring workflow**: `defineStories` API, variants, children, status flag, DRY patterns, utilities.
  - `obsidian-arrow-css` — **CSS decision hierarchy**: Obsidian classes → oas-* utilities → custom CSS; token reference; specificity scoping; overrides via variables; auditing for excess CSS.
  - `arrow-js-obsidian-templates` — Arrow v1.0.6 template syntax + footguns.
  - `arrow-js-obsidian-patterns` — icons, CSS scoping, lifecycle, reactive state.
  - `arrow-js-obsidian-porting` — sandbox→plugin parity check (`component-hash`).
  - `obsidian-arrow-maintenance` — updating an existing project.
- [`docs/prompts/`](docs/prompts/) — copy-paste agent prompts: `agent-setup.md`
  (scaffold + orient) and `update-existing.md` (update tooling + skills, keep src).

Design rationale (why `core`+`framework`, no SSR, how `app.css` is sourced) is
summarized in "What this is (and isn't)" below and in the README.

## What this is (and isn't)

- **Is:** a Vite + TypeScript sandbox. Components use `@arrow-js/core`
  (`reactive`, `html`, `component`, `watch`) + `@arrow-js/framework` (`boundary`),
  mounted with `template(container)` — the exact call an Obsidian
  `ItemView.onOpen()` makes. Styling comes entirely from Obsidian's real
  `app.css`, loaded under Obsidian body classes.
- **Isn't:** an SSR app. There is **no server and no hydration** — an Obsidian
  plugin renders only in the Electron renderer, so `@arrow-js/ssr` and
  `@arrow-js/hydrate` are intentionally absent. Do not add them.

## Run it

```sh
pnpm install
pnpm pull-css     # macOS-only auto-detect; else --path <asar|css> / OBSIDIAN_ASAR=<path>
pnpm dev          # Vite + HMR
```

`public/app.css` is **git-ignored** (Obsidian's proprietary CSS — not
redistributed); run `pnpm pull-css` once before `pnpm dev`.

Install the skills (pulled from the published repo, not vendored):
`pnpm skills:install --yes` (non-interactive, all skills) or `pnpm skills:install`
(TUI); update with `pnpm skills:update`. Scope
flags: `--agent <name>`, `--project-dir=<path>`, `--global`. **Nested inside
another repo?** Skills install cwd-relative — use `--project-dir=<outer-repo>` so
they land where an agent at the outer repo looks. To refresh an existing
project's tooling, run `npx create-obsidian-arrow update` (see the
obsidian-arrow-maintenance skill).

## Arrow v1.0.6 footguns — READ BEFORE WRITING TEMPLATES

These are hard runtime errors, not style nits. They are encoded in CI
(`test/template-footguns.test.mjs`) where possible.

1. **No literal HTML comments inside `html\`\`` templates.** Arrow uses HTML
   comments as expression-slot markers; a literal `<!-- … -->` makes the slot
   count mismatch and throws `Invalid HTML position`. Use JS `//` comments
   *outside* the template literal.
2. **An attribute expression must be the *entire* value.** Good:
   `class="${() => '…'}"`. Broken: `class="static ${() => '…'}"` (partial values
   aren't registered as placeholders → throws). Build the full string in one
   expression.
3. **Reactive vs static.** `${data.x}` renders once at mount; `${() => data.x}`
   is tracked and updates only that slot. Forgetting the `() =>` is the #1
   "why isn't it updating" bug. Returning `false` from an attribute expression
   **removes** the attribute (vs `""` which keeps it empty).
4. **`@event` handlers must type the param `Event`, not a narrowed subtype.**
   `(e: MouseEvent) => …` fails to assign to Arrow's handler type (parameter
   contravariance) → `TS2345`. Use `(e: Event) => …` and narrow inside; no-arg
   handlers are fine. (Caught by `tsc`; footguns 1–2 are caught by
   `test/template-footguns.test.mjs`, which also flags this for inline handlers.)

Other conventions: property binding via `.prop` (`.checked="${() => …}"`),
events via `@event` (`@click="${fn}"`), keyed lists via
`html\`…\`.key(id)`, async sections via `component(asyncFn, { fallback })` wrapped
in `boundary()`.

## Conventions

- **Check `/reference/classes` first** — Obsidian has semantic classes for most
  common patterns. Use them before writing any custom CSS.
- **Use `oas-*` utilities second** (`src/utilities.css`) — flex, gap, padding,
  margin, typography, border, overflow helpers built on Obsidian's token scale.
  Prefer `class="oas-flex oas-gap-2"` over `style="display:flex;gap:8px"`.
- **Custom CSS last** — only when Obsidian has no class and utilities don't cover
  it. Scope under container + element type, use `var(--…)` tokens for values.
- Add a story by creating a co-located `*.stories.ts` next to the component —
  it appears at `/components/<slug>` automatically. See the `obsidian-arrow-stories`
  skill for the full `defineStories` API (variants, children, status, notes).
  Browse live tokens at `/reference`, curated classes at `/reference/classes`.

## CSS scoping

- Use Obsidian's own classes (`.setting-item`, `.clickable-icon`,
  `.workspace-leaf`, `.vertical-tab-*`) and `var(--…)` tokens **first**. Add
  custom CSS only where Obsidian has no class.
- Scope any custom rule under a container class + element type (e.g.
  `.oas-frame button.oas-theme-toggle`) so it beats Obsidian's global
  `button:not(.clickable-icon)` rule and never leaks. Sandbox-only chrome lives
  in `src/sandbox/sandbox.css`; component styling stays on Obsidian classes.

## Verify before claiming done

```sh
pnpm typecheck    # tsc --noEmit
pnpm test         # node:test
pnpm lint         # biome
pnpm check        # all of the above (format + typecheck + test)
```

Then confirm the actual render in the browser at the `pnpm dev` URL — check the
console is clean and the component looks like a real Obsidian pane. Do not claim
a component works on typecheck alone; Arrow's footguns only surface at render.

## Porting a component into the plugin

Components are framework-light and use only Obsidian classes/tokens, so porting
is mechanical: copy the component file into the plugin's view directory and
mount it from `ItemView.onOpen()` via `template(this.contentEl)`. If it uses
`boundary()`/async components, add `@arrow-js/framework` to the plugin and the
`import '@arrow-js/framework'` side-effect import. Strip any sandbox chrome
(`src/sandbox/*`) — that stays here.

**Bring `src/utilities.css` along.** Components may use `oas-`-prefixed utility
classes (flex, gap, padding, typography, border — all built on Obsidian's token
scale). Copy `src/utilities.css` once into the plugin's styles directory and
import it there. The `oas-` prefix guarantees no conflict with Obsidian selectors.
Re-copy when the sandbox file changes (the porting-parity skill covers this).
