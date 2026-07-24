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
 * ## Structural token-name contract
 *
 * Every DS theme resolves against the same custom-property names:
 *
 * - Colors:    `--color-<role>[-content|-soft]` per the DS's declaration,
 *              plus the fixed `--color-base-100/200/300` / `--color-base-content`
 * - Roundness: `--radius-selector` | `--radius-field` | `--radius-box`
 * - Sizing:    `--size-selector` | `--size-field`
 * - Text ramp: `--text-xs` … `--text-3xl`
 * - Border:    `--border` (web-only addition; daisy v5 compatible)
 * - Misc:      `--disabled-opacity`
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
 * A color accepted by contract props: a token name from the recommended
 * vocabulary (autocompleted), any DS-declared token name, or a raw CSS
 * color string.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ColorValue = RecommendedRole | BaseSurfaceToken | (string & {});

/**
 * Structural (non-color) custom-property names in the contract.
 */
export const STRUCTURAL_TOKEN_LIST = [
    '--radius-selector', '--radius-field', '--radius-box',
    '--size-selector', '--size-field',
    '--text-xs', '--text-sm', '--text-md', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl',
    '--border',
    '--disabled-opacity',
] as const;

export type StructuralToken = typeof STRUCTURAL_TOKEN_LIST[number];

/** Values `resolveColorToken` must never rewrite into `var(--color-*)`. */
const CSS_KEYWORDS: ReadonlySet<string> = new Set([
    'inherit', 'initial', 'unset', 'revert', 'revert-layer',
    'currentcolor', 'transparent', 'none',
]);

const TOKEN_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

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
    if (CSS_KEYWORDS.has(value)) return value;
    return TOKEN_NAME.test(value) ? `var(--color-${value})` : value;
}

/**
 * Accepts a color token name (recommended roles autocompleted; DS-declared
 * roles equally valid) OR any raw CSS color string (`'#fff'`, `'rgb(…)'`,
 * `'var(--foo)'`).
 */
export type BackgroundValue = ColorValue;
