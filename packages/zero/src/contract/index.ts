// The shared contract: anatomy machinery, data-attribute spec, token
// vocabulary and common prop fragments.

export type {
    SizeScale,
    RecommendedSize,
    RecommendedRole,
    BaseSurfaceToken,
    ColorValue,
    BackgroundValue,
    TokenCategory,
    TokenCategoryId,
    TokenCategoryShape,
    TokenSyntax,
} from './tokens.js';
export {
    RECOMMENDED_ROLE_LIST,
    BASE_SURFACE_TOKEN_LIST,
    SIZE_SCALE_LIST,
    TOKEN_CATEGORIES,
    TOKEN_KEY_PATTERN,
    TEXT_FIXED_PREFIX,
    CSS_COLOR_KEYWORDS,
    ROLE_NAME_PATTERN,
    tokenProperty,
    resolveColorToken,
    defaultSwatch,
} from './tokens.js';

export type {
    ZeroVocabulary,
    ColorValueFor,
    SizeScaleFor,
    VariantValueFor,
    AxesFor,
    ModsFor,
    ZeroThemeName,
    ZeroThemeNameOrCustom,
    ZeroProperty,
    ZeroBreakpoint,
    ZeroTokenCategory,
    TokenKeyFor,
} from './vocabulary.js';
export { cssVar, token } from './vocabulary.js';

export type { FlagName, Orientation, PlacementName } from './data-attrs.js';
export {
    FLAG_VOCABULARY,
    STATE_VOCABULARY,
    STATE_NAMES,
    STATE_SYNONYMS,
    PLACEMENT_VOCABULARY,
    dataAttr,
    stateAttr,
} from './data-attrs.js';

export type { Anatomy, AnatomyJSON, PartSpec, PartJSON, PartPseudo, TokenHint } from './anatomy.js';
export { defineAnatomy } from './anatomy.js';

export type {
    WithClass,
    WithDisabled,
    WithColor,
    WithSize,
    WithVariant,
    WithAxes,
    WithMods,
    WithVariantAxes,
    WithVariantAxesOpen,
    WithOrientation,
    WithAsChild,
    PartProps,
} from './props.js';
export { variantAttrs, RESERVED_AXES, VARIANT_AXES, MOD_ATTR_PREFIX } from './props.js';
export { renderAsChild, synthesizesClickFrom } from './as-child.js';
