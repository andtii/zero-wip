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
                transition: 'background var(--duration-fast) var(--ease-standard)',
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
                transition: 'transform var(--duration-fast) var(--ease-standard)',
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

const buttonBase: NonNullable<PartStyles['base']> = {
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
};

export const popover: RecipeInput = {
    component: 'popover',
    parts: {
        trigger: {
            base: buttonBase,
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: { background: 'var(--color-base-300)' },
                closed: {},
                ...focusRing,
            },
        },
        popup: {
            base: {
                padding: '1rem',
                minWidth: '14rem',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                boxShadow: '0 10px 30px -10px oklch(0% 0 0 / 0.3)',
            },
            states: { open: {}, closed: {} },
        },
        title: {
            base: { margin: '0 0 0.5rem', fontSize: 'var(--text-md)', fontWeight: '600' },
        },
        close: {
            base: { ...buttonBase, padding: '0.25rem 0.75rem', fontSize: 'var(--text-xs)' },
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        },
    },
};

export const tooltip: RecipeInput = {
    component: 'tooltip',
    parts: {
        trigger: {
            base: {},
            states: { open: {}, closed: {}, disabled: {} },
        },
        popup: {
            base: {
                padding: '0.375rem 0.625rem',
                maxWidth: '18rem',
                fontSize: 'var(--text-xs)',
                background: 'var(--color-neutral)',
                color: 'var(--color-neutral-content)',
                border: 'none',
                borderRadius: 'var(--radius-field)',
                boxShadow: '0 4px 12px oklch(0% 0 0 / 0.25)',
            },
            states: { open: {}, closed: {} },
        },
    },
};

export const menu: RecipeInput = {
    component: 'menu',
    parts: {
        trigger: {
            base: buttonBase,
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: { background: 'var(--color-base-300)' },
                closed: {},
                ...focusRing,
            },
        },
        popup: {
            base: {
                padding: '0.375rem',
                minWidth: '12rem',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                boxShadow: '0 10px 30px -10px oklch(0% 0 0 / 0.3)',
            },
            states: { open: {}, closed: {} },
        },
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.375rem 0.625rem',
                fontSize: 'var(--text-sm)',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
                outline: 'none',
            },
            states: {
                highlighted: { background: 'var(--color-primary)', color: 'var(--color-primary-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        group: { base: {} },
        'group-label': {
            base: {
                padding: '0.375rem 0.625rem',
                fontSize: 'var(--text-xs)',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'color-mix(in oklab, var(--color-base-content) 55%, transparent)',
            },
        },
        separator: {
            base: {
                height: 'var(--border)',
                margin: '0.375rem 0',
                background: 'var(--color-base-300)',
            },
        },
    },
};

export const field: RecipeInput = {
    component: 'field',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: '600' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
            selectors: {
                '&[data-required]::after': { content: '" *"', color: 'var(--color-error)' },
            },
        },
        description: {
            base: {
                margin: '0',
                fontSize: 'var(--text-xs)',
                color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
            },
        },
        error: {
            base: { margin: '0', fontSize: 'var(--text-xs)', color: 'var(--color-error)' },
        },
    },
    skipStates: { label: ['invalid', 'required'], error: ['invalid'] },
};

export const checkbox: RecipeInput = {
    component: 'checkbox',
    tokens: { '--checkbox-size': 'calc(var(--size-selector) * 5)' },
    parts: {
        root: {
            base: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                checked: {}, unchecked: {}, indeterminate: {},
            },
        },
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'var(--checkbox-size)',
                height: 'var(--checkbox-size)',
                border: 'calc(var(--border) * 2) solid var(--color-base-300)',
                borderRadius: 'var(--radius-selector)',
                background: 'var(--color-base-100)',
                transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                checked: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' },
                indeterminate: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' },
                unchecked: {},
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '2px' },
                invalid: { borderColor: 'var(--color-error)' },
                disabled: {},
            },
        },
        indicator: {
            base: { color: 'var(--color-primary-content)', lineHeight: '1', fontSize: 'var(--text-xs)' },
            states: { checked: {}, unchecked: {}, indeterminate: {} },
            selectors: {
                '&[data-state="checked"]::after': { content: '"✓"' },
                '&[data-state="indeterminate"]::after': { content: '"−"' },
            },
        },
        label: {
            base: { fontSize: 'var(--text-sm)' },
            states: { checked: {}, unchecked: {}, indeterminate: {}, disabled: {} },
        },
    },
};

export const radioGroup: RecipeInput = {
    component: 'radio-group',
    tokens: { '--radio-size': 'calc(var(--size-selector) * 5)' },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: '600' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        item: {
            base: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                checked: {}, unchecked: {},
            },
        },
        'item-control': {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'var(--radio-size)',
                height: 'var(--radio-size)',
                border: 'calc(var(--border) * 2) solid var(--color-base-300)',
                borderRadius: '9999px',
                background: 'var(--color-base-100)',
                transition: 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                checked: { borderColor: 'var(--color-primary)' },
                unchecked: {},
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '2px' },
                disabled: {},
            },
        },
        'item-indicator': {
            base: {
                width: 'calc(var(--radio-size) / 2)',
                height: 'calc(var(--radio-size) / 2)',
                borderRadius: '9999px',
                background: 'transparent',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                checked: { background: 'var(--color-primary)' },
                unchecked: {},
            },
        },
        'item-label': {
            base: { fontSize: 'var(--text-sm)' },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    skipStates: { root: [], label: ['invalid', 'required'] },
};

export const progress: RecipeInput = {
    component: 'progress',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' },
            states: { loading: {}, complete: {}, indeterminate: {} },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: '500' },
        },
        track: {
            base: {
                width: '100%',
                height: 'calc(var(--size-selector) * 2)',
                background: 'var(--color-base-300)',
                borderRadius: '9999px',
                overflow: 'hidden',
            },
        },
        range: {
            base: {
                height: '100%',
                background: 'var(--color-primary)',
                borderRadius: '9999px',
                transition: 'width var(--duration-normal) var(--ease-standard)',
            },
            states: {
                complete: { background: 'var(--color-success)' },
                loading: {},
                indeterminate: { width: '40%', animation: 'zero-basic-indeterminate 1.2s ease-in-out infinite' },
            },
        },
        'value-text': {
            base: {
                fontSize: 'var(--text-xs)',
                color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
            },
        },
    },
    keyframes: {
        'zero-basic-indeterminate': 'from { margin-left: -40%; } to { margin-left: 100%; }',
    },
};

export const slider: RecipeInput = {
    component: 'slider',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: '600' },
            states: { disabled: {} },
        },
        input: {
            base: { width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' },
            states: {
                disabled: { cursor: 'not-allowed' },
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '2px' },
                invalid: { accentColor: 'var(--color-error)' },
            },
        },
        'value-text': {
            base: {
                fontSize: 'var(--text-xs)',
                color: 'color-mix(in oklab, var(--color-base-content) 65%, transparent)',
            },
        },
    },
    skipStates: { root: ['invalid', 'focus-visible'] },
};

export const accordion: RecipeInput = {
    component: 'accordion',
    parts: {
        root: {
            base: {
                display: 'flex',
                flexDirection: 'column',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                overflow: 'hidden',
            },
        },
        item: {
            base: { borderBottom: 'var(--border) solid var(--color-base-300)' },
            states: { open: {}, closed: {} },
            selectors: {
                '&:last-child': { borderBottom: 'none' },
            },
        },
        trigger: {
            base: {
                display: 'block',
                padding: '0.75rem 1rem',
                fontSize: 'var(--text-md)',
                fontWeight: '500',
                cursor: 'pointer',
                listStyle: 'none',
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
                open: {},
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
        },
        panel: {
            base: { padding: '0 1rem 0.75rem', fontSize: 'var(--text-md)' },
            states: { open: {}, closed: {} },
        },
    },
};

export const select: RecipeInput = {
    component: 'select',
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column' },
        },
        trigger: {
            base: {
                ...buttonBase,
                justifyContent: 'space-between',
                gap: '0.75rem',
                minWidth: '12rem',
                background: 'var(--color-base-100)',
            },
            states: {
                hover: { borderColor: 'var(--color-base-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: { borderColor: 'var(--color-primary)' },
                closed: {},
                invalid: { borderColor: 'var(--color-error)' },
                placeholder: {},
                ...focusRing,
            },
        },
        value: {
            base: {},
            states: {
                placeholder: { color: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)' },
            },
        },
        indicator: {
            base: { opacity: '0.6', transition: 'transform var(--duration-fast) var(--ease-standard)' },
            states: { open: { transform: 'rotate(180deg)' }, closed: {} },
        },
        popup: {
            base: {
                padding: '0.375rem',
                minWidth: '12rem',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                boxShadow: '0 10px 30px -10px oklch(0% 0 0 / 0.3)',
            },
            states: { open: {}, closed: {} },
        },
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                padding: '0.375rem 0.625rem',
                fontSize: 'var(--text-sm)',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
            },
            states: {
                highlighted: { background: 'var(--color-primary)', color: 'var(--color-primary-content)' },
                selected: { fontWeight: '600' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        'item-indicator': {
            base: { fontSize: 'var(--text-xs)' },
            states: { selected: {} },
        },
    },
};

export const recipes: RecipeInput[] = [
    tabs, collapsible, switchRecipe, dialog, popover, tooltip, menu,
    field, checkbox, radioGroup, progress, slider, accordion, select,
];
