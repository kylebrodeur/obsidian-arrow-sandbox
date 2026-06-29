# create-obsidian-arrow

Scaffold a new [Obsidian](https://obsidian.md/)-styled [Arrow.js](https://arrow-js.com/)
UI sandbox — a client-only Vite + TypeScript project that renders Arrow
components against Obsidian's real `app.css`, ready to port into a plugin.

## Usage

Once published:

```sh
pnpm create obsidian-arrow my-app
# or: npm create obsidian-arrow@latest my-app
```

Locally (before publishing), from the sandbox repo:

```sh
node create-obsidian-arrow/index.mjs ../my-app
```

Then:

```sh
cd my-app
pnpm install
pnpm pull-css   # extract Obsidian's app.css (macOS auto-detect)
pnpm dev
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
