# Obsidian Arrow Sandbox

A client-only prototyping environment for building [Arrow.js](https://arrow-js.com/)
UI that drops into an Obsidian plugin with near-zero refactoring. Components are
written with `@arrow-js/core` (+ `@arrow-js/framework` for async boundaries) and
styled entirely by Obsidian's real `app.css`, so what you see here is what you
get inside a plugin view.

New machine? See [`docs/workflow.md`](docs/workflow.md) for the full
fresh-checkout-to-running workflow.

## Scaffold a new project

Scaffold a fresh sandbox with the published initializer
([`create-obsidian-arrow`](create-obsidian-arrow/)):

```sh
npm create obsidian-arrow@latest my-app
# or:  pnpm create obsidian-arrow my-app
# or:  npx create-obsidian-arrow my-app
```

Then `cd my-app && pnpm install && pnpm pull-css && pnpm dev`. A freshly
scaffolded project passes `pnpm run ci` out of the box. The initializer's
template is generated from this repo (`pnpm create:sync`), so it never drifts.

**Update an existing project's tooling** (refreshes the managed files — scripts,
skills, docs, agent guides, CI, `biome.json` — and merges new `package.json`
scripts/deps; never touches `src/`, `public/`, `index.html`, or build configs):

```sh
npx create-obsidian-arrow update            # in the project (or: update <dir>)
npx create-obsidian-arrow update --dry-run  # preview first
```

> **Nested in another repo?** If you scaffold inside an existing repo, skills
> install scoped to the scaffold folder (the `skills` CLI is cwd-relative), so the
> session/`skill://` registry — which only indexes the **repo root** + global —
> won't see them. Install at the outer repo instead:
> `pnpm skills:install --yes --project-dir=<outer-repo>` (or, from the outer repo,
> `npx skills add kylebrodeur/obsidian-arrow-sandbox --all --yes`), then **reload
> the session**. The scaffolder prints this hint when it detects nesting.

> This repo (the full sandbox) is **not** published to npm — only the
> `create-obsidian-arrow/` initializer is. Copy-paste agent prompts live in
> [`docs/prompts/`](docs/prompts/): `agent-setup.md` (scaffold + orient) and
> `update-existing.md` (update tooling + skills, keeping `src/` intact).

## Quick start

```sh
pnpm install
pnpm pull-css     # extract Obsidian's app.css from your local install (required)
pnpm dev          # Vite dev server with HMR
```

`pull-css` reads `app.css` out of `Obsidian.app/.../obsidian.asar` (macOS) and
writes `public/app.css`. Override the location with `--path <obsidian.asar|app.css>`
or `OBSIDIAN_ASAR=<path>`. **Run it once before `pnpm dev`** — it needs a local
Obsidian install.

> **Why it isn't committed:** `public/app.css` is **git-ignored**. It's
> Obsidian's proprietary stylesheet, so we don't redistribute it — each developer
> extracts it from their own licensed Obsidian install via `pnpm pull-css`.

> **Platform note:** automatic Obsidian discovery is currently **macOS-only** —
> `pull-css` knows where `Obsidian.app` lives on macOS. Windows and WSL paths are
> not auto-detected yet (planned). On those platforms, point the script at the
> file explicitly via `--path <obsidian.asar|app.css>` or `OBSIDIAN_ASAR=<path>`.

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

## Agent skills

This repo is the source of truth for five [`skills`](https://github.com/vercel-labs/skills)-compatible
skills under [`skills/`](skills/) — it's a skill marketplace. Scaffolds **don't
vendor copies**; they pull from this published repo, so installs are always
current.

- `obsidian-arrow-sandbox` — running and using this sandbox, CSS scoping, porting basics.
- `obsidian-arrow-stories` — **component + story authoring workflow**: the complete `defineStories` API (variants, children, status flag, notes), DRY patterns, utility classes, story viewing, and how to structure sub-components.
- `obsidian-arrow-css` — **CSS decision hierarchy**: Obsidian classes first, `oas-*` utilities second, custom CSS last; the live token reference (`/reference`), class catalog (`/reference/classes`), specificity scoping, overrides via CSS variables, and auditing components to minimize hand-written CSS.
- `arrow-js-obsidian-templates` — Arrow v1.0.6 template rules + footguns.
- `arrow-js-obsidian-patterns` — integration patterns: icons (Lucide / data-icon
  sweep), CSS scoping vs Obsidian globals, mount/unmount lifecycle, reactive state.
- `arrow-js-obsidian-porting` — content-addressed porting parity: the
  `component-hash` tool + a husky/CI check that the plugin copy hasn't drifted
  from the sandbox source.
- `obsidian-arrow-maintenance` — updating an existing project: `create-obsidian-arrow
  update`, `skills:update`, nesting/`--project-dir`, re-pull styling.

Install them into your agent (pulls from the published repo; the sandbox repo
itself uses its local `skills/`):

```sh
pnpm skills:install                                 # interactive picker (TUI) on a terminal
pnpm skills:install --yes                           # non-interactive — installs all skills
pnpm skills:install --yes --agent claude-code       # install for one agent only
pnpm skills:install --yes --project-dir=<repo-root> # install into another project root
pnpm skills:update                                  # update an existing setup to the latest
```

Anywhere, with no project at all:
`npx skills add kylebrodeur/obsidian-arrow-sandbox --all --yes`.

`postinstall` offers the picker automatically after `pnpm install`, but only in
an interactive terminal — in CI / non-TTY it just prints how to install (never
hangs). For agents/CI, use `--yes`.
Scope flags: `--agent <name>` (one agent), `--project-dir=<path>` (install into a
different project root, e.g. an outer repo a scaffold is nested in), `--global`
(user-level, available everywhere). `pnpm skills:update` runs
`npx skills update -y`. The auto `postinstall` step takes no CLI args, so the env
forms `SKILLS_AGENT` / `SKILLS_PROJECT_DIR` / `SKILLS_GLOBAL` (and
`SKIP_SKILLS_INSTALL=1`) influence *that* path.

## Component viewer & reference

**Component viewer (`/components`):** a Storybook-style browser for sandbox
components. Co-locate a `*.stories.ts` file next to any component and it appears
in the sidebar and on Home automatically. Stories support named variants,
drill-in via `children` slugs, and a derived src path shown in the viewer — all
discovered at build time via `import.meta.glob`.

**Reference index (`/reference`):** all `var(--)` tokens parsed live from
`app.css`, grouped by category (Size & spacing, Radius, Colors, …) with color
swatches, size bars, a filter input, theme-aware resolved values, and a copy
button. `/reference/classes` is a curated catalog of Obsidian pattern classes
with live previews.

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

## Porting a component into the plugin

Components use only Obsidian classes + `var(--…)` tokens and mount via
`template(container)` — the same call an `ItemView.onOpen()` makes. To port:
copy the component file into the plugin's view directory and mount it from
`onOpen()`. If it uses `boundary()`/async components, add `@arrow-js/framework`
to the plugin and the `import '@arrow-js/framework'` side-effect import.

Also copy `src/utilities.css` into the plugin once — components may use `oas-`
utility classes (flex, gap, padding, typography, border helpers built on
Obsidian's token scale). The `oas-` prefix means no conflicts with Obsidian's
own selectors. All ported components in a plugin share one copy of this file.

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
4. **`@event` handlers must type the param `Event`, not a narrowed subtype**
   (`MouseEvent`, …). Parameter contravariance makes `(e: MouseEvent) => void`
   fail to assign to Arrow's handler type (`TS2345`); use `(e: Event) => …` and
   narrow inside. Caught by `tsc`, and the inline form is also guarded by
   `test/template-footguns.test.mjs`.
