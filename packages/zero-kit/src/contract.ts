/**
 * Kit-side copy of the zero token contract vocabulary.
 *
 * Deliberately duplicated from `@sigx/zero/contract` so the kit stays a
 * pure Node tool with no runtime dependency on zero; `zero-kit validate`
 * cross-checks a consumer's installed `@sigx/zero` manifest against this
 * list, which is the parity guard for the duplication.
 */

export const COLOR_VARIANT_LIST = [
    'primary', 'secondary', 'accent', 'neutral',
    'info', 'success', 'warning', 'error',
] as const;

export type ColorVariant = typeof COLOR_VARIANT_LIST[number];

export type CoreColorToken =
    | ColorVariant
    | `${ColorVariant}-content`
    | 'base-100' | 'base-200' | 'base-300' | 'base-content';

export type SoftColorToken = `${ColorVariant}-soft`;

export const CORE_COLOR_TOKEN_LIST: readonly CoreColorToken[] = [
    ...COLOR_VARIANT_LIST.flatMap((v): CoreColorToken[] => [v, `${v}-content`]),
    'base-100', 'base-200', 'base-300', 'base-content',
];

/** `x` / `x-content` foreground/background pairs the validator contrast-checks. */
export const CONTRAST_PAIRS: readonly (readonly [CoreColorToken, CoreColorToken])[] = [
    ...COLOR_VARIANT_LIST.map((v) => [v, `${v}-content`] as const),
    ['base-100', 'base-content'],
    ['base-200', 'base-content'],
    ['base-300', 'base-content'],
];

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
    tokens: { colors: string[]; structural: string[]; sizeScale: string[] };
    components: ManifestComponent[];
}
