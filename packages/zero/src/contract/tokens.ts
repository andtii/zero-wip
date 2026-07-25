/**
 * The shared design-system token contract — web edition.
 *
 * `@sigx/zero` is the design-system-neutral foundation that DS packages
 * (`@sigx/zero-basic`, `@sigx/zero-daisyui`, …) build on. This module is the
 * *grammar* they agree on — size scales, color naming conventions and
 * structural theme token names — so that switching an app from one design
 * system to another is an import swap, not a rewrite.
 *
 * Rules of the contract:
 *
 * - The color contract is a naming GRAMMAR, not a vocabulary: each design
 *   system declares its own role names (via `@sigx/zero-kit`), and every
 *   color token is `--color-<role>`, optionally paired with
 *   `--color-<role>-content` (readable foreground on the role color) and
 *   `--color-<role>-soft` (tinted surface derived against `base-100`).
 *   Zero itself knows no role names — only the convention.
 * - The base surfaces (`base-100/200/300/base-content`) are the one fixed
 *   color vocabulary: they anchor soft derivation, `light-dark()` root
 *   emission and theme swatches, and every DS must provide them.
 * - `RECOMMENDED_ROLE_LIST` is the default vocabulary a DS gets when it
 *   declares nothing — shared recipes and the generation skill reference
 *   these names, but nothing in zero requires them.
 * - `variant` (fill style: outline, soft, ghost, …) is intentionally NOT in
 *   the contract — it is design-system chrome and differs per DS. Zero passes
 *   it through as `data-variant` without interpreting it.
 * - Structural custom-property NAMES are part of the contract; the *values*
 *   come from each DS's compiled themes.
 *
 * ## The token-category contract
 *
 * Non-color tokens follow the same shape as colors: a closed set of
 * CATEGORIES (`TOKEN_CATEGORIES`), each fixing a `--prefix-` and the value
 * grammar tooling needs, with fully OPEN keys inside that a design system
 * declares and that flow into its manifest. `recommended` names the keys
 * `css/base.css` ships fallbacks for, so a category a design system never
 * mentions still resolves.
 *
 * - Colors:    `--color-<role>[-content|-soft]` per the DS's declaration,
 *              plus the fixed `--color-base-100/200/300` / `--color-base-content`
 * - Categories: `--radius-*`, `--size-*`, `--text-*`, `--border`,
 *              `--disabled-opacity` — see `TOKEN_CATEGORIES`
 *
 * Colors stay a separate, stricter mechanism on purpose; the reasoning is on
 * `TokenCategory`.
 */

/** The shared component size scale. */
export type SizeScale = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const SIZE_SCALE_LIST = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

/**
 * The recommended color roles — the default vocabulary a design system gets
 * when it declares no `roles` of its own. Used for prop autocomplete and
 * structural defaults; any DS-declared role name is equally valid everywhere
 * these appear.
 */
export const RECOMMENDED_ROLE_LIST = [
    'primary', 'secondary', 'accent', 'neutral',
    'info', 'success', 'warning', 'error',
] as const;

export type RecommendedRole = typeof RECOMMENDED_ROLE_LIST[number];

/** The fixed base surfaces every design system provides. */
export const BASE_SURFACE_TOKEN_LIST = ['base-100', 'base-200', 'base-300', 'base-content'] as const;

export type BaseSurfaceToken = typeof BASE_SURFACE_TOKEN_LIST[number];

/**
 * A value for the semantic `color` axis: a role name — recommended roles
 * autocompleted, any DS-declared role equally valid. Base surfaces are not
 * part of the axis.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ColorValue = RecommendedRole | (string & {});

/** How a token category spells its custom properties. */
export type TokenCategoryShape =
    /** `${prefix}${key}` — the keys are design-system-declared. */
    | 'scale'
    /** `prefix` verbatim; the category holds a single value, no keys. */
    | 'scalar';

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
 * Categories are a closed, kit-curated set — each carries the semantics
 * tooling needs to reason about that family (its value grammar, and later
 * things like reduced-motion handling for durations).
 * The KEYS inside a category are fully open: a design system declares its own
 * (`shadow: { level1, …, level5 }`) and they flow into its manifest.
 * `recommended` is guidance, autocomplete and the set `base.css` ships
 * fallbacks for — never a constraint.
 *
 * This is the color contract's "declared vocabulary + naming grammar" model
 * (see `RECOMMENDED_ROLE_LIST`) generalized to every other token family.
 * Colors are deliberately NOT in this table: a role is a semantic contract
 * whose completeness must be enforced (a missing role breaks contrast
 * validation and leaves `var(--color-x)` unresolved), so they keep the
 * stricter declare-then-require model. Categories are value sets with
 * structural fallbacks, so absence is never an error.
 */
export interface TokenCategory {
    /** Stable id — the key used in zero's and every design system's manifest. */
    readonly id: string;
    readonly shape: TokenCategoryShape;
    /** Custom-property prefix, including the leading `--`. */
    readonly prefix: string;
    /** Where the category lives in the authoring shape, under `system`. */
    readonly path: readonly string[];
    /** Keys a design system gets fallbacks for; open to any other key. */
    readonly recommended: readonly string[];
    readonly syntax: TokenSyntax;
    /** One-line intent — published in the manifest for tooling and AI. */
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
 * may start with a digit (`--text-2xl`). Color roles keep the stricter
 * `ROLE_NAME_PATTERN` because `resolveColorToken` has to resolve a bare
 * identifier to `var(--color-<role>)`.
 */
export const TOKEN_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
        throw new Error(`[zero] token category "${category.id}" is a scale — tokenProperty needs a key`);
    }
    return `${category.prefix}${key}`;
}

/**
 * Values `resolveColorToken` must never rewrite into `var(--color-*)`.
 *
 * Exported because `@sigx/zero-kit` keeps a mirror of this contract and
 * rejects role declarations that use these names (a role named `transparent`
 * could never be referenced by convention). The mirror is kept honest by
 * `packages/zero-kit/__tests__/contract-parity.test.ts`.
 */
export const CSS_COLOR_KEYWORDS: ReadonlySet<string> = new Set([
    'inherit', 'initial', 'unset', 'revert', 'revert-layer',
    'currentcolor', 'transparent', 'none',
]);

/**
 * Role names must be bare kebab-case identifiers — they become
 * `--color-<role>`, and `resolveColorToken` resolves them by that shape alone.
 */
export const ROLE_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Resolve a color value to a CSS color string — by convention, not by
 * vocabulary (zero doesn't know which roles a design system declared).
 *
 * - `--anything`                    → `var(--anything)`
 * - bare kebab-case identifier
 *   (`'primary'`, `'base-100'`, any DS-declared role) → `var(--color-<name>)`
 * - CSS-wide keywords, `transparent`, `currentcolor`, `none` → unchanged
 * - anything else (`'#ffaa00'`, `'rgb(…)'`, `'oklch(…)'`) → unchanged
 *
 * Note the convention makes named CSS colors like `'red'` resolve as token
 * names — write them as `#f00` / `rgb()` when a literal color is meant.
 */
export function resolveColorToken(value: string): string {
    if (value.startsWith('--')) return `var(${value})`;
    if (CSS_COLOR_KEYWORDS.has(value)) return value;
    return ROLE_NAME_PATTERN.test(value) ? `var(--color-${value})` : value;
}

/**
 * Accepts a color token name — roles or base surfaces (recommended names
 * autocompleted; DS-declared names equally valid) — OR any raw CSS color
 * string (`'#fff'`, `'rgb(…)'`, `'var(--foo)'`).
 */
export type BackgroundValue = ColorValue | BaseSurfaceToken;
