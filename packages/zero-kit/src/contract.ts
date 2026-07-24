/**
 * Kit-side copy of the zero token contract vocabulary.
 *
 * Deliberately duplicated from `@sigx/zero/contract` so the kit stays a
 * pure Node tool with no runtime dependency on zero; `zero-kit validate`
 * cross-checks a consumer's installed `@sigx/zero` manifest against this
 * list, which is the parity guard for the duplication.
 *
 * The color contract is a naming GRAMMAR, not a vocabulary: a design system
 * declares its own role names (`roles`), and every color token is
 * `--color-<role>` with the suffix semantics `-content` (readable foreground
 * on the role color, contrast-validated) and `-soft` (tinted surface derived
 * against `base-100`). Only the base surfaces are fixed — they anchor soft
 * derivation, `light-dark()` root emission and theme swatches.
 */

/** Declaration of one color role in a design system's vocabulary. */
export interface RoleDecl {
    /** Emit + require + contrast-check a `<role>-content` pairing. Default true. */
    content?: boolean;
    /** Emit a `<role>-soft` tint (explicit value or `softMix` derivation). Default true. */
    soft?: boolean;
    /** Intent of the role — surfaced in the DS manifest for tooling/AI. */
    description?: string;
}

/** Role names must be bare kebab-case identifiers (they become `--color-<role>`). */
export const ROLE_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * The recommended role vocabulary — the default `roles` declaration when a
 * design system doesn't provide one. Shared component recipes and the
 * generation skill reference these names; declaring more (or fewer) roles is
 * fully supported.
 */
export const RECOMMENDED_ROLE_LIST = [
    'primary', 'secondary', 'accent', 'neutral',
    'info', 'success', 'warning', 'error',
] as const;

export type RecommendedRole = typeof RECOMMENDED_ROLE_LIST[number];

export const DEFAULT_ROLES: Record<RecommendedRole, RoleDecl> = Object.fromEntries(
    RECOMMENDED_ROLE_LIST.map((r) => [r, {}]),
) as Record<RecommendedRole, RoleDecl>;

/** The fixed base surfaces every design system must provide. */
export const BASE_SURFACE_TOKEN_LIST = ['base-100', 'base-200', 'base-300', 'base-content'] as const;

export type BaseSurfaceToken = typeof BASE_SURFACE_TOKEN_LIST[number];

/** Normalize a roles declaration (undefined → the recommended vocabulary). */
export function resolveRoles(roles: Record<string, RoleDecl> | undefined): Record<string, RoleDecl> {
    return roles ?? DEFAULT_ROLES;
}

/** Theme-authorable color token names for a declaration (no `-soft` — optional). */
export function requiredColorTokens(roles: Record<string, RoleDecl>): string[] {
    return [
        ...Object.entries(roles).flatMap(([name, decl]) =>
            decl.content === false ? [name] : [name, `${name}-content`]),
        ...BASE_SURFACE_TOKEN_LIST,
    ];
}

/** `bg` / `fg` pairs the validator contrast-checks for a declaration. */
export function contrastPairs(roles: Record<string, RoleDecl>): readonly (readonly [string, string])[] {
    return [
        ...Object.entries(roles)
            .filter(([, decl]) => decl.content !== false)
            .map(([name]) => [name, `${name}-content`] as const),
        ['base-100', 'base-content'],
        ['base-200', 'base-content'],
        ['base-300', 'base-content'],
    ];
}

/** Interaction states resolved to real pseudo-classes, not data attributes. */
export const INTERACTION_STATES: Record<string, string> = {
    hover: ':hover:not([data-disabled])',
    focus: ':focus',
    'focus-visible': ':focus-visible',
    active: ':active:not([data-disabled])',
};

/** Contract variant axes and their pass-through attributes. */
export const VARIANT_AXES: Record<string, string> = {
    color: 'data-color',
    size: 'data-size',
    variant: 'data-variant',
};

// ── Minimal structural mirror of @sigx/zero's AnatomyJSON/manifest types ──

export interface ManifestPart {
    name: string;
    element: string;
    states?: readonly string[];
    flags?: readonly string[];
    tokens?: readonly string[];
    asChild?: boolean;
    /** state/flag name → selector fragment (e.g. `open` → `[data-state="open"]`). */
    selectors: Record<string, string>;
}

export interface ManifestComponent {
    scope: string;
    orientation?: boolean;
    parts: ManifestPart[];
}

export interface ZeroManifest {
    zeroVersion: string;
    tokens: {
        colors: {
            convention: { prefix: string; contentSuffix: string; softSuffix: string };
            required: string[];
            recommendedRoles: string[];
        };
        structural: string[];
        sizeScale: string[];
    };
    components: ManifestComponent[];
}
