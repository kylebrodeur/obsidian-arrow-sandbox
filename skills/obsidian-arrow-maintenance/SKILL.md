---
name: obsidian-arrow-maintenance
description: Use when updating or maintaining an EXISTING scaffolded obsidian-arrow project — refresh the managed tooling with create-obsidian-arrow update, update installed agent skills with pnpm skills:update, fix skills scoping when the project is nested inside another repo (--project-dir / --global), and re-pull Obsidian styling. Only tooling/skills/docs are refreshed; your src is preserved.
---

# Maintaining an existing Obsidian Arrow project

How to bring an already-scaffolded project up to date. The scaffolder is
create-only (it refuses a non-empty dir), so updates split into three tracks:
**tooling files**, **agent skills**, and **styling**. None of these touch your
`src/`.

## 1. Refresh the tooling (scripts, skills files, docs, CI, config)

```sh
npx create-obsidian-arrow update            # in the project root (or: update <dir>)
npx create-obsidian-arrow update --dry-run  # preview what would change first
```

Refreshes the **managed** files from the latest template — `scripts/`, `skills/`,
`docs/`, `.github/`, `.husky/`, `biome.json`, `AGENTS.md`, `CLAUDE.md` — and
**merges** `package.json` scripts + any missing deps. It **never** touches `src/`,
`public/`, `index.html`, `vite.config.ts`, `tsconfig.json`, or `.gitignore`. After
it runs: `pnpm install && pnpm check`.

## 2. Update the installed agent skills

```sh
pnpm skills:update    # = npx skills update -y  (updates installed skills in place)
```

Or reinstall the latest straight from the published repo (works from anywhere,
even if the project predates the skill scripts):

```sh
npx skills add kylebrodeur/obsidian-arrow-sandbox --all --yes
```

## 3. Nested inside another repo? Fix skills scoping

The `skills` CLI installs project-scope **relative to cwd**. If this project sits
inside a larger repo and your agent runs from the **outer** repo, skills installed
here won't be found. Install them where the agent looks:

```sh
pnpm skills:install --yes --project-dir=<outer-repo>   # project-scoped at the outer root
pnpm skills:install --yes --global                     # or user-level (all projects)
```

(`SKILLS_PROJECT_DIR` / `SKILLS_GLOBAL` env forms drive the auto `postinstall`
step, which takes no CLI args.)

## 4. Re-pull Obsidian styling after Obsidian updates

`public/app.css` is a local snapshot (git-ignored). If Obsidian updated or the
sandbox renders stale, refresh it:

```sh
pnpm pull-css
```

## 5. Re-check porting parity

After updating, re-run the porting-parity check so plugin copies still match the
sandbox source (see the **arrow-js-obsidian-porting** skill):

```sh
node scripts/component-hash.mjs --check port-parity.json
```
