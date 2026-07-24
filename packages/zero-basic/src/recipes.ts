/**
 * zero-basic recipes — readable neutral styling for every zero component.
 * Pure data (type-only kit imports); compiled to CSS by build.mjs.
 */
import type { PartStyles, RecipeInput } from '@sigx/zero-kit';

const focusRing: Record<string, PartStyles['base']> = {
    'focus-visible': {
        outline: '2px solid var(--color-primary)',
        outlineOffset: '2px',
    },
};

export const tabs: RecipeInput = {
    component: 'tabs',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
        },
        list: {
            base: {
                display: 'flex',
                gap: '0.25rem',
                borderBottom: 'var(--border) solid var(--color-base-300)',
            },
        },
        tab: {
            base: {
                appearance: 'none',
                background: 'none',
                border: 'none',
                borderBottom: '2px solid transparent',
                marginBottom: 'calc(-1 * var(--border))',
                padding: '0.5rem 0.875rem',
                fontSize: 'var(--text-sm)',
                color: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-field) var(--radius-field) 0 0',
            },
            states: {
                hover: { color: 'var(--color-base-content)', background: 'var(--color-base-200)' },
                active: { color: 'var(--color-primary)', borderBottomColor: 'var(--color-primary)' },
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
};

export const collapsible: RecipeInput = {
    component: 'collapsible',
    parts: {
        root: {
            base: {
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
            },
            states: { open: {}, closed: {} },
        },
        trigger: {
            base: {
                display: 'block',
                padding: '0.75rem 1rem',
                fontSize: 'var(--text-md)',
                fontWeight: '500',
                borderRadius: 'var(--radius-box)',
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
                open: { borderRadius: 'var(--radius-box) var(--radius-box) 0 0' },
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        },
        panel: {
            base: {
                padding: '0.75rem 1rem',
                borderTop: 'var(--border) solid var(--color-base-300)',
                fontSize: 'var(--text-md)',
            },
            states: { open: {}, closed: {} },
        },
    },
};

export const switchRecipe: RecipeInput = {
    component: 'switch',
    tokens: {
        '--switch-width': 'calc(var(--size-selector) * 11)',
        '--switch-height': 'calc(var(--size-selector) * 6)',
        '--switch-pad': 'calc(var(--size-selector) * 0.75)',
    },
    parts: {
        root: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
            },
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
                borderRadius: '9999px',
                background: 'var(--color-base-300)',
                transition: 'background 0.15s ease',
            },
            states: {
                checked: { background: 'var(--color-primary)' },
                unchecked: {},
                'focus-visible': {
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: '2px',
                },
                disabled: {},
            },
        },
        thumb: {
            base: {
                position: 'absolute',
                top: 'var(--switch-pad)',
                left: 'var(--switch-pad)',
                width: 'calc(var(--switch-height) - var(--switch-pad) * 2)',
                height: 'calc(var(--switch-height) - var(--switch-pad) * 2)',
                borderRadius: '9999px',
                background: 'var(--color-base-100)',
                boxShadow: '0 1px 2px oklch(0% 0 0 / 0.25)',
                transition: 'transform 0.15s ease',
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
            base: { fontSize: 'var(--text-sm)' },
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
                            checked: { background: `var(--color-${c})` },
                            'focus-visible': { outline: `2px solid var(--color-${c})` },
                        },
                    },
                },
            ]),
        ),
    },
    defaultVariants: { color: 'primary' },
};

export const dialog: RecipeInput = {
    component: 'dialog',
    parts: {
        trigger: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5em',
                padding: '0.5rem 1rem',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                color: 'var(--color-base-content)',
                background: 'var(--color-base-200)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
                cursor: 'pointer',
            },
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
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                boxShadow: '0 20px 50px -12px oklch(0% 0 0 / 0.35)',
            },
            states: { open: {}, closed: {} },
            selectors: {
                '&::backdrop': {
                    background: 'color-mix(in oklab, var(--color-neutral) 45%, transparent)',
                },
            },
        },
        title: {
            base: {
                margin: '0 0 0.5rem',
                fontSize: 'var(--text-lg)',
                fontWeight: '600',
            },
        },
        description: {
            base: {
                margin: '0 0 1rem',
                fontSize: 'var(--text-sm)',
                color: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)',
            },
        },
        close: {
            base: {
                appearance: 'none',
                padding: '0.375rem 0.875rem',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-base-content)',
                background: 'var(--color-base-200)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
                cursor: 'pointer',
            },
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        },
    },
};

export const recipes: RecipeInput[] = [tabs, collapsible, switchRecipe, dialog];
