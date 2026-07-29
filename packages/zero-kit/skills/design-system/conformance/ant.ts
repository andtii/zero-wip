/**
 * Conformance fixture: **Ant Design** — Tier 2 (RFC 0003 §7.2).
 *
 * A correction as much as a fixture. RFC 0003 §1.3 and §7.2 justify Ant's place
 * in the matrix as "the axis named `type`" — that was true of v5. **Ant Design
 * v6 (2025-11) makes `color` × `variant` the documented Button API** and demotes
 * `type` to sugar over the two ("Set button type. Will follow `variant` &
 * `color` if provided"). So on its headline axes Ant now CONFIRMS zero's
 * topology rather than stressing it, and both rows grade `exact`.
 *
 * What Ant still forces, and nothing else in the matrix does:
 *
 *   - **`shape`** — a genuine extra axis (`default | circle | round`) that zero
 *     has no named prop for. With Radix's `radius` this is one of only two
 *     honest `tokens.axes` uses in the matrix: an axis zero LACKS, rather than a
 *     rename of one it has.
 *   - **three independent boolean props** — `danger`, `ghost`, `block` — on one
 *     component, where every other system has at most two.
 *   - **`block`**, which corroborates daisyUI's in-repo `btn-block` (RFC §3).
 *
 * `type` is kept as a row precisely because it is legacy sugar: it is what a v5
 * codebase still passes, and grading it is the honest thing to do.
 */
import type { RecipeInput, RolesDecl, SystemTokens, TokensInput } from '@sigx/zero-kit';
import type { ConformanceFixture } from './types.js';

/**
 * Ant's `color` takes `default | primary | danger` plus thirteen presets. Six
 * are declared: the three semantic values and three presets, which is enough to
 * show the axis is ordinary roles.
 */
export const roles = {
    default: {}, primary: {}, danger: {}, blue: {}, green: {}, gold: {},
} as const satisfies RolesDecl;

export const system = {
    radius: { selector: '0.25rem', field: '0.375rem', box: '0.5rem' },
    size: { selector: '0.25rem', field: '0.25rem' },
    border: '1px',
    disabledOpacity: '0.4',

    spacing: {
        '2xs': '0.125rem', xs: '0.25rem', sm: '0.5rem', md: '0.75rem',
        lg: '1rem', xl: '1.5rem', '2xl': '2rem',
    },

    shadow: {
        xs: '0 2px 0 oklch(0% 0 0 / 0.02)',
        sm: '0 1px 2px 0 oklch(0% 0 0 / 0.03), 0 1px 6px -1px oklch(0% 0 0 / 0.02)',
        md: '0 6px 16px 0 oklch(0% 0 0 / 0.08)',
        lg: '0 9px 28px 0 oklch(0% 0 0 / 0.05)',
        xl: '0 12px 48px 16px oklch(0% 0 0 / 0.03)',
    },

    motion: {
        durations: { instant: '0ms', fast: '100ms', normal: '200ms', slow: '300ms' },
        easings: {
            linear: 'linear',
            standard: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
            accelerate: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
            decelerate: 'cubic-bezier(0.23, 1, 0.32, 1)',
        },
    },

    typography: {
        fonts: {
            sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
            mono: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
        },
        sizes: {
            xs: '0.75rem', sm: '0.875rem', md: '0.875rem',
            lg: '1rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem',
        },
        weights: { normal: '400', medium: '500', semibold: '600', bold: '600' },
        leading: { none: '1', tight: '1.4', normal: '1.5715' },
        tracking: { tight: '0', normal: '0', wide: '0.02em' },
    },
} as const satisfies SystemTokens;

export const systemDark = {
    shadow: {
        xs: '0 2px 0 oklch(0% 0 0 / 0.15)',
        sm: '0 1px 2px 0 oklch(0% 0 0 / 0.2), 0 1px 6px -1px oklch(0% 0 0 / 0.15)',
        md: '0 6px 16px 0 oklch(0% 0 0 / 0.4)',
        lg: '0 9px 28px 0 oklch(0% 0 0 / 0.45)',
        xl: '0 12px 48px 16px oklch(0% 0 0 / 0.5)',
    },
} as const satisfies Partial<SystemTokens>;

export const tokens: TokensInput<typeof roles, typeof system> = {
    roles,
    /** v6 spells the middle step `medium`; `middle` remains a legacy alias. */
    sizes: ['small', 'medium', 'large'],
    /** v6's first-class `variant`, added in 5.21 and made the documented axis in 6.0. */
    variants: ['outlined', 'dashed', 'solid', 'filled', 'text', 'link'],
    /**
     * Two axes zero has no named prop for. `shape` is a genuine extra axis;
     * `type` is v5's fused axis, kept because v6 still accepts it.
     */
    axes: {
        shape: ['default', 'circle', 'round'],
        type: ['default', 'primary', 'dashed', 'text', 'link'],
    },
    /** Three independent booleans on one component. */
    modifiers: ['danger', 'ghost', 'block'],
    system,
    systemDark,
    breakpoints: { sm: '576px', md: '768px', lg: '992px' },
    defaultLight: 'ant',
    defaultDark: 'ant-dark',
    themes: {
        ant: {
            colorScheme: 'light',
            pair: 'ant-dark',
            softMix: 0.12,
            colors: {
                'base-100': 'oklch(100% 0 0)',
                'base-200': 'oklch(98% 0.001 264)',
                'base-300': 'oklch(92% 0.003 264)',
                'base-content': 'oklch(25% 0.005 264)',

                default: 'oklch(45% 0.004 264)',
                'default-content': 'oklch(100% 0 0)',
                primary: 'oklch(53% 0.18 253)',
                'primary-content': 'oklch(100% 0 0)',
                danger: 'oklch(53% 0.2 27)',
                'danger-content': 'oklch(100% 0 0)',
                blue: 'oklch(53% 0.18 253)',
                'blue-content': 'oklch(100% 0 0)',
                green: 'oklch(50% 0.14 150)',
                'green-content': 'oklch(100% 0 0)',
                gold: 'oklch(78% 0.15 80)',
                'gold-content': 'oklch(24% 0.05 80)',
            },
        },
        'ant-dark': {
            colorScheme: 'dark',
            pair: 'ant',
            softMix: 0.2,
            colors: {
                'base-100': 'oklch(18% 0.004 264)',
                'base-200': 'oklch(23% 0.005 264)',
                'base-300': 'oklch(30% 0.006 264)',
                'base-content': 'oklch(96% 0 0)',

                default: 'oklch(72% 0.005 264)',
                'default-content': 'oklch(18% 0.004 264)',
                primary: 'oklch(70% 0.14 253)',
                'primary-content': 'oklch(18% 0.03 253)',
                danger: 'oklch(70% 0.17 27)',
                'danger-content': 'oklch(18% 0.03 27)',
                blue: 'oklch(70% 0.14 253)',
                'blue-content': 'oklch(18% 0.03 253)',
                green: 'oklch(73% 0.14 150)',
                'green-content': 'oklch(18% 0.03 150)',
                gold: 'oklch(82% 0.14 80)',
                'gold-content': 'oklch(20% 0.05 80)',
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
                padding: 'var(--space-xs) var(--space-lg)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--weight-normal)',
                lineHeight: 'var(--leading-tight)',
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { borderColor: 'var(--btn-accent)', color: 'var(--btn-accent)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                'focus-visible': { outline: '2px solid var(--btn-accent)', outlineOffset: '1px' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { filter: 'brightness(0.92)' },
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
                        '--btn-soft': `var(--color-${role}-soft)`,
                    },
                },
            },
        ])),
        variant: {
            outlined: { root: { base: { background: 'var(--color-base-100)', borderColor: 'var(--color-base-300)' } } },
            dashed: { root: { base: { background: 'var(--color-base-100)', borderStyle: 'dashed' } } },
            solid: { root: { base: { background: 'var(--btn-accent)', color: 'var(--btn-on-accent)', borderColor: 'transparent' } } },
            filled: { root: { base: { background: 'var(--btn-soft)', borderColor: 'transparent' } } },
            text: { root: { base: { background: 'transparent', borderColor: 'transparent', boxShadow: 'none' } } },
            link: { root: { base: { background: 'transparent', borderColor: 'transparent', boxShadow: 'none', color: 'var(--btn-accent)' } } },
        },
        size: {
            small: { root: { base: { padding: 'var(--space-2xs) var(--space-sm)', fontSize: 'var(--text-sm)' } } },
            medium: { root: { base: {} } },
            large: { root: { base: { padding: 'var(--space-sm) var(--space-xl)', fontSize: 'var(--text-lg)' } } },
        },
        /** The genuine extra axis — `axes={{ shape: 'circle' }}`. */
        shape: {
            default: { root: { base: { borderRadius: 'var(--radius-field)' } } },
            circle: { root: { base: { borderRadius: '50%', aspectRatio: '1', padding: 'var(--space-xs)' } } },
            round: { root: { base: { borderRadius: '9999px' } } },
        },
        /** v5's fused axis, still accepted in v6 as sugar over `color` + `variant`. */
        type: {
            default: { root: { base: { background: 'var(--color-base-100)', borderColor: 'var(--color-base-300)' } } },
            primary: { root: { base: { background: 'var(--color-primary)', color: 'var(--color-primary-content)', borderColor: 'transparent' } } },
            dashed: { root: { base: { borderStyle: 'dashed' } } },
            text: { root: { base: { background: 'transparent', borderColor: 'transparent', boxShadow: 'none' } } },
            link: { root: { base: { background: 'transparent', borderColor: 'transparent', boxShadow: 'none', color: 'var(--color-primary)' } } },
        },
    },
    modifiers: {
        danger: { root: { base: { '--btn-accent': 'var(--color-danger)', '--btn-on-accent': 'var(--color-danger-content)', '--btn-soft': 'var(--color-danger-soft)' } } },
        ghost: { root: { base: { background: 'transparent', color: 'var(--color-base-100)', borderColor: 'var(--color-base-100)' } } },
        /** daisyUI's `btn-block`, arrived at independently — RFC 0003 §3's in-repo corroboration. */
        block: { root: { base: { display: 'flex', width: '100%' } } },
    },
    compoundVariants: [
        {
            // `danger` is sugar for `color="danger"`, so a solid danger button
            // must repaint the fill rather than only the accent token.
            match: { variant: 'solid', danger: true },
            parts: { root: { base: { background: 'var(--color-danger)', color: 'var(--color-danger-content)' } } },
        },
    ],
};

export const conformance = {
    id: 'ant',
    tier: 2,
    system: 'Ant Design',
    release: '6 (antd 6.4)',
    source: 'https://ant.design/components/button',
    verified: '2026-07-29',
    provenBy: 'fixture',
    summary:
        'A `shape` axis zero has no prop for, three independent booleans, and a legacy fused `type` kept as sugar.',
    api: {
        roles: {
            vendorCount: 16,
            note: 'v6 exposes `color` as a first-class prop — `default | primary | danger` plus thirteen presets. Six declared.',
        },
        sizes: {
            note: 'v6 spells the middle step `medium`; `middle` survives as a legacy alias in `SizeType`. Zero\'s `sizes` is an open declared vocabulary, so Ant\'s own spelling is carried verbatim — no translation table.',
        },
        // `variants` omitted: v6's `outlined | dashed | solid | filled | text |
        // link` lands in `tokens.variants` under Ant's own names. Exact — and
        // the reason RFC §1.3's "axis named `type`" premise no longer holds.
        axes: {
            shape: {
                note: 'A genuine extra axis: zero has three named axis props and `shape` is not one of them, so it is reached as `axes={{ shape: "circle" }}`. Together with Radix\'s `radius`, one of only two rows in the matrix where `tokens.axes` is used for an axis zero LACKS rather than to rename one it has.',
            },
            type: {
                note: 'v5\'s fused axis, documented in v6 as sugar: "Set button type. Will follow `variant` & `color` if provided." Carried as an axis because a v5 codebase still passes it; an adapter would resolve it to `color` + `variant` instead.',
            },
        },
        modifiers: {
            danger: {
                note: 'A boolean that is itself sugar for `color="danger"`, so it appears twice in this fixture — once as a declared role, once as a modifier. That is Ant\'s API, not a modelling choice.',
            },
            ghost: { note: 'A boolean for buttons on coloured backgrounds. Presence-only, so `[data-mod-ghost]`.' },
            block: {
                note: 'Full-width. The same modifier daisyUI reaches independently as `btn-block`, which is RFC 0003 §3\'s in-repo corroboration that presence-only styling is a real category.',
            },
        },
    },
} as const satisfies ConformanceFixture;
