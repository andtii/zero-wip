# Changelog

## [Unreleased]

### Added

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
