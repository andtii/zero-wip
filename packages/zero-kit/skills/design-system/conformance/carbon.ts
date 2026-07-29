/**
 * Conformance fixture: **Carbon Design System** — Tier 2 (RFC 0003 §7.2).
 *
 * Carbon forces three things:
 *
 *   - **an axis named `kind`**, not `variant`. It maps onto `variants` rather
 *     than into `tokens.axes`: `kind` IS a variant axis by structure — a closed
 *     set of chrome treatments, one at a time, over no colour axis — and `axes`
 *     is for axes zero LACKS, not for renaming axes it has. The name is
 *     restored by an adapter (RFC 0003 §2, #179), not by the contract.
 *   - **no colour axis at all**, the second independent witness for `roles: {}`
 *     after `zero-heroui`.
 *   - **values zero's grammar cannot spell.** `danger--tertiary` fails
 *     `TOKEN_KEY_PATTERN` (double hyphen), so the design system declares
 *     `danger-tertiary` and the vendor spelling survives only in `api.values`.
 *     That is a real gap, forced independently by Radix's `105%`.
 *
 * Note also that Carbon's `danger--*` set is `danger` × `{primary, tertiary,
 * ghost}` — a FUSED vocabulary, exactly like HeroUI's `danger-soft`. Two
 * unrelated design systems, the same shape.
 */
import type {
    CustomTokenDecl, RecipeInput, RoleDecl, SystemTokens, TokensInput,
} from '@sigx/zero-kit';
import type { ConformanceFixture } from './types.js';

// TODO: file before #174 lands — "vendor axis values outside TOKEN_KEY_PATTERN".
const GAP_VALUE_GRAMMAR = 0;

/** No colour prop on a Carbon button — `kind` carries treatment AND destructiveness. */
export const roles = {} as const satisfies Record<string, RoleDecl>;

/** The palette, as custom tokens: these are not members of a `color` axis. */
export const custom = {
    'carbon-interactive': { description: 'The primary interactive fill.', syntax: '<color>' },
    'carbon-interactive-ink': { description: 'Ink on the interactive fill.', syntax: '<color>' },
    'carbon-danger': { description: 'The destructive fill.', syntax: '<color>' },
    'carbon-danger-ink': { description: 'Ink on the destructive fill.', syntax: '<color>' },
    'carbon-line': { description: 'Hairlines and outlined borders.', syntax: '<color>' },
    'carbon-focus': { description: 'The focus ring.', syntax: '<color>' },
} as const satisfies Record<string, CustomTokenDecl>;

export const system = {
    /** Carbon is square. The corner radius is 0 across the productive theme. */
    radius: { selector: '0', field: '0', box: '0' },
    size: { selector: '0.25rem', field: '0.25rem' },
    border: '1px',
    disabledOpacity: '0.5',

    spacing: {
        '2xs': '0.125rem', xs: '0.25rem', sm: '0.5rem', md: '0.75rem',
        lg: '1rem', xl: '1.5rem', '2xl': '2.5rem',
    },

    shadow: {
        xs: '0 1px 2px 0 oklch(0% 0 0 / 0.1)',
        sm: '0 2px 4px 0 oklch(0% 0 0 / 0.12)',
        md: '0 4px 8px 0 oklch(0% 0 0 / 0.14)',
        lg: '0 8px 16px 0 oklch(0% 0 0 / 0.16)',
        xl: '0 16px 32px 0 oklch(0% 0 0 / 0.18)',
    },

    /** Carbon's productive motion — short, and asymmetric on entry vs exit. */
    motion: {
        durations: { instant: '0ms', fast: '70ms', normal: '110ms', slow: '240ms' },
        easings: {
            linear: 'linear',
            standard: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
            accelerate: 'cubic-bezier(0.4, 0.14, 1, 1)',
            decelerate: 'cubic-bezier(0, 0, 0.38, 0.9)',
        },
    },

    typography: {
        fonts: {
            sans: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
            mono: '"IBM Plex Mono", ui-monospace, monospace',
        },
        sizes: {
            xs: '0.75rem', sm: '0.875rem', md: '1rem',
            lg: '1.125rem', xl: '1.25rem', '2xl': '1.75rem', '3xl': '2rem',
        },
        weights: { normal: '400', medium: '500', semibold: '600', bold: '600' },
        leading: { none: '1', tight: '1.29', normal: '1.5' },
        tracking: { tight: '0', normal: '0.16px', wide: '0.32px' },
    },
} as const satisfies SystemTokens;

export const systemDark = {
    shadow: {
        xs: '0 1px 2px 0 oklch(0% 0 0 / 0.4)',
        sm: '0 2px 4px 0 oklch(0% 0 0 / 0.45)',
        md: '0 4px 8px 0 oklch(0% 0 0 / 0.5)',
        lg: '0 8px 16px 0 oklch(0% 0 0 / 0.55)',
        xl: '0 16px 32px 0 oklch(0% 0 0 / 0.6)',
    },
} as const satisfies Partial<SystemTokens>;

export const tokens: TokensInput<typeof roles, typeof system> = {
    roles,
    /** Six steps, `xs` through `2xl`, default `lg`. */
    sizes: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
    /**
     * Carbon's `kind`, respelled. The vendor writes `danger--tertiary` with a
     * double hyphen; `TOKEN_KEY_PATTERN` admits only single-hyphen kebab, so
     * the declared value is `danger-tertiary` and `api.values` carries the
     * vendor spelling. See the `unsupported` note on why that is a real gap
     * rather than a naming preference.
     */
    variants: [
        'primary', 'secondary', 'tertiary', 'ghost', 'danger',
        'danger-primary', 'danger-ghost', 'danger-tertiary',
    ],
    /** Carbon's `hasIconOnly` / `isExpressive`. */
    modifiers: ['icon-only', 'expressive'],
    custom,
    system,
    systemDark,
    breakpoints: { sm: '672px', md: '1056px', lg: '1312px' },
    defaultLight: 'carbon-white',
    defaultDark: 'carbon-g100',
    themes: {
        'carbon-white': {
            colorScheme: 'light',
            pair: 'carbon-g100',
            colors: {
                'base-100': 'oklch(100% 0 0)',
                'base-200': 'oklch(96% 0.001 264)',
                'base-300': 'oklch(90% 0.002 264)',
                'base-content': 'oklch(21% 0.005 264)',
            },
            custom: {
                'carbon-interactive': 'oklch(50% 0.19 259)',
                'carbon-interactive-ink': 'oklch(100% 0 0)',
                'carbon-danger': 'oklch(50% 0.21 27)',
                'carbon-danger-ink': 'oklch(100% 0 0)',
                'carbon-line': 'oklch(86% 0.003 264)',
                'carbon-focus': 'oklch(50% 0.19 259)',
            },
        },
        'carbon-g100': {
            colorScheme: 'dark',
            pair: 'carbon-white',
            colors: {
                'base-100': 'oklch(19% 0.004 264)',
                'base-200': 'oklch(25% 0.005 264)',
                'base-300': 'oklch(33% 0.006 264)',
                'base-content': 'oklch(96% 0 0)',
            },
            custom: {
                'carbon-interactive': 'oklch(72% 0.14 259)',
                'carbon-interactive-ink': 'oklch(19% 0.004 264)',
                'carbon-danger': 'oklch(70% 0.17 27)',
                'carbon-danger-ink': 'oklch(19% 0.004 264)',
                'carbon-line': 'oklch(38% 0.006 264)',
                'carbon-focus': 'oklch(85% 0.09 259)',
            },
        },
    },
};

export const button: RecipeInput = {
    component: 'button',
    tokens: {
        '--btn-fill': 'var(--carbon-interactive)',
        '--btn-ink': 'var(--carbon-interactive-ink)',
        '--btn-line': 'transparent',
    },
    parts: {
        root: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                // Carbon buttons are left-aligned with a trailing icon well.
                justifyContent: 'space-between',
                gap: 'var(--space-2xl)',
                padding: 'var(--space-md) var(--space-lg)',
                border: 'var(--border) solid var(--btn-line)',
                borderRadius: '0',
                background: 'var(--btn-fill)',
                color: 'var(--btn-ink)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-normal)',
                lineHeight: 'var(--leading-tight)',
                letterSpacing: 'var(--tracking-normal)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { filter: 'brightness(0.9)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed', filter: 'none' },
                // Carbon's focus is a two-tone inset ring, not an outline offset.
                'focus-visible': {
                    outline: '2px solid var(--carbon-focus)',
                    outlineOffset: '-3px',
                },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { filter: 'brightness(0.82)' },
            },
        },
    },
    variants: {
        variant: {
            primary: { root: { base: { '--btn-fill': 'var(--carbon-interactive)', '--btn-ink': 'var(--carbon-interactive-ink)', '--btn-line': 'transparent' } } },
            secondary: { root: { base: { '--btn-fill': 'var(--color-base-content)', '--btn-ink': 'var(--color-base-100)', '--btn-line': 'transparent' } } },
            tertiary: { root: { base: { '--btn-fill': 'transparent', '--btn-ink': 'var(--carbon-interactive)', '--btn-line': 'var(--carbon-interactive)' } } },
            ghost: { root: { base: { '--btn-fill': 'transparent', '--btn-ink': 'var(--carbon-interactive)', '--btn-line': 'transparent' } } },
            danger: { root: { base: { '--btn-fill': 'var(--carbon-danger)', '--btn-ink': 'var(--carbon-danger-ink)', '--btn-line': 'transparent' } } },
            // The fused members: destructiveness × treatment, one value each.
            'danger-primary': { root: { base: { '--btn-fill': 'var(--carbon-danger)', '--btn-ink': 'var(--carbon-danger-ink)', '--btn-line': 'transparent' } } },
            'danger-tertiary': { root: { base: { '--btn-fill': 'transparent', '--btn-ink': 'var(--carbon-danger)', '--btn-line': 'var(--carbon-danger)' } } },
            'danger-ghost': { root: { base: { '--btn-fill': 'transparent', '--btn-ink': 'var(--carbon-danger)', '--btn-line': 'transparent' } } },
        },
        size: {
            xs: { root: { base: { padding: 'var(--space-2xs) var(--space-md)', minHeight: '1.5rem' } } },
            sm: { root: { base: { padding: 'var(--space-xs) var(--space-md)', minHeight: '2rem' } } },
            md: { root: { base: { padding: 'var(--space-sm) var(--space-lg)', minHeight: '2.5rem' } } },
            // `lg` is Carbon's default button size.
            lg: { root: { base: { padding: 'var(--space-md) var(--space-lg)', minHeight: '3rem' } } },
            xl: { root: { base: { padding: 'var(--space-lg) var(--space-lg)', minHeight: '4rem', alignItems: 'flex-start' } } },
            '2xl': { root: { base: { padding: 'var(--space-xl) var(--space-lg)', minHeight: '5rem', alignItems: 'flex-start' } } },
        },
    },
    modifiers: {
        'icon-only': { root: { base: { padding: 'var(--space-md)', gap: '0', aspectRatio: '1', justifyContent: 'center' } } },
        expressive: { root: { base: { fontSize: 'var(--text-md)', letterSpacing: 'var(--tracking-tight)' } } },
    },
    compoundVariants: [
        {
            // `isExpressive` "only applies to the large/default button size" —
            // the conditionality lives in the recipe, so an adapter can forward
            // the flag unconditionally without knowing the rule.
            match: { size: 'lg', expressive: true },
            parts: { root: { base: { minHeight: '3.5rem', fontSize: 'var(--text-lg)' } } },
        },
    ],
};

export const conformance = {
    id: 'carbon',
    tier: 2,
    system: 'Carbon Design System',
    release: '11 (@carbon/react 1.111)',
    source: 'https://carbondesignsystem.com/components/button/usage/',
    verified: '2026-07-29',
    provenBy: 'fixture',
    summary:
        'An axis named `kind` over no colour axis, with fused values zero\'s identifier grammar cannot spell.',
    api: {
        // `roles: {}` — nothing to map. A design system with no colour axis has
        // no colour prop to rename, which is why this key is absent rather than
        // present-and-empty.
        variants: {
            as: 'kind',
            values: {
                'danger-primary': 'danger--primary',
                'danger-ghost': 'danger--ghost',
                'danger-tertiary': 'danger--tertiary',
            },
            gap: GAP_VALUE_GRAMMAR,
            note: '`kind` is a variant axis by structure — a closed set of chrome treatments, one at a time, over no colour axis — so it maps to `variants` rather than into `tokens.axes`, which is for axes zero lacks. The name is an adapter concern (§2). The VALUES are the real gap: `danger--tertiary` fails `TOKEN_KEY_PATTERN`, so the vendor spelling survives only here.',
        },
        modifiers: {
            'icon-only': {
                as: 'hasIconOnly',
                note: 'A boolean prop reaching the DOM as `[data-mod-icon-only]`. The second witness for this encoding after HeroUI\'s `isIconOnly` — two unrelated systems, the same reshape.',
            },
            expressive: {
                as: 'isExpressive',
                note: 'A boolean whose meaning is CONDITIONAL on an axis value ("only applies to the large/default button size"). The flag forwards unconditionally; the condition is a `compoundVariants` match in the recipe.',
            },
        },
    },
} as const satisfies ConformanceFixture;
