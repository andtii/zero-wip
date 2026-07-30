/**
 * Conformance fixture: **Radix Themes** — Tier 1 (RFC 0003 §7.2).
 *
 * The one genuinely missing shape. Radix forces four things no in-repo design
 * system does:
 *
 *   - a **numeric size ramp** (`1 | 2 | 3 | 4`), where every other system uses
 *     `sm | md | lg` names;
 *   - a **`highContrast` boolean**, which is what `tokens.modifiers` exists for;
 *   - **`radius` as a valued axis** — this is the repo's FIRST use of
 *     `tokens.axes`, declared and validated since the axis work landed but
 *     exercised by no design system (heroui could not: v3 removed `radius`);
 *   - axes bound on an **ancestor** (`<Theme radius scaling grayColor>`) rather
 *     than on the component, which nothing in the contract can express.
 *
 * Button-only, per §7.2: fixtures prove the contract at a fraction of a full
 * skin's cost. Values are approximated from public documentation.
 */
import type { RecipeInput, RolesDecl, SystemTokens, TokensInput } from '@sigx/zero-kit';
import type { ConformanceFixture } from './types.js';

/** DS-level, ancestor-scoped axes — theme-scope token rebinds. */
const GAP_ANCESTOR_AXES = 197;
/** Responsive / per-breakpoint axis values. */
const GAP_RESPONSIVE_VALUES = 199;

/**
 * Six of Radix's 26 accents. The mapping is per name, so the other twenty are
 * token authoring rather than contract — but each declared role costs a
 * contrast-checked colour pair per theme, so a fixture that declared all 26
 * would be proving palette discipline instead of axis shape.
 */
export const roles = {
    gray: {}, blue: {}, red: {}, green: {}, amber: {}, violet: {},
} as const satisfies RolesDecl;

export const system = {
    // Radix's default `radius="medium"`, as the baseline the axis moves off.
    radius: { selector: '0.25rem', field: '0.375rem', box: '0.5rem' },
    size: { selector: '0.25rem', field: '0.25rem' },
    border: '1px',
    disabledOpacity: '0.5',

    spacing: {
        '2xs': '0.125rem', xs: '0.25rem', sm: '0.5rem', md: '0.75rem',
        lg: '1rem', xl: '1.5rem', '2xl': '2rem',
    },

    shadow: {
        xs: '0 1px 2px 0 oklch(0% 0 0 / 0.05)',
        sm: '0 1px 3px 0 oklch(0% 0 0 / 0.08)',
        md: '0 4px 8px -2px oklch(0% 0 0 / 0.1)',
        lg: '0 12px 24px -4px oklch(0% 0 0 / 0.12)',
        xl: '0 24px 48px -8px oklch(0% 0 0 / 0.14)',
    },

    motion: {
        durations: { instant: '0ms', fast: '120ms', normal: '200ms', slow: '320ms' },
        easings: {
            linear: 'linear',
            standard: 'cubic-bezier(0.16, 1, 0.3, 1)',
            accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
            decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
        },
    },

    typography: {
        fonts: {
            sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, sans-serif',
            mono: 'ui-monospace, "Menlo", "Consolas", monospace',
        },
        sizes: {
            xs: '0.75rem', sm: '0.875rem', md: '1rem',
            lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem',
        },
        weights: { normal: '400', medium: '500', semibold: '600', bold: '700' },
        leading: { none: '1', tight: '1.25', normal: '1.5' },
        tracking: { tight: '-0.01em', normal: '0', wide: '0.02em' },
    },
} as const satisfies SystemTokens;

export const systemDark = {
    shadow: {
        xs: '0 1px 2px 0 oklch(0% 0 0 / 0.3)',
        sm: '0 1px 3px 0 oklch(0% 0 0 / 0.4)',
        md: '0 4px 8px -2px oklch(0% 0 0 / 0.45)',
        lg: '0 12px 24px -4px oklch(0% 0 0 / 0.5)',
        xl: '0 24px 48px -8px oklch(0% 0 0 / 0.55)',
    },
} as const satisfies Partial<SystemTokens>;

export const tokens: TokensInput<typeof roles, typeof system> = {
    roles,
    /**
     * The numeric ramp, in Radix's own spelling. `TOKEN_KEY_PATTERN` admits
     * bare digits, so no `1 ↔ xs` translation table is needed anywhere —
     * `[data-size="1"]` is what the compiler emits.
     */
    sizes: ['1', '2', '3', '4'],
    variants: ['classic', 'solid', 'soft', 'surface', 'outline', 'ghost'],
    /**
     * The first `tokens.axes` declaration in the repo. Radix binds `radius` on
     * `<Theme>` AND accepts it per component; only the latter is expressible,
     * which is what the `axes.radius` row grades and what the `<Theme>`-scoped
     * row records as unsupported.
     */
    axes: { radius: ['none', 'small', 'medium', 'large', 'full'] },
    modifiers: ['high-contrast', 'loading'],
    breakpoints: { sm: '520px', md: '768px', lg: '1024px' },
    defaultLight: 'radix',
    defaultDark: 'radix-dark',
    themes: {
        radix: {
            colorScheme: 'light',
            pair: 'radix-dark',
            softMix: 0.14,
            colors: {
                'base-100': 'oklch(99% 0 0)',
                'base-200': 'oklch(97% 0.002 286)',
                'base-300': 'oklch(92% 0.004 286)',
                'base-content': 'oklch(20% 0.006 286)',

                gray: 'oklch(44% 0.006 286)',
                'gray-content': 'oklch(99% 0 0)',
                blue: 'oklch(54% 0.19 258)',
                'blue-content': 'oklch(99% 0 0)',
                red: 'oklch(54% 0.21 27)',
                'red-content': 'oklch(99% 0 0)',
                green: 'oklch(48% 0.14 155)',
                'green-content': 'oklch(99% 0 0)',
                // The one light fill in the set — dark ink, like Radix's amber-9.
                amber: 'oklch(84% 0.16 84)',
                'amber-content': 'oklch(24% 0.05 84)',
                violet: 'oklch(50% 0.22 293)',
                'violet-content': 'oklch(99% 0 0)',
            },
        },
        'radix-dark': {
            colorScheme: 'dark',
            pair: 'radix',
            softMix: 0.22,
            colors: {
                'base-100': 'oklch(18% 0.005 286)',
                'base-200': 'oklch(23% 0.006 286)',
                'base-300': 'oklch(30% 0.008 286)',
                'base-content': 'oklch(97% 0 0)',

                gray: 'oklch(72% 0.008 286)',
                'gray-content': 'oklch(18% 0.005 286)',
                blue: 'oklch(72% 0.14 258)',
                'blue-content': 'oklch(18% 0.03 258)',
                red: 'oklch(71% 0.17 27)',
                'red-content': 'oklch(18% 0.03 27)',
                green: 'oklch(74% 0.15 155)',
                'green-content': 'oklch(18% 0.03 155)',
                amber: 'oklch(85% 0.15 84)',
                'amber-content': 'oklch(22% 0.05 84)',
                violet: 'oklch(74% 0.16 293)',
                'violet-content': 'oklch(18% 0.03 293)',
            },
        },
    },
};

const ROLES = Object.keys(roles);

export const button: RecipeInput = {
    component: 'button',
    tokens: {
        '--btn-accent': 'var(--color-blue)',
        '--btn-on-accent': 'var(--color-blue-content)',
        '--btn-soft': 'var(--color-blue-soft)',
    },
    parts: {
        root: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-sm)',
                width: 'fit-content',
                padding: 'var(--space-sm) var(--space-lg)',
                border: 'var(--border) solid transparent',
                borderRadius: 'var(--radius-field)',
                background: 'var(--btn-accent)',
                color: 'var(--btn-on-accent)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { filter: 'brightness(0.94)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed', filter: 'none' },
                'focus-visible': {
                    outline: '2px solid var(--btn-accent)',
                    outlineOffset: '2px',
                },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { filter: 'brightness(0.9)' },
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
        /** Radix's six treatments. `classic` and `surface` have no daisyUI analogue. */
        variant: {
            classic: {
                root: {
                    base: {
                        background: 'var(--btn-accent)',
                        color: 'var(--btn-on-accent)',
                        boxShadow: 'var(--shadow-sm)',
                    },
                },
            },
            solid: { root: { base: { background: 'var(--btn-accent)', color: 'var(--btn-on-accent)' } } },
            soft: { root: { base: { background: 'var(--btn-soft)', color: 'var(--color-base-content)' } } },
            surface: {
                root: {
                    base: {
                        background: 'var(--color-base-100)',
                        color: 'var(--color-base-content)',
                        borderColor: 'var(--color-base-300)',
                    },
                },
            },
            outline: {
                root: {
                    base: {
                        background: 'transparent',
                        color: 'var(--color-base-content)',
                        borderColor: 'var(--btn-accent)',
                    },
                },
            },
            ghost: { root: { base: { background: 'transparent', color: 'var(--color-base-content)' } } },
        },
        /** The numeric ramp — `[data-size="1"]` and up. */
        size: {
            '1': { root: { base: { padding: 'var(--space-2xs) var(--space-sm)', fontSize: 'var(--text-xs)' } } },
            '2': { root: { base: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)' } } },
            '3': { root: { base: { padding: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--text-md)' } } },
            '4': { root: { base: { padding: 'var(--space-md) var(--space-xl)', fontSize: 'var(--text-lg)' } } },
        },
        /** The custom axis — `[data-radius="full"]`, reached as `axes={{ radius: 'full' }}`. */
        radius: {
            none: { root: { base: { borderRadius: '0' } } },
            small: { root: { base: { borderRadius: 'var(--radius-selector)' } } },
            medium: { root: { base: { borderRadius: 'var(--radius-field)' } } },
            large: { root: { base: { borderRadius: 'var(--radius-box)' } } },
            full: { root: { base: { borderRadius: '9999px' } } },
        },
    },
    /** Radix's `highContrast` and `loading` booleans. */
    modifiers: {
        'high-contrast': {
            root: {
                base: {
                    background: 'var(--color-base-content)',
                    color: 'var(--color-base-100)',
                    borderColor: 'var(--color-base-content)',
                },
            },
        },
        loading: { root: { base: { cursor: 'progress', opacity: '0.7' } } },
    },
    compoundVariants: [
        {
            // A high-contrast soft button has to drop the tint entirely, or the
            // flag does nothing visible — the case `compoundVariants` matching a
            // modifier exists for.
            match: { variant: 'soft', 'high-contrast': true },
            parts: { root: { base: { background: 'var(--color-base-content)', color: 'var(--color-base-100)' } } },
        },
    ],
};

export const conformance = {
    id: 'radix',
    tier: 1,
    system: 'Radix Themes',
    release: '3.3',
    source: 'https://www.radix-ui.com/themes/docs/components/button',
    verified: '2026-07-29',
    provenBy: 'fixture',
    summary:
        'A numeric size ramp, boolean flags, and two axes rebound on an ancestor rather than the component.',
    api: {
        roles: {
            vendorCount: 26,
            note: 'Radix accents are a palette selection rather than semantic roles, but the axis shape is identical: one named `color` prop, one value, `[data-color="…"]`. Six of 26 are declared — each costs a contrast-checked pair per theme.',
        },
        sizes: { kind: 'numeric ramp' },
        // `variants` omitted: Radix spells it `variant` and zero spells it
        // `variant`. That is what `exact` means, and it is why the common case
        // declares nothing at all.
        axes: {
            radius: {
                note: 'The name survives, the reach does not: `axes={{ radius: "large" }}` rather than a named prop, because zero has three named axes and `radius` is not one of them.',
            },
        },
        modifiers: {
            'high-contrast': {
                as: 'highContrast',
                note: 'A camelCase boolean prop, reaching the DOM as `mods={{ "high-contrast": true }}` → `[data-mod-high-contrast]`. Presence is preserved; the prop name is the adapter\'s job.',
            },
            loading: {
                note: 'Same shape as `highContrast`, and the name already matches — but a boolean prop is still a reshape into a presence attribute.',
            },
        },
    },
    unsupported: [
        {
            axis: 'size (responsive form)',
            kind: 'numeric ramp',
            vocabulary: ['{ initial: "1", md: "3" }'],
            gap: GAP_RESPONSIVE_VALUES,
            note: "Radix types every size as `Responsive<'1'|'2'|'3'|'4'>` — a per-breakpoint OBJECT, not a scalar. Zero's `size` takes one value; breakpoints exist only as compile-time `@media` conditions inside a recipe, never as prop values. Nothing else in the matrix forces this.",
            neverEmitted: ['data-size-md'],
        },
        {
            axis: 'radius / scaling / grayColor (<Theme>-scoped)',
            kind: 'enumeration',
            vocabulary: ['radius ×5', 'scaling 90%–110%', 'grayColor ×7'],
            gap: GAP_ANCESTOR_AXES,
            note: 'Radix rebinds these once on an ancestor and every descendant inherits. `tokens.axes` is component vocabulary — the only CSS naming an axis is the recipe selector, always prefixed `[data-scope][data-part]` — and `compileTokensCss` emits only `:where(:root)`, the prefers-color-scheme block, `[data-theme="…"]` and reduced-motion. `scaling` is doubly blocked: `105%` fails `TOKEN_KEY_PATTERN`, so it could not be an axis value even at component scope.',
            neverEmitted: ['data-scaling', 'data-gray-color'],
        },
    ],
} as const satisfies ConformanceFixture;
