# Workflow

How to go from a fresh machine to building Obsidian plugin UI in the sandbox.

## Prerequisites (one-time, per machine)

- **Node ≥ 18** and **pnpm** — `corepack enable` (ships with Node) or `npm i -g pnpm`.
- **Obsidian desktop app installed** — required by `pull-css` to extract `app.css`.
  macOS is auto-detected; Windows/WSL needs an explicit path (see below).

## Spin up a sandbox

```sh
# 1. Scaffold from the published initializer (any one of these)
pnpm create obsidian-arrow my-ui        # or: npm create obsidian-arrow@latest my-ui
                                         # or: npx create-obsidian-arrow my-ui
cd my-ui

# 2. Install dependencies
pnpm install

# 3. Pull Obsidian's styling locally — REQUIRED before dev (needs Obsidian installed)
pnpm pull-css                            # macOS: auto-detects /Applications/Obsidian.app
                                         # else:  pnpm pull-css --path <obsidian.asar|app.css>
                                         #        or  OBSIDIAN_ASAR=<path> pnpm pull-css

# 4. Run it
pnpm dev                                 # open the printed URL — / is the index, /example the demo
```

`public/app.css` is **git-ignored and never shipped** (it's Obsidian's proprietary
CSS), so step 3 must run on every fresh checkout, or the sandbox renders unstyled.

## Make your agent aware (optional)

From inside the scaffolded project:

```sh
pnpm skills:install          # interactive picker (TUI) on a terminal
pnpm skills:install --yes    # non-interactive — installs ALL bundled skills (for agents/CI)
pnpm skills:update           # update an already-installed setup to the latest
```

Then point the agent at [`AGENTS.md`](../AGENTS.md), or brief a fresh agent with
[`docs/prompts/agent-setup.md`](prompts/agent-setup.md).

## Build → verify → port loop

```sh
# add a component in src/components/, register it in src/examples/registry.ts
pnpm dev          # iterate with HMR
pnpm run ci       # biome + typecheck + tests + build before trusting it
```

Always confirm the actual render in the browser — Arrow's footguns surface only
at render, so a passing `tsc` is not proof a component works. See the footguns in
[`AGENTS.md`](../AGENTS.md) and the `arrow-js-obsidian-templates` skill.

**Port a component into a plugin:** copy the file into the plugin's view directory
and mount it from `ItemView.onOpen()` via `template(this.contentEl)`. If it uses
`boundary()`/async components, add `@arrow-js/framework` to the plugin and the
side-effect `import '@arrow-js/framework'`. Leave `src/sandbox/*` behind.

## Scaffold vs. clone

- **Scaffold** (`pnpm create obsidian-arrow`) when you want to **build plugin UI** —
  the normal use.
- **Clone** this repo (`kylebrodeur/obsidian-arrow-sandbox`) only to **change the
  sandbox or the initializer itself**, then `pnpm create:sync` and publish the
  `create-obsidian-arrow/` package (`cd create-obsidian-arrow && pnpm publish`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `pnpm dev` renders unstyled / `var(--…)` not resolving | Run `pnpm pull-css` (step 3). |
| `pull-css` can't find Obsidian | Pass `--path <obsidian.asar\|app.css>` or set `OBSIDIAN_ASAR` (Windows/WSL not auto-detected). |
| `Invalid HTML position` at render | An Arrow footgun — no HTML comments in templates; attribute expressions must be the whole value. See `AGENTS.md`. |
