/**
 * Kit-side copy of the zero token contract vocabulary.
 *
 * Deliberately duplicated from `@sigx/zero/contract` so the kit stays a
 * pure Node tool with no runtime dependency on zero. The duplication is kept
 * honest by `packages/zero-kit/__tests__/contract-parity.test.ts`, which
 * compares every shared export by value, fails when a new shared export is
 * added without a parity row, and re-derives the reserved-name claim from
 * zero's actual `resolveColorToken` behavior.
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

/** How a token category spells its custom properties. */
export type TokenCategoryShape = 'scale' | 'scalar';

/**
 * CSS value grammar of a category. Published in the manifest so tooling and
 * generators know what a category accepts. NOT currently used for `@property`
 * registration: a registered `<length>` computes to an absolute value, which
 * would break `em`-relative and inheritance-sensitive ramps. Categories that
 * benefit from registration (animatable ones) opt in when they are added.
 */
export type TokenSyntax = '<length>' | '<time>' | '<number>' | '<color>' | '*';

/**
 * One token category: the naming GRAMMAR for a family of custom properties.
 *
 * Categories are closed and kit-curated; the KEYS inside are declared by each
 * design system and open. This is the color model (`roles`) generalized to
 * every other token family — colors themselves stay separate and stricter,
 * because a role is a semantic contract whose completeness must be enforced,
 * whereas a category is a value set with structural fallbacks in base.css.
 *
 * Mirrors `TOKEN_CATEGORIES` in `@sigx/zero/contract`; the parity test keeps
 * the two identical.
 */
export interface TokenCategory {
    readonly id: string;
    readonly shape: TokenCategoryShape;
    /** Custom-property prefix, including the leading `--`. */
    readonly prefix: string;
    /** Where the category lives in the authoring shape, under `system`. */
    readonly path: readonly string[];
    /** Keys base.css ships fallbacks for; open to any other key. */
    readonly recommended: readonly string[];
    readonly syntax: TokenSyntax;
    readonly description: string;
}

export const TOKEN_CATEGORIES = [
    {
        id: 'radius', shape: 'scale', prefix: '--radius-', path: ['radius'],
        recommended: ['selector', 'field', 'box'], syntax: '<length>',
        description: 'Corner rounding per surface kind: selector (checkbox/radio), field (input/button), box (card/dialog).',
    },
    {
        id: 'size', shape: 'scale', prefix: '--size-', path: ['size'],
        recommended: ['selector', 'field'], syntax: '<length>',
        description: 'Base unit control sizing multiplies — calc(var(--size-field) * 10).',
    },
    {
        id: 'text', shape: 'scale', prefix: '--text-', path: ['text'],
        recommended: ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'], syntax: '<length>',
        description: 'Font-size ramp.',
    },
    {
        id: 'duration', shape: 'scale', prefix: '--duration-', path: ['motion', 'durations'],
        recommended: ['instant', 'fast', 'normal', 'slow'], syntax: '<time>',
        description: 'Transition and animation durations; collapsed to ~0 under prefers-reduced-motion.',
    },
    {
        id: 'ease', shape: 'scale', prefix: '--ease-', path: ['motion', 'easings'],
        recommended: ['linear', 'standard', 'emphasized'], syntax: '*',
        description: 'Easing functions — the shape of a motion, independent of its duration.',
    },
    {
        id: 'border', shape: 'scalar', prefix: '--border', path: ['border'],
        recommended: [], syntax: '<length>',
        description: 'Default border width.',
    },
    {
        id: 'disabled-opacity', shape: 'scalar', prefix: '--disabled-opacity', path: ['disabledOpacity'],
        recommended: [], syntax: '<number>',
        description: 'Opacity applied to disabled parts.',
    },
] as const satisfies readonly TokenCategory[];

export type TokenCategoryId = typeof TOKEN_CATEGORIES[number]['id'];

/**
 * Token keys become the tail of a custom property, so unlike color roles they
 * may start with a digit (`--text-2xl`).
 */
export const TOKEN_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Read a category's node out of an authoring object, following the whole
 * `path`. Categories added later nest (`['typography', 'sizes']`), so
 * shortcutting to `path[0]` would silently resolve the wrong object.
 */
export function systemNodeAt(source: unknown, path: readonly string[]): unknown {
    let node = source;
    for (const segment of path) {
        if (node === undefined || node === null || typeof node !== 'object') return undefined;
        node = (node as Record<string, unknown>)[segment];
    }
    return node;
}

/**
 * The custom-property name a category key emits.
 *
 * `scalar` categories hold a single value and take no key; `scale`
 * categories require one — omitting it would silently produce
 * `--radius-undefined`, so it throws instead.
 */
export function tokenProperty(category: TokenCategory, key?: string): string {
    if (category.shape === 'scalar') return category.prefix;
    if (key === undefined) {
        throw new Error(`[zero-kit] token category "${category.id}" is a scale — tokenProperty needs a key`);
    }
    return `${category.prefix}${key}`;
}

/**
 * Role names zero's `resolveColorToken` treats as CSS keywords and never
 * resolves to `var(--color-<role>)` — declaring them would create tokens
 * that can't be referenced by convention. Mirrors `CSS_COLOR_KEYWORDS` in
 * `@sigx/zero/contract`; the parity test asserts both that the sets match and
 * that each name really does survive `resolveColorToken` unchanged.
 */
export const RESERVED_ROLE_NAMES: ReadonlySet<string> = new Set([
    'inherit', 'initial', 'unset', 'revert', 'revert-layer',
    'currentcolor', 'transparent', 'none',
]);

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
        categories: TokenCategory[];
        sizeScale: string[];
    };
    components: ManifestComponent[];
}
