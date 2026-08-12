/**
 * `@sigx/zero/contract/core` — the DOM-free contract surface.
 *
 * Everything `@sigx/zero/contract` exports EXCEPT the two deliberately
 * DOM-typed modules: `props.ts` (the asChild `PartProps` bag types its events
 * and ref with `lib.dom` shapes for web DX) and `as-child.ts` (whose
 * signatures name `EventTarget`). A platform runtime without DOM types
 * (`@sigx/lynx-zero`) imports the contract from here; the `portable`
 * type-test project compiles this entry under `lib: ["es2022"]`, so the gate
 * covers the real published entrypoint rather than source-relative paths.
 */

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

export { variantAttrs, RESERVED_AXES, VARIANT_AXES, MOD_ATTR_PREFIX } from './variant-attrs.js';

export {
    CLASS_GRAMMAR_VERSION,
    HOST_CLASS,
    partClass,
    stateClass,
    flagClass,
    axisClass,
    modClass,
    orientationClass,
    placementClass,
    themeClass,
} from './class-names.js';
