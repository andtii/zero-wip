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
