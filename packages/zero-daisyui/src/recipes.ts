/**
 * zero-daisyui recipes — daisyUI's component look expressed against the
 * zero anatomy. Pure data; compiled to CSS by build.mjs. The point of this
 * package: a design system is data, and "looks like daisy" is one possible
 * value of that data.
 */
import type { PartStyles, RecipeInput } from '@sigx/zero-kit';

const focusRing: Record<string, NonNullable<PartStyles['base']>> = {
    'focus-visible': {
        outline: '2px solid var(--color-base-content)',
        outlineOffset: '2px',
    },
};

// daisy "tabs-box" flavor: a rounded container, lifted active tab.
export const tabs: RecipeInput = {
    component: 'tabs',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
        },
        list: {
            base: {
                display: 'inline-flex',
                alignSelf: 'flex-start',
                padding: '0.25rem',
                gap: '0.25rem',
                background: 'var(--color-base-200)',
                borderRadius: 'var(--radius-field)',
            },
        },
        tab: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                padding: '0.375rem 1rem',
                fontSize: 'var(--text-sm)',
                fontWeight: '600',
                color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
                borderRadius: 'calc(var(--radius-field) - 0.25rem)',
                cursor: 'pointer',
                transition: 'background 0.2s ease, color 0.2s ease',
            },
            states: {
                hover: { color: 'var(--color-base-content)' },
                active: {
                    background: 'var(--color-base-100)',
                    color: 'var(--color-base-content)',
                    boxShadow: '0 1px 2px oklch(0% 0 0 / 0.15)',
                },
                inactive: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
        },
        panel: {
            base: { fontSize: 'var(--text-md)' },
            states: { active: {}, inactive: {} },
        },
    },
    variants: {
        color: {
            primary: {
                tab: { states: { active: { background: 'var(--color-primary)', color: 'var(--color-primary-content)' } } },
            },
        },
    },
};

// daisy "collapse collapse-arrow" flavor.
export const collapsible: RecipeInput = {
    component: 'collapsible',
    parts: {
        root: {
            base: {
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                overflow: 'hidden',
            },
            states: { open: {}, closed: {} },
        },
        trigger: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                fontSize: 'var(--text-md)',
                fontWeight: '600',
            },
            states: {
                open: {},
                closed: {},
                hover: { background: 'var(--color-base-200)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
            selectors: {
                '&::after': {
                    content: '""',
                    width: '0.5rem',
                    height: '0.5rem',
                    border: '2px solid currentColor',
                    borderTop: 'none',
                    borderLeft: 'none',
                    transform: 'rotate(45deg)',
                    transition: 'transform 0.2s ease',
                    opacity: '0.6',
                },
                '&[data-state="open"]::after': {
                    transform: 'rotate(225deg)',
                },
            },
        },
        panel: {
            base: { padding: '0 1.25rem 1rem', fontSize: 'var(--text-md)' },
            states: { open: {}, closed: {} },
        },
    },
};

// daisy "toggle" flavor.
export const switchRecipe: RecipeInput = {
    component: 'switch',
    tokens: {
        '--switch-width': 'calc(var(--size-selector) * 12)',
        '--switch-height': 'calc(var(--size-selector) * 6.5)',
        '--switch-pad': 'calc(var(--size-selector) * 0.75)',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                checked: {},
                unchecked: {},
            },
        },
        control: {
            base: {
                display: 'inline-block',
                position: 'relative',
                width: 'var(--switch-width)',
                height: 'var(--switch-height)',
                borderRadius: 'var(--radius-selector)',
                border: 'var(--border) solid var(--color-base-300)',
                background: 'var(--color-base-200)',
                transition: 'background 0.2s ease, border-color 0.2s ease',
            },
            states: {
                checked: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' },
                unchecked: {},
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '2px' },
                disabled: {},
            },
        },
        thumb: {
            base: {
                position: 'absolute',
                top: 'var(--switch-pad)',
                left: 'var(--switch-pad)',
                width: 'calc(var(--switch-height) - var(--switch-pad) * 2 - var(--border) * 2)',
                height: 'calc(var(--switch-height) - var(--switch-pad) * 2 - var(--border) * 2)',
                borderRadius: 'var(--radius-selector)',
                background: 'var(--color-base-100)',
                boxShadow: '0 1px 2px oklch(0% 0 0 / 0.2)',
                transition: 'transform 0.2s ease, background 0.2s ease',
            },
            states: {
                checked: {
                    transform: 'translateX(calc(var(--switch-width) - var(--switch-height)))',
                    background: 'var(--color-primary-content)',
                },
                unchecked: {},
            },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: '500' },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    variants: {
        color: Object.fromEntries(
            (['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'] as const).map((c) => [
                c,
                {
                    control: {
                        states: {
                            checked: { background: `var(--color-${c})`, borderColor: `var(--color-${c})` },
                            'focus-visible': { outline: `2px solid var(--color-${c})` },
                        },
                    },
                    thumb: {
                        states: { checked: { background: `var(--color-${c}-content)` } },
                    },
                },
            ]),
        ),
    },
    defaultVariants: { color: 'primary' },
};

// daisy "modal" flavor (+ "btn" trigger/close).
const btn: NonNullable<PartStyles['base']> = {
    appearance: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5em',
    height: 'calc(var(--size-field) * 12)',
    paddingInline: 'calc(var(--size-field) * 4)',
    fontSize: 'var(--text-sm)',
    fontWeight: '600',
    color: 'var(--color-base-content)',
    background: 'var(--color-base-200)',
    border: 'var(--border) solid var(--color-base-300)',
    borderRadius: 'var(--radius-field)',
    boxShadow: '0 1px 2px oklch(0% 0 0 / 0.08)',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
};

export const dialog: RecipeInput = {
    component: 'dialog',
    keyframes: {
        'zero-daisy-pop': 'from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); }',
    },
    parts: {
        trigger: {
            base: btn,
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: {},
                closed: {},
                ...focusRing,
            },
        },
        popup: {
            base: {
                padding: '1.5rem',
                maxWidth: '32rem',
                width: 'calc(100% - 2rem)',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                border: 'none',
                borderRadius: 'var(--radius-box)',
                boxShadow: '0 25px 50px -12px oklch(0% 0 0 / 0.4)',
            },
            states: {
                open: { animation: 'zero-daisy-pop 0.2s ease-out' },
                closed: {},
            },
            selectors: {
                '&::backdrop': {
                    background: 'oklch(0% 0 0 / 0.4)',
                },
            },
        },
        title: {
            base: { margin: '0 0 0.5rem', fontSize: 'var(--text-lg)', fontWeight: '700' },
        },
        description: {
            base: {
                margin: '0 0 1.25rem',
                fontSize: 'var(--text-sm)',
                color: 'color-mix(in oklab, var(--color-base-content) 75%, transparent)',
            },
        },
        close: {
            base: btn,
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        },
    },
};

export const recipes: RecipeInput[] = [tabs, collapsible, switchRecipe, dialog];
