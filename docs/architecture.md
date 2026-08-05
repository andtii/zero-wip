# SignalX Zero — architecture

This is the design doc of the system **as it exists in the tree**. It is
descriptive, not aspirational: every claim below is checkable against source,
and where a historical proposal and the tree disagree, the tree won. The
three RFCs that used to live in `docs/rfcs/` are deleted — this document
describes what they became; what each proposed and where it landed is
recorded in [§11 History](#11-history--the-rfcs-and-where-they-went), and
their full texts remain reachable in the git history of `docs/rfcs/`.

Two companion documents stay separate because they serve different readers:
[`docs/building-your-own-component.md`](./building-your-own-component.md) is
the guide for shipping a component zero doesn't (see [§8](#8-ecosystem-components)),
and [`docs/design-system-conformance.md`](./design-system-conformance.md) is
the **generated** conformance matrix (see [§7](#7-the-authoring-surface) for
the program that generates it).

## 1. Thesis and shape

Zero is a design-system-neutral component foundation for the web. The thesis
splits one product into two artifacts with a machine-checkable seam between
them:

- **`@sigx/zero`** ships unstyled, accessible compound components. Every
  rendered part carries `data-scope="<component>"`, `data-part="<part>"` and
  optionally one `data-state` value — a stable, machine-readable anatomy.
  Zero attaches **no styling** to any of it beyond a minimal structural
  `css/base.css`.
- **A design system is data**: typed tokens and recipes, compiled by
  **`@sigx/zero-kit`** (a Node-only authoring kit) into plain CSS that
  selects on the anatomy attributes. No Tailwind, no CSS-in-JS, no runtime
  styling engine.

The styling seam is **attributes, never classes or inline styles**. That one
rule is what makes everything else work: a design system can be swapped at
runtime by swapping a `<link>` (the playground does exactly this across six
design systems over the same JSX), a design system can be *generated* by a
model that has only read the manifest, and a component the design system has
never heard of renders unstyled but accessible — correctly attributed
anatomy, working behavior, `hidden` still honored. That fallback is the
baseline of the thesis, not an error state.

The package map, and what each package is *for*:

| Package | Role |
|---|---|
| `@sigx/zero` | The runtime foundation: anatomy contract, headless behaviors, 31 compound components, theme engine. Peer-depends on `sigx` only. |
| `@sigx/zero-kit` | The Node-only authoring kit: `defineTokens` / `defineRecipe` / `defineDesignSystem` / `defineApi`, the tokens+recipes → CSS compiler, validation, artifact emission, the `sigx` CLI plugin, the generation skill, and the JSON schemas. Never a runtime dependency. |
| `@sigx/zero-basic`, `@sigx/zero-daisyui` | Shipping design systems — the neutral starter and the daisyUI-flavoured proof that a design system is data. |
| `@sigx/zero-material` | Private acceptance test: **extensible vocabularies** (13 colour roles, a `level1`–`level5` elevation ramp, its own easings and breakpoints). |
| `@sigx/zero-brutalist` | Private acceptance test: a skin generated end-to-end from a style brief through the design-system skill. |
| `@sigx/zero-heroui` | Private acceptance test: **non-orthogonal axis surfaces** — no colour axis at all (`roles: {}`), colour fused into a seven-member `variant`, presence-only modifiers, a declared three-step size ramp. |
| `@sigx/zero-carbon` | Private acceptance test: the **vendor-named api surface** — a fused `kind` vocabulary with Carbon's double-hyphen spellings restored at the prop boundary by the generated `./components` module. |
| `@sigx/zero-ext-example` | Private acceptance test: the **ecosystem-component loop** — a component built entirely from zero's public surface and adopted by zero-basic via a manifest fragment ([§8](#8-ecosystem-components)). |
| `examples/playground` | The demo app and the e2e host: runtime design-system switching, one DS live at a time. |
| `examples/typed-app` | The consumer-side type capstone: three isolated programs compiled against **emitted** artifacts through real package exports ([§9](#9-the-verification-architecture)). |

Everything publishable is lockstep-versioned; nothing has been released yet,
which is why the contract could be broken freely as it hardened (every
breaking change in [§11](#11-history--the-rfcs-and-where-they-went) was free
exactly once).

## 2. The anatomy contract

The contract lives in `packages/zero/src/contract/` and every component's
`anatomy.ts`; the aggregate registry is `packages/zero/src/anatomy.ts`.

**Scope, part, state.** Every rendered part carries `data-scope` and
`data-part` (kebab-case). `data-state` holds exactly one value at a time from
a closed, per-part set. Boolean flags are presence-only (`data-disabled=""`,
never `="false"`).

**The part tree.** `PartSpec.parent` names the same-scope part a part renders
*inside* — the anatomy is a tree, with top-level parts (a lone `root`, or a
trigger/popup pair whose Root renders a fragment) as its roots. `parent` is a
statement about the rendered DOM, not the compound-component API, and it
names the **containing part, not the immediate parent element**: a menu
`item` declares `parent: 'popup'` even when it renders inside a `group`,
because other parts and consumer markup may sit between. Three consumers read
the tree: `expectAnatomy` asserts the declared parent appears among the
element's same-scope ancestors, the contrast audit derives its ancestor
chains from it instead of hand-maintaining them, and the recipe compiler uses
containment to bound descendant-anchored axis rules
([§3.3](#33-compilation)) and to detect dead rules on rootless scopes.

**States are governed.** `STATE_VOCABULARY`
(`packages/zero/src/contract/data-attrs.ts`) closes the `data-state` value
space the same way flags were closed from the start: every value in every
anatomy's `states` must be a member, and a new state value is a contract
change there first. The vocabulary is grouped into families — presence
(`open|closed`), selection (`checked|unchecked|indeterminate`), activation
(`active|inactive`), toggle (`on|off`), loading
(`loading|loaded|complete|error`), fill (`full|half|empty`) — but the
families are documentation, not a per-part constraint: membership is checked
against the union, so progress may legitimately mix `loading|complete` with
`indeterminate`. A companion `STATE_SYNONYMS` table maps the spellings the
vocabulary deliberately does *not* contain (`expanded → open`,
`mixed → indeterminate`, `busy → loading`, …) to the member that means the
same thing — purely diagnostic, so a governance failure is actionable rather
than a scavenger hunt. The table is mirrored in zero-kit (parity-tested) so
`mergeManifests` says the same thing to ecosystem fragments.

**Flags are a closed shared vocabulary.** `FLAG_VOCABULARY`: `disabled`,
`highlighted`, `selected`, `invalid`, `required`, `readonly`, `placeholder`,
`focus-visible`, `pressed`, `press-animating`. Components never invent
synonyms; a new flag is a contract change. The press pair is produced by
`createPressFeedback`: `pressed` while the pointer/key is physically down,
`press-animating` from press-start until the design system's press animation
*finishes* — not until release, so a one-shot ripple always plays out — with
the press point published as `--press-x`/`--press-y`/`--press-r`.

**Placements are declared, not exempted.** `PLACEMENT_VOCABULARY` closes
`data-placement` (twelve side/alignment values), and a part that can carry
the attribute declares which subset in its anatomy (`PartSpec.placements`) —
the anchored-position behavior stamps open floats with where they *actually*
are after flipping, and Toast stamps its viewport and roots. This replaced an
earlier blanket exemption: `expectAnatomy` now fails an undeclared
`data-placement` exactly as it fails an undeclared state.

**`hiddenIn` is a styling fact.** A part the runtime hides with the `hidden`
attribute in some state declares those states (`hiddenIn: ['error']` on
avatar's `image`). It belongs in the anatomy because it changes what a recipe
can honestly be asked to do: a rule targeting a hidden state can never paint,
so identical CSS across a hidden and a visible state is *correct*. The
state-legibility guard reads it from the manifest instead of carrying a
hardcoded exemption list. Every entry must be one of the part's own `states`,
and a part the runtime never hides omits the key — the schema rejects an
empty array, since a key claiming nothing reads as a fact where there is
none.

**Pseudo parts.** A part that renders no element of its own (dialog's
`backdrop`) declares `pseudo: { of, selector }`; selectors compose with the
pseudo-element last, so states narrow the host — the only thing an attribute
can narrow. The part stays real in the anatomy because a non-web platform
would render it as an element.

**The registry is typed closed.** `anatomies` in
`packages/zero/src/anatomy.ts` is declared `as const satisfies
Record<string, Anatomy>` — 31 components — so `ZeroScope` is a closed literal
union. That closure is load-bearing: the generated register artifact asserts
its scope keys against it at compile time ([§3.5](#35-the-register-artifact)),
which is what makes a typo'd or version-skewed scope a compile error instead
of a silent fall-through to the open unions.

**Enforcement.** `expectAnatomy` (`@sigx/zero/testing`) is the assertion
zero's own suite runs and ecosystem packages are told to run: declared parts
only, states from the closed set, flags declared and presence-only,
`data-placement` from the declared subset, `hidden` exactly where `hiddenIn`
says, and the declared `parent` present among same-scope ancestors. Custom
axes must be passed in explicitly (`{ axes: ['emphasis'] }`) and are checked
for grammar and non-collision with the contract. Runner-agnostic — it throws
a plain `Error`.

**Flow into tooling.** Each component's `anatomy.ts` is the source of truth:
the component imports its part names from it, tests assert against it, and
`scripts/gen-manifest.mjs` emits the whole registry (plus the attribute spec
and token grammar) as `dist/manifest.json` at build time
([§4](#4-the-manifest-contract)). Changing an anatomy is a breaking change.

## 3. The variant-axis pipeline

The centerpiece. A design system's styling *surface* — which colours, sizes,
variants, custom axes and modifiers each component answers to — travels a
single pipeline from declaration to a consumer's JSX, and every stage is
validated against the one before it:

```
declare (tokens.ts)  →  validate  →  compile (CSS)  →  harvest  →  emit types  →  runtime attrs
```

### 3.1 Declared vocabulary

`TokensInput` (`packages/zero-kit/src/tokens.ts`) declares, design-system
wide: `roles` (the colour vocabulary), `sizes`, `variants`, `axes` (custom
axis name → value list), `modifiers` (presence-only names), and `scopes`
(per-scope narrowing).

The grammar's load-bearing distinction: **absence means "I didn't say";
empty means "there isn't one".**

- `sizes: []` is legal and means *this design system has no size axis* —
  `resolveSizes([])` returns `[]`, every recipe keying `variants.size`
  errors, and the register artifact emits `size: never` everywhere. An
  *omitted* `sizes` takes the recommended ramp. `roles: {}` makes the same
  claim for colour (zero-heroui is the shipped proof: genuinely colourless).
- `variants: []` at the design-system level is currently an **error**
  ("declared but empty — omit it to leave the vocabulary undeclared");
  an omitted `variants` means "declared nothing, check nothing", not "no
  variant axis". The asymmetry with `sizes` is a known wart, tracked in
  [#295](https://github.com/signalxjs/zero/issues/295).

**Per-scope vocabularies** (`tokens.scopes`). A design system may declare,
per component scope, which part of each axis vocabulary that scope offers —
which reframes the design-system-wide lists as the **union of every scope's
vocabulary** rather than one vocabulary all scopes share. Inside a scope
entry the same absence/empty grammar applies: an absent key means the scope
offers the whole union, an empty list is the positive claim "this scope has
no such axis". The restriction unit is deliberately the **scope, not the
part**: zero carries one attribute per axis on the scope's carrier part, so
two vocabularies on two parts of one scope are two *axes*, not one axis
restricted twice — `parts` is reserved inside a scope entry and rejected by
name so per-part narrowing could be added later without a breaking change.
The shipped proof is `select` under zero-basic: its `variant` vocabulary
(`outline | soft | ghost`) is its own, not the button's.

Two mechanisms serve shapes the enumerated axes cannot:

- **Modifiers** are presence-only styling switches in a prefixed namespace:
  `tokens.modifiers: ['icon-only', 'pending']` →
  `mods={{ 'icon-only': true }}` → `data-mod-icon-only=""`. The prefix is
  the safety argument: modifiers are presence-only, exactly the shape of
  zero's own flags, so an unprefixed name would silently collide with a flag
  zero adds later. Axes are *valued*, so they need no prefix — a name
  collision can never match a flag rule, and the runtime throws on reserved
  axis names anyway. Absence is a modifier's default; there is no
  `defaultVariants` analogue for them.
- **Custom axes** (`tokens.axes`) carry everything else — a renamed or extra
  enumerated axis (`radius`, `shape`, Ant's `type`) becomes
  `axes={{ type: 'primary' }}` → `[data-type="primary"]`, validated and
  typed like the named three.

`defaultVariants` lives at **recipe** level: values applied when the axis
attribute is absent, i.e. CSS-only defaults.

### 3.2 Build-time validation

`validateDesignSystem` / `validateRecipes`
(`packages/zero-kit/src/resolve/`) enforce one principle stated in the
source: **an explicit declaration closes its set.** Colour against `roles`,
variant against `tokens.variants`, a custom axis against `tokens.axes`, size
against an *explicitly declared* `tokens.sizes`, and any value against a
scope's own `tokens.scopes` entry — all errors listing the declared set.
Only the default-resolved size ramp stays advisory (the author never wrote
the set down). The other rules worth knowing:

- **`defaultVariants` is validated unconditionally** — against the recipe
  itself (wired keys and values), so it needs no declaration to be checked.
- **An axis wired with zero values is an error** — the components emitter
  would otherwise print an empty union.
- **Compound variants**: matching an axis the recipe never wires in
  `variants` is an error (the value would be harvested into the type union
  while the CSS only half-supports it); matching a value the axis doesn't
  wire is a warning.
- **Union honesty diagnostics.** When one scope narrows an axis and a styled
  sibling does not, the sibling is still offering values declared for
  someone else — a *cross-talk* warning. A union value in no scope's
  vocabulary is *unclaimed* — reportable only once every styled scope is
  restricted, because an unrestricted scope's vocabulary *is* the union.
- **Token-name grammar**: `recipe.tokens` keys must be `--kebab-case` (a key
  missing `--` would be emitted as a plain CSS declaration on every carrier
  element); two roles whose derived properties collide (`danger` derives
  `--color-danger-soft`; a role literally named `danger-soft` emits the same
  property) are an error — a live hazard, since `danger-soft` is a real
  HeroUI variant name.
- Reserved names: an axis may not shadow a named prop (`color`, `size`,
  `variant`, `mods`, `axes`) nor anything the anatomy contract owns
  (`scope`, `part`, `state`, `orientation`, the flag vocabulary). The kit
  keeps its own copies of these sets — it must stay a pure Node tool — held
  honest by the contract parity test.

### 3.3 Compilation

`packages/zero-kit/src/targets/web/recipe-css.ts`. Axis rules are anchored
on the **carrier part**: the part named `root`, else the first declared part
(`carrierPart` in the kit's contract module). Four scopes have no `root` —
dialog, menu, popover, tooltip render a fragment Root — so their carrier is
the **trigger**, and their axis attributes live there.

For the carrier itself the rule is flat: the attribute sits on the element,
`[data-scope="s"][data-part="trigger"][data-variant="v"]`. For any other
part the attribute is on an *ancestor*, and a bare descendant selector is
unbounded — card-in-card would let the outer instance's axis rules reach the
inner one, with source order rather than proximity deciding. The compiler
therefore emits a **donut scope**:

```css
@scope ([data-scope=s][data-part=root][data-variant=v]) to ([data-scope=s][data-part=root])
```

The lower bound is any nested same-scope carrier — its subtree leaves the
scope. Two CSS facts make this correct: scoping proximity outranks source
order, so each part resolves to its *nearest* carrier; and an unscoped rule
counts as infinitely distant, so the axis refinement still beats the flat
base rules. Because the four rootless scopes render their popups as
**top-layer siblings** of the trigger, the donut can never reach them — so
the validator errors on any variant/modifier/compound rule for a part whose
declared `parent` chain does not reach the carrier: those selectors would
compile but never match ("dead rules"). Axis styling on those scopes styles
the trigger, in each skin's button idiom.

Other compilation facts a reader needs:

- **Defaults are mirrored onto absence.** A single-axis rule whose value is
  the recipe's default is emitted twice: `[attr="v"]` and `:not([attr])`.
  Compound variants take the same treatment as a **cross product**: each
  matched axis contributes `[attr="v"]`, plus `:not([attr])` when the value
  is that axis's default — without it, a compound naming a defaulted axis
  would match nothing, since the attribute is simply absent. (`match: true`
  contributes a modifier's presence attribute, which is how modifiers
  participate in compounds.)
- **Emission order is a correctness concern, not taste.** At-rules add no
  specificity, so conditional buckets are emitted in a fixed tier order —
  raw conditions, preference queries, breakpoints, reduced-motion,
  `@starting-style` — with reduced-motion late so an accessibility override
  is never overwritten by a wider viewport, and `@starting-style` after the
  open-state rules it interpolates from. The same prelude reached at two
  different tiers (a raw `@media (min-width: 640px)` next to a declared
  `sm`) is a hard error: its position would otherwise depend on visit
  order.
- Everything lands inside `@layer zero.recipes`; `@keyframes` are emitted
  outside the layer.
- Compound rules are emitted separately rather than comma-joined, because
  part-style emission appends pseudo-element suffixes and `&` substitutions
  that would bind only to the last selector of a list.

### 3.4 Harvest

`compileDesignSystem` (`packages/zero-kit/src/design-system.ts`) records,
per scope, what the recipes **actually wire**:
`CompiledComponentAxes { color, size, variant, axes, mods, defaults?,
offered? }`. Each axis's value set is the recipe's `variants` keys unioned
with every `compoundVariants[].match` value — the compiler emits CSS for
both, and the types must cover everything the CSS matches. `defaults` is
carried for the manifest but never widens a union (validation already
guaranteed membership). `offered` is the scope's resolved `tokens.scopes`
entry, present only when the scope restricts something: *offered is the
promise, the sibling fields are the delivery, and the gap between them is a
finding* — the coverage report and the register artifact read the same
shared predicates so they cannot disagree.

This is why the emitted types describe **the harvest, not the declaration**:
the harvest is strictly stronger. It refuses to type a value the compiled
CSS does not implement.

### 3.5 The register artifact

`packages/zero-kit/src/targets/web/register-dts.ts` emits
`dist/register.d.ts` + an empty `dist/register.js` for every design system.
The mechanism is module augmentation of one empty interface:

```ts
// @sigx/zero
export interface ZeroVocabulary {}
```

The generated file augments it with `theme`, `breakpoint`, `property`,
`tokens` (per-category key unions) and `components` — one entry per compiled
scope, each carrying `color` / `size` / `variant` / `axes` / `mods`. An app
opts in with one side-effect import (`import '@sigx/zero-basic/register'`);
without it, every scoped resolver falls back to the open unions, so **no
augmentation means no change for anyone**.

The encoding rules are where the correctness lives:

- **An unwired axis is `never`**, with a generated doc comment naming the
  reason (scope declared it empty, the design system has no such axis, or
  no recipe wires it) — so the error explains itself.
- **An empty `axes`/`mods` bag is `Record<string, never>`, never `{}`** —
  `{}` is the top object type and would silently permit any bag, which is
  the exact failure class the mechanism exists to remove.
- The consumer-side resolvers (`packages/zero/src/contract/vocabulary.ts`)
  keep three cases distinguishable — no augmentation → open fallback;
  declared → literal union; declared empty → `never` — and the
  `[Scoped<S>] extends [never]` guard must come **first**, because testing
  the axis result against `never` cannot separate "no augmentation" from
  "declared empty".
- The file ends with two self-verifying assertions that make it fail its
  *own* compilation rather than silently degrade: `_ScopesValid` asserts
  every `components` key is a `ZeroScope` (a typo'd or version-skewed scope
  would otherwise take the open fallback and un-narrow exactly the
  component it meant to narrow) — with ecosystem scopes **excluded by
  name** in an `Exclude<…>` form whose comment lines double as the record of
  which scopes are foreign and who owns them; and `_EntriesValid` asserts
  every entry carries all five members, because the resolvers fall back to
  the open union for a member they cannot find, so a truncated entry would
  silently un-narrow the axis it omitted.

The consumer proof for this path is `examples/typed-app/src/register.tsx`,
which compiles against the **emitted** artifact through real package
exports ([§9](#9-the-verification-architecture)).

### 3.6 The components artifact — vendor-named apis

Zero's stance, stated once: **visual and behavioural fidelity is
guaranteed; API-surface fidelity is an adapter, not a contract change.** The
pass-through attributes (`data-color`/`data-size`/`data-variant`) are part
of the anatomy contract for the same reason `data-part` is — they are the
stable surface the runtime design-system swap depends on. A vendor's prop
*names* (`kind`, `type`, `isIconOnly`) are restored one layer up.

That layer is `defineApi` (`packages/zero-kit/src/api.ts`) plus the
generated `./components` module
(`packages/zero-kit/src/targets/web/components-dts.ts`):

- An api declaration maps zero's surfaces to vendor names — axis renames
  (`variant` → `kind`), per-value respellings (`values` remap:
  `danger-tertiary` ↔ Carbon's `danger--tertiary`, a spelling the attribute
  grammar cannot carry), and modifiers as flat vendor booleans
  (`isIconOnly`). Per-scope overrides live under `api.components.<scope>`.
- `RESERVED_PROPS_BY_SCOPE` guards the rename: a **design-system-wide**
  mapping onto a component-specific Root prop (`name` on Select, `type` on
  Button) is an error — it would silently delete that prop — while the same
  mapping under `api.components.<scope>` is deliberate vendor-faithful
  shadowing and allowed. The table is re-derived from zero's actual
  `*RootProps` declarations by a parity test.
- The emitted `components.d.ts` is **self-contained**: no `declare module`,
  no `ZeroVocabulary` augmentation, no `/register` import needed — so two
  design systems' `./components` modules can coexist in one program, which
  two register augmentations never could. Unwired axes are simply *absent*
  from the surface (omission is this artifact's `never`). `components.js`
  is data only: one `adapt(Base, spec)` call per routing component, with
  all behavior in `@sigx/zero/adapt`.

Emission and consumption differ: `writeArtifacts` always writes the
register artifact, and writes `components.*` only when an api is declared
(today: zero-heroui and zero-carbon; the Ant fixture proves the per-scope
override). But **a consumer picks one path per program** — the register path
narrows zero's own prop names via augmentation; the components path
delivers vendor names with the vocabulary untouched. `examples/typed-app`
compiles the two (plus carbon's values remap) as three isolated programs
for exactly this reason.

### 3.7 Runtime

`variantAttrs` (`packages/zero/src/contract/props.ts`) is the single
pass-through: `color`/`size`/`variant` → `data-*`, the `axes` bag →
`data-<axis>`, `mods` → `data-mod-<name>=""`. Its guards are the runtime
half of the contract — JS consumers have no types, so the runtime is the
only thing protecting them: an axis that shadows a named prop throws, a
reserved/contract-owned axis throws, a non-kebab name throws; `undefined`
axis values are skipped *before* the guards (a narrowed bag has optional
members); falsy mods are skipped (presence-only — `false` and `undefined`
both mean absent).

All **31 components** compose `WithVariantAxes<'<scope>'>` — the scope
literal is constrained to `ZeroScope`, so a typo'd literal
(`WithVariantAxes<'buton'>`) is a compile error rather than a silently
*different* type taking the open fallback. Ecosystem components use
`WithVariantAxesOpen<S extends string>`: the open constraint is the
deliberate cost of an out-of-tree scope. For the four rootless scopes the
axis props sit on the **Trigger**, not the fragment Root, matching where the
compiler anchors the rules ([§3.3](#33-compilation)).

One typing behavior worth naming because assertions depend on it: sigx's
JSX prop surface **strips `never`-valued props** from the parameter type, so
an unwired axis surfaces as *no prop at all* rather than a prop no value
satisfies. Both spellings mean "no value compiles"; the type tests treat
them as one predicate (`Unusable`).

### 3.8 The ledgers

`packages/zero-kit/__tests__/axis-coverage.test.ts` guards the
accepts-but-unwired gap — a component that accepts an axis at runtime which
no design system wires — and carries two ledgers, both bound from **both
ends** because the two ways a ledger goes stale are opposite:

- **`NO_VARIANT`** records, per carrier that wires no `variant` anywhere,
  the surveyed reason (per-vendor prop tables, dated). A new carrier
  arriving unrecorded fails; a recorded reason whose carrier has since been
  wired fails. It is a record of *decisions*.
- **`UNWIRED_AXES`** records `(scope, axis)` pairs a design system may
  leave unwired *for now* — debt with an issue, not a decision. It is
  **empty today**: its one population so far (the Contract v1 carriers'
  colour/size axes) emptied when #329 wired all six skins (closing #321),
  and the ledger's stale check is what forced the cleanup — an entry
  outliving its recipes would silently re-open the hole.

Carrier discovery is structural (the test greps component sources for
`WithVariantAxes`), so a new carrier cannot arrive unnoticed.

## 4. The manifest contract

Two different artifacts share the filename `manifest.json`, and they share
**only** the filename.

**Zero's anatomy manifest** — emitted at build by
`packages/zero/scripts/gen-manifest.mjs` into `dist/manifest.json`,
published as the `./manifest.json` subpath, governed by
`packages/zero-kit/schemas/manifest.schema.json`. It carries `$schema`,
`zeroVersion`, the `attributeSpec` (attribute names, flag form, the flag /
state / placement vocabularies, the synonym table, the variant axes), the
token grammar (`colors`, `categories`, recommended ramps), and `components`
— an **array** of `anatomy.toJSON()` snapshots, each part with its
`parent`, `states`, `flags`, `placements`, `hiddenIn`, `pseudo`, hints, and
ready-made per-state selector fragments (what the recipe compiler
consumes). There is no `manifestVersion`: a contract change ships a new
zero version and a new schema.

**A design system's artifact manifest** — emitted by `writeArtifacts` into
the package's `dist/manifest.json`, governed by
`packages/zero-kit/schemas/ds-manifest.schema.json`. Required keys:
`$schema`, `manifestVersion` (`const 1` — consumers hard-check the number
rather than sniffing keys), `zeroVersion` (the kit's own version; lockstep
makes them the same train), `name`, `themes`, `tokens` (roles, sizes,
variants, axes, modifiers, scopes, custom, breakpoints, system/systemDark,
and `properties` — every custom property the compiled tokens.css actually
emits, read back off the stylesheet so it cannot drift), and `components` —
a **record**, scope → the harvested `CompiledComponentAxes`
([§3.4](#34-harvest)), plus `api` when one is declared. The array/record
asymmetry is the cleanest one-line proof the two files are different
artifacts.

The DS manifest is **self-validated at write time**: `writeArtifacts`
JSON-round-trips the object and validates it against the schema with Ajv,
so a manifest the schema rejects fails the build that *produces* it, not
the app that reads it. Consumers use the exported TS types
(`DesignSystemManifest`, `DS_MANIFEST_VERSION`) rather than re-declaring
the shape — the drift that motivated this (playground, smoke spec and
contrast audit each carrying their own copy) is the recorded incident.

**Fragments** are how a scope zero doesn't ship enters a design system's
manifest: `{ version: 1, package, components }`, schema
`fragment.schema.json`, where `components` literally `$ref`s the anatomy
manifest's component shape — a fragment is zero's own component shape plus
ownership. `mergeManifests` enforces, in order: the version pin (a
pre-`hiddenIn` fragment used to slide straight through), the package
specifier grammar (it is interpolated into generated import statements),
scope and part-name grammar (the scope is also a filename and a selector),
selector-breakout characters, and then the shared vocabularies on the
ecosystem surface — flags against `FLAG_VOCABULARY`, states against
`STATE_NAMES` with synonyms in the message, placements, `hiddenIn ⊆
states`, and `parent` acyclicity. A scope collision is a hard error naming
the existing owner; every merged component is stamped with its owning
`package` (provenance), which survives compilation and drives the
register artifact's `Exclude`-form gate and the components module's import
specifiers.

## 5. The compiler and CSS architecture

**Four cascade layers, one statement.**
`LAYER_ORDER_STATEMENT` (`packages/zero-kit/src/contract.ts`):

```css
@layer zero.fallback, zero.tokens, zero.recipes, zero.structure;
```

It is declared in `packages/zero/css/base.css` **and** emitted atop every
compiled `tokens.css`, because the *first* mention of a layer fixes its
position: a design-system stylesheet parsed before base.css would otherwise
create `zero.tokens` first and leave the fallbacks above it. Restating the
order is idempotent; relying on load order is not. What each layer holds:

| Layer | Contents |
|---|---|
| `zero.fallback` | base.css only: design-system-neutral structural token defaults (radius/size/text ramps, durations, …) so an unstyled page is sane. |
| `zero.tokens` | Compiled design-system tokens: `:where(:root)` defaults, `@property`-adjacent blocks, theme blocks. |
| `zero.recipes` | All compiled recipe CSS, plus base.css's few structural necessities (summary marker removal, `cursor: not-allowed`). |
| `zero.structure` | One rule: `[data-scope][data-part][hidden]:not([hidden="until-found" i]) { display: none }`. |

`zero.structure` exists because `[hidden]` otherwise relies on the UA
sheet — the weakest declaration in the document — and all six design
systems shipped an unconditional `display: flex` that defeated it (#209: a
collapsed tree branch hid nothing, anywhere, for five PRs). A *later layer*
rather than higher specificity (compound selectors can reach (0,8,0)) and
never `!important` (which would also outrank the consumer's unlayered app
CSS — the consumer must always win). `hidden="until-found"` is exempt
because the UA gives it `content-visibility: hidden` for find-in-page.

**Specificity is designed, not accidental.** Root token defaults are
emitted as `:where(:root)` — (0,0,0) — so any `[data-theme="x"]` block at
(0,1,0) beats them regardless of source order, a nested `data-theme`
re-themes its subtree by inheritance, and unlayered app CSS beats
everything. Theme blocks are diff-only (only what diverges from `:root`),
with two deliberate exceptions restated per theme: scheme-divergent
non-colour props (or a `data-theme="light"` island under a system-dark root
would inherit the dark value), and tokens whose values *reference colour
properties* — `var()` in a custom property substitutes where **declared**,
not where used, so a `--shadow-md: … var(--color-primary)` declared only at
`:root` would capture `:root`'s primary forever ("a phosphor glow written
that way stayed green on an amber theme").

**`@property` registrations are per design system**, emitted above the
layers in each compiled tokens.css — every declared colour role (typed
`<color>`, so theme switches animate) plus declared customs carrying a
`syntax`. They cannot live in zero's base.css, which does not know the
declared role names; `-soft` is unregistered because its value can be
`color-mix()`, invalid as an `initial-value`.

**Reduced motion** collapses every *declared* duration key to `0.01ms` —
not `0ms`, because a zero duration suppresses the `transitionend` /
`animationend` events presence/exit coordination waits on. The block's
selector is `:root, [data-theme]` at (0,1,0), emitted last inside the
layer, so it ties-and-wins against every theme block — `:where(:root)`
would silently lose the moment a theme was selected. base.css carries the
same block for the recommended durations only. A validator warning flags
`transition` shorthands with literal durations (reduced motion can only
collapse `var(--duration-*)`); infinite loops are deliberately exempt from
the collapse-to-zero logic and handled by their own e2e
([§9](#9-the-verification-architecture)): a loop at ~0s strobes rather
than stops.

**The physical-direction lint** (`resolve/validate-recipes.ts`) warns on
physical properties that have logical twins (`left` → `inset-inline-start`,
`margin-left` → `margin-inline-start`, physical corner radii → logical
ones) — in part declarations, `@keyframes` bodies, and the raw `recipe.css`
escape hatch alike. Exemptions are reasoned, not silenced: parts that are
rotated/drawn, pure centring translations, and `--press-x` (a measured
pixel offset from the element's own left edge). Its known blind spot is
**`transform`**: `translateX(8px)` moves physically right under both
directions and has no logical spelling — which is exactly why the RTL e2e
measures rendered boxes; the lint reads declarations, the spec reads boxes,
and neither subsumes the other.

**Interpolation guards.** Every point where authored strings are spliced
into emitted CSS is validated, each with its motivating incident recorded
at the guard: `assertAxisToken` on axis names and values (a value carrying
`"` closes the attribute selector early — a seeded
`size: { 'x"], [data-part="panel': … }` emitted a second, unrelated
selector that styled every tab in any panel: selector injection, not a
typo); property-name grammar and a `CSS_BREAKOUT` check on declaration
values (`x;} [data-scope]{color` restyled every scoped element on the
page); pseudo-element projections; `@keyframes` names (a keyframes named
`none` would capture `animation: none`); theme names into
`[data-theme="…"]`; token keys; and fragment package specifiers (selector
injection *and* path traversal). The policy is a hard error rather than
escaping — a recipe that needs `content: '";"'` is asked to spell it
differently, because an escape hatch here is an injection surface.

## 6. The theme model

**The registry holds metadata, never values.**
`packages/zero/src/theme/registry.ts` stores names, colour-scheme,
light/dark pairing and an optional swatch; token *values* live in the
design system's compiled CSS. `ThemeSource` is typed structurally on
purpose: the kit's `TokensInput` is assignable to it, so every
`installThemes()` passes the whole declaration and the registry reads only
the keys it needs — zero never imports the kit, which is Node-only.

**Scheme and theme are different axes.** The colour scheme is the closed
CSS pair `'light' | 'dark'` (it maps onto `color-scheme` and
`prefers-color-scheme`, which have exactly those values); theme names are
open — `dim` is a *theme* whose scheme is dark, not a third scheme.
Selection is three-valued: an explicit theme name, or `null` = follow the
system. The system default needs **no JavaScript**: compiled CSS uses
`light-dark()` with `color-scheme: light dark` on `:root` (colour tokens
only — a non-colour token that differs between the default themes goes into
a `prefers-color-scheme: dark` block instead, because `light-dark()` is a
`<color>` function). The controller only manages *explicit* choices via the
`data-theme` attribute.

**`pickThemeFor` prefers declared defaults.** The registry stores each
source's `defaultLight`/`defaultDark` and prefers them (when registered
with the matching scheme) over first-registered — the latent bug only a
third theme exposes; zero-daisyui's five themes (`light`, `dark`, `dim`,
`nord`, `sunset`) are the shipped exercise. `toggle()` prefers a theme's
registered `pair`, else `pickThemeFor` of the opposite scheme.

**Name typing follows one rule: authoring is closed, anything that
round-trips through storage or the registry is open.** `setTheme` and the
provider props take the closed `ZeroThemeName` (narrowed by a register
artifact); `theme()`'s *return*, `getTheme`, `registerTheme` and the
storage boundary stay open — a persisted name may come from an older app
version or a runtime-registered tenant theme, so a closed type there would
be a lie.

**Controller and Provider are split, and the split has a known desync.**
`themeController()` is a lazily-created browser singleton (throws under
SSR); `ThemeProvider` creates a *separate* controller instance for its
subtree (and is the per-request answer on the server); `ThemeScope` is just
a `data-theme` island. Every client controller writes the same
`document.documentElement` attribute while holding its own signal state,
and nothing synchronizes the signals. Only the singleton registers for
`clearThemes()` notifications — so after a design-system swap, a
provider-created client controller keeps an explicit theme naming a
stylesheet that left. This is **known, documented at the registration site,
and deliberately unfixed**: per-request server controllers can never see
`clearThemes` (it throws on the server), and provider-created controllers
are owned by their provider. The playground works around it explicitly —
capture the theme before `clearThemes()`, re-apply after `installThemes()`
if the incoming system defines the same name.

**FOUC handling** is one line: `themeInitScript()` returns an inline IIFE
for `<head>` that reads the persisted explicit choice from `localStorage`
and stamps `data-theme` before first paint. The *system* preference needs
no script at all — that is `light-dark()`'s job.

## 7. The authoring surface

**Two runtime-facing entries, one Node surface.**
`@sigx/zero-kit` exports four subpaths: the Node-only barrel, `./build`,
`./plugin`, and `./define` — the one surface a design-system *source* may
import at runtime. `./define`'s module graph is `node:`-free **by
contract**: `ds-runtime-imports.test.ts` walks the graph and fails on the
first `node:` import, because the incident it encodes (a `defineApi` value
import dragging the kit's Node surface into a design system's runtime
graph) presented as a hung e2e suite, not as an error.

**`runStandardBuild` makes a design-system package's build script data.**
The pipeline — merge fragments → validate → throw before emitting anything
on failure → compile → build the coverage report → `writeArtifacts` — used
to be copied byte-identically across six `build.mjs` files; it now lives
once in `@sigx/zero-kit/build`, and a skin's `build.mjs` is ~15 lines of
declaration passing. The CLI (`sigx zero:build` / `zero:validate`, aliased
`build`/`validate`, discovered through the `"sigx-cli"` field) calls the
same functions, so the CLI path and the build.mjs path cannot drift. There
is deliberately no scaffolding command — `init` was declined
(#10, closed not-planned: the skill's "copy `zero-basic`" instruction *is*
the front door); `eject` remains open (#11).

**The generation skill** (`packages/zero-kit/skills/design-system/`, shipped
in the package) is the repo's graded asset: a model reads the anatomy
manifest, writes `tokens.ts` + `recipes.ts` against the token grammar, and
iterates against `zero:validate`. It travels with a **brief pack** (five
worked style briefs; `zero-brutalist` is the end-to-end regression test for
the skill itself) and the **conformance fixtures** — compiling
`TokensInput`/`RecipeInput` files for HeroUI, Material, Radix Themes, Ant
and Carbon, each proving a non-default axis surface.

**The conformance program** keeps the "any design system can be built on
this" claim honest with three artifacts split by lifetime: the grading
rules (frozen — `exact` / `renamed` / `reshaped` / `unsupported`, where
`renamed` means the same surface under a vendor name restored by the
generated `./components` module), the data
([`docs/design-system-conformance.md`](./design-system-conformance.md) —
**generated**, never hand-edited), and the proof (the fixtures and the
shipped packages). The matrix is emitted by
`formatConformanceMatrix` (`packages/zero-kit/src/resolve/conformance.ts`)
and pinned as a vitest file snapshot — `pnpm test -- conformance` fails on
drift and `--update` rewrites the doc — so a row and its declaring artifact
are the same object and cannot drift apart. Tier-3 rows are generated from
`buildReport` over the six in-repo systems; the same report ships as each
package's `dist/report.json` and behind `sigx zero:validate --report`:
components styled, axes wired per scope, declared-but-unwired values, the
axis-agnostic divergence partition, state coverage, and the minimum
contrast margin per theme. Automated vendor-doc checking is out of scope by
design — it rots, then gets muted; the dated source column is the honest
amount of process.

## 8. Ecosystem components

Zero's component set is closed; its authoring surface is not. The full
guide is [`docs/building-your-own-component.md`](./building-your-own-component.md);
the architecture facts, briefly:

- An ecosystem package is a **peer** of `@sigx/zero`, not a plugin into it:
  it declares a vendor-prefixed anatomy with `defineAnatomy`, builds the
  component from the same public behaviors zero's own components use, types
  it with `WithVariantAxesOpen`, and holds itself to the contract with
  `expectAnatomy`.
- It reaches design systems as **data**: a fragment
  (`{ version, package, components }`) plus an optional recipe pack written
  against the recommended token grammar, from an entry whose module graph
  stays free of component imports — a design system's Node build script
  imports it.
- The **export-name convention** is load-bearing: the package's root export
  carries `componentExportName(scope)` (`ext-stepper` → `ExtStepper`),
  because an api-declaring design system's generated `./components` module
  imports exactly that name from exactly that package. The convention broke
  once, unnoticed, because api mode and fragment mode had never been
  composed — which is why the components-dts tests now assert it.
- The merge enforces the shared vocabularies at the boundary and stamps
  provenance; the generated register artifact excludes merged scopes **by
  name** from its `ZeroScope` gate rather than dropping the gate
  ([§3.5](#35-the-register-artifact), [§4](#4-the-manifest-contract)).
  `packages/zero-ext-example` + zero-basic's `build.mjs` is the shipped
  round trip, and `packages/zero/type-tests/ecosystem/` is its compile-time
  proof.
- A design system that never merges the fragment leaves the component
  **unstyled but accessible**. That fallback is the contract.

## 9. The verification architecture

The gates, as an inventory. The working law behind all of them: **a new
gate must be shown red first** — mutate the code until the gate must fail,
watch it fail, then trust it. A gate accepted on a green run has proven
only that it can pass. (In writing, this exists as the PR template's
red-→-green checkbox and as the recorded practice in nearly every guard's
docblock — several of which exist *because* a previous gate was green while
checking a fraction of what it claimed.)

| Gate | Where | What it proves |
|---|---|---|
| Unit suites (68 files) | `packages/*/__tests__/`, vitest over **source** via aliases | Behaviors, SSR safety, per-component contracts, compiler semantics. |
| CSS goldens | `zero-kit/__tests__/css-golden.test.ts` | Byte-for-byte compiled CSS per skin: ordering, layering, specificity are the product. |
| Parity family (6) | `contract-parity`, `registry-parity`, `reserved-props-parity`, `schemas`, `llms-doc`, `type-test-paths` | Every deliberately duplicated surface (kit↔zero contract copies, manifest↔registry, api reserved props↔real Root props, schemas↔reality, llms.txt claims↔source, type-test paths↔package exports) is pinned from both sides. |
| State legibility | `zero-kit/__tests__/state-legibility.test.ts` | Every declared state is visually distinct in every skin — read from **compiled CSS**, honoring `hiddenIn`. |
| Axis coverage + value coverage | `axis-coverage.test.ts`, `axis-value-coverage.test.ts` | No component accepts an axis nothing wires (ledgered, [§3.8](#38-the-ledgers)); no declared axis step goes unhonored by the recipes that claim it. |
| Type tests (6 isolated projects) | `packages/zero/type-tests/` — `open`, `augmented`, `generated`, `components`, `registered-components`, `ecosystem` | Each proves one narrowing regime in its own program (augmentation leaks program-wide, so isolation is the point): the unaugmented open fallback; a hand-written augmentation (a `.ts`, so `skipLibCheck` cannot skip it); the real emitted material golden; the emitted `components.d.ts` goldens with the vocabulary untouched, two design systems coexisting; **all 31 scopes' real prop surfaces** under the emitted zero-basic golden; and the ecosystem `Exclude`-gate round trip. |
| Register compile gate | `zero-kit/__tests__/register-dts-compile.test.ts` | Every skin's emitted `register.d.ts` compiles with `skipLibCheck: false` against a generated stub of `@sigx/zero`, so the artifact's self-assertions actually execute ([§3.5](#35-the-register-artifact)). |
| Typed-app capstone | `examples/typed-app` (CI, after build) | The consumer side: three isolated programs against **emitted `dist/`** through real package exports — register narrowing, the no-register components surface, and carbon's values remap. |
| Interaction e2e (19 specs) | `examples/playground/e2e/` — press-feedback, dialog, popover, tooltip, menu-submenu, context-menu, combobox, select, toast-presence, tabs, tree-view, slider, number-input, rating-group | Real-browser contracts (chromium/firefox/webkit, plus reduced-motion and forced-colors projects), under the **locator law** (`e2e/demo.ts`): a part is located through a named root, never page-wide selectors or cross-demo positional indexing. |
| Contrast audit | `e2e/contrast-audit.spec.ts` | Two matrices over every state combination × skin × theme: text legibility for text-bearing parts and indicator paint for parts whose job is paint, measured in their real ancestor chains (derived from the part tree); each skin's wired axis surface rides the text matrix; 3:1 hard floor, 2:1 for `disabled` measured pre-fade. |
| DS smoke | `e2e/ds-smoke.spec.ts` | All six skins: `hidden` computes `display: none`, no undeclared axis/mod value renders, the runtime swap leaves one live stylesheet and re-seeds vocabulary + themes, boot logs no console error. |
| Reduced motion / RTL | `e2e/reduced-motion.spec.ts`, `e2e/rtl.spec.ts` | The two loops (Skeleton, Spinner) assert `animation-name` running under chromium **and** `none` under reduced-motion — both directions, or a never-animating recipe passes; RTL measures rendered boxes across all six skins, complementing the physical-direction lint's `transform` blind spot ([§5](#5-the-compiler-and-css-architecture)). |
| Axe audit | `e2e/axe-audit.spec.ts` | axe-core over every playground page, hard-failing serious/critical WCAG A/AA, with an **empty allowlist** (`axe-allowlist.json` — stale entries fail; a real bug gets fixed in `packages/zero`, never allowlisted). |
| CI ordering | `.github/workflows/ci.yml` | lint → catalog → typecheck → build → **type tests after build** (so unmapped subpaths cannot fall through to an absent `dist/`) → test; the e2e job adds playground typecheck + typed-app + Playwright. Bundle-size budgets run as their own workflow; `verify-pack` dry-runs publishing. |

## 10. Known limitations and open directions

Honesty section. These are the edges the tree knows about today:

- **`@sigx/runtime-core` blocks a full lib check.** Its shipped
  declarations fail `skipLibCheck: false` (a side-effect
  `import './jsx-types.d.ts'` rejected as TS2882), so every type-test
  project and typed-app program keeps `skipLibCheck: true` for
  *dependency* declarations, and the register compile gate runs against a
  generated stub instead of zero's real source. The flip to `false` the day
  core ships clean declarations is the whole remaining gap, and the
  tsconfigs say so in place.
- **The dual-controller theme desync** ([§6](#6-the-theme-model)) is known
  and deliberately unfixed; consumers that swap design systems at runtime
  carry the playground's capture/re-apply pattern.
- **The component surface is finite.** Thirty-one components, skewed to
  primitives plus the content tier; there is no DatePicker, no Table, no
  data grid. The ecosystem path ([§8](#8-ecosystem-components)) exists
  precisely so those need not enter zero's own inventory to be first-class.
- **Multi-target is aspirational.** The target SPI that would let one
  design-system source emit for non-web platforms (#97) never landed —
  the multi-target RFC ([§11](#11-history--the-rfcs-and-where-they-went))
  proposed it, its platform-neutral groundwork shipped
  (`--text-fixed-*` aliases, web-only runtime properties, the anatomy
  superset parts, the kit's core/emitter split), but zero-kit today ships
  exactly one target: the web. Nothing in the tree emits for Lynx.
- **Open contract directions, by issue:**
  [#280](https://github.com/signalxjs/zero/issues/280) (should overlay
  triggers show their overlay is open),
  [#286](https://github.com/signalxjs/zero/issues/286) (`tokens.roles` is
  both palette and colour vocabulary, so a token-only role reads as a
  declared axis value),
  [#295](https://github.com/signalxjs/zero/issues/295) (`variants: []` at
  the design-system level, so `variant: never` can say which of its two
  meanings it has),
  [#197](https://github.com/signalxjs/zero/issues/197) /
  [#198](https://github.com/signalxjs/zero/issues/198) /
  [#199](https://github.com/signalxjs/zero/issues/199) (ancestor-scoped
  axes, a token-key grammar for axis values, responsive axis values),
  [#51](https://github.com/signalxjs/zero/issues/51) (misspelled CSS
  property names still compile),
  [#11](https://github.com/signalxjs/zero/issues/11) (`eject`),
  [#17](https://github.com/signalxjs/zero/issues/17) (first publish — the
  standing deadline that made every breaking change above free).

## 11. History — the RFCs and where they went

Three RFCs proposed most of what [§2](#2-the-anatomy-contract)–[§7](#7-the-authoring-surface)
describe; a 2026-08 verification-and-contract campaign then moved the tree
past all of them, which is why they were deleted and this document written
in their place (#330). The full texts remain reachable in the git history of
`docs/rfcs/`.

| RFC | Proposed | Landed | Status |
|---|---|---|---|
| **0001 — Multi-target design systems** (#95, amendment #107; texts merged as #101, #108) | One authoring toolchain emitting per-target through a published SPI; Lynx as the pilot; a unified token contract | The platform-neutral groundwork only: the contract changes (#109 — `--text-fixed-*`, runtime properties declared web-only), the shared-anatomy changes (#110 — slider superset parts, dialog `backdrop`/`footer`), and the kit's split into a target-neutral core plus web emitters (#111) | **Partially implemented; the core proposal never landed.** The target SPI (#97) is open, no Lynx emitter exists, and `zero-heroui` was eventually created for the expressiveness RFC's reasons, not as the Lynx pilot |
| **0002 — Typed design systems** (#127; revision #139 merged as #140) | Declared axis vocabularies, the `ZeroVocabulary` augmentation seam, the generated `register.d.ts`, per-category token typing, multi-theme | Phase by phase: declared vocabularies (#145), the seam and per-component narrowing (#150), the register artifact and `/register` subpaths (#151), wiring the then-unwired axes (#152, closing #103), daisyui multi-theme + `pickThemeFor` defaults (#153) | **Implemented**, then re-verified and hardened by the 2026-08 campaign (self-verifying artifacts, all-31 resolution — see below) |
| **0003 — Contract expressiveness** (#156) | `data-mod-*` modifiers, `sizes: []`, compound/default correctness, the conformance program, `zero-heroui`, vendor-named apis, per-scope vocabularies | Correctness fixes (#159 compound×default cross product, #161 `ThemeInput.components` removal, #163 token-name validation, #165 `sizes: []`); modifiers (#167); the coverage report (#178); the generated conformance matrix + fixtures (#184, #186); `zero-heroui` (#170, #192) and the playground reading the live vocabulary (#172); the api surface (#180/#181/#182, issue #179) and `zero-carbon` (#185, #193, issue #183); the variant survey ledger (#169, #293, issue #175); per-scope vocabularies as `tokens.scopes` (#296, issue #294) | **Implemented** — including both questions the RFC left open (the restriction unit is the scope; the fourteen unwired carriers became a ledger of recorded decisions) |
| **2026-08 campaign** (issues #316–#326, #321) | — (issues, not RFCs: the "the RFCs are archaeology now" work) | Real verification gates: all-31 type-test resolution, self-verifying register artifacts, 6/6 parity, CI ordering, the llms.txt pin (#320); compiler hygiene + `/define` + `/build` + per-scope api (#322); Contract v1: the part tree, `@scope` axis bounding, state/placement governance, axes on all 31, the versioned DS manifest (#323); runtime a11y consistency (#324); overlay e2e + axe + typed-app (#327); component completions (#328); skin axis wiring for the Contract v1 carriers (#329, closing #321) | **This is the tree §§2–9 describe** |
