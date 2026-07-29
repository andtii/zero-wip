/**
 * Conformance fixture: **Material 3** — Tier 1 (RFC 0003 §7.2).
 *
 * Material is already a package, so why a fixture? Because
 * `packages/zero-material` declares `variants: ['solid','outline','soft','ghost']`
 * — the four-name set all four in-repo systems share, which RFC 0003 §1.1
 * exists to name as CONVENTION rather than contract. Material 3's actual button
 * vocabulary is `filled | tonal | elevated | outlined | text`. Citing the
 * package as proof of a Material `variant` row would therefore be a false claim
 * on day one, and §7.4's whole point is that a row may claim `exact` only if it
 * names an artifact that executes it. This file is that artifact.
 *
 * The package remains the proof for the two rows it genuinely does execute:
 * thirteen colour roles (`zero-material/src/tokens.ts`), and the `level1`–`level5`
 * elevation ramp. Neither is repeated here.
 *
 * The in-repo divergence is tracked in #175.
 */
import type { RecipeInput, RoleDecl, SystemTokens, TokensInput } from '@sigx/zero-kit';
import type { ConformanceFixture } from './types.js';

/**
 * Five of Material's thirteen, chosen for what a button actually paints. The
 * full set — including the tonal `surface` family and a `content: false`
 * hairline `outline` — is declared and shipped by `packages/zero-material`.
 */
export const roles = {
    primary: { description: 'Primary key colour' },
    secondary: { description: 'Secondary key colour' },
    tertiary: { description: 'Tertiary key colour — Material has no `accent`' },
    error: { description: 'Error state' },
    // Explicit tone, not a derived tint — the `tonal` and `elevated` fills.
    'surface-container': { soft: false, description: 'Cards, sheets, raised fills' },
} as const satisfies Record<string, RoleDecl>;

export const system = {
    radius: { selector: '0.5rem', field: '624.9375rem', box: '0.75rem' },
    size: { selector: '0.25rem', field: '0.25rem' },
    border: '1px',
    disabledOpacity: '0.38',

    spacing: {
        '2xs': '0.125rem', xs: '0.25rem', sm: '0.5rem', md: '0.75rem',
        lg: '1rem', xl: '1.5rem', '2xl': '2rem',
    },

    /** Material's elevation ramp — `level1`–`level5`, not `sm`/`md`/`lg`. */
    shadow: {
        level1: '0 1px 2px 0 oklch(0% 0 0 / 0.3), 0 1px 3px 1px oklch(0% 0 0 / 0.15)',
        level2: '0 1px 2px 0 oklch(0% 0 0 / 0.3), 0 2px 6px 2px oklch(0% 0 0 / 0.15)',
        level3: '0 4px 8px 3px oklch(0% 0 0 / 0.15), 0 1px 3px 0 oklch(0% 0 0 / 0.3)',
        level4: '0 6px 10px 4px oklch(0% 0 0 / 0.15), 0 2px 3px 0 oklch(0% 0 0 / 0.3)',
        level5: '0 8px 12px 6px oklch(0% 0 0 / 0.15), 0 4px 4px 0 oklch(0% 0 0 / 0.3)',
    },

    motion: {
        durations: { instant: '0ms', fast: '100ms', normal: '200ms', slow: '350ms' },
        easings: {
            linear: 'linear',
            standard: 'cubic-bezier(0.2, 0, 0, 1)',
            emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
            accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
            decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
        },
    },

    typography: {
        fonts: {
            sans: 'Roboto, ui-sans-serif, system-ui, sans-serif',
            mono: '"Roboto Mono", ui-monospace, monospace',
        },
        sizes: {
            xs: '0.6875rem', sm: '0.75rem', md: '0.875rem',
            lg: '1rem', xl: '1.375rem', '2xl': '1.75rem', '3xl': '2.25rem',
        },
        weights: { normal: '400', medium: '500', semibold: '500', bold: '700' },
        leading: { none: '1', tight: '1.25', normal: '1.43' },
        tracking: { tight: '0', normal: '0.00625em', wide: '0.03125em' },
    },
} as const satisfies SystemTokens;

export const systemDark = {
    shadow: {
        level1: '0 1px 2px 0 oklch(0% 0 0 / 0.6), 0 1px 3px 1px oklch(0% 0 0 / 0.45)',
        level2: '0 1px 2px 0 oklch(0% 0 0 / 0.6), 0 2px 6px 2px oklch(0% 0 0 / 0.45)',
        level3: '0 4px 8px 3px oklch(0% 0 0 / 0.45), 0 1px 3px 0 oklch(0% 0 0 / 0.6)',
        level4: '0 6px 10px 4px oklch(0% 0 0 / 0.45), 0 2px 3px 0 oklch(0% 0 0 / 0.6)',
        level5: '0 8px 12px 6px oklch(0% 0 0 / 0.45), 0 4px 4px 0 oklch(0% 0 0 / 0.6)',
    },
} as const satisfies Partial<SystemTokens>;

export const tokens: TokensInput<typeof roles, typeof system> = {
    roles,
    /** M3 Expressive's five-step button ramp, on zero's spelling of the same steps. */
    sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
    /**
     * Material 3's ACTUAL button vocabulary — the reason this file exists.
     * `packages/zero-material` declares `solid | outline | soft | ghost`.
     */
    variants: ['filled', 'tonal', 'elevated', 'outlined', 'text'],
    system,
    systemDark,
    breakpoints: { sm: '600px', md: '905px', lg: '1240px' },
    defaultLight: 'material',
    defaultDark: 'material-dark',
    themes: {
        material: {
            colorScheme: 'light',
            pair: 'material-dark',
            softMix: 0.12,
            colors: {
                'base-100': 'oklch(99% 0.002 285)',
                'base-200': 'oklch(96% 0.004 285)',
                'base-300': 'oklch(91% 0.006 285)',
                'base-content': 'oklch(19% 0.006 285)',

                primary: 'oklch(48% 0.17 285)',
                'primary-content': 'oklch(100% 0 0)',
                secondary: 'oklch(47% 0.05 285)',
                'secondary-content': 'oklch(100% 0 0)',
                tertiary: 'oklch(48% 0.09 355)',
                'tertiary-content': 'oklch(100% 0 0)',
                error: 'oklch(45% 0.2 27)',
                'error-content': 'oklch(100% 0 0)',
                'surface-container': 'oklch(94% 0.006 285)',
                'surface-container-content': 'oklch(19% 0.006 285)',
            },
        },
        'material-dark': {
            colorScheme: 'dark',
            pair: 'material',
            softMix: 0.2,
            colors: {
                'base-100': 'oklch(17% 0.006 285)',
                'base-200': 'oklch(22% 0.007 285)',
                'base-300': 'oklch(29% 0.008 285)',
                'base-content': 'oklch(93% 0.004 285)',

                primary: 'oklch(82% 0.1 285)',
                'primary-content': 'oklch(24% 0.13 285)',
                secondary: 'oklch(84% 0.03 285)',
                'secondary-content': 'oklch(26% 0.04 285)',
                tertiary: 'oklch(84% 0.06 355)',
                'tertiary-content': 'oklch(28% 0.08 355)',
                error: 'oklch(80% 0.11 27)',
                'error-content': 'oklch(26% 0.15 27)',
                'surface-container': 'oklch(23% 0.007 285)',
                'surface-container-content': 'oklch(93% 0.004 285)',
            },
        },
    },
};

const ROLES = Object.keys(roles);

export const button: RecipeInput = {
    component: 'button',
    tokens: {
        '--btn-accent': 'var(--color-primary)',
        '--btn-on-accent': 'var(--color-primary-content)',
        '--btn-soft': 'var(--color-primary-soft)',
    },
    parts: {
        root: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-xl)',
                border: 'var(--border) solid transparent',
                // Material 3's full-round button shape.
                borderRadius: 'var(--radius-field)',
                background: 'var(--btn-accent)',
                color: 'var(--btn-on-accent)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--weight-medium)',
                lineHeight: 'var(--leading-tight)',
                letterSpacing: 'var(--tracking-wide)',
                cursor: 'pointer',
                transition: 'background var(--duration-normal) var(--ease-emphasized), box-shadow var(--duration-normal) var(--ease-emphasized)',
            },
            states: {
                hover: { filter: 'brightness(0.94)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed', filter: 'none', boxShadow: 'none' },
                'focus-visible': { outline: '3px solid var(--color-secondary)', outlineOffset: '2px' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { filter: 'brightness(0.88)' },
            },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((role) => [
            role,
            {
                root: {
                    base: {
                        '--btn-accent': `var(--color-${role})`,
                        '--btn-on-accent': `var(--color-${role}-content)`,
                    },
                },
            },
        ])),
        /**
         * The five real Material 3 button variants. `elevated` is the one that
         * has no analogue in the four-name convention at all — it is a low
         * surface fill DEFINED by carrying elevation.
         */
        variant: {
            filled: { root: { base: { background: 'var(--btn-accent)', color: 'var(--btn-on-accent)' } } },
            tonal: {
                root: {
                    base: {
                        background: 'var(--color-surface-container)',
                        color: 'var(--color-surface-container-content)',
                    },
                },
            },
            elevated: {
                root: {
                    base: {
                        background: 'var(--color-surface-container)',
                        color: 'var(--btn-accent)',
                        boxShadow: 'var(--shadow-level1)',
                    },
                },
            },
            outlined: {
                root: {
                    base: {
                        background: 'transparent',
                        color: 'var(--btn-accent)',
                        borderColor: 'var(--color-base-300)',
                    },
                },
            },
            text: {
                root: {
                    base: {
                        background: 'transparent',
                        color: 'var(--btn-accent)',
                        padding: 'var(--space-sm) var(--space-md)',
                    },
                },
            },
        },
        size: {
            xs: { root: { base: { padding: 'var(--space-2xs) var(--space-md)', fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { padding: 'var(--space-xs) var(--space-lg)', fontSize: 'var(--text-sm)' } } },
            md: { root: { base: {} } },
            lg: { root: { base: { padding: 'var(--space-lg) var(--space-2xl)', fontSize: 'var(--text-lg)' } } },
            xl: { root: { base: { padding: 'var(--space-xl) var(--space-2xl)', fontSize: 'var(--text-xl)' } } },
        },
    },
    compoundVariants: [
        {
            // An elevated button lifts further on hover — the elevation ramp is
            // a token scale, not an axis, which is why it has no matrix row.
            match: { variant: 'elevated' },
            parts: { root: { states: { hover: { boxShadow: 'var(--shadow-level2)' } } } },
        },
    ],
};

export const conformance = {
    id: 'material',
    tier: 1,
    system: 'Material 3',
    release: '3 (Expressive)',
    source: 'https://m3.material.io/components/buttons/specs',
    verified: '2026-07-29',
    provenBy: 'fixture',
    summary:
        'Thirteen colour roles, a `level1`–`level5` elevation ramp, and a button vocabulary the in-repo skin does not use.',
    api: {
        roles: {
            vendorCount: 13,
            note: "Material's `-content` foregrounds are spelled `on-primary`, `on-surface` — the same convention under a different affix, so they need no translation. Five of thirteen are declared here; `packages/zero-material` ships the full set, including a `content: false` hairline `outline` and the tonal `surface` family.",
        },
        sizes: { note: 'M3 Expressive names the steps "extra small" through "extra large"; zero spells the same five `xs`–`xl`.' },
        // `variants` omitted: `filled | tonal | elevated | outlined | text` land
        // in `tokens.variants` under Material's own names. Exact.
    },
} as const satisfies ConformanceFixture;
