# Changelog

## [Unreleased]

### Changed (breaking — pre-release)

- **The color contract is now a naming grammar, not a fixed vocabulary**:
  design systems declare their own roles (via `@sigx/zero-kit`); zero knows
  only the `--color-<role>[-content|-soft]` convention and the fixed base
  surfaces (`base-100/200/300/base-content`).
- `resolveColorToken` resolves by convention: `--x` → `var(--x)`, bare
  kebab-case identifiers → `var(--color-<name>)` (CSS-wide keywords,
  `transparent`, `currentcolor` excluded), everything else passes through.
  Named CSS colors like `'red'` now resolve as token names — write literal
  colors as `#f00` / `rgb()`.
- The `color` prop (`WithColor`) accepts any DS-declared role;
  recommended roles keep autocomplete.
- `manifest.json` `tokens.colors` is now `{ convention, required,
  recommendedRoles }` instead of a flat token list.
- `css/base.css` no longer registers `@property` for the eight recommended
  roles — registrations are emitted per-declaration by the kit into each
  design system's compiled `tokens.css`.
- Removed the fixed-vocabulary exports `COLOR_VARIANT_LIST`,
  `CORE_COLOR_TOKEN_LIST`, `COLOR_TOKEN_LIST`, `ColorVariant`, `ColorToken`,
  `CoreColorToken`, `SoftColorToken` in favor of `RECOMMENDED_ROLE_LIST`,
  `BASE_SURFACE_TOKEN_LIST`, `RecommendedRole`, `BaseSurfaceToken`,
  `ColorValue`.
