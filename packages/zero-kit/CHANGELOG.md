# Changelog

## [Unreleased]

### Changed (breaking — pre-release)

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
- `TokensInput.swatch` — declaration-driven theme-picker swatch (default:
  first four declared roles + base surfaces).
- `TokensInput.breakpoints` — reserved DS-level breakpoint declaration,
  surfaced in the DS manifest (consumed by the upcoming conditions support).

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
