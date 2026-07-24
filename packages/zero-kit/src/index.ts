// @sigx/zero-kit — design-system authoring for SignalX Zero.
//
// Typed tokens and recipes compiled to plain, layered CSS against the
// @sigx/zero anatomy manifest. Node-only; a built design system ships CSS
// and a tiny runtime module that imports only @sigx/zero.

export type { ThemeInput, TokensInput } from './tokens.js';
export { defineTokens, compileTokensCss } from './tokens.js';

export type { CssProps, PartStyles, RecipeInput } from './recipes.js';
export { defineRecipe, compileRecipeCss } from './recipes.js';

export type {
    DesignSystemInput,
    CompiledDesignSystem,
    CompiledTheme,
} from './design-system.js';
export { defineDesignSystem, compileDesignSystem } from './design-system.js';

export type { ValidationIssue, ValidationResult } from './validate.js';
export { validateDesignSystem } from './validate.js';

export { writeArtifacts } from './artifacts.js';

export type {
    ColorVariant,
    CoreColorToken,
    SoftColorToken,
    ManifestPart,
    ManifestComponent,
    ZeroManifest,
} from './contract.js';
export {
    COLOR_VARIANT_LIST,
    CORE_COLOR_TOKEN_LIST,
    CONTRAST_PAIRS,
    INTERACTION_STATES,
    VARIANT_AXES,
} from './contract.js';
