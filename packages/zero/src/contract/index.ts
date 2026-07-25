// The shared contract: anatomy machinery, data-attribute spec, token
// vocabulary and common prop fragments.

export type {
    SizeScale,
    RecommendedRole,
    BaseSurfaceToken,
    ColorValue,
    StructuralToken,
    BackgroundValue,
} from './tokens.js';
export {
    RECOMMENDED_ROLE_LIST,
    BASE_SURFACE_TOKEN_LIST,
    STRUCTURAL_TOKEN_LIST,
    SIZE_SCALE_LIST,
    CSS_COLOR_KEYWORDS,
    ROLE_NAME_PATTERN,
    resolveColorToken,
} from './tokens.js';

export type { FlagName, Orientation } from './data-attrs.js';
export { FLAG_VOCABULARY, dataAttr, stateAttr } from './data-attrs.js';

export type { Anatomy, AnatomyJSON, PartSpec, PartJSON, TokenHint } from './anatomy.js';
export { defineAnatomy } from './anatomy.js';

export type {
    WithClass,
    WithDisabled,
    WithColor,
    WithSize,
    WithVariant,
    WithOrientation,
    WithAsChild,
    PartProps,
} from './props.js';
export { variantAttrs } from './props.js';
export { renderAsChild } from './as-child.js';
