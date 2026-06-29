---
name: arrow-js-obsidian-templates
description: Use when writing @arrow-js/core (v1.0.6) html`` templates — the reactive-vs-static rule, full-value attribute binding (returning false removes the attribute), .property and @event binding, keyed lists, async component(fn, { fallback }) wrapped in boundary(), and the footguns: no literal HTML comments inside templates and no partial attribute values (both throw "Invalid HTML position" at render), plus @event handlers must type the param as Event not a narrowed subtype like MouseEvent (TS2345).
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

## Event handler typing

An `@event` handler must be assignable to `(e: Event) => void`. A handler typed
with a narrowed subtype fails (parameter contravariance) — `tsc` reports
`TS2345 … not assignable to 'ArrowExpression'`. Type the param `Event` and
narrow inside; no-arg handlers are always fine.

```ts
// ❌ TS2345 — narrowed param
html`<div @mousedown="${(e: MouseEvent) => resize(e)}">`
// ✅ widen, narrow inside
html`<div @mousedown="${(e: Event) => resize(e as MouseEvent)}">`
```

(document.addEventListener handlers are unaffected — they're DOM-lib typed.)

## Hard footguns

Render-time (pass `tsc`, fail only at render — always verify in a browser):

1. **No literal HTML comments inside templates.** Arrow uses HTML comments as
   expression-slot markers, so a literal `<!-- … -->` inflates the slot count and
   throws `Invalid HTML position`. Use JS `//` comments outside the template.
2. **No partial attribute values** — the expression must be the whole value
   (see Attributes above), else `Invalid HTML position`.

Type-time (caught by `tsc`):

3. **No narrowed `Event` subtype in `@event` handlers** (see Event handler
   typing above).

CI guards all three: `test/template-footguns.test.mjs` scans for `<!--` and for
inline handlers typed with a narrowed Event subtype; `tsc` covers the rest.
