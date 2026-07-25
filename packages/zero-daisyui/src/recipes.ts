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
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' },
        },
        list: {
            base: {
                display: 'inline-flex',
                alignSelf: 'flex-start',
                padding: 'var(--space-xs)',
                gap: 'var(--space-xs)',
                background: 'var(--color-base-200)',
                borderRadius: 'var(--radius-field)',
            },
        },
        tab: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                padding: 'var(--space-sm) var(--space-xl)',
                fontSize: 'var(--text-sm)',
                fontWeight: '600',
                color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
                borderRadius: 'calc(var(--radius-field) - 0.25rem)',
                cursor: 'pointer',
                transition: 'background var(--duration-normal) var(--ease-standard), color var(--duration-normal) var(--ease-standard)',
            },
            states: {
                hover: { color: 'var(--color-base-content)' },
                active: {
                    background: 'var(--color-base-100)',
                    color: 'var(--color-base-content)',
                    boxShadow: 'var(--shadow-sm)',
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
                padding: 'var(--space-xl) var(--space-2xl)',
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
                    transition: 'transform var(--duration-normal) var(--ease-standard)',
                    opacity: '0.6',
                },
                '&[data-state="open"]::after': {
                    transform: 'rotate(225deg)',
                },
            },
        },
        panel: {
            base: { padding: '0 var(--space-2xl) var(--space-xl)', fontSize: 'var(--text-md)' },
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
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-lg)', cursor: 'pointer' },
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
                transition: 'background var(--duration-normal) var(--ease-standard), border-color var(--duration-normal) var(--ease-standard)',
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
                boxShadow: 'var(--shadow-md)',
                transition: 'transform var(--duration-normal) var(--ease-standard), background var(--duration-normal) var(--ease-standard)',
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
    // The visible ring lives on `control`; the <label> root only groups the
    // control and its text. Declared rather than left implicit so the
    // delegation reads as a decision.
    skipStates: { root: ['focus-visible'] },
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
    boxShadow: 'var(--shadow-xs)',
    cursor: 'pointer',
    transition: 'background var(--duration-normal) var(--ease-standard)',
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
                boxShadow: 'var(--shadow-xl)',
            },
            states: {
                open: { animation: 'zero-daisy-pop var(--duration-normal) ease-out' },
                closed: {},
            },
            selectors: {
                '&::backdrop': {
                    background: 'oklch(0% 0 0 / 0.4)',
                },
            },
        },
        title: {
            base: { margin: '0 0 var(--space-md)', fontSize: 'var(--text-lg)', fontWeight: '700' },
        },
        description: {
            base: {
                margin: '0 0 var(--space-2xl)',
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

// daisy "dropdown-content"/card look for floating panels.
const floatingPanel: NonNullable<PartStyles['base']> = {
    background: 'var(--color-base-100)',
    color: 'var(--color-base-content)',
    border: 'var(--border) solid var(--color-base-300)',
    borderRadius: 'var(--radius-box)',
    boxShadow: 'var(--shadow-lg)',
};

export const popover: RecipeInput = {
    component: 'popover',
    parts: {
        trigger: {
            base: btn,
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: { background: 'var(--color-base-300)' },
                closed: {},
                ...focusRing,
            },
        },
        popup: {
            base: { ...floatingPanel, padding: 'var(--space-2xl)', minWidth: '15rem' },
            states: { open: {}, closed: {} },
        },
        title: {
            base: { margin: '0 0 var(--space-md)', fontSize: 'var(--text-md)', fontWeight: '700' },
        },
        close: {
            base: { ...btn, height: 'calc(var(--size-field) * 8)', paddingInline: 'calc(var(--size-field) * 3)', fontSize: 'var(--text-xs)' },
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
                padding: 'var(--space-xs) var(--space-lg)',
                maxWidth: '18rem',
                fontSize: 'var(--text-xs)',
                fontWeight: '500',
                background: 'var(--color-neutral)',
                color: 'var(--color-neutral-content)',
                border: 'none',
                borderRadius: 'var(--radius-field)',
            },
            states: { open: {}, closed: {} },
        },
    },
};

// daisy "menu in a dropdown" look.
export const menu: RecipeInput = {
    component: 'menu',
    parts: {
        trigger: {
            base: btn,
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: { background: 'var(--color-base-300)' },
                closed: {},
                ...focusRing,
            },
        },
        popup: {
            base: { ...floatingPanel, padding: 'var(--space-md)', minWidth: '13rem' },
            states: { open: {}, closed: {} },
        },
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: 'var(--space-md) var(--space-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                borderRadius: 'var(--radius-field)',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                highlighted: { background: 'var(--color-base-200)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        group: { base: {} },
        'group-label': {
            base: {
                padding: 'var(--space-md) var(--space-lg) var(--space-xs)',
                fontSize: 'var(--text-xs)',
                fontWeight: '700',
                opacity: '0.6',
            },
        },
        separator: {
            base: {
                height: 'var(--border)',
                margin: 'var(--space-sm) var(--space-md)',
                background: 'var(--color-base-300)',
            },
        },
    },
};

export const field: RecipeInput = {
    component: 'field',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: '600' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
            selectors: {
                '&[data-required]::after': { content: '" *"', color: 'var(--color-error)' },
            },
        },
        description: {
            base: { margin: '0', fontSize: 'var(--text-xs)', opacity: '0.6' },
        },
        error: {
            base: { margin: '0', fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: '500' },
        },
    },
};

export const checkbox: RecipeInput = {
    component: 'checkbox',
    tokens: { '--checkbox-size': 'calc(var(--size-selector) * 6)' },
    parts: {
        root: {
            base: { display: 'inline-flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' },
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
                border: 'var(--border) solid var(--color-base-content)',
                borderRadius: 'calc(var(--radius-selector) / 3)',
                background: 'var(--color-base-100)',
                boxShadow: 'inset 0 1px 1px oklch(0% 0 0 / 0.1)',
                transition: 'background var(--duration-normal) var(--ease-standard), border-color var(--duration-normal) var(--ease-standard)',
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
            base: { color: 'var(--color-primary-content)', lineHeight: '1', fontSize: 'var(--text-xs)', fontWeight: '700' },
            states: { checked: {}, unchecked: {}, indeterminate: {} },
            selectors: {
                '&[data-state="checked"]::after': { content: '"✓"' },
                '&[data-state="indeterminate"]::after': { content: '"−"' },
            },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: '500' },
            states: { checked: {}, unchecked: {}, indeterminate: {}, disabled: {} },
        },
    },
    // The visible ring lives on `control`; the <label> root only groups the
    // control and its text. Declared rather than left implicit so the
    // delegation reads as a decision.
    skipStates: { root: ['focus-visible'] },
};

export const radioGroup: RecipeInput = {
    component: 'radio-group',
    tokens: { '--radio-size': 'calc(var(--size-selector) * 6)' },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: '0.625rem' },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: '600' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        item: {
            base: { display: 'inline-flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' },
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
                border: 'var(--border) solid var(--color-base-content)',
                borderRadius: '9999px',
                background: 'var(--color-base-100)',
                transition: 'border-color var(--duration-normal) var(--ease-standard)',
            },
            states: {
                checked: { borderColor: 'var(--color-primary)', borderWidth: 'calc(var(--border) * 2)' },
                unchecked: {},
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '2px' },
                disabled: {},
            },
        },
        'item-indicator': {
            base: {
                width: 'calc(var(--radio-size) * 0.55)',
                height: 'calc(var(--radio-size) * 0.55)',
                borderRadius: '9999px',
                background: 'transparent',
                transition: 'background var(--duration-normal) var(--ease-standard), transform var(--duration-normal) var(--ease-standard)',
                transform: 'scale(0.5)',
            },
            states: {
                checked: { background: 'var(--color-primary)', transform: 'scale(1)' },
                unchecked: {},
            },
        },
        'item-label': {
            base: { fontSize: 'var(--text-sm)', fontWeight: '500' },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    // The visible ring lives on `item-control`; `item` is the <label> that
    // wraps it. Declared rather than left implicit so the delegation reads
    // as a decision.
    skipStates: { item: ['focus-visible'] },
};

export const progress: RecipeInput = {
    component: 'progress',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', width: '100%' },
            states: { loading: {}, complete: {}, indeterminate: {} },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: '600' },
        },
        track: {
            base: {
                width: '100%',
                height: 'calc(var(--size-selector) * 2.5)',
                background: 'var(--color-base-300)',
                borderRadius: 'var(--radius-selector)',
                overflow: 'hidden',
            },
        },
        range: {
            base: {
                height: '100%',
                background: 'var(--color-primary)',
                borderRadius: 'var(--radius-selector)',
                transition: 'width var(--duration-slow) var(--ease-standard)',
            },
            states: {
                complete: { background: 'var(--color-success)' },
                loading: {},
                indeterminate: { width: '40%', animation: 'zero-daisy-indeterminate 1.2s ease-in-out infinite' },
            },
            // A looping animation must STOP under reduced motion, not speed
            // up — which is why its duration is a literal rather than a
            // `var(--duration-*)` that would collapse to 0.01ms.
            at: {
                'reduced-motion': {
                    states: { indeterminate: { animation: 'none', width: '100%' } },
                },
            },
        },
        'value-text': {
            base: { fontSize: 'var(--text-xs)', opacity: '0.6' },
        },
    },
    keyframes: {
        'zero-daisy-indeterminate': 'from { margin-left: -40%; } to { margin-left: 100%; }',
    },
};

export const slider: RecipeInput = {
    component: 'slider',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', width: '100%' },
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
            base: { fontSize: 'var(--text-xs)', opacity: '0.6' },
        },
    },
    skipStates: { root: ['invalid', 'focus-visible'] },
};

export const accordion: RecipeInput = {
    component: 'accordion',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
        },
        item: {
            base: {
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                overflow: 'hidden',
            },
            states: { open: {}, closed: {} },
        },
        trigger: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-xl) var(--space-2xl)',
                fontSize: 'var(--text-md)',
                fontWeight: '600',
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
            selectors: {
                '&::after': {
                    content: '""',
                    width: '0.5rem',
                    height: '0.5rem',
                    border: '2px solid currentColor',
                    borderTop: 'none',
                    borderLeft: 'none',
                    transform: 'rotate(45deg)',
                    transition: 'transform var(--duration-normal) var(--ease-standard)',
                    opacity: '0.6',
                },
                '&[data-state="open"]::after': { transform: 'rotate(225deg)' },
            },
        },
        panel: {
            base: { padding: '0 var(--space-2xl) var(--space-xl)', fontSize: 'var(--text-md)' },
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
                ...btn,
                justifyContent: 'space-between',
                gap: 'var(--space-lg)',
                minWidth: '13rem',
                fontWeight: '500',
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
                placeholder: { opacity: '0.5' },
            },
        },
        indicator: {
            base: { opacity: '0.6', transition: 'transform var(--duration-normal) var(--ease-standard)' },
            states: { open: { transform: 'rotate(180deg)' }, closed: {} },
        },
        popup: {
            base: { ...floatingPanel, padding: 'var(--space-md)', minWidth: '13rem' },
            states: { open: {}, closed: {} },
        },
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.625rem',
                padding: 'var(--space-md) var(--space-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: '500',
                borderRadius: 'var(--radius-field)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                highlighted: { background: 'var(--color-base-200)' },
                selected: { color: 'var(--color-primary)', fontWeight: '700' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        'item-indicator': {
            base: { fontSize: 'var(--text-xs)', color: 'var(--color-primary)' },
            states: { selected: {} },
        },
    },
};

export const recipes: RecipeInput[] = [
    tabs, collapsible, switchRecipe, dialog, popover, tooltip, menu,
    field, checkbox, radioGroup, progress, slider, accordion, select,
];
