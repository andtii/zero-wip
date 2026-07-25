// @sigx/zero-kit — design-system authoring for SignalX Zero.
//
// Typed tokens and recipes compiled to plain, layered CSS against the
// @sigx/zero anatomy manifest. Node-only; a built design system ships CSS
// and a tiny runtime module that imports only @sigx/zero.

export type {
    CustomTokenDecl,
    RadiusKey,
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
    RoleDecl,
    RecommendedRole,
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
    BASE_SURFACE_TOKEN_LIST,
    TOKEN_CATEGORIES,
    TOKEN_KEY_PATTERN,
    ROLE_NAME_PATTERN,
    RESERVED_ROLE_NAMES,
    tokenProperty,
    resolveRoles,
    systemNodeAt,
    requiredColorTokens,
    contrastPairs,
    INTERACTION_STATES,
    VARIANT_AXES,
} from './contract.js';
