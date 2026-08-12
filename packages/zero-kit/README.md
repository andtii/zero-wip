# @sigx/zero-kit

Design-system authoring for [SignalX Zero](https://npmjs.com/package/@sigx/zero):
typed tokens and per-part recipes compiled to plain, layered CSS against the
zero anatomy manifest. The barrel is Node-only — a built design system ships
CSS plus a tiny runtime module — with two purpose-built subpaths:
`@sigx/zero-kit/define` (the `define*` helpers from a `node:`-free module
graph, safe in a browser bundle) and `@sigx/zero-kit/build` (the standard
build pipeline as one function).

```bash
npm install -D @sigx/zero-kit @sigx/cli
```

`@sigx/cli` provides the `sigx` binary; the kit plugs its `zero:build` /
`zero:validate` commands into it on install (see [CLI](#cli) below). Install it
alongside — a package manager only links the executables of *direct*
dependencies.

```ts
import { defineTokens, defineRecipe, defineDesignSystem } from '@sigx/zero-kit';

export const designSystem = defineDesignSystem({
    name: 'acme',
    tokens: defineTokens({
        // The color vocabulary is YOURS: declare any roles (omit for the
        // recommended eight). Each emits --color-<role> (+ -content/-soft).
        roles: { primary: {}, surface: { content: false, soft: false } },
        // The size axis is yours too — omit for the recommended xs–xl ramp.
        sizes: ['compact', 'comfortable', 'spacious'],
        // The variant axis, and any custom axes. Declaring them closes the
        // set: a recipe typo becomes a build error, not a minted value.
        variants: ['solid', 'outline', 'ghost'],
        axes: { density: ['compact', 'comfortable'] },
        // Non-color tokens: declared ONCE for the design system, not per
        // theme. Categories are closed; the keys inside them are yours.
        system: {
            radius: { selector: '0.375rem', field: '0.375rem', box: '0.75rem' },
            border: '1px',
        },
        // Values that must differ by color scheme (light-dark() is a <color>
        // function, so non-color tokens need this).
        systemDark: { border: '2px' },
        // DS-specific tokens, declared → validated + in the manifest.
        custom: { 'glass-blur': { description: 'backdrop blur', syntax: '<length>' } },
        defaultLight: 'acme', defaultDark: 'acme-dark',
        themes: {
            acme: {
                colorScheme: 'light',
                colors: { primary: 'oklch(60% 0.2 260)', 'primary-content': 'oklch(98% 0.01 260)', surface: 'oklch(97% 0 0)', /* + base-100/200/300/base-content */ },
                custom: { 'glass-blur': '12px' },
            }, /* … */
        },
    }),
    recipes: [
        defineRecipe({
            component: 'tabs',
            parts: { tab: { base: { padding: '0.5rem 1rem' }, states: { active: { color: 'var(--color-primary)' } } } },
        }),
    ],
});
```

Only the base surfaces (`base-100/200/300/base-content`) are fixed — they
anchor `-soft` derivation, `light-dark()` emission and theme swatches.
Declared roles are `@property`-registered in the compiled CSS and surfaced,
with `sizes`, `variants`, `modifiers`, `axes`, `system`, `custom` and
`breakpoints`, in the DS's `dist/manifest.json` (which also lists every custom
property the design system emits, and the axis values each recipe wires, per
component).
`writeArtifacts` additionally emits `dist/register.d.ts` — a **generated,
never authored** augmentation of `@sigx/zero`'s `ZeroVocabulary`, so an app
importing `@sigx/<ds>/register` gets the design system's themes, tokens and
per-component axis values as closed types.

Every variant axis works this way. `roles` names what `color` accepts,
`sizes` what `size` accepts, `variants` what `variant` accepts, `modifiers`
what `mods` accepts, and `axes` declares any further axes. The rule is one
principle: **an explicit declaration closes its set** — recipe values outside a
declared vocabulary are errors, while the default recommended ramps stay
advisory warnings. (`variants`/`modifiers`/`axes` have no recommended default,
so omitting them leaves those axes unchecked.) `sizes` is the `data-size` axis
— not `system.size`, which is the `--size-*` control-sizing unit.

**A vocabulary may belong to one scope.** Real design systems do not give every
component the same variants — Radix Themes varies a select as
`classic | surface | soft` and a button as something else. Declare the **union**
at the top level and say which part of it each scope offers:

```ts
variants: ['solid', 'outline', 'classic', 'surface', 'soft'],   // the UNION
scopes: {
    button: { variants: ['solid', 'outline'] },
    select: { variants: ['classic', 'surface', 'soft'] },
},
```

Every axis takes a restriction (`colors`, `sizes`, `variants`, `axes`,
`modifiers`), a scope may only narrow, and the vocabulary reaches the manifest,
the report and `register.d.ts`. An **absent** key means the scope offers the
whole union; an **empty list** is the claim "this scope has no such axis at
all", the same grammar `sizes: []` uses design-system-wide. The unit is the
scope rather than the part: zero puts one attribute per axis on the scope's
carrier and cascades it to every part below, so two vocabularies inside one
component are two **axes** — declare the second in `axes`. See
`docs/architecture.md`, "Declared vocabulary".

The cascade to inner parts is emitted as an `@scope` donut
(`@scope ([carrier][attr]) to ([carrier]) { [part] { … } }`) rather than an
unbounded descendant selector: nest one instance of a scope inside another (a
card in a card) and each part resolves its axis to the NEAREST carrier by CSS
scoping proximity, instead of source order deciding which instance's value
leaks through.

Not every modifier is an axis, either. An axis answers *which one* and always
carries a value; some design-system modifiers answer *is it on* and carry none
— daisyUI's `block` and `wide`, Radix's `high-contrast`, HeroUI's `icon-only`.
Declare those in `modifiers`, wire them in a recipe's `modifiers` block, and
consumers set them through zero's `mods` prop:

```ts
// tokens.ts
modifiers: ['block', 'icon-only'],

// recipes.ts
modifiers: { block: { root: { base: { width: '100%' } } } },
```

```tsx
<Button.Root mods={{ block: true }}>Save</Button.Root>   // → data-mod-block
```

They render into their own `data-mod-*` namespace rather than as bare
`data-<name>` flags. Zero owns the unprefixed presence-only vocabulary
(`data-disabled`, `data-pressed`, …) and **extends it between versions**, so an
unprefixed modifier named `busy` would silently start matching a `data-busy`
flag a later zero adds — with exactly the right shape and no error. A valued
axis cannot fail that way: a collision there simply never matches, and the
runtime throws. Different hazard, different treatment. A modifier has no
`defaultVariants` analogue, because absence already is its default.

Nor is the SET of axes closed. `color` / `size` / `variant` have named props
because almost every design language has them; key `variants` on any other
axis your design needs and consumers reach it through zero's `axes` prop:

```ts
variants: { density: { compact: { root: { base: { paddingBlock: '0.15rem' } } } } },
```
```tsx
<Button.Root color="primary" axes={{ density: 'compact' }}>Save</Button.Root>
```

Axis names are kebab-case and may not be ones the anatomy contract owns
(`scope`, `part`, `state`, `orientation`, or any flag) — see `RESERVED_AXES`.

Both halves of the token contract work the same way: a **closed set of
categories**, each fixing a `--prefix-` and a value grammar, with **open keys
inside** that the design system declares. `zero-kit` curates the categories
because they carry semantics tooling needs; the vocabulary within is yours.
Omitting a category is fine — `@sigx/zero/css` ships fallbacks for the
recommended keys, so absence is never a validation error.

```bash
sigx zero:validate   # tokens, WCAG contrast, recipe structure + content
sigx zero:validate --report   # what the design system covers, not what's wrong
sigx zero:build      # dist/css/index.css + per-component files + manifest
```

Conditional styles live in `parts.<part>.at`, keyed by a declared breakpoint
(`@media (min-width: …)`), a built-in preference query (`reduced-motion`,
`hover-none`, `prefers-dark`, `forced-colors`, `print`) or a raw `@` prelude
(`@container`, `@supports`, `@starting-style`). Nesting composes the
at-rules, and because `variants` hold the same shape, responsive variants
need nothing extra. Author mobile-first — breakpoints are `min-width`, and
declaration order is emission order.

Unknown parts/states fail the build — the anatomy manifest is the contract.
So do undeclared token references: a recipe that says `var(--color-brnad)`
is an error naming the nearest declared token, not a stylesheet that silently
renders nothing. The vocabulary is derived from your own declaration, so it
grows with the design system rather than being a list to maintain.
The `skills/design-system` folder ships an agent skill that generates a
complete design system from a style brief and iterates against `validate`.

## Building a design system

Every design system runs the same pipeline; it ships as one function on the
`@sigx/zero-kit/build` subpath, and a package's `build.mjs` is only its data:

```js
import { fileURLToPath } from 'node:url';
import { anatomies } from '@sigx/zero/anatomy';
import { runStandardBuild } from '@sigx/zero-kit/build';
import { designSystem } from './dist/design-system.js';

await runStandardBuild({
    designSystem,
    manifest: { components: Object.values(anatomies).map((a) => a.toJSON()) },
    // fragments: [fragment],   // ecosystem manifest fragments, merged in
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
});
```

It validates, prints every issue, refuses to emit from an invalid source
(throws after printing), compiles, builds the coverage report and writes the
artifacts. `sigx zero:build` calls the same function.

`targets` selects the emit targets (default `['web']`, which is today's
output exactly). The list is validated up front: unknown names fail, `web`
is not optional (every other target emits beside it), and `'lynx'` — the
class-grammar target for platforms without attribute selectors — currently
fails with "not implemented yet" while its emitters land across the #348
campaign.

## The authoring surface in a browser graph

The kit's barrel is Node-only — a design-system package may never
value-import it at runtime (one import drags `node:fs` into every browser
consumer). The `define*` helpers live on `@sigx/zero-kit/define`, whose
module graph is `node:`-free by contract (pinned by a test that walks it), so
a design-system module that sits in a package's runtime graph writes:

```ts
import { defineApi } from '@sigx/zero-kit/define';
```

and keeps the full literal narrowing without a `satisfies` reimplementation.

## The vendor-named component API

A design system may declare, beside `tokens` and `recipes`, how zero's axis
surfaces appear under the vendor's own prop names (issue #179;
`docs/architecture.md`, "The components artifact — vendor-named apis"):

```ts
import { defineApi } from '@sigx/zero-kit/define';
import { variants, modifiers } from './tokens.js';

export const api = defineApi({ variants, modifiers }, {
    variant: { as: 'kind', values: { 'danger-tertiary': 'danger--tertiary' } },
    size: { values: { sm: 'small', md: 'medium' } },
    modifiers: { 'icon-only': { as: 'hasIconOnly' } },
    components: { button: { variant: { as: 'type' } } },
});
```

`as` renames a surface (Carbon's `kind`, Ant's `type`); `values` respells
individual members whose vendor spelling the attribute grammar cannot hold —
the rendered attribute keeps the zero spelling, only the prop surface
respells. All five surfaces map: `color`, `size`, `variant`, custom `axes`
and `modifiers`. `components` scopes an override to one component,
REPLACING the DS-wide entry for the surfaces it names — and it is where a
rename that shadows a component-specific prop must live: `api.variant = {
as: 'name' }` design-system-wide would silently delete Select's `name`, so
the validator rejects any DS-wide mapping onto a prop in
`RESERVED_PROPS_BY_SCOPE` and points at `api.components.<scope>`, where the
shadowing is a per-component decision (Ant's `type` over Button's native
`type` — vendor-faithful, chosen for Button alone). Zero's own components are untouched: `variant` stays `variant`
everywhere, and the declaration only shapes the design system's *additional*
`./components` module. The declaration is validated against the declared
vocabulary (`validateApi`, run inside `validateDesignSystem`), and the
conformance grade — `exact | renamed | reshaped | unsupported` — derives from
it mechanically (`apiGrade` / `modifierGrade`), so a conformance-matrix row
and the artifact it points at are the same object. The coverage report gains
an `api` section listing every vendor prop, where it routes, and its grade.

A design system that declares an `api` gets a generated `./components`
module in its build: `dist/components.d.ts` (self-contained vendor-named
types — no `/register` import needed, nothing augments `ZeroVocabulary`) and
`dist/components.js` (data only — one PURE `adapt()` call per component that
routes anything, a plain re-export otherwise; all behaviour lives in
`@sigx/zero/adapt`, written once and never generated). Add the subpath to the
package's exports map:

```json
"./components": { "types": "./dist/components.d.ts", "import": "./dist/components.js" }
```

and consumers write `import { Button } from '@sigx/<ds>/components'` —
`<Button kind="ghost" hasIconOnly>` fully narrowed, rendering the unchanged
zero attributes. The DS manifest carries the per-component routing under
`api` for tooling. `skills/design-system/conformance/` holds real vendor
fixtures (Carbon, Ant, Radix Themes, HeroUI, Material 3) that validate,
compile and grade in CI; `@sigx/zero-heroui` ships the first real adapter,
and `docs/design-system-conformance.md` — the conformance matrix
(`docs/architecture.md` §7) — is generated from the fixtures and the
in-repo coverage reports
(`conformanceRows` / `reportRows` / `formatConformanceMatrix`), so a matrix
row and the artifact it cites are the same object.

## CLI

The kit is a plugin for the [`sigx` CLI](https://www.npmjs.com/package/@sigx/cli):
having `@sigx/zero-kit` in a package's dependencies is the whole wiring. The
CLI discovers it there and offers its commands in any directory that looks like
a design-system package.

```
sigx zero:validate [entry] [--manifest <path>] [--extra-manifest <path>]...
                   [--strict] [--report] [--report-json <path>]
sigx zero:build    [entry] [--manifest <path>] [--extra-manifest <path>]...
                   [--out <dir>]
```

`entry` is a compiled ES module (default `./dist/design-system.js`) exporting
the design system as `designSystem` or as its default export. `--manifest`
defaults to `@sigx/zero/manifest.json` resolved from the current directory, so
the contract checked is the one the project ships; it takes either a path or a
module specifier. `--strict` turns warnings into a failure — the flag to use in
CI.

`--extra-manifest` (repeatable, path or module specifier) merges an ecosystem
**manifest fragment** into the base manifest instead of replacing it — how a
design system opts into covering a component some other package ships. See
"Ecosystem components" below.

## Ecosystem components

An ecosystem component package is a peer of `@sigx/zero`: it builds its
component from zero's public surface (`defineAnatomy`, the behaviors, the
contract helpers — see zero's "Building your own components") and publishes a
**manifest fragment**:

```json
{
    "version": 1,
    "package": "@acme/zero-stepper",
    "components": [ /* defineAnatomy(...).toJSON() */ ]
}
```

`version` is the fragment contract version (`FRAGMENT_VERSION`) and is
required — the merge hard-errors on a missing or unknown one, so a fragment
built against an older contract fails by name instead of merging silently.

A design system that wants to cover it merges the fragment —
`--extra-manifest` on the CLI, or `mergeManifests(base, fragment)` in a
`build.mjs`-style script — and writes (or imports) a recipe for the scope like
any other. Everything downstream is scope-agnostic, so validation, recipe
compilation, the vocabulary system and the coverage report all just work; the
merge hard-errors on a scope collision, which is why fragment scopes should
carry a vendor prefix (`acme-stepper`). It also holds the fragment to the
shared vocabularies — flags, governed states (a synonym like `expanded` fails
with "use `open`"), placements, `hiddenIn ⊆ states` and an acyclic part
tree — so the "no synonyms" rule binds on the ecosystem surface, not only on
zero's own anatomies.

Provenance travels with the merge. Merged scopes are tracked as *external* on
the compiled design system (`externalScopes`), the generated `register.d.ts`
excludes exactly them — by name — from its ZeroScope compile gate (the
typo/version-skew guard keeps full strength for zero-origin scopes, and the
emitted comment records who owns what), and under api mode the generated
`./components` module imports an external scope from its owning package's root
export instead of `@sigx/zero/<scope>`.

A component may also ship a **recipe pack** — `RecipeInput[]` written against
the recommended token grammar (`var(--color-primary)`, the recommended sizes)
— so any design system that keeps the recommended vocabulary can adopt its
styling by importing the recipes rather than writing them. A design system
that never merges the fragment simply leaves the component unstyled — which is
still accessible and correctly attributed, the contract's baseline.

The commands are namespaced so another plugin's `build` can't shadow them; the
bare `sigx build` / `sigx validate` aliases also resolve when nothing else
claims those names. Both exit non-zero on failure, and `sigx zero:build --help`
prints the current flags.

## The coverage report

Validation answers "is this correct" and returns a flat list of issues.
`--report` answers the other question — what the design system actually
*covers*:

```bash
sigx zero:validate --report                 # human-readable summary
sigx zero:validate --report-json report.json
sigx zero:validate --report-json -          # JSON on stdout, ready to pipe
```

```
heroui — coverage report
  components styled: 8/23 (35%)
    unstyled: accordion, avatar, collapsible, combobox, menu, …
  declared out of existence: color
  color wired: 0/8 (0%) — no such axis
  size wired: 5/8 (63%)
  variant wired: 1/8 (13%)
  states+flags covered: 83/104 (80%) (0 conditionally, 2 skipped deliberately)
  theme hero-light: min contrast 14.33:1 (base-300 vs base-content)
```

The report is emitted whether or not validation passes — a design system that
fails is exactly the one whose coverage is worth reading. (The one exception is
a design system that does not compile at all: that is already an error, and
there is nothing to report about it.)

`sigx zero:build` writes the same report to `dist/report.json` alongside
`manifest.json` and `register.d.ts`, as does `writeArtifacts` when handed one —
so a built design system carries its report without anyone running `validate`.

It carries, per design system: components styled against the anatomy manifest;
the axes each component wires, and which its `register.d.ts` types `never`
(derived from the same harvest, so the two cannot disagree); declared-but-unwired
values per axis and per modifier — the only place a declared-but-unused colour
role or size step surfaces, since the validator has no rule for those; per-part
state and flag coverage, including what `skipStates` delegates deliberately
(that field has a second reader — the state-legibility guard treats an entry as
"this state is deliberately indistinguishable from its siblings", so it waives
more than the coverage warning); the
**axis-agnostic divergence report**, listing per axis the per-component value
sets and flagging any component wiring a strict subset of its siblings; and the
minimum WCAG contrast margin per theme across the declared role pairs.

`--report-json -` makes stdout carry the JSON and nothing else — diagnostics go
to stderr and pass/fail is the exit code. Two flags rather than one
`--report=json` because `@sigx/args` has no optional-value form yet; they
collapse once it does.

## JSON Schemas

The package ships JSON Schemas (draft 2020-12) for the authoring surfaces.
`schemas/` is in-repo source; the npm package publishes only `dist/`, so
consumers find them at `dist/schemas/`. Each `$id` points at the docs-site
URL where they will be served (publishing tracked on the docs repo):

- `https://signalxjs.github.io/zero/schemas/tokens.schema.json` — `TokensInput`
- `https://signalxjs.github.io/zero/schemas/recipe.schema.json` — `RecipeInput`
- `https://signalxjs.github.io/zero/schemas/manifest.schema.json` — the
  `@sigx/zero` anatomy manifest (`dist/manifest.json` declares it as its
  `$schema`)
- `https://signalxjs.github.io/zero/schemas/ds-manifest.schema.json` — the
  **design-system** manifest a compiled DS ships as `dist/manifest.json`.
  A different artifact from the anatomy manifest — the two share a basename
  and nothing else. Versioned (`manifestVersion`, `DS_MANIFEST_VERSION` in
  code, the `DesignSystemManifest` type on the package root), and
  `writeArtifacts` self-validates against it before writing, so a shape break
  fails the build that produces the manifest rather than the app that reads it
- `https://signalxjs.github.io/zero/schemas/report.schema.json` — the coverage
  report (`dist/report.json` declares it as its `$schema`)
- `https://signalxjs.github.io/zero/schemas/fragment.schema.json` — the
  ecosystem manifest fragment (`--extra-manifest` / `mergeManifests`)

They close the JSON-first authoring loop: a generator (AI or otherwise) emits
tokens and recipes as plain JSON, checks them against the schema for
structural mistakes, wraps them in `defineTokens` / `defineRecipe`, and runs
`sigx zero:validate` for the semantic half — completeness, WCAG contrast,
anatomy and token-reference checks the schema can't see. The schemas are kept
honest by the test suite, which validates every shipped design system's
tokens and recipes (and the real zero manifest) against them.

MIT © Andreas Ekdahl
