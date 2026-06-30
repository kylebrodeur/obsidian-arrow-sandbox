---
name: arrow-js-obsidian-porting
description: Use when porting an Arrow component from the obsidian-arrow-sandbox into the real Obsidian plugin, or wiring a check that the plugin copy hasn't drifted from the sandbox source. Covers the content-addressed porting-parity tool (scripts/component-hash.mjs), the canonical-form rules, a port-parity manifest, and a husky/CI pre-commit hook. The sandbox is the source of truth; the plugin copy must match.
---

# Porting parity (sandbox → Obsidian plugin)

The sandbox is the **source of truth** for a component; the plugin gets a
near-verbatim copy. The risk is **drift** — someone hand-edits the plugin copy,
or a port silently diverges. This makes components **content-addressed**: a
canonical hash of the component's portable body must match on both sides, the
same idea as "never hand-edit generated artifacts."

## Write portable components

So the body is byte-identical across sandbox and plugin and only the *mount site*
differs:

- Take data via **props / getters**, not hard-wired sources. The sandbox passes a
  stub (`loadStatus()`); the plugin passes the real source (rpc) — but that wiring
  lives at the **call site** (`main.ts` / `ItemView.onOpen()`), not in the
  component body.
- Use Obsidian classes + `var(--…)` tokens (already the rule). Keep
  `obsidian`-API calls (`setIcon`, …) out of the component body where possible.

## The tool: `scripts/component-hash.mjs`

Dependency-free Node; canonicalizer in `scripts/lib/canonical-source.mjs`.

```sh
node scripts/component-hash.mjs <file>                       # print canonical hash
node scripts/component-hash.mjs --verify <sandbox> <plugin>  # PARITY OK | DRIFT (exit 0/1)
node scripts/component-hash.mjs --check port-parity.json     # check all; exit 1 on drift
node scripts/component-hash.mjs --check port-parity.json --update   # re-bless baselines
```

**Canonical form** (define it so both sides agree by construction):
- `import …;` statements are stripped (single- and multi-line) — imports are the
  main legit delta (stub vs real data, the `obsidian` API).
- Line endings → `\n`, trailing whitespace trimmed, blank-line runs collapsed,
  leading/trailing blanks trimmed.
- Comments are **kept** (they're part of the component; the sandbox owns them too).
- SHA-256 of the result.

So two copies that differ only in imports/formatting hash equal; any change to
the body/template/comments shows as drift.

## Wiring the check in the plugin

The hook lives in the **plugin** repo (that's where ported copies drift). Copy the
two dependency-free files in (`scripts/lib/canonical-source.mjs`,
`scripts/component-hash.mjs`) and add a manifest:

```jsonc
// port-parity.json — paths resolve relative to THIS file
{
  "entries": [
    {
      "plugin": "src/chat/arrow/SettingsPanel.ts",
      "sandbox": "../../arrow-ui/obsidian-arrow-sandbox/src/components/SettingsPanel.ts", // optional
      "hash": "<sha256>"                                                                  // fallback when sandbox isn't checked out
    }
  ]
}
```

- If the `sandbox` path exists (sibling checkout), the check compares **plugin
  copy ↔ live sandbox source** — catches drift in both directions.
- If it doesn't, it falls back to the recorded `hash` (catches hand-edits to the
  plugin copy). Record/refresh it with `--update` after an intentional re-port.

husky `pre-commit` (and CI):

```sh
node scripts/component-hash.mjs --check port-parity.json
```

On drift the commit fails: *edit the sandbox component and re-port* (don't
hand-edit the copy); use `--update` only to intentionally re-bless.

## What this does NOT do (by design)

- **No runtime component-DOM hashing in Obsidian.** Source parity already
  guarantees same code → same Arrow DOM, and the sandbox vs real Obsidian DOM
  *intentionally* differ (icon stub vs `setIcon`, `MarkdownRenderer` nodes, live
  theme), so a runtime markup hash would be tautological *and* full of false
  mismatches. The real runtime risk is visual/CSS — verify that by **loading in
  Obsidian and looking**, not with a hash.
- **Planned (not built): a styling-freshness check.** A small helper that hashes
  the *live Obsidian token set* and compares it to the sandbox's pulled `app.css`
  snapshot, to flag "re-run `pnpm pull-css`." That's the one runtime hash worth
  having — environment parity, not component parity. Add it when needed.
