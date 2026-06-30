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

Local dev of the initializer itself (from the sandbox repo, before publishing):

```sh
node create-obsidian-arrow/index.mjs ../my-app
```

## What you get

A full sandbox: client-only Vite + TS, `@arrow-js/core` + `@arrow-js/framework`
(no SSR), `routeToPage` + Navigation-API router with an `/example` demo, Biome +
husky pre-commit + `node:test` + GitHub Actions CI, bundled agent skills, and the
`pull-css` script that extracts Obsidian's `app.css`.

## Maintaining the template

`template/` is **generated** from the sandbox repo so it never drifts. After
changing the sandbox, regenerate it from the repo root:

```sh
pnpm create:sync
```
