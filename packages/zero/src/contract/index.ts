// The shared contract: anatomy machinery, data-attribute spec, token
// vocabulary and common prop fragments.

export type {
    SizeScale,
    ColorVariant,
    ColorToken,
    CoreColorToken,
    SoftColorToken,
    StructuralToken,
    BackgroundValue,
} from './tokens.js';
export {
    COLOR_VARIANT_LIST,
    CORE_COLOR_TOKEN_LIST,
    COLOR_TOKEN_LIST,
    STRUCTURAL_TOKEN_LIST,
    SIZE_SCALE_LIST,
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
