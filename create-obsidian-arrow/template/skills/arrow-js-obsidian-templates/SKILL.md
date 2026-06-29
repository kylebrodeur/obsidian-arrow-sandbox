---
name: arrow-js-obsidian-templates
description: Use when writing @arrow-js/core (v1.0.6) html`` templates — the reactive-vs-static rule, full-value attribute binding (returning false removes the attribute), .property and @event binding, keyed lists, async component(fn, { fallback }) wrapped in boundary(), and the two hard footguns that throw "Invalid HTML position" at render (no literal HTML comments inside templates; an attribute expression must be the entire value).
---

# Arrow.js Templates (v1.0.6)

Rules for writing `html\`\`` templates that render correctly in the browser and
inside an Obsidian plugin. Several of these are hard runtime errors, not style.

## Reactive vs static — the core rule

```ts
import { html, reactive } from "@arrow-js/core"
const data = reactive({ count: 0 })

html`<span>${data.count}</span>`        // ❌ renders ONCE — never updates
html`<span>${() => data.count}</span>`  // ✅ tracked — updates only this slot
```

`${value}` is read once at mount. `${() => value}` is tracked: Arrow records the
reactive reads inside the function and re-runs **only that slot** when they
change. Forgetting `() =>` is the #1 "why isn't it updating" bug.

## Attributes

An attribute expression must be the **entire** attribute value:

```ts
html`<div class="${() => (active() ? "tab is-active" : "tab")}">`  // ✅
html`<div class="tab ${() => active() ? "is-active" : ""}">`        // ❌ THROWS
```

Partial values (`"static ${…}"`) are not registered as placeholders and throw
`Invalid HTML position`. Build the full string in one expression.

Returning `false` from an attribute expression **removes** the attribute (vs `""`
which keeps it present-but-empty) — the clean way to toggle `disabled`/`hidden`:

```ts
html`<button disabled="${() => !canSubmit()}">Save</button>`
```

## Properties, events, lists

```ts
html`<input .value="${() => data.text}" />`                 // .prop = IDL property
html`<button @click="${() => data.count++}">+</button>`     // @event
html`${() => data.items.map((i) => html`<li>${i.text}</li>`.key(i.id))}`  // keyed list
```

Keyed lists preserve DOM across reorders; mutate item fields in place for
fine-grained updates instead of replacing the whole array.

## Async sections

```ts
import { boundary } from "@arrow-js/framework"
const Card = component(
  async () => { const d = await load(); return html`<div>${d.label}</div>` },
  { fallback: html`<div>Loading…</div>` }   // shown while pending
)
html`${boundary(Card())}`
```

Works client-side with no SSR. `boundary()` only takes `{ idPrefix }`; the
visible loading state comes from the async component's `fallback` option.

## Hard footguns (cause `Invalid HTML position` at render)

1. **No literal HTML comments inside templates.** Arrow uses HTML comments as
   expression-slot markers, so a literal `<!-- … -->` inflates the slot count and
   throws. Use JS `//` comments outside the template literal.
2. **No partial attribute values** (see Attributes above).

Both pass `tsc` cleanly and only fail at render — so always verify in a browser,
and guard them in CI (scan source for `<!--` inside template modules).
