# create-obsidian-arrow

Scaffold a new [Obsidian](https://obsidian.md/)-styled [Arrow.js](https://arrow-js.com/)
UI sandbox — a client-only Vite + TypeScript project that renders Arrow
components against Obsidian's real `app.css`, ready to port into a plugin.

## Usage

```sh
npm create obsidian-arrow@latest my-app
# or: pnpm create obsidian-arrow my-app
# or: npx create-obsidian-arrow my-app
```

Then:

```sh
cd my-app
pnpm install
pnpm pull-css   # required — extract Obsidian's app.css from your local install (macOS auto-detect)
pnpm dev
```

> `public/app.css` is git-ignored and never bundled — it's Obsidian's proprietary
> CSS, so each developer extracts it from their own install via `pnpm pull-css`.

### Install the agent skills

Skills aren't vendored into the scaffold — `skills:install` pulls them from the
published repo (source of truth, always current) via the
[`skills`](https://github.com/vercel-labs/skills) CLI:

```sh
pnpm skills:install --yes                       # non-interactive — installs all
pnpm skills:install                             # interactive picker
pnpm skills:install --yes --project-dir=<root>  # install at another repo root (nesting)
pnpm skills:update                              # update an existing setup
```

If you scaffold **inside an existing repo**, skills install scoped to the
scaffold folder (the CLI is cwd-relative); use `--project-dir=<outer-repo>` (or
`--global`) to install where an agent at the outer repo looks. The scaffolder
prints this hint when it detects nesting.

## Update an existing project

The scaffolder is create-only, but `update` refreshes an existing project's
**managed** tooling (`scripts/`, `skills/`, `docs/`, `.github/`, `.husky/`,
`biome.json`, agent guides) and merges new `package.json` scripts/deps — it never
touches your `src/`, `public/`, `index.html`, or build configs:

```sh
npx create-obsidian-arrow update            # in the project (or: update <dir>)
npx create-obsidian-arrow update --dry-run  # preview
```

Then `pnpm install && pnpm check`.

## Local dev of the initializer

From the sandbox repo, before publishing:

```sh
node create-obsidian-arrow/index.mjs ../my-app          # scaffold
node create-obsidian-arrow/index.mjs update ../my-app   # update
```

## What you get

A full sandbox: client-only Vite + TS, `@arrow-js/core` + `@arrow-js/framework`
(no SSR), `routeToPage` + Navigation-API router, a Storybook-style component
viewer at `/components` (co-locate `*.stories.ts` to add stories), a live token
and class reference at `/reference`, Biome + husky pre-commit + `node:test` +
GitHub Actions CI, a `skills:install` that pulls the agent skills from the
published repo, and the `pull-css` script that extracts Obsidian's `app.css`.

## Maintaining the template

`template/` is **generated** from the sandbox repo so it never drifts. After
changing the sandbox, regenerate it from the repo root:

```sh
pnpm create:sync
```
