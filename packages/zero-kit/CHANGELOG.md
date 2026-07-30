# Changelog

## [Unreleased]

### Added

- **`hiddenIn` on `ManifestPart` and in `manifest.schema.json`** (#227): the
  states zero's runtime hides a part in, mirroring `PartSpec.hiddenIn` in
  `@sigx/zero/contract`. The state-legibility guard reads it instead of the
  hardcoded avatar exemption it shipped with — a fact about zero's runtime is
  the anatomy's to state, not a test's to remember, and not something six
  design systems should each restate through `skipStates`. Unlike
  `skipStates`, one part is enough at component level: `hiddenIn` states a
  difference (a part appearing and disappearing) where a skip waives one.

- **`print` is a named built-in condition** (#226). `at: { print: … }` emits
  `@media print` and sorts with the other preference queries — after the flat
  rules it refines, before any breakpoint. Naming it matters because print is
  the second medium where a `background`-painted indicator disappears
  (backgrounds are dropped by default, as author colours are revalued under
  `forced-colors`), and `forced-colors` having a name while `print` did not
  made the raw `@media print` prelude look like the only route.

- **The state-legibility guard** (`__tests__/state-legibility.test.ts`, #226).
  Compiles all six in-repo design systems and asserts, over the *emitted* CSS,
  that (A) for every component no pair of a part's declared states renders
  identically in every part, and (B) any `indicator` part that declares states
  distinguishes all of them itself. It reads compiled CSS rather than the
  recipe tree because state styling arrives through `states`, `selectors`,
  variants, compound variants, modifiers, nested `at` and the raw `css` hatch —
  only the output sees all seven. It judges the **default render**: rules inside
  any `@media` are excluded (the `forced-colors`/`print` glyph fallback must not
  be what proves a mark exists), as are declarations that only say how a state
  arrives (`transition*`, `will-change`, `animation-delay`) — a rule left with
  nothing else is dropped whole. `skipStates` waives it **per part**, and at
  component level only when every part carrying those states waives them.
  Caught, on the pre-fix tree: a rating group
  whose `full` and `half` were the same declaration in all six design systems,
  three checkbox indicators that painted no mark at all, and two progress bars
  where `complete` looked like `loading`. Its own failure mode is covered too:
  state-blind fixture recipes, including one differentiated only by a
  forced-colors glyph and one only by a transition, that the assertions must
  report.
  The design-system skill now teaches the rule the guard enforces: a state
  indicator is drawn geometry, interpolating between states, with a glyph
  fallback under `forced-colors` and `print`.

- **The conformance matrix, generated** (RFC 0003 §7, #174).
  `conformanceRows` / `reportRows` / `formatConformanceMatrix` derive
  `docs/design-system-conformance.md` from the conformance fixtures and the
  in-repo coverage reports; the snapshot test in `conformance.test.ts` IS the
  row↔fixture parity check, since a row and its declaration are the same
  object. The Carbon/Ant/Radix fixtures gained the executing half — a
  Button-only design system each, validated and compiled, with the emitted
  selector strings asserted (§7.4 mechanism 2); Radix's is the repo's first
  real `tokens.axes` use and first numeric size ramp. A Material 3 fixture
  joins as the zero-native Tier-1 row, pinned verbatim to
  `packages/zero-material`.

- **The vendor-named component API declaration** (issue #179, RFC 0003 §2).
  A design system may declare, beside `tokens` and `recipes`, how zero's axis
  surfaces appear under the vendor's own prop names —
  `api: defineApi({ variants, modifiers }, { variant: { as: 'kind' }, … })`.
  This release ships the declaration only: `defineApi` (with an optional
  vocabulary argument that narrows `values` keys and modifier names at the
  declaration), `validateApi` wired into `validateDesignSystem`, and
  `apiGrade`/`modifierGrade` deriving the RFC 0003 §7.3 conformance grade
  (`exact | renamed | reshaped | unsupported`) mechanically from the
  declaration. The coverage report gains an optional `api` section (one row
  per vendor prop: where it routes, its grade, its respelled values), and
  `skills/design-system/conformance/` holds four vendor fixtures (Carbon, Ant,
  Radix Themes, HeroUI) that validate and grade in CI.

- **The generated `./components` artifact** (issue #179, phase 2). A design
  system with an `api` now gets `dist/components.d.ts` + `dist/components.js`
  from the same build: self-contained vendor-named types (no `/register`
  needed, no `ZeroVocabulary` augmentation — two design systems' modules can
  coexist) over a data-only runtime of PURE `adapt()` calls and re-exports.
  `compileDesignSystem` derives the per-component routing
  (`CompiledDesignSystem.componentApi`, via `deriveComponentApi` — the
  design-system-level declaration filtered to what each recipe wires,
  `values` pre-inverted for the runtime), `writeArtifacts` writes the module
  when present, and the DS manifest carries the routing under `api`.
  `carrierPart` moved from the web recipe compiler to `contract.ts` (pure
  manifest logic) and is now exported. `@sigx/zero-heroui` ships the first
  real adapter (`variant` exact, `isIconOnly`/`isPending` renamed), and the
  emitted `.d.ts` goldens are compiled end to end by a fourth isolated
  type-test project asserting the issue's gate.

### Changed

- **`skipStates` documents its second consumer** (#226). An entry has always
  silenced the validator's coverage warning; it is now also how a design system
  waives the state-legibility guard, i.e. it asserts "this state is deliberately
  indistinguishable from its siblings". Same field, same semantics, two readers —
  spelled out in the JSDoc, the recipe schema, the README and the skill, because
  an author silencing a warning should know they are also making a design claim.

- **`sizes: []` is now legal and means "this design system has no size axis"**
  (RFC 0003 §5, #164). It used to be a hard error, and an omitted ramp is
  silently replaced by the recommended `xs`–`xl`, so *every* compiled manifest
  advertised a size ramp — including for a design system that has none, which
  the docs site and the generation skill both read as fact. Absence and
  emptiness are now different statements: omitting `sizes` still takes the
  recommended ramp ("I didn't say"), `[]` declares there is no axis ("there
  isn't one"), matching what `roles: {}` already does for colour. A recipe
  wiring `variants.size` under an empty ramp is an error naming the missing
  axis rather than the missing value.

### Removed

- **BREAKING — `ThemeInput.components` is gone** (RFC 0003 §6.2, #160). It was
  documented as per-component theme overrides, but the emitter discarded the
  component key and wrote every value at theme scope. Worse, those values land
  in `@layer zero.tokens` while `recipe.tokens` declarations land in
  `@layer zero.recipes`, which `packages/zero/css/base.css` orders later — so a
  `theme.components` entry could never override a component token a recipe
  declares, which is exactly what the field was named for. Where it did work
  (defining a token a recipe only references) it was indistinguishable from
  `theme.extra`. No design system used it, and the emitted CSS is unchanged.
  Migration: `components: { button: { '--btn-radius': v } }` →
  `extra: { '--btn-radius': v }`, with the same cascade-layer caveat.

- **BREAKING — the `zero-kit` binary is gone.** Its two commands are now
  contributed to the [`sigx` CLI](https://www.npmjs.com/package/@sigx/cli) as a
  plugin: `zero-kit build` → `sigx zero:build`, `zero-kit validate` →
  `sigx zero:validate` (the bare `sigx build` / `sigx validate` aliases resolve
  when no other plugin claims them). Install `@sigx/cli` alongside the kit to
  get the `sigx` executable. Flags are unchanged, and each design-system
  package's own `build.mjs` — which calls the library directly — is unaffected.

### Added

- **The coverage report** (RFC 0003 §7.4 / §4, RFC 0002 §8, #173):
  `sigx zero:validate --report` prints what a design system *covers*, and
  `--report-json <path>` writes the machine-readable shape (`-` for stdout,
  which then carries nothing else — diagnostics go to stderr and pass/fail is
  the exit code). `sigx zero:build` writes the same report to
  `dist/report.json`, alongside `manifest.json` and `register.d.ts`, so a built
  design system carries it without anyone running `validate`. Validation
  returns a flat issue list, which says
  what is *wrong*; a scored report is what makes a generated design system
  reviewable, and the conformance matrix generates its already-proven-in-repo
  rows from this file rather than by hand.

  It carries: components styled against the anatomy manifest; the axes each
  component wires and which its `register.d.ts` types `never`; declared-but-
  unwired values per axis and per modifier — the only place an unused colour
  role or size step surfaces, since the validator has no rule for those (Material
  declares thirteen roles and wires nine); per-part state and flag coverage,
  splitting what is styled unconditionally from what only a condition, variant,
  compound or modifier reaches, and what `skipStates` delegates deliberately;
  the **axis-agnostic divergence report** promised by RFC 0003 §4 — per axis,
  the per-component value sets, flagging any component wiring a strict subset of
  its siblings, generalising the colour-only cross-component warning without
  adding an authoring surface; and the minimum WCAG contrast margin per theme.

  New exports: `buildReport`, `formatReport`, `REPORT_SCHEMA_URL`, their types,
  and `undeclaredAxes` — which moved out of the register generator so the report
  and the register artifact name the same axes by construction rather than by
  coincidence. `writeArtifacts` takes an optional third argument, the report to
  emit; callers that pass nothing are unaffected. New JSON Schema
  `report.schema.json`, shipped in `dist/schemas/` like the other three.

  Two flags rather than one `--report=json` because `@sigx/args` has no
  optional-value form — a value flag given no value is a `MISSING_VALUE` parse
  error, and `.required()` governs flag presence, not value presence. They
  collapse once signalxjs/terminal#102 lands (tracked as #177).

- **Presence-only modifiers** (RFC 0003 §3, #166): `TokensInput.modifiers`
  declares them, `RecipeInput.modifiers` (name → part → styles) wires them, and
  the compiler emits `[data-mod-<name>]` — valueless, because a modifier has no
  vocabulary; the names are the vocabulary. `compoundVariants[].match` accepts
  `true` for a modifier, which is also how a presence-only condition joins a
  compound at all. Harvested into `CompiledComponentAxes.mods` and emitted by
  the register generator as `mods: { 'block': boolean }` (or
  `Record<string, never>` when a design system declares none), so an undeclared
  modifier is a type error under an opted-in design system. Declared-but-unwired
  modifiers warn like any other declared vocabulary. There is no
  `defaultVariants` analogue — absence already is a modifier's default.

  This closes the one thing the axis grammar could not express: daisyUI's
  `btn-block`/`btn-wide`, Radix's `highContrast`, Ant's boolean `danger`,
  HeroUI v3's `isIconOnly`. The closest previous encoding was a one-member axis
  (`axes: { block: ['block'] }`), which restates the name as its own value.

- **The kit is a `sigx` CLI plugin** (#154): a `"sigx-cli"` manifest field and
  a new `@sigx/zero-kit/plugin` export, built on `definePlugin` and
  `@sigx/args`. Auto-discovered in any package that depends on the kit. This
  replaces ~113 lines of hand-rolled argv parsing with declared, typed args and
  brings `--help`/`-h` per command, `--flag=value` as well as `--flag value`,
  kebab↔camel flag names, rejection of unknown flags and of value flags given
  no value, and generated help text — none of which the old parser had. The
  command surface gains its first tests.

- **The generated register artifact** (RFC 0002 phase 3, #131):
  `writeArtifacts` emits `dist/register.d.ts` + `dist/register.js` per design
  system — a generated (never authored) augmentation of `@sigx/zero`'s
  `ZeroVocabulary` carrying theme names, breakpoints, the emitted
  custom-property union, per-category token unions (recommended ∪ declared
  keys), and per-component wired axis values, `never` where nothing is wired
  and `Record<string, never>` for empty axes. Every recipe scope is emitted,
  scope keys are quoted (they are kebab-case) and the file carries a
  compile-time assertion against `ZeroScope`. Exposed as
  `compileRegisterDts`/`compileRegisterJs` beside the other web-target
  emitters; `CompiledDesignSystem` gains `components`
  (`CompiledComponentAxes`: `variants` keys ∪ `compoundVariants` matches,
  `defaultVariants` recorded without widening). All four design-system
  packages gain the `"./register"` exports subpath.

### Fixed

- **The register artifact said the wrong thing about an axis a design system
  declares out of existence** (#99). A `never` axis was always explained as
  "no `<ds>` recipe wires it", which sends an author looking for a recipe gap —
  wrong advice when the design system declared `roles: {}` or `sizes: []` and
  there is no axis to wire. The generator now distinguishes the two:
  *"heroui declares no color axis at all"* versus *"no heroui recipe wires
  it"*, decided per axis rather than per design system, so a declared-but-
  unwired `variant` still reads as the recipe gap it is. Only `color` and
  `size` can be declared away — via `roles: {}` / `sizes: []`, which are
  distinguishable from an omission because omitting either yields the
  recommended set. Omitting `tokens.variants` means "check nothing", not "no
  variant axis", so `variant` is never reported that way. Surfaced by the first
  design system with no colour axis; the four existing goldens are unchanged.

- **Two unvalidated token-name paths** (RFC 0003 §6.3, #162). `recipe.tokens`
  keys were not checked at all: a key spelled without the leading `--` is
  passed through by `declBlock` as an ordinary declaration, so
  `tokens: { color: 'red' }` silently restyled every carrier element of the
  component instead of defining a token. Now an error, and so is a key that is
  not `--` plus the same kebab-case identifier every other declared name uses
  (`--Btn_Accent` is legal CSS and still wrong here). And two roles could
  derive the same custom property — role `danger-soft` emits
  `--color-danger-soft`, which role `danger` already derives — with the later
  one silently winning; now an error naming both roles. A role declaring
  `soft: false` frees the derived name, and is not flagged.

- **`compoundVariants` silently ignored `defaultVariants`** (RFC 0003 §6.1,
  #158). The single-axis loop mirrors a defaulted value onto the attribute's
  absence (`:not([data-variant])`); the compound loop did not, so a compound
  matching `{ variant: 'solid', color: 'primary' }` under
  `defaultVariants: { variant: 'solid' }` never applied to
  `<Button.Root color="primary">` — which carries no `data-variant` at all —
  and nothing reported it. The compound selector is now the cross product of
  each matched axis's alternatives, emitted as one rule per combination
  (`emitPartStyles` appends pseudo-element suffixes and state selectors to what
  it is handed, so a comma-joined list would bind them to the last selector
  only). No shipped design system used `compoundVariants`, so no emitted CSS
  changes.

- **Two new compound-variant validator rules** (#158): an **error** when a
  compound matches an axis the recipe never wires in `variants` — the generated
  types harvest compound match values into the axis union, so such an axis
  type-checks on its own and then matches nothing — and a **warning** when the
  axis is wired but has no rule for that particular value.

### Changed

- **`dist/manifest.json`'s `components` field changed shape**: from a bare
  scope-name array to the per-scope wired-axes record (scope names remain its
  keys). In-repo consumers updated; the zero package's own manifest is
  unaffected.

- **Declared axis vocabularies** (RFC 0002 phase 1, #129): `TokensInput`
  gains `variants` (the `variant` axis value set) and `axes` (custom axis
  name → value set). Both are validated like `sizes` (non-empty, kebab-case,
  no duplicates); axis names are additionally rejected against the named-prop
  axes and `RESERVED_AXES` — the validator rejects exactly what the zero
  runtime refuses to render. Once declared, a recipe `variants.variant` or
  custom-axis value outside the list is an error listing the declared set,
  wiring an undeclared custom axis is an error, and a declared value no
  recipe wires warns. Both fields flow into `CompiledDesignSystem.tokens`,
  `dist/manifest.json` and `tokens.schema.json`. Omitting them preserves
  previous behaviour exactly.
- **`defaultVariants` validation**, unconditional: every key must name an
  axis the recipe wires and every value must be one the axis wires
  (`variants` keys plus `compoundVariants` matches). Previously
  `defaultVariants: { variant: 'ghots' }` was a silent no-op.

### Changed

- **An explicit declaration closes its set**: a `variants.size` value off an
  *explicitly declared* `tokens.sizes` ramp is now an error (previously a
  warning); the default recommended ramp still warns. No shipped design
  system declares `tokens.sizes`, so nothing shipped changes behaviour.
- The duplicate colour-variant warning in `validateDesignSystem` was removed;
  the same condition is already an error in `validateRecipes`, and every
  violation used to report twice at two severities.
- All four design systems declare `variants: ['solid', 'outline', 'soft',
  'ghost']`.

## [0.1.0] - 2026-07-27

### Added

- **Pseudo-part projection** (multi-target RFC docs/rfcs/0001, #98):
  `ManifestPart.pseudo` marks a part that renders no element of its own on
  the web (dialog's `backdrop`). `compileRecipeCss` attaches such a part's
  rules to the host part with the pseudo-element last —
  `[data-part="popup"][data-state="open"]::backdrop` — across base, states,
  nested selectors, variants and compound variants. The manifest schema
  gains the matching optional `pseudo` object.

- **`--text-fixed-<key>` aliases** (part of the multi-target RFC,
  docs/rfcs/0001, #96): `compileTokensCss` derives a `--text-fixed-<key>:
  var(--text-<key>)` alias for every emitted `--text-<key>`, restating it in
  exactly the theme blocks that re-emit the underlying key (an alias
  substitutes its `var()` where declared — the same capture trap as
  color-referencing tokens). A literal `typography.sizes` key spelling a
  `fixed-*` name wins over the derived alias. The aliases join the token
  vocabulary, so recipes may reference `var(--text-fixed-<key>)` for any
  declared or recommended key. Exported as `TEXT_FIXED_PREFIX`
  (parity-tested against `@sigx/zero/contract`).
- **Contract docs for cross-target semantics**: `RUNTIME_PROPERTIES` are
  documented as web-only (a target that cannot resolve inline-written
  `var()` has no equivalent mechanism), and `-soft` derivation is documented
  as oklab-at-`softMix` for every emit target.

- **JSON Schemas for the authoring surfaces** (draft 2020-12), shipped in
  `schemas/` and copied to `dist/schemas/` by the build, for publication at
  `https://signalxjs.github.io/zero/schemas/`:
  `tokens.schema.json` (`TokensInput`), `recipe.schema.json` (`RecipeInput`)
  and `manifest.schema.json` — the manifest `@sigx/zero` already emitted with
  that `$schema` URL, which now exists. A generator can emit tokens/recipes as
  plain JSON, schema-check the structure, then run `zero-kit validate` for the
  semantic half. The schemas are validated against every shipped design
  system (and the real zero manifest) by the test suite, including negative
  cases, so they cannot silently drift from the TypeScript types.

- **`RUNTIME_PROPERTIES`** — the custom properties the `@sigx/zero` runtime
  writes on elements (`--press-x/y/r`, `--progress-percent`,
  `--slider-percent`) are now part of the token vocabulary, so recipes may
  reference them without a "never declares" error. The press trio is new;
  the percent pair was always written by Progress/Slider and merely never
  referenced by a shipped recipe.
- The validator warns when a recipe targets `data-press-animating` but never
  starts an animation — the runtime clears the flag as soon as no animation
  is running, so such a rule matches for zero frames.

- **A recipe may key `variants` on any axis, not just the contract three.**
  The old warning — *"no zero component ever sets that attribute, so nothing
  can match them"* — was accurate and is now obsolete: `@sigx/zero`'s new
  `axes` prop sets `data-<axis>`. It is replaced by an **error** on an axis
  that shadows the anatomy contract (`RESERVED_AXES`, mirrored from
  `@sigx/zero/contract`'s prop fragments and parity-tested), the one case that must
  still fail — `data-state` as a variant axis would repoint every
  `[data-state="open"]` rule in the design system.
- Two validator rules for the colour axis, the counterpart to the size-ramp
  check: an **error** on a `variants.color` key that names no declared role
  (it compiles to a selector `data-color` can never match), and a **warning**
  when one component wires fewer roles than its siblings. The second catches
  a component claiming the axis and under-delivering — `@sigx/zero-daisyui`
  styled only `primary` on Tabs while Button looped all eight, so
  `<Tabs.Root color="success">` type-checked, emitted the attribute and
  matched nothing. A role held back consistently across every component
  (`@sigx/zero-material`'s tonal surfaces) is a deliberate choice and says
  nothing.
- `TokenVocabulary` gains `roles`, alongside `sizes`.

### Fixed

- **Selector injection through variant axis names and values.** Recipe
  compilation interpolated them straight into `[data-<axis>="<value>"]`, so a
  value containing a quote closed the attribute early and everything after it
  was read as CSS — `size: { 'x"], [data-part="panel': … }` emitted a second,
  unrelated selector styling every tab inside any panel. `compileRecipeCss`
  now throws on an axis name or value that isn't a kebab-case identifier (the
  same `TOKEN_KEY_PATTERN` every other declared name obeys), and
  `validateRecipes` reports it as an error first, including for
  `compoundVariants.match`. `tokens.sizes` entries are checked at the
  declaration too. Affects all axes, not just `size`.

### Changed (breaking — pre-release)

- `ZeroManifest.tokens.sizeScale` is now `tokens.recommendedSizes`, matching
  `tokens.colors.recommendedRoles`. `SizeScale` widens to accept any
  DS-declared size name.
- **Extensible color roles**: the color vocabulary is now DS-declared.
  `TokensInput.roles` declares role names (each emitting `--color-<role>`,
  plus `-content` / `-soft` per its `RoleDecl`); omitting `roles` selects the
  recommended eight. `defineTokens` / `defineDesignSystem` are generic over
  the declaration, so theme `colors` keys stay autocompleted and
  completeness-checked. Only the base surfaces
  (`base-100/200/300/base-content`) remain fixed.
- The validator derives completeness and WCAG contrast pairs from the role
  declaration, errors on color tokens outside the declared vocabulary, and
  warns when `extra` is used instead of declared `custom` tokens.
- `@property` registrations for declared roles (and `custom` tokens with a
  `syntax`) are emitted at the top of the compiled `tokens.css` (moved from
  `@sigx/zero`'s `base.css`, which cannot know DS-declared names).
- The DS-level `dist/manifest.json` now carries `tokens: { roles, custom,
  breakpoints }` — the declared vocabulary for tooling and the generation
  skill.
- Removed the fixed-vocabulary exports `COLOR_VARIANT_LIST`,
  `CORE_COLOR_TOKEN_LIST`, `CONTRAST_PAIRS` in favor of
  `RECOMMENDED_ROLE_LIST`, `DEFAULT_ROLES`, `BASE_SURFACE_TOKEN_LIST`,
  `resolveRoles`, `requiredColorTokens`, `contrastPairs`.

### Added

- `TokensInput.custom` — declared DS-specific tokens (`name → { description,
  syntax? }`), valued per-theme via `ThemeInput.custom`, validated for
  completeness and surfaced in the DS manifest.
- `TokensInput.sizes` — the design system's `size` axis vocabulary, the
  analogue of `roles` for the other axis zero interprets. Recipes are
  validated against *this* ramp instead of a fixed `xs`–`xl`, so a design
  system with density steps is no longer warned on every one of them, and it
  is surfaced in the DS manifest as `tokens.sizes`. Omitted → the recommended
  ramp. `SIZE_SCALE_LIST` and `RecommendedSize`/`SizeScale` are now exported,
  so a design system can extend rather than retype it
  (`sizes: [...SIZE_SCALE_LIST, '2xl']`).
- `TokenVocabulary` gains `sizes` — it now carries the declared variant-axis
  vocabularies alongside the custom-property names, which is what the recipe
  validator checks against.
- `TokensInput.swatch` — declaration-driven theme-picker swatch (default:
  first four declared roles + base surfaces).
- `defaultSwatch(roleNames)` — that default rule, exported and mirrored in
  `@sigx/zero/contract` so `registerThemes` applies the same one at runtime.
  Previously it was inlined in the compiler and copy-pasted into each design
  system's `installThemes()`, which is how the registry and the manifest drifted
  apart; the contract-parity suite now guards it.
- `TokensInput.breakpoints` — reserved DS-level breakpoint declaration,
  surfaced in the DS manifest (consumed by the upcoming conditions support).

- `starting-style` is a built-in recipe condition, emitted after the rule it
  interpolates from. Presence — enter and exit animation — is declarative:
  zero never unmounts a popup, so transitioning `display`/`overlay` with
  `allow-discrete` is all the platform needs, and no runtime helper is
  involved.
- The validator warns about a half-animated part: `starting-style` with no
  transition to interpolate, or with no discrete property (`display`,
  `overlay`, `content-visibility`) carried by `allow-discrete`.
  The second is the silent one — the entry animates and the exit does not,
  because the element stops being rendered before it can play.
- A style-brief pack ships with the design-system skill:
  `skills/design-system/briefs/` holds four complete, compiling starting points
  (brutalist, glass, corporate, terminal), each one a full `TokensInput` plus a
  worked Button recipe. They are validated and compiled by the test suite, and
  the skill's cheat-sheet table is compared against them cell by cell, so a
  brief that goes stale fails a test instead of misleading the next reader.
- A `tokens.system` value that references a colour now resolves per theme.
  CSS substitutes `var()` where a property is *declared*, so a system-tier
  token declared once at `:root` captured that colour and every `[data-theme]`
  block inherited the captured value — a phosphor glow written
  `0 0 16px var(--color-primary)` stayed green on the amber theme. Such tokens
  are now restated inside each theme block, the way scheme-divergent values
  already were, so the reference resolves against that theme's own colours.
  This replaces the validator warning shipped alongside the brief pack: the
  shape it warned about is the shape that works.
- The validator rejects an unknown key under `system`. It was ignored
  silently, so a design system could declare a whole token category that
  never appeared, with nothing to explain why — which is exactly what a
  stale line in the agent skill caused. The message names the categories
  and suggests the right path for a category reached by its old name.
- `@sigx/zero-material` is the acceptance test for the extensible token
  vocabulary: a design language zero was not designed around, expressed
  entirely as data. It validates with no errors and no warnings, styles all
  fifteen components, and required no change to the kit.
- Both shipped design systems implement the `size` and `variant` axes for
  the new Button. They were advertised by the contract and implemented
  nowhere -- three `variants` blocks existed across both systems, all
  `color` -- so a generator had no worked example to imitate.
- **Typography in the token contract** -- `system.typography` declares
  `fonts`, `weights`, `leading`, `tracking` and the `--text-*` ramp,
  emitting `--font-*`, `--weight-*`, `--leading-*`, `--tracking-*`.
  Previously only a font-SIZE ramp existed, so a design system could not
  state its typographic voice at all: families and weights were reachable
  only through `extra`, which the validator warns on and which never
  reaches the manifest.
- `typography.scale: { base, ratio }` generates the `--text-*` ramp as a
  modular scale; explicit `typography.sizes` win per key, so a generated
  ramp with one hand-tuned display size is expressible.
- **`--font-*` means FAMILIES.** Sizes stay `--text-*`. This settles the
  naming against `@sigx/lynx-zero`, which currently uses `--font-*` for a
  control-label size ramp; that side renames when it is rewritten.
- `ThemeInput.text` / `TokensInput.system.text` moved to
  `system.typography.sizes` (breaking, pre-release).
- The validator rejects a `<number>` token carrying a unit -- CSS drops
  `font-weight: 700px` and a united `line-height` silently, the same
  failure mode as a unitless duration.
- **Recipe content validation.** Structure was already checked hard -- an
  unknown part or state fails the build -- but nothing looked inside a
  declaration, so a typo'd `var(--color-brnad)` compiled straight through
  to the shipped stylesheet and resolved to nothing. Recipes are now checked
  against a token vocabulary derived from the design system's own
  declaration, so every category added to `TOKEN_CATEGORIES` is enforced
  without touching the validator.
- New errors: an undeclared `var()` reference (with a "did you mean"), a
  component that styles `focus-visible` nowhere, a `skipStates` entry naming
  neither a state nor a flag, and variants on a component with no `root`
  part (the selectors could never match).
- New warnings: hardcoded palette colours, literal `transition` durations
  (which opt out of reduced motion), components with no recipe, and a part
  that declares `focus-visible` without styling it.
- `skipStates` now covers flags as well as machine states. Entries like
  `skipStates: { label: ['invalid', 'required'] }` were dead config, since
  those are flags -- they now mean what they always appeared to.
- Exported `tokenVocabulary` and `validateRecipes` for tooling that wants
  the vocabulary or the content pass on its own.
- **Spacing and shadow token categories** -- `system.spacing` emits
  `--space-*` and `system.shadow` emits `--shadow-*`, so a design system
  states its density and elevation once instead of scattering rem literals
  and box-shadows through its recipes. Keys are open, so an elevation ramp
  named `level1`..`level5` needs no special-casing.
- Both shipped design systems moved onto them: 76 spacing declarations and
  11 shadows, verified to resolve to byte-identical CSS. zero-basic also
  gains a heavier dark-scheme elevation ramp via `systemDark.shadow` -- a
  shadow tuned for a white page is nearly invisible on a dark one, and
  `light-dark()` cannot express it because it only takes colors.
- **Conditional recipe styles** -- `PartStyles.at` maps a condition to the
  same shape, recursively. Keys resolve to a declared breakpoint's
  `@media (min-width: ...)`, a built-in preference query, or a raw `@`
  prelude (`@container`, `@supports`, `@starting-style`).
  `TokensInput.breakpoints` -- declared but inert since it was added -- is
  now consumed. Because `variants` hold `PartStyles`, responsive variants
  need no separate mechanism.
- `compileRecipeCss` takes a third `RecipeContext` argument carrying the
  design system's breakpoints; `compileDesignSystem` passes it for you.
- `RecipeInput.css` -- raw CSS appended inside the component's own layer
  block, for anything the typed surface cannot express.
- The validator checks breakpoint declarations: kebab-case names, px/rem/em
  values, no collision with a built-in condition name, and **ascending
  order** -- declaration order is emission order, so a largest-first list
  would silently make the wider breakpoint lose to the narrower one.
- **Motion tokens** (`system.motion`) — `durations` and `easings` emit
  `--duration-*` / `--ease-*`, so a design system states its motion
  personality once instead of scattering `0.15s` through its recipes.
- **`prefers-reduced-motion` is now honored.** The compiler emits a block
  collapsing every *declared* duration to `0.01ms`. It has to be emitted per
  design system rather than living in `@sigx/zero`'s `base.css`, because
  duration keys are DS-declared and base.css cannot know a name like
  `--duration-emphasized-decelerate` — the same reason `@property`
  registration moved out of base.css. `0.01ms` rather than `0ms` keeps
  `transitionend` / `animationend` firing, which presence and exit-animation
  coordination depends on.
- The validator rejects a unitless duration. CSS ignores `150` outright, so
  the transition silently never runs and no event ever fires.
- **Token categories** — the declared-vocabulary architecture, generalized
  beyond color. `TOKEN_CATEGORIES` is a closed, kit-curated table (each entry
  fixing a `--prefix-`, the keys `@sigx/zero/css` ships fallbacks for, and a
  value grammar); the keys inside each category are declared by the design
  system and open, so a custom elevation ramp or type scale flows into the DS
  manifest without special-casing.
- `TokensInput.system` declares non-color token values **once for the design
  system** instead of restating them in every theme, with `TokensInput.
  systemDark` for dark-scheme overrides and `ThemeInput.system` for a single
  theme. Resolution: `system` → `systemDark` → `theme.system`.
  `defineTokens` / `defineDesignSystem` take a second `const` type parameter,
  so per-theme overrides narrow to exactly the keys that were declared.
- The DS `dist/manifest.json` gains `tokens.system`, `tokens.systemDark` and
  `tokens.properties` — the flat, sorted list of every custom property the
  design system emits, read back off the compiled CSS so it cannot drift
  (it includes derived tokens like `--color-<role>-soft`).

### Changed (breaking — pre-release)

- `ThemeInput.radius` / `size` / `text` / `border` / `disabledOpacity` moved
  to `TokensInput.system`. A theme keeps a `system` block for genuine
  per-theme differences.
- Compiled `tokens.css` no longer restates design-system-level token values
  inside every `[data-theme]` block — they live on `:where(:root)` and are
  inherited. Themes emit only what they actually change (plus any
  scheme-divergent values, see below). Computed values are unchanged; both
  shipped design systems lost 14 lines of pure duplication.

### Fixed

- **Every token kind now follows the system color scheme, not just colors and
  token categories.** Declared `custom` tokens, `extra` tokens and
  `components` overrides were emitted on `:where(:root)` from the default
  *light* theme unconditionally, so a theme pair whose `--glass-blur` differed
  resolved to the light value under system dark until the user explicitly
  picked a theme. All non-color properties now go through one map and one
  scheme-divergence pass, so the `prefers-color-scheme` block and the
  per-theme restatement cover them equally.
- **Non-color tokens can now differ by color scheme.** `:where(:root)` took
  *all* structural values from the light theme, so a dark theme's differing
  radius or border silently never applied under system dark. `light-dark()`
  can't help — it is a `<color>` function. Scheme-divergent values now emit a
  `@media (prefers-color-scheme: dark)` block, and every theme restates them
  so explicitly choosing the light theme while the OS is dark actually wins.
- The validator's `--color-*` namespace check for custom tokens now applies
  to every category namespace, and `systemDark` / per-theme overrides that
  name an undeclared key are errors (the runtime mirror of the type error,
  since `validate` runs against compiled JS).
- The kit's copy of zero's token contract is now genuinely parity-guarded.
  `contract.ts` claimed `zero-kit validate` cross-checked the installed
  `@sigx/zero` manifest — it never did, so the two copies could drift
  undetected. A dedicated test now compares every shared export by value,
  fails when a new shared export is added without a parity row, and
  re-derives the reserved-role-name rule from zero's actual
  `resolveColorToken` behavior. The misleading docstrings are corrected.
- Golden CSS fixtures cover the full compiled output (tokens, every
  component, and the combined index) of both shipped design systems, so
  ordering, layering and specificity regressions in the compiler are caught
  rather than assumed.
