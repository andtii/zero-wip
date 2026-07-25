/**
 * zero-daisyui tokens — daisyUI's "light" and "dark" theme values on the
 * zero contract. Values match the daisy presets `@sigx/daisyui` ships, so a
 * zero app skinned with this package sits visually next to a daisy app.
 */
import type { RoleDecl, SystemTokens, TokensInput } from '@sigx/zero-kit';

/** daisyUI's color vocabulary — the recommended eight roles, declared explicitly. */
export const roles = {
    primary: {}, secondary: {}, accent: {}, neutral: {},
    info: {}, success: {}, warning: {}, error: {},
} as const satisfies Record<string, RoleDecl>;

/**
 * daisy's non-color token values — declared once for the design system rather
 * than restated per theme. The pill-shaped toggles come from the large
 * `radius.selector`; both daisy themes share the same structural feel.
 */
export const system = {
    radius: { selector: '1.5rem', field: '0.5rem', box: '1rem' },
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
    // daisy runs a slightly roomier ramp than basic — the `xl`/`2xl` steps
    // are where its cards and modals get their air.
    spacing: {
        '2xs': '0.125rem',
        xs: '0.25rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
    },
    // daisy leans on many barely-separated low elevations; preserved exactly.
    shadow: {
        xs: '0 1px 2px oklch(0% 0 0 / 0.08)',
        sm: '0 1px 2px oklch(0% 0 0 / 0.15)',
        md: '0 1px 2px oklch(0% 0 0 / 0.2)',
        lg: '0 12px 32px -8px oklch(0% 0 0 / 0.3)',
        xl: '0 25px 50px -12px oklch(0% 0 0 / 0.4)',
    },
    // daisy's own timings, unchanged in value — 0.15s/0.2s/0.3s as authored.
    motion: {
        durations: { fast: '150ms', normal: '200ms', slow: '300ms' },
        easings: { standard: 'ease' },
    },
    border: '1px',
    disabledOpacity: '0.3',
} as const satisfies SystemTokens;

export const tokens: TokensInput<typeof roles, typeof system> = {
    roles,
    system,
    defaultLight: 'light',
    defaultDark: 'dark',
    themes: {
        light: {
            colorScheme: 'light',
            pair: 'dark',
            softMix: 0.12,
            colors: {
                'base-100': 'oklch(100% 0 0)',
                'base-200': 'oklch(96.1% 0 0)',
                'base-300': 'oklch(92.4% 0 0)',
                'base-content': 'oklch(21% 0.006 285.88)',
                primary: 'oklch(49.12% 0.3096 275.75)',
                'primary-content': 'oklch(89.824% 0.06192 275.75)',
                secondary: 'oklch(69.71% 0.329 342.55)',
                'secondary-content': 'oklch(98.71% 0.0106 342.55)',
                accent: 'oklch(76.76% 0.184 183.61)',
                'accent-content': 'oklch(15.352% 0.0368 183.61)',
                neutral: 'oklch(32.17% 0.02 277.58)',
                'neutral-content': 'oklch(89.434% 0.004 277.58)',
                info: 'oklch(72.06% 0.191 231.6)',
                'info-content': 'oklch(14.412% 0.0382 231.6)',
                success: 'oklch(64.8% 0.15 160)',
                'success-content': 'oklch(12.96% 0.03 160)',
                warning: 'oklch(84.71% 0.199 83.87)',
                'warning-content': 'oklch(16.942% 0.0398 83.87)',
                error: 'oklch(63.72% 0.237 25.33)',
                'error-content': 'oklch(12.744% 0.0474 25.33)',
            },
        },
        dark: {
            colorScheme: 'dark',
            pair: 'light',
            softMix: 0.16,
            colors: {
                'base-100': 'oklch(25.33% 0.016 252.42)',
                'base-200': 'oklch(23.26% 0.014 253.1)',
                'base-300': 'oklch(21.15% 0.012 254.09)',
                'base-content': 'oklch(97.807% 0.003 252.42)',
                primary: 'oklch(65.69% 0.196 275.75)',
                'primary-content': 'oklch(13.138% 0.0392 275.75)',
                secondary: 'oklch(74.8% 0.26 342.55)',
                'secondary-content': 'oklch(14.96% 0.052 342.55)',
                accent: 'oklch(74.51% 0.167 183.61)',
                'accent-content': 'oklch(14.902% 0.0334 183.61)',
                neutral: 'oklch(31.3% 0.021 264.53)',
                'neutral-content': 'oklch(90.26% 0.0042 264.53)',
                info: 'oklch(72.06% 0.191 231.6)',
                'info-content': 'oklch(14.412% 0.0382 231.6)',
                success: 'oklch(64.8% 0.15 160)',
                'success-content': 'oklch(12.96% 0.03 160)',
                warning: 'oklch(84.71% 0.199 83.87)',
                'warning-content': 'oklch(16.942% 0.0398 83.87)',
                error: 'oklch(63.72% 0.237 25.33)',
                'error-content': 'oklch(12.744% 0.0474 25.33)',
            },
        },
    },
};
