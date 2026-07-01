# Agent setup prompt

Copy everything in the block below and give it to a coding agent (Claude Code or
similar) to scaffold a new Obsidian Arrow sandbox and orient itself.

---

```text
Scaffold and set up an Obsidian Arrow Sandbox, then orient yourself on it.

WHAT IT IS
A client-only Vite + TypeScript sandbox for prototyping Obsidian plugin UI with
Arrow.js (@arrow-js/core + @arrow-js/framework), rendered against Obsidian's real
app.css so components look exactly as they will inside a plugin. Components mount
via `template(container)` — the same call an Obsidian ItemView.onOpen() makes —
so a finished component copy-pastes into a plugin with near-zero refactoring.
There is NO SSR/hydration (an Obsidian plugin renders entirely client-side); do
not add @arrow-js/ssr or @arrow-js/hydrate.

SCAFFOLD IT (use the published tool — pick one)
  npm create obsidian-arrow@latest my-app
  pnpm create obsidian-arrow my-app
  npx create-obsidian-arrow my-app

Then:
  cd my-app
  pnpm install
  pnpm pull-css     # REQUIRED before dev — extracts Obsidian's app.css from your
                    # LOCAL install into public/app.css (git-ignored, never
                    # committed; it's Obsidian's proprietary CSS). Auto-detect is
                    # macOS-only; on Windows/WSL pass --path <obsidian.asar|app.css>
                    # or set OBSIDIAN_ASAR=<path>.
  pnpm dev          # open the printed URL: / is home, /components the story viewer,
                    # /reference the Obsidian token/class index.
                    # The toolbar slider/presets + edge drag handle resize the panel.
  pnpm skills:install --yes   # install all agent skills non-interactively, pulled
                              # from the published repo (not vendored) — this loads
                              # the domain knowledge. Drop --yes for an interactive picker.
                              # NESTED inside another repo? Skills install cwd-relative,
                              # so add --project-dir=<outer-repo> (or --global) to put them
                              # where an agent at the outer repo will find them.

READ FIRST
- AGENTS.md (root) — operating guide + docs map (links everything below).
- docs/workflow.md — fresh-machine → running workflow.
- skills/*/SKILL.md — obsidian-arrow-sandbox (workflow), arrow-js-obsidian-
  templates (template syntax + footguns), arrow-js-obsidian-patterns (icons via
  Lucide/data-icon sweep, CSS scoping, mount/unmount lifecycle, reactive state),
  arrow-js-obsidian-porting (sandbox→plugin parity check),
  obsidian-arrow-maintenance (updating an existing project).

ARROW v1.0.6 FOOTGUNS — do not relearn these the hard way:
1. NO literal HTML comments inside html`` templates — Arrow treats HTML comments
   as expression-slot markers, so `<!-- … -->` throws "Invalid HTML position" at
   render. Use JS // comments outside the template.
2. An attribute expression must be the ENTIRE value. `class="${() => '…'}"` works;
   `class="static ${() => '…'}"` (partial) throws. Build the full string in one
   expression. Returning `false` from a whole-value attribute expr removes the attr.
3. Reactive vs static: `${x}` renders once; `${() => x}` is tracked and updates
   only that slot. Forgetting the `() =>` is the #1 "not updating" bug.
4. @event handlers must type the param as `Event`, not a narrowed subtype
   (MouseEvent, …) — contravariance makes it fail to assign (TS2345). Use
   `(e: Event) => …` and narrow inside; no-arg handlers are fine.
Footguns 1, 2, 4 are guarded by test/template-footguns.test.mjs + tsc.

CONVENTIONS
- Use Obsidian's own classes (.setting-item, .clickable-icon, .workspace-leaf,
  .vertical-tab-*, .modal, .mod-cta) and var(--…) tokens first; add custom CSS
  only when Obsidian has no class, scoped under a container class + element type
  (e.g. `.my-panel button.my-action`) so it beats Obsidian's global button rule.
- Sandbox-only chrome lives in src/sandbox/* — it does NOT port to a plugin.
- Add a demo by creating a co-located `*.stories.ts` next to the component (see
  README "Add a story"); it appears at `/components/<slug>` automatically.
  Browse Obsidian tokens/classes at `/reference`.

VERIFY BEFORE CLAIMING DONE
- `pnpm typecheck && pnpm test && pnpm lint` (or `pnpm run ci` for the full chain).
- Then open the `pnpm dev` URL and confirm the component renders like a real
  Obsidian pane with a clean console — Arrow's footguns only surface at render,
  so typecheck passing is not proof a component works.

PORTING TO A PLUGIN
Copy the component file into the plugin's view dir and mount from
ItemView.onOpen() via `template(this.contentEl)`. If it uses boundary()/async
components, add @arrow-js/framework to the plugin and the side-effect
`import '@arrow-js/framework'`. Leave src/sandbox/* behind. Guard against drift
with the porting-parity check (see the arrow-js-obsidian-porting skill).

MAINTENANCE (existing project)
Refresh tooling later with `npx create-obsidian-arrow update` (preserves src/),
update skills with `pnpm skills:update`. See the obsidian-arrow-maintenance skill.

Start by scaffolding, running setup steps, then read AGENTS.md and confirm
`pnpm dev` renders correctly at /components and /reference. Report what you see.
```

---

## Notes

- The scaffolder is published to npm as **`create-obsidian-arrow`**, which is why
  all three of `npm create obsidian-arrow`, `pnpm create obsidian-arrow`, and
  `npx create-obsidian-arrow` work (the `create-` prefix is what `*/create`
  resolves to).
- `pnpm pull-css` is the one step that won't "just work" on a fresh machine —
  it needs a local Obsidian install (macOS auto-detected). That's intentional:
  Obsidian's `app.css` is proprietary and never committed/redistributed.
