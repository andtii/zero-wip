# @sigx/zero-kit

Design-system authoring for [SignalX Zero](https://npmjs.com/package/@sigx/zero):
typed tokens and per-part recipes compiled to plain, layered CSS against the
zero anatomy manifest. Node-only — a built design system ships CSS plus a tiny
runtime module.

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
`hover-none`, `prefers-dark`, `forced-colors`) or a raw `@` prelude
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

## CLI

The kit is a plugin for the [`sigx` CLI](https://www.npmjs.com/package/@sigx/cli):
having `@sigx/zero-kit` in a package's dependencies is the whole wiring. The
CLI discovers it there and offers its commands in any directory that looks like
a design-system package.

```
sigx zero:validate [entry] [--manifest <path>] [--strict]
                   [--report] [--report-json <path>]
sigx zero:build    [entry] [--manifest <path>] [--out <dir>]
```

`entry` is a compiled ES module (default `./dist/design-system.js`) exporting
the design system as `designSystem` or as its default export. `--manifest`
defaults to `@sigx/zero/manifest.json` resolved from the current directory, so
the contract checked is the one the project ships; it takes either a path or a
module specifier. `--strict` turns warnings into a failure — the flag to use in
CI.

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
state and flag coverage, including what `skipStates` delegates deliberately; the
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
- `https://signalxjs.github.io/zero/schemas/report.schema.json` — the coverage
  report (`dist/report.json` declares it as its `$schema`)

They close the JSON-first authoring loop: a generator (AI or otherwise) emits
tokens and recipes as plain JSON, checks them against the schema for
structural mistakes, wraps them in `defineTokens` / `defineRecipe`, and runs
`sigx zero:validate` for the semantic half — completeness, WCAG contrast,
anatomy and token-reference checks the schema can't see. The schemas are kept
honest by the test suite, which validates every shipped design system's
tokens and recipes (and the real zero manifest) against them.

MIT © Andreas Ekdahl
