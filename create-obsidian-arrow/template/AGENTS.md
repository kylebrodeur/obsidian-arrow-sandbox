# AGENTS.md

Operating guide for AI agents working in **obsidian-arrow-sandbox** — a
client-only environment for prototyping [Arrow.js](https://arrow-js.com/) UI that
ports into an Obsidian plugin with near-zero refactoring.

## Docs map (start here)

This file is the hub — everything else is linked from here:

- [`docs/workflow.md`](docs/workflow.md) — fresh-machine → running workflow.
- [`skills/`](skills/) — installable domain skills (`pnpm skills:install`):
  obsidian-arrow-sandbox, arrow-js-obsidian-templates, arrow-js-obsidian-patterns.
- [`docs/prompts/agent-setup.md`](docs/prompts/agent-setup.md) — prompt for
  briefing a fresh agent (scaffold + orient).

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
