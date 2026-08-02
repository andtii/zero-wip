# RFC 0003 — Contract expressiveness: modifiers, axis fidelity, and the conformance program

- **Status**: Proposed
- **Tracking issue**: #156
- **Affected repos**: `signalxjs/zero` (this repo) only. RFC 0001's target SPI is
  orthogonal — everything here is authoring-surface and web-target work, and none
  of it waits on #97.
- **Decisions locked before this RFC**:
  1. **Zero guarantees visual fidelity, not API-surface fidelity.** Every visual
     state a design system can paint, zero can paint. Prop *names* are an
     adapter-package concern.
  2. **Presence-only modifiers get their own prefixed namespace** (`data-mod-*`),
     declared by the design system, disjoint from zero's flag vocabulary by
     construction.
  3. **Axis vocabularies stay design-system-wide.** Per-component *narrowing*
     already exists in the generated types; per-component *declaration* waits for
     the content tier.
  4. **A conformance claim is only as good as the artifact that executes it.**
  5. **All of it lands before #17** — nothing is published, so every breaking
     change here is free exactly once.

## 1. Motivation

RFC 0002 made the axis vocabularies *declared* and *typed*: a design system says
which colours, sizes and variants it offers, the validator closes those sets, and
`register.d.ts` narrows the props per component per design system. That machinery
works. What it has never been asked is whether the vocabularies it projects can
describe a design system nobody in this repo wrote.

The answer, measured rather than assumed, is *mostly — with three real holes and
one false claim*.

### 1.1 The variant vocabulary is convention wearing the costume of a contract

All four design systems declare the same four variants, independently:

```ts
variants: ['solid', 'outline', 'soft', 'ghost'],
```

`zero-basic/src/tokens.ts:88`, `zero-daisyui/src/tokens.ts:65`,
`zero-material/src/tokens.ts:127`, `zero-brutalist/src/tokens.ts:105`. Four
separate declarations that happen to agree. There is no shared list, no
recommended default (unlike `roles` and `sizes`, `variants` has none —
`zero-kit/src/tokens.ts:197-205`), and nothing that would notice if the fifth
design system declared something else.

That the four agree is not itself wrong. What is wrong is that the repo has no
way to tell the difference between "the contract requires this" and "we typed the
same thing four times". `zero-material` already carries the tell — it maps rather
than renames, and says so out loud:

```ts
// packages/zero-material/src/recipes.ts:364-365
variant: {
    // Material calls these filled / outlined / tonal / text.
    solid: { … }
```

Material Design's fifth button style, `elevated`, has nowhere to go in a
four-name vocabulary. Nobody decided that; the shape of `zero-basic` decided it.

A sharper symptom sits in the showcase. `examples/playground/src/App.tsx:66`
iterates a literal:

```tsx
{(['solid', 'outline', 'soft', 'ghost'] as const).map((variant) => (
```

A design system declaring a fifth variant compiles, validates, emits CSS and
type-checks correctly — and is then **invisible in the one screen built to
demonstrate it**, silently, with no error. The toolbar enumerates themes from the
registry; the variant row does not enumerate anything.

### 1.2 The extensibility mechanisms are entirely unexercised

Grepping the four design systems for the features that make the vocabulary open:

| Mechanism | Design systems using it |
|---|---|
| `compoundVariants` | **none** |
| `tokens.axes` (custom axes) | **none** |
| `tokens.sizes` (declared ramp) | **none** |
| `theme.components` | **none** |

Only kit unit tests touch any of them. So the single feature that makes an axis
surface extensible — custom axes — has no design-system-level coverage at all,
and `compoundVariants`, the mechanism a non-orthogonal vocabulary needs most, has
never emitted a byte of shipped CSS. §6.1 shows it is also broken.

### 1.3 Real design systems do not share our axis topology

Checked against current vendor documentation rather than memory:

| System | Axis surface | What it stresses |
|---|---|---|
| **HeroUI v3** | **no `color` prop**; `variant` = `primary, secondary, tertiary, outline, ghost, danger, danger-soft`; `isIconOnly`, `isPending` | colour and treatment **fused** into one axis, re-cut as semantic hierarchy; presence-only modifiers |
| **HeroUI v2** | `color` (6) × `variant` (7: `solid, bordered, light, flat, faded, shadow, ghost`) | orthogonal, but 7 ≫ 4 |
| **Material 3** | 13 roles, `level1–5` elevation; button `filled/tonal/outlined/text/elevated`, chip `assist/filter/input/suggestion` | per-component variant divergence |
| **Radix Themes** | `variant` + `color` + `radius` + numeric `size` (1–4) + `highContrast` | numeric ramps, boolean modifier, DS-level extra axes |
| **Ant Design** | axis named **`type`**; boolean `danger` / `ghost`; `shape` | the axis has a different *name* |
| **Carbon** | axis named **`kind`**; no colour axis | ditto, plus colourlessness |

Three distinct pressures fall out, and only one of them is about names:

1. **Presence-only modifiers** (`isIconOnly`, `highContrast`, `danger`,
   daisyUI's own `btn-block`/`btn-wide`) have no faithful encoding — §3.
2. **Non-orthogonal vocabularies** (`danger-soft` as one member; no `color` axis
   at all) need `compoundVariants` to work and `roles: {}` to be real — §6.1, §8.
3. **Renamed axes** (`type`, `kind`) are a question about what zero promises at
   all — §2.

## 2. What "any design system can be built on this" means

The claim is ambiguous, and the ambiguity is the entire cost driver.

- **Claim A — visual and behavioural fidelity.** Every visual state a design
  system can paint, zero can paint; every interaction it supports, zero's
  behaviors support.
- **Claim B — API-surface fidelity.** Every design system's *consumer API* is
  reproducible: Ant's `type`, Carbon's `kind`, HeroUI's `isIconOnly` appear as
  themselves.

**This RFC commits to Claim A and explicitly declines Claim B.**

Claim B means the three named axis props become renameable per design system.
That breaks the thesis the repo is built on. `examples/playground` swaps design
systems at runtime over the same JSX — a `<link>` swap plus a registry re-seed
(`examples/playground/src/design-systems.ts`). If `variant` is `variant` under
daisyUI and `type` under an Ant-flavoured system, the same component tree means
two different things depending on which stylesheet loaded, and the swap silently
renders wrong instead of failing. The pass-through attributes
(`data-color`/`data-size`/`data-variant`) are part of the anatomy contract for
the same reason `data-part` is: they are the stable surface tooling and
design systems agree on.

Claim B is also unnecessary. A renamed axis is reachable today with no contract
change at all, as a declared custom axis:

```ts
axes: { type: ['primary', 'default', 'dashed', 'text', 'link'] }
```

→ `<Button.Root axes={{ type: 'primary' }}>` → `[data-type="primary"]`, validated
and narrowed in `register.d.ts` like any other axis. A thin
`@sigx/zero-antd/components` wrapper mapping `type` → the axis bag restores the
native prop name for consumers who want it. That wrapper is a *package*, not a
contract change — and it is exactly the shape a design system's own component
layer takes when it is rebuilt on this framework.

So the conformance matrix (§7) grades a renamed axis **`renamed`**, not
**`unsupported`**, and names the adapter as the remedy. `unsupported` is reserved
for things zero genuinely cannot paint.

## 3. Presence-only modifiers — the `data-mod-*` namespace

### 3.1 The hole

Zero owns a closed boolean-flag vocabulary, and says so in three places
(`packages/zero/src/contract/data-attrs.ts`, the manifest schema, and
`RESERVED_AXES`):

```ts
/**
 * The shared boolean-flag vocabulary. Components never invent synonyms —
 * a new flag is a contract change.
 */
export const FLAG_VOCABULARY = [
    'disabled', 'highlighted', 'selected', 'invalid', 'required',
    'readonly', 'placeholder', 'focus-visible', 'pressed', 'press-animating',
] as const;
```

That closure is correct and must stay: presence-only flags are how the anatomy
contract expresses *state*, and a design system minting `data-busy` would be
inventing anatomy.

But it leaves design systems with **enumerations only**. Every variant compiles
to `[data-<axis>="<value>"]` — the value is mandatory. The closest encoding of a
presence-only modifier is a one-member axis:

```ts
axes: { block: ['block'] }        // → axes={{ block: 'block' }} → [data-block="block"]
```

which restates the name as its own value and reads wrong in devtools. This is a
fidelity gap rather than a hard impossibility, but it is the gap that daisyUI's
own `btn-block`/`btn-wide`/`btn-square`/`btn-circle` family falls into — in the
design system this repo already ships.

### 3.2 Why a prefixed namespace, and not the alternatives

| Option | Verdict |
|---|---|
| Bless the 1-member axis as the idiom | Free, but the redundant value is permanent noise. Keep it documented as an escape hatch, not the answer. |
| A boolean *value type* inside `axes` | Makes `AxesFor<S>` a heterogeneous mapped type and pushes a discriminant through `CompiledComponentAxes`, the manifest and the register generator. Rejected: it makes a monomorphic mechanism polymorphic. |
| Unprefixed sibling `data-<name>` | Reads best, and is the one option that is **unsafe**. The collision guard is `RESERVED_AXES`, which is *versioned*. If zero adds flag `data-busy` in a later version and a design system already ships modifier `busy`, every `[data-busy]` rule silently starts matching zero's runtime flag. Rejected. |
| **Prefixed `data-mod-*`** | **Chosen.** Provably disjoint from zero's flag vocabulary forever, so zero can evolve its flags without breaking a shipped design system. One prefix in devtools is the price. |

This draws a principled line worth stating explicitly: **prefix modifiers, do not
prefix axes.** Axes are valued, so a name collision with a presence-only zero
flag can never match a rule, and `variantAttrs` already throws loudly at runtime
for a reserved axis name. Modifiers are presence-only, so a collision is
exactly-shaped and silent. Different hazard, different treatment.

It also mirrors the anatomy contract's own split — enumerated `data-state` versus
presence-only flags. Two mechanisms in the contract, two mechanisms in the
authoring surface.

### 3.3 The surface

| Layer | Addition |
|---|---|
| `zero-kit/src/tokens.ts` | `TokensInput.modifiers?: readonly string[]` — DS-wide, validated by the existing `checkAxisValues` (kebab-case, non-empty, no duplicates) |
| `zero-kit/src/recipes.ts` | `RecipeInput.modifiers?: Record<string, Record<string, PartStyles>>` — name → part → styles |
| `targets/web/recipe-css.ts` | emit through the existing `variantSelector(component, host, '[data-mod-<name>]')`, reusing the carrier/descendant projection unchanged |
| `compoundVariants[].match` | accepts `true` for a modifier name, contributing `[data-mod-<name>]` — this is also the answer to compound/flag participation (§10.2) |
| `zero-kit/src/design-system.ts` | `CompiledComponentAxes.mods: string[]`, harvested alongside the axes |
| `targets/web/register-dts.ts` | `mods: { 'icon-only'?: boolean }`, or `Record<string, never>` when none — the same top-type trap the `axes` line already avoids |
| `zero/src/contract/props.ts` | `WithMods<S>`; `variantAttrs` grows a `mods` branch emitting `data-mod-<k>=""` and skipping falsy values |
| `zero/src/contract/vocabulary.ts` | `ModsFor<S>`, following `AxesFor<S>`'s three-case guard exactly (including the `[Scoped<S>] extends [never]` ordering rule) |
| validator | the "declared but wired by nothing" warning extends to modifiers |

Modifiers are **presence-only by construction**: the emitted attribute has no
value, so there is no vocabulary to close beyond the names themselves, and no
`defaultVariants` analogue (absence *is* the default).

## 4. Axis vocabularies stay design-system-wide

**Amended and discharged (#294) — they no longer do.** The deferral below and
both of its corrections are settled in **§4.1**, which also closes the per-part
question §9.1 left open. The section is kept as written because it is the record
of what was deferred and why the deferral was reasonable at the time.

`tokens.variants`, `tokens.sizes`, `tokens.roles` and `tokens.axes` are declared
once per design system, and the validator closes each set globally. Material's
button variants and its chip variants would therefore have to pool into one flat
list, with nothing able to say "these belong to button only".

**Deferring this, deliberately.** The harm is smaller than it looks:
`register.d.ts` already narrows **per component** from the recipe harvest, so a
consumer writing `<Button variant="assist">` under Material is *already* a type
error. What is design-system-wide is only the declaration, the closed-set
validation, the manifest listing and the unwired warning — so the only mistake
left uncaught is an **authoring** one, a chip variant appearing in a button
recipe. Zero has no chip. HeroUI v3 has one flat variant set and needs no
partition either.

**Do the cheap half instead.** Generalise the colour-only cross-component
divergence warning into an **axis-agnostic partition report**: for every axis,
list the per-component value sets and flag any component wiring a strict subset
of its siblings. That belongs in `--report` (§7.4), not in a new authoring
surface.

**Revisit when the content tier lands** (card, alert, badge, chip — RFC 0002 §8
already names them). The design at that point is additive and therefore free to
defer: an optional per-scope **restriction** map that narrows, never widens, the
design-system-wide set, for validation and the manifest only.

**A second trigger arrived first (#175, §9.1).** The fourteen unwired `variant`
carriers are a waiting caller *today*, not at the content tier: twelve of them
have a variant in a surveyed design system, none in this vocabulary, and they
cannot be wired until a scope can carry its own. Two corrections to the
paragraph above, both from that survey:

- A map that only *narrows* is not enough on its own. `select` needs `classic`
  and `surface`, which the button's set does not contain — so
  `tokens.variants` has to become the **union** of every scope's vocabulary,
  with each scope restricting to its subset. That is still additive, but it
  changes what the design-system-wide declaration *means*.
- Radix's Select varies Trigger and Content with **different** vocabularies, so
  the unit of restriction may be the **part**, not the scope. Settle that before
  building, because per-scope is not a strict subset of the problem.

### 4.1 The unit is the scope, and `tokens.variants` is the union (#294)

**Landed as `tokens.scopes`.** A design system may declare, per component scope,
which part of each axis vocabulary that scope offers:

```ts
// packages/zero-kit/src/tokens.ts — TokensInput
variants: ['solid', 'outline', 'classic', 'surface', 'soft'],   // the UNION
scopes: {
    button: { variants: ['solid', 'outline'] },
    select: { variants: ['classic', 'surface', 'soft'] },
},
```

Both corrections above are adopted. `tokens.variants` is now **the union of
every scope's vocabulary**, and a scope narrows to its own subset — which is
what makes `select` expressible at all, since `classic` and `surface` are in no
button's set to narrow from. The restriction is keyed by the **(scope, axis)
pair** and covers every axis — `variant`, `size`, `color`, `tokens.axes` and
`tokens.modifiers` — rather than `variant` alone. Restricting only `variant`
would have left `tokens.axes` design-system-wide and unrestricted, which is this
section's own defect reproduced one level down; and the demonstrated
non-`variant` caller already exists, since #258 was a **size** problem.

Two spellings, and the difference is load-bearing: an **absent** key means the
scope offers the whole union; an **empty list** is the claim "this scope has no
such axis at all", the same grammar `sizes: []` uses design-system-wide (§5).

**Settled: the restriction unit is the scope, not the part.** Radix's Select —
Trigger `classic | surface | soft | ghost`, Content `solid | soft` — is
expressible today with no contract change at all, as `variant` carrying the
trigger vocabulary plus a declared custom axis carrying the surface one.
`variantSelector` already emits
`[data-part="root"][data-<axis>="v"] [data-part="popup"]`, and that selector
matches because **zero has no portals**: `Select.Popup` is a `popover="auto"`
element rendered inside `Select.Root`, and the top layer changes paint order,
not tree position (`Dialog.tsx`, `Toast.tsx` both say so). So one scope with two
vocabularies is one scope with two **axes**.

Two further observations dissolve the case rather than merely working around it.
The vocabularies are not select's: `classic | surface | soft` is the *field
chrome* set six other carriers in the `NO_VARIANT` ledger want, and
`solid | soft` is a *floating surface* set `menu`, `popover` and `dialog` would
share — so this is a cross-scope shared axis, the opposite of a per-part
problem. And `select.trigger` declares `asChild`, which is how Radix's own
DropdownMenu delegates trigger chrome to a Button. **No component in
`packages/zero/src/components/` requires two variant vocabularies in one scope.**

**Per-part is deferred, not rejected, and the deferral is insured rather than
argued.** A `parts` key inside a scope entry is reserved and rejected by name,
exactly as `DesignSystemApi` reserves `components`, so adding it later is
additive with scope-level values as the part-level default. Two prerequisites
are recorded for whoever revives it: `PartSpec` declares no part containment, so
resolving part → carrier needs a part tree across every anatomy; and
`carrierPart` already resolves to `trigger` for the four rootless scopes
(`dialog`, `menu`, `popover`, `tooltip`), where the descendant selector can
never match — harmless only because none of the four carries an axis today.

**The honest argument against.** The web target is not the only target. RFC 0001's
target SPI guarantees no descendant selector, and on a platform where each part
is an independent view "the carrier's attribute reaches its descendants" is a web
accident. Per-scope is correct for the web target and for every surveyed design
system, not correct in principle; the portable formulation would be a carrier
declarable **per axis**, which is cheap to add later and buys nothing today.

**What the union costs, and how it is paid back.** The design-system-wide list
stops meaning "the vocabulary" and starts meaning "every value some scope
offers", so two diagnostics exist purely to keep that honest:

- **Cross-talk.** If one scope narrows an axis and a styled sibling does not, the
  sibling is still offering values declared for someone else. `validateDesignSystem`
  warns at the declaration; `axis-value-coverage.test.ts` reports it as a
  coverage gap against the sibling. That is the union's honest consequence, not a
  bug to engineer around — the escape is to restrict the sibling too, and
  restating the whole union is explicitly *not* warned about for exactly that
  reason.
- **Unclaimed.** A union value in no scope's vocabulary is a new finding class,
  reported by the validator and by rule C, and reachable only once every styled
  scope is restricted — while one is open, its vocabulary *is* the union.

**What deliberately did not change.** `register.d.ts` still emits the **harvest**,
not the declaration. Because wiring a value outside a scope's vocabulary is now
an error, the harvest narrows to the scope vocabulary anyway, and it is strictly
stronger: it additionally refuses to type a value the compiled CSS does not
implement, which is the RFC 0002 §4.1 tier-2 failure #103 removed. And
`api.components` stays reserved — per-scope *vocabulary* does not imply per-scope
*api*, and the two must not get conflated.

**The fourteen are unblocked but not wired.** None of the six design systems
declares a vocabulary for them, so `never` remains the correct compiled answer
and the `NO_VARIANT` ledger stands — with its reasons now meaning "not declared
yet" rather than "cannot be said". Wiring one costs its recipes plus the contrast
audit's ancestor chains: thirteen of the fourteen carry their axes on a part that
renders no text, so the one-element probe cannot reach them.

## 5. `sizes: []` — the size axis becomes opt-out

Today an empty ramp is a hard error and an omitted one is silently replaced:

```ts
// zero-kit/src/resolve/validate.ts:367-370
if (sizes.length === 0) {
    error('tokens.sizes', 'declared but empty — omit it to take the recommended ramp');
}
```
```ts
// zero-kit/src/contract.ts:232-234
export function resolveSizes(sizes: readonly string[] | undefined): readonly string[] {
    return sizes ?? SIZE_SCALE_LIST;
}
```

So **every compiled manifest advertises a size ramp**, including for a design
system that has no size axis at all. The manifest lies, and the docs site and the
generation skill read the manifest.

Compare `roles`, which already handles this cleanly: `roles: {}` is legal,
required colour tokens collapse to the base surfaces, and a colourless design
system genuinely works. The asymmetry is an oversight, not a decision.

**`sizes: []` becomes legal and means "this design system has no size axis".**
`resolveSizes([])` returns `[]`; the validator errors on any recipe keying
`variants.size`; `register.d.ts` emits `size: never` for every component; the
manifest lists `[]`. Omitting `sizes` keeps its current meaning — take the
recommended ramp — so no existing design system changes.

## 6. Correctness fixes the survey exposed

These are not expressiveness questions. They are defects found while asking
expressiveness questions, and two of them are only invisible today because no
design system uses the feature.

### 6.1 `compoundVariants` silently ignores `defaultVariants`

The single-axis loop mirrors a defaulted value onto the attribute's absence:

```ts
// zero-kit/src/targets/web/recipe-css.ts — inside the variants loop
if (recipe.defaultVariants?.[axis] === value) {
    const dflt = variantSelector(component, host, `:not([${attr}])`);
    emitPartStyles(component, partName, styles, dflt, sink, context, registry, suffix);
}
```

The compound loop immediately below it has **no such branch** — it builds a
conjunction of `[attr="value"]` fragments and nothing else. So with
`defaultVariants: { variant: 'solid' }`, a compound matching
`{ variant: 'solid', color: 'primary' }` **does not apply** to
`<Button.Root color="primary">`: the attribute is absent, `[data-variant="solid"]`
does not match, and nothing reports it. The validator only checks that
`defaultVariants` names something the recipe wires.

**Fix:** build the compound selector as a cross product. Each matched axis
contributes `[attr="v"]` normally, and *both* `[attr="v"]` and `:not([attr])`
when it is the default — then map each combination through `variantSelector` and
join the results into one comma-separated selector list, emitted as a single
declaration block. With *k* defaulted axes in the match that is ≤2^k selectors,
in practice ≤8, and one block means no specificity or ordering surprise.

**Plus two validator rules**, beside the existing compound checks:

- **error** when a compound matches an axis the recipe never wires in `variants`
  — today that value is silently harvested into the generated type union while
  the CSS only half-supports it.
- **warning** on an unreachable match — a combination no single-axis rule covers.

This is the only silent-wrong-output bug in the set, and `compoundVariants` is
precisely the mechanism a fused vocabulary like HeroUI v3's needs. It has zero
blast radius today (§1.2) and would bite on day one of the first real skin.

### 6.2 `ThemeInput.components` is inert, not merely unscoped

The field is documented as per-component theme overrides
(`{ button: { '--btn-radius': '9999px' } }`), but the emitter discards the
component key:

```ts
// zero-kit/src/targets/web/tokens-css.ts:164-168
for (const overrides of Object.values(theme.components ?? {})) {
    for (const [name, value] of Object.entries(overrides)) {
        props[name] = value;
    }
}
```

Worse than unscoped, it cannot do the one thing it is named for. Those
properties are emitted inside `@layer zero.tokens`, while every `recipe.tokens`
declaration is emitted inside `@layer zero.recipes`, and
`packages/zero/css/base.css` orders them:

```css
@layer zero.fallback, zero.tokens, zero.recipes, zero.structure;
```

*(`zero.structure` was appended in #209 — see the remedy below, which it is the
first instance of: it carries the `[hidden]` guard that no design system may
overrule.)*

Layer order beats specificity unconditionally, so a `theme.components` entry can
**never override a component token the recipe declares** — which is precisely
what "component overrides" means. It does still *define* a token the recipe only
references; but in that case it is indistinguishable from `theme.extra`, which
emits into the same bag at the same scope (the only differences being that
`extra` normalises a missing `--` prefix, and that `components` carries a scope
key nothing reads). So the field is dead for its stated purpose and a duplicate
everywhere else. No design system uses it.

**Remove it.** If a real requirement appears later, the correct design is
`[data-theme="t"] [data-scope="s"]` emitted into a new layer *after*
`zero.recipes`, with the scope validated against the anatomy manifest and the
token name validated against that component's declared `recipe.tokens` keys.
Do not build that speculatively.

The "new layer after `zero.recipes`" remedy is no longer hypothetical:
`zero.structure` (#209) is exactly that shape. A declaration that must outrank
every design system gets a later layer — never `!important`, which would also
outrank the consumer's own unlayered app CSS.

### 6.3 Unvalidated token names

Two gaps, both one rule each:

- **`recipe.tokens` keys are not checked at all** — not for kebab-case, not for
  the `--` prefix. A key missing `--` passes straight through the property
  emitter and becomes a real CSS declaration on every carrier element of that
  component. Require `/^--[a-z][\w-]*$/`.
- **Role names can collide with derived properties.** A role named `danger-soft`
  emits `--color-danger-soft`, which is also what role `danger` derives. Nothing
  detects it, though `tokens.custom` gets exactly this check. Compute the derived
  property set per role and error on duplicates. `danger-soft` is a real HeroUI
  v3 variant name, so this is a live collision, not a synthetic one.

## 7. The conformance program

An assertion that "any design system can be built on this" is worth nothing
without artifacts that execute the claim. This section defines how the claim is
recorded, graded and kept honest.

### 7.1 Three artifacts, split by lifetime

| Artifact | Path | Lifetime |
|---|---|---|
| The rules — tiers, columns, what each fidelity grade means | this RFC | frozen |
| The data — the matrix itself | `docs/design-system-conformance.md` | living |
| The proof — compiling fixtures | `packages/zero-kit/skills/design-system/conformance/*.ts` | executing |

The fixture location reuses an existing pattern rather than inventing one:
`skills/design-system/briefs/` already ships compiling `TokensInput` + Button
`RecipeInput` files, exercised by `__tests__/briefs.test.ts`. `conformance.test.ts`
mirrors it. The design-system generation skill can then cite the fixtures as
worked examples of non-default axis surfaces, which is free value for the
generation loop.

### 7.2 The rows, and why these

Six rows in three tiers, chosen so each stresses a *different* contract
dimension — not a popularity ranking.

**Tier 1 — must be buildable, or Claim A is false:**

| System | Forces |
|---|---|
| HeroUI v3 | no colour axis; colour × treatment fused into one 7-member variant; presence-only modifiers |
| Material 3 | 13 roles, `level1–5` elevation, per-component variant divergence |
| Radix Themes | numeric size ramp (1–4), `highContrast` boolean, DS-level `radius`/`scaling` axes |

**Tier 2 — buildable with a documented adapter (§2):**

| System | Forces |
|---|---|
| Ant Design | axis named `type`; boolean `danger`/`ghost`; a `shape` axis |
| Carbon | axis named `kind`; no colour axis |

**Tier 3 — already proven in-repo, rows generated rather than written:** basic,
daisyUI, material, brutalist — plus daisyUI's `btn-block`/`btn-wide` family as
the in-repo evidence for §3.

Deliberately **one full design-system package** beyond the existing four (§8).
Radix, Ant and Carbon stay button-only fixtures: they prove the contract at a
fraction of the cost, and every full skin has to stay green in the Playwright
state-matrix contrast audit forever.

### 7.3 Columns and grades

One row per *(system × axis surface)*:

1. **System** and **Source** — versioned documentation URL, plus the date it was
   last verified
2. **Their axis name** (`type`, `kind`, `variant`, …)
3. **Kind** — `enumeration` | `presence-flag` | `numeric ramp` |
   `per-component-divergent`
4. **Their vocabulary**
5. **Zero mapping** — `variant` / `sizes` / `axes.<name>` / `modifiers.<name>` /
   raw `selectors`
6. **Fidelity** — `exact` (same prop name and shape) | `renamed` (adapter, same
   shape) | `reshaped` (e.g. boolean → modifier) | `unsupported`
7. **Blocking gap** — issue number; empty if and only if `exact`
8. **Proven by** — the in-repo executing artifact

### 7.4 Staying honest — three mechanisms, no scraping

1. **Column 8 is load-bearing.** A row may claim `exact` or `renamed` only if it
   names a real, executing artifact: a fixture file, a design-system package, or
   a named test. That turns the document from prose into a test manifest.
2. **A parity test**, in the shape of the existing `contract-parity.test.ts`:
   every Tier-1/2 row must have a fixture and every fixture must have a row.
   Drift becomes a failing test rather than a stale document. Each fixture
   asserts the *emitted selector strings*, so a compiler regression breaks the
   conformance claim directly rather than quietly.
3. **`sigx zero:validate --report`** — scoped in RFC 0002 §8 as `zero-kit
   validate --report`, before #155 rebuilt the CLI as a `sigx` plugin — emitting
   components styled, axes wired per component, declared-but-unwired values,
   states covered, the §4 axis partition report, and the minimum contrast margin
   per theme. **Tier-3 rows are generated from the four in-repo reports**, so
   they cannot go stale by hand.

Automated vendor-documentation checking is explicitly **out of scope**. It rots,
then gets muted, and a muted check is worse than none. A dated source column plus
a re-verification item on the release checklist is the honest amount of process.

## 8. `zero-heroui` — the acceptance test

The repo already has the pattern: `zero-material` exists as "the acceptance test
for extensible vocabularies" (13 roles, a five-step elevation ramp, its own
easings and breakpoints), private, proving the contract rather than shipping a
licensed token set. This RFC adds its counterpart.

**`packages/zero-heroui` — the acceptance test for non-orthogonal axis surfaces
and presence-only modifiers.** Private, web-only, values approximated from public
documentation.

**Targeting HeroUI v3 deliberately, not v2.** v2 is orthogonal colour × variant,
which is structurally what `zero-basic` already is; it would prove nothing beyond
a longer list. v3 is the hard case, and every hard part of it maps onto something
this RFC changes.

**#99 is re-scoped in place, not refiled** — the same treatment RFC 0002 gave its
phase issues. Its lynx-first framing and its #97 gate both go: #97 (target SPI)
is still open and would block this indefinitely, the internal `lynx-heroui` is
being rebuilt on this framework anyway, and the public v3 surface is the one
worth testing against. The lynx target becomes a follow-up mirroring #100.

**Acceptance checklist:**

1. **Spike `roles: {}` first, before committing to the package.** A colourless
   design system *should* work — `resolveRoles({})` returns `{}` and the required
   tokens collapse to the base surfaces — but `defaultSwatch` degrades to
   `['base-100', 'base-content']` and the contrast pairs degrade with it. Half an
   hour of verification that de-risks the whole issue.
2. `variants` declared as v3's seven, closed-set validated — a vocabulary
   emphatically not `{solid, outline, soft, ghost}`.
3. `modifiers: ['icon-only', 'pending']` wired on button (§3).
4. **At least one `compoundVariants` entry whose match includes a defaulted
   axis** — the direct end-to-end regression test for §6.1, and the first use of
   `compoundVariants` by any design system.
5. `sizes` declared explicitly, so the closed-set rule engages — nothing in the
   repo declares the ramp today (§1.2).
6. Green under the existing Playwright state-matrix contrast audit, both colour
   schemes.
7. A fifth switchable entry in `examples/playground/src/design-systems.ts` — and
   the variant row reading the active design system's declared vocabulary instead
   of the literal at `App.tsx:66` (§1.1).

Item 7's second half is a prerequisite for the whole exercise being visible, not
a nicety.

## 9. Migration phases

| Phase | Issue | Work | Gate |
|---|---|---|---|
| **1** | this RFC | Decisions recorded; §6 correctness fixes filed and landed independently: the compound×default cross product, `ThemeInput.components` removal, `recipe.tokens` key grammar, role derived-token collisions. | A recipe with `defaultVariants: {variant:'solid'}` and a compound matching `{variant:'solid', color:'primary'}` applies to a `<Button color="primary">` carrying no `data-variant`; a seeded bad `recipe.tokens` key and a seeded role collision both error. |
| **2** | §3, §5 | `TokensInput.modifiers` + `RecipeInput.modifiers` + `mods` prop + `data-mod-*` emission + register narrowing + compound participation; `sizes: []` opt-out. | Golden `register.d.ts` shows `mods` narrowing and `size: never` under an opted-out ramp; `pnpm test:types` has positive and `@ts-expect-error` assertions for both; `contract-parity.test.ts` covers the new prefix. |
| **3** | §7 | `sigx zero:validate --report` including the §4 axis partition report; `docs/design-system-conformance.md`; the Tier-1/2 fixtures and the row↔fixture parity test. | `pnpm test -- conformance` green; every Tier-1/2 row compiles and emits the selectors it claims; Tier-3 rows regenerate from the four in-repo reports. |
| **4** | #99 re-scoped | `zero-heroui` per §8, plus the playground reading the declared vocabulary. | The checklist in §8, end to end: a scratch app importing `@sigx/zero-heroui/register` accepts `variant="danger-soft"`, rejects `variant="solid"`, rejects `color` entirely, and autocompletes `mods={{ 'icon-only': true }}`. |
| **5** | #103 follow-on | RFC 0002 phase-4 leftovers: the three `size` gaps (tabs, switch, toggle-group) and the four unwired components; then `variant` on the remaining ten — wire or record per component, **after** phase 4. | No component accepts an axis no design system wires, or the divergence is recorded per component with its reason. **Discharged — see §9.1: recorded for all fourteen (#175).** |

Phases 1 and 5's first half are independent of everything and may land at any
time. 2 gates 3 and 4. **The `variant` half of phase 5 is deliberately gated on
phase 4**: wiring `solid/outline/soft/ghost` across ten components × four design
systems is ~40 recipe blocks that encode the §1.1 convention harder, in exactly
the place a divergent design system has to unpick it. Done before `zero-heroui`
exists, it gets done twice — and for several of the ten the honest answer is "no
variant here", which `never` already encodes correctly.

### 9.1 Outcome of phase 5's `variant` half (#175)

**Recorded, not wired — for all fourteen carriers.** The gating instinct above
was right, and the survey that discharged it found the reason is sharper than
"for several the honest answer is no variant here". Against §7.2's set:

**Twelve of the fourteen do carry a variant in a real design system, and not one
of the twelve spells it `solid | outline | soft | ghost`.** Radix Themes varies
checkbox, switch, radio-group, slider, progress and text fields as
`classic | surface | soft`, its avatar as `solid | soft` and its segmented
control as `surface | classic`; Ant v6's AutoComplete is
`outlined | borderless | filled | underlined`; HeroUI v3's tabs are
`primary | secondary`. Only `rating-group` and `tree-view` have no style axis
anywhere in the set.

So the blocker is not effort and not taste — it is **§4**. The vocabulary is
declared design-system-wide and the four convention systems declared a
*button's*, so wiring these carriers means painting `ghost` onto a progress bar.
The fourteen are now §4's demonstrated caller, alongside the content tier.

One finding goes further than §4 as drafted: **Radix's Select varies its Trigger
as `classic | surface | soft | ghost` and its Content as `solid | soft`** — two
vocabularies inside one scope. Zero carries `variant` as a single attribute on
the scope's carrier part, so a per-*scope* restriction map would not express it
either. §4's revisit should treat per-part as the open question, not assume
per-scope closes it.

**Discharged — see §4.1 (#294): the unit is the scope, and the Select case is
two axes rather than two vocabularies.** The blocker named above is gone;
`tokens.scopes` landed and `tokens.variants` is the union. The fourteen are now
unwired by *decision* rather than by *inability*, which is a different sentence
with the same conclusion.

The per-carrier reasons live in the `NO_VARIANT` ledger in
`packages/zero-kit/__tests__/axis-coverage.test.ts`, which fails in both
directions: a new carrier arriving unrecorded, and a recorded reason whose
carrier has since been wired.

## 10. Open questions

1. **Does `roles: {}` survive the contrast audit?** The Playwright state-matrix
   audit hard-fails below 3:1 for every text-bearing part × state × design system
   × theme. With no roles, the pairs collapse to the base surfaces. Expected to
   pass trivially; §8's item 1 exists to find out before the package is written.
2. **Should modifiers participate in `defaultVariants`?** Absence is a modifier's
   natural default, so "default-on" would mean emitting `:not([data-mod-x])`
   styles — expressible, but no surveyed system wants it. Deferred until one does.
3. ~~**Compound negation / OR.**~~ Closed: the §6.1 cross product plus modifier
   participation in `match` covers every case in the §7.2 set. Real negation is a
   grammar change with no demonstrated demand.
4. ~~**`orientation` as a first-class axis.**~~ Closed as won't-fix. RFC 0002
   §10.5 already called it over-reach; all four design systems style it through
   raw `selectors`, and the manifest already carries the capability flag.
5. **Does the adapter-package pattern (§2) want kit support?** A generated
   `components/` wrapper mapping native prop names onto the axis bag could be
   emitted rather than hand-written. Out of scope here; revisit if a second
   design system wants one.

## 11. Tracking issues

Filed and cross-linked from **#156** (this RFC's tracking issue):

- **§6.1** — compiler: `compoundVariants` honour `defaultVariants`, plus the two
  validator rules
- **§6.2** — remove `ThemeInput.components` (inert by layer order)
- **§6.3** — validator: `recipe.tokens` key grammar and role derived-token
  collisions
- **§3** — design-system modifiers: `tokens.modifiers`, `recipe.modifiers`, the
  `mods` prop, `data-mod-*` emission, register narrowing
- **§5** — `sizes: []` opts out of the size axis
- **§7.4** — `sigx zero:validate --report` plus the axis partition report
- **§7** — the conformance matrix, its fixtures and the parity test
- **§8** — `zero-heroui`, **re-scoping #99 in place**
- **§8/§1.1** — the playground reads the declared axis vocabulary
- **§9 phase 5** — RFC 0002 phase-4 leftovers, split into the unblocked half and
  the `variant` half
- **§4 / §4.1** — per-scope axis vocabularies (`tokens.scopes`), the union, and
  the per-part decision — **#294**

Related and unchanged by this RFC: **#97** and **#100** (RFC 0001), **#51**,
**#118**, **#125**, **#126**. **#17** is the deadline — everything above is a
breaking change, and nothing is published yet.
