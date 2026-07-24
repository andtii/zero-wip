/**
 * The shared design-system token contract — web edition.
 *
 * `@sigx/zero` is the design-system-neutral foundation that DS packages
 * (`@sigx/zero-basic`, `@sigx/zero-daisyui`, …) build on. This module is the
 * *vocabulary* they agree on — size scales, semantic colors and theme token
 * names — so that switching an app from one design system to another is an
 * import swap, not a rewrite.
 *
 * The token NAMES here are shared verbatim with `@sigx/lynx-zero` (and the
 * terminal contract): one design-system source can target web, Lynx and
 * terminal because all three resolve the same custom-property names.
 *
 * Rules of the contract:
 *
 * - DS packages **extend** these types, they never redeclare them. Drift
 *   fails `pnpm typecheck`.
 * - `variant` (fill style: outline, soft, ghost, …) is intentionally NOT in
 *   the contract — it is design-system chrome and differs per DS. Zero passes
 *   it through as `data-variant` without interpreting it.
 * - Theme CSS custom-property NAMES are part of the contract; the *values*
 *   come from each DS's compiled themes.
 *
 * ## Structural token-name contract
 *
 * Every DS theme resolves against the same custom-property names:
 *
 * - Colors:    `--color-<ColorToken>` (e.g. `--color-primary`, `--color-base-100`)
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
 * Semantic color names — the shared `color` prop vocabulary. A DS maps each
 * onto its palette.
 *
 * Single source of truth: the `ColorVariant` union, the `-content` / `-soft`
 * token derivations, and the runtime `COLOR_TOKENS` Set all derive from this
 * tuple.
 */
export const COLOR_VARIANT_LIST = [
    'primary', 'secondary', 'accent', 'neutral',
    'info', 'success', 'warning', 'error',
] as const;

export type ColorVariant = typeof COLOR_VARIANT_LIST[number];

/**
 * Tokens authored by every theme: each variant + its `-content` pairing,
 * plus the base surfaces.
 */
export type CoreColorToken =
    | ColorVariant
    | `${ColorVariant}-content`
    | 'base-100' | 'base-200' | 'base-300' | 'base-content';

/**
 * Soft (tinted-surface) tokens — one per variant, exposed as
 * `--color-<variant>-soft`. On the web these are *live CSS*, not
 * materialized values: the kit emits
 * `color-mix(in oklab, var(--color-primary) N%, var(--color-base-100))`
 * so an app overriding `--color-primary` gets correct tints for free.
 * (Lynx materializes the same `softMix` at theme registration instead.)
 */
export type SoftColorToken = `${ColorVariant}-soft`;

/**
 * The full set of semantic color tokens every compiled theme carries,
 * exposed as `--color-<token>` CSS custom properties.
 */
export type ColorToken = CoreColorToken | SoftColorToken;

export const CORE_COLOR_TOKEN_LIST: readonly CoreColorToken[] = [
    ...COLOR_VARIANT_LIST.flatMap((v): CoreColorToken[] => [v, `${v}-content`]),
    'base-100', 'base-200', 'base-300', 'base-content',
];

export const COLOR_TOKEN_LIST: readonly ColorToken[] = [
    ...COLOR_VARIANT_LIST.flatMap((v): ColorToken[] => [v, `${v}-content`, `${v}-soft`]),
    'base-100', 'base-200', 'base-300', 'base-content',
];

const COLOR_TOKENS: ReadonlySet<string> = new Set(COLOR_TOKEN_LIST);

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

/**
 * Resolve a color value to a CSS color string.
 *
 * - Known semantic tokens (e.g. `'base-100'`) → `var(--color-base-100)`.
 * - Anything else (`'#ffaa00'`, `'rgb(…)'`, `'var(--my-custom)'`) passes
 *   through unchanged.
 */
export function resolveColorToken(value: string): string {
    return COLOR_TOKENS.has(value) ? `var(--color-${value})` : value;
}

/**
 * Accepts a semantic color token (autocompleted) OR any raw CSS color
 * string (`'#fff'`, `'rgb(…)'`, `'var(--foo)'`).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type BackgroundValue = ColorToken | (string & {});
