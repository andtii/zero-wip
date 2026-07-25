/**
 * zero-basic tokens — a neutral, readable default palette.
 *
 * Type-only import from the kit: this module is pure data and ships in the
 * runtime bundle (installThemes derives registry metadata from it), so it
 * must not pull the Node-only kit at runtime.
 */
import type { RoleDecl, SystemTokens, ThemeSystem, TokensInput } from '@sigx/zero-kit';

/**
 * zero-basic's color vocabulary — exactly the recommended eight roles.
 * Declared explicitly (rather than relying on the kit default) so the DS
 * manifest documents the vocabulary and so this file shows the pattern a
 * DS with a different vocabulary follows.
 */
export const roles = {
    primary: {}, secondary: {}, accent: {}, neutral: {},
    info: {}, success: {}, warning: {}, error: {},
} as const satisfies Record<string, RoleDecl>;

/**
 * zero-basic's non-color token values — declared once for the design system
 * rather than restated per theme. Both themes share this structural feel;
 * a theme that wanted its own would override via its `system` block.
 */
export const system = {
    radius: { selector: '0.375rem', field: '0.375rem', box: '0.75rem' },
    size: { selector: '0.25rem', field: '0.25rem' },
    // Typography. `fonts` is FAMILIES — sizes are the --text-* ramp, which
    // this design system inherits from @sigx/zero's fallbacks.
    typography: {
        fonts: {
            sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        },
        weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
        leading: { none: 1, tight: 1.25, normal: 1.5 },
        tracking: { normal: '0em', wide: '0.05em' },
    },
    // Density ramp. The values are the ones these recipes already used, so
    // tokenizing changed nothing visually — what it buys is retuning density
    // in one place.
    spacing: {
        '2xs': '0.125rem',
        xs: '0.25rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
    },
    // Elevation, light scheme. `systemDark` below carries the heavier set —
    // the same shadow reads as almost nothing on a dark surface.
    shadow: {
        xs: '0 1px 2px oklch(0% 0 0 / 0.25)',
        sm: '0 4px 12px oklch(0% 0 0 / 0.25)',
        md: '0 10px 30px -10px oklch(0% 0 0 / 0.3)',
        lg: '0 20px 50px -12px oklch(0% 0 0 / 0.35)',
    },
    // Durations match the literals these recipes used before tokenization,
    // so the visual result is unchanged — what's new is that they can be
    // retuned in one place, and that reduced motion now collapses them.
    motion: {
        durations: { fast: '150ms', normal: '200ms' },
        easings: { standard: 'ease' },
    },
    border: '1px',
    disabledOpacity: '0.4',
} as const satisfies SystemTokens;

/**
 * Dark-scheme overrides. A shadow tuned for a white page is nearly invisible
 * on a dark one, so the ramp gets deeper and more opaque.
 */
export const systemDark = {
    shadow: {
        xs: '0 1px 2px oklch(0% 0 0 / 0.6)',
        sm: '0 4px 12px oklch(0% 0 0 / 0.6)',
        md: '0 10px 30px -10px oklch(0% 0 0 / 0.7)',
        lg: '0 20px 50px -12px oklch(0% 0 0 / 0.75)',
    },
} as const satisfies ThemeSystem<typeof system>;

export const tokens: TokensInput<typeof roles, typeof system> = {
    roles,
    system,
    systemDark,
    // Mobile-first min-widths. Declaration order is emission order, so these
    // must ascend — the validator enforces it.
    breakpoints: { sm: '640px', md: '768px', lg: '1024px' },
    defaultLight: 'basic',
    defaultDark: 'basic-dark',
    themes: {
        basic: {
            colorScheme: 'light',
            pair: 'basic-dark',
            softMix: 0.12,
            colors: {
                'base-100': 'oklch(100% 0 0)',
                'base-200': 'oklch(96.5% 0.001 286)',
                'base-300': 'oklch(92% 0.002 286)',
                'base-content': 'oklch(24% 0.01 285)',
                primary: 'oklch(48% 0.21 262)',
                'primary-content': 'oklch(97% 0.014 262)',
                secondary: 'oklch(48% 0.15 300)',
                'secondary-content': 'oklch(97% 0.012 300)',
                accent: 'oklch(52% 0.13 200)',
                'accent-content': 'oklch(97% 0.01 200)',
                neutral: 'oklch(30% 0.01 285)',
                'neutral-content': 'oklch(96% 0.002 285)',
                info: 'oklch(52% 0.14 235)',
                'info-content': 'oklch(97% 0.012 235)',
                success: 'oklch(48% 0.12 155)',
                'success-content': 'oklch(97% 0.01 155)',
                warning: 'oklch(60% 0.13 80)',
                'warning-content': 'oklch(16% 0.03 80)',
                error: 'oklch(50% 0.19 27)',
                'error-content': 'oklch(97% 0.012 27)',
            },
        },
        'basic-dark': {
            colorScheme: 'dark',
            pair: 'basic',
            softMix: 0.16,
            colors: {
                'base-100': 'oklch(21% 0.012 285)',
                'base-200': 'oklch(25% 0.013 285)',
                'base-300': 'oklch(30% 0.014 285)',
                'base-content': 'oklch(93% 0.004 286)',
                primary: 'oklch(70% 0.16 262)',
                'primary-content': 'oklch(17% 0.04 262)',
                secondary: 'oklch(72% 0.14 300)',
                'secondary-content': 'oklch(17% 0.04 300)',
                accent: 'oklch(74% 0.12 200)',
                'accent-content': 'oklch(17% 0.03 200)',
                neutral: 'oklch(35% 0.01 285)',
                'neutral-content': 'oklch(93% 0.003 285)',
                info: 'oklch(74% 0.13 235)',
                'info-content': 'oklch(18% 0.04 235)',
                success: 'oklch(74% 0.14 155)',
                'success-content': 'oklch(18% 0.04 155)',
                warning: 'oklch(80% 0.14 80)',
                'warning-content': 'oklch(20% 0.04 80)',
                error: 'oklch(68% 0.17 27)',
                'error-content': 'oklch(17% 0.04 27)',
            },
        },
    },
};
