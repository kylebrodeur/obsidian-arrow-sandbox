# Update-existing-project prompt

Copy the block below and give it to a coding agent to bring an **existing**
Obsidian Arrow project fully up to date — tooling, skills, styling — **without
touching your source code**.

---

```text
Update this existing Obsidian Arrow project to the latest tooling and agent
skills. Do NOT change any of my source code.

HARD CONSTRAINTS
- Never modify src/, public/, index.html, vite.config.ts, tsconfig.json, or my
  component/app code. Only managed tooling, skills, and docs may change.
- Preview before applying anything destructive; don't commit unless I ask.
- At the end, prove src/ was untouched (`git diff --stat` shows no src/ changes).

CONTEXT
Scaffolded from create-obsidian-arrow. Tooling + agent skills come from the
published repo kylebrodeur/obsidian-arrow-sandbox; skills install via the
`skills` CLI and are NOT vendored in the project.

STEPS (in order)

1. Locate + nesting check
   - Find the project root (has package.json + scripts/).
   - Is it nested in a larger repo? Compare `git rev-parse --show-toplevel` to the
     project dir. If the OUTER root differs, that's where skills must be installed
     so the session's skill:// registry (repo-root + global only) can find them.

2. Refresh tooling — preserves src/
   - Preview:  npx create-obsidian-arrow update --dry-run
   - Apply:    npx create-obsidian-arrow update
   - Then:     pnpm install
   Refreshes scripts/, docs/, .github/, .husky/, biome.json, AGENTS.md, CLAUDE.md
   and merges package.json scripts/deps. It never touches src/, public/, or configs.

3. Reset agent skills to the current set
   - Audit:   npx skills list
   - Remove any stale/old ones (older setups were missing some skills):
       npx skills remove obsidian-arrow-sandbox arrow-js-obsidian-templates \
         arrow-js-obsidian-patterns arrow-js-obsidian-porting obsidian-arrow-maintenance
   - Install the current set from the published repo, AT THE RIGHT ROOT (the OUTER
     repo root if nested):
       npx skills add kylebrodeur/obsidian-arrow-sandbox --all --yes
     (equivalently from the project: pnpm skills:install --yes
      [--project-dir=<outer-repo>])
   - Reload the agent session so skill:// resolves them.

4. Refresh Obsidian styling
   - pnpm pull-css        (needs a local Obsidian; macOS auto-detected, else --path)

5. Clean stray install artifacts
   - git status — untracked .agents/ (now git-ignored) or stray skills-lock.json?
   - Broken symlinks:  find .agents ~/.claude/skills -type l ! -exec test -e {} \; -print

6. Re-check porting parity (only if you keep a port-parity manifest)
   - node scripts/component-hash.mjs --check port-parity.json

7. Verify
   - pnpm run ci          (biome + typecheck + tests + build)
   - pnpm dev             and confirm /components and /reference render with a clean console

REPORT
- What `update` changed, which skills are now installed and where, the pull-css
  result, and `git diff --stat` confirming src/ is untouched.
```

---

## Notes
- Skills are pulled from the published repo, so step 3 is location-independent for
  the *source* — only the *install location* matters (run it at the repo root the
  agent uses; reload after).
- `npx create-obsidian-arrow update` is **create-only-safe**: it refreshes managed
  files and merges `package.json`, but never overwrites `src/`, `public/`,
  `index.html`, or build configs. See the `obsidian-arrow-maintenance` skill.
