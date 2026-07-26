// @sigx/zero-kit — design-system authoring for SignalX Zero.
//
// Typed tokens and recipes compiled to plain, layered CSS against the
// @sigx/zero anatomy manifest. Node-only; a built design system ships CSS
// and a tiny runtime module that imports only @sigx/zero.

export type {
    CustomTokenDecl,
    DurationKey,
    EaseKey,
    MotionDecl,
    FontKey,
    LeadingKey,
    RadiusKey,
    ShadowKey,
    SpaceKey,
    TrackingKey,
    TypographyDecl,
    WeightKey,
    RolesDecl,
    Scale,
    SizeKey,
    SystemTokens,
    TextKey,
    ThemeColors,
    ThemeInput,
    ThemeSystem,
    TokenValue,
    TokensInput,
} from './tokens.js';
export { defineTokens, compileTokensCss } from './tokens.js';

export type { TypeScale } from './scale.js';
export { generateTypeScale } from './scale.js';

export type { CssProps, PartStyles, RecipeContext, RecipeInput } from './recipes.js';
export { defineRecipe, compileRecipeCss, BUILTIN_CONDITIONS } from './recipes.js';

export type {
    DesignSystemInput,
    CompiledDesignSystem,
    CompiledTheme,
} from './design-system.js';
export { defineDesignSystem, compileDesignSystem } from './design-system.js';

export type { ValidationIssue, ValidationResult } from './validate.js';
export { validateDesignSystem } from './validate.js';

export type { TokenVocabulary } from './vocabulary.js';
export { tokenVocabulary } from './vocabulary.js';
export { validateRecipes } from './validate-recipes.js';

export { writeArtifacts } from './artifacts.js';

export type {
    RoleDecl,
    RecommendedRole,
    RecommendedSize,
    SizeScale,
    BaseSurfaceToken,
    TokenCategory,
    TokenCategoryId,
    TokenCategoryShape,
    TokenSyntax,
    ManifestPart,
    ManifestComponent,
    ZeroManifest,
} from './contract.js';
export {
    RECOMMENDED_ROLE_LIST,
    DEFAULT_ROLES,
    // Exported so a design system can extend the recommended ramp rather than
    // retype it: `sizes: [...SIZE_SCALE_LIST, '2xl']`.
    SIZE_SCALE_LIST,
    BASE_SURFACE_TOKEN_LIST,
    TOKEN_CATEGORIES,
    TOKEN_KEY_PATTERN,
    ROLE_NAME_PATTERN,
    RESERVED_ROLE_NAMES,
    tokenProperty,
    defaultSwatch,
    resolveRoles,
    systemNodeAt,
    requiredColorTokens,
    contrastPairs,
    INTERACTION_STATES,
    VARIANT_AXES,
} from './contract.js';
