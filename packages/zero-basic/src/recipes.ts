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
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
        },
        list: {
            base: {
                display: 'flex',
                gap: 'var(--space-xs)',
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
                padding: 'var(--space-lg) var(--space-xl)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--weight-medium)',
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
                padding: 'var(--space-lg) var(--space-xl)',
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
                gap: 'var(--space-md)',
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
                boxShadow: 'var(--shadow-xs)',
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
    // The visible ring lives on `control`; the <label> root only groups the
    // control and its text. Declared rather than left implicit so the
    // delegation reads as a decision.
    skipStates: { root: ['focus-visible'] },
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
                padding: 'var(--space-md) var(--space-xl)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
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
            // Mobile-first: a full-bleed sheet on small viewports, the
            // centered card from `sm` up. Below `sm` a 32rem card with a
            // 1rem gutter is most of the screen anyway, minus the reachability.
            base: {
                padding: 'var(--space-2xl)',
                width: '100%',
                maxWidth: 'none',
                height: '100dvh',
                maxHeight: 'none',
                margin: '0',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                border: 'none',
                borderRadius: '0',
                boxShadow: 'none',
            },
            states: { open: {}, closed: {} },
            selectors: {
                '&::backdrop': {
                    background: 'color-mix(in oklab, var(--color-neutral) 45%, transparent)',
                },
            },
            at: {
                sm: {
                    base: {
                        width: 'calc(100% - 2rem)',
                        maxWidth: '32rem',
                        height: 'auto',
                        maxHeight: 'calc(100% - 2rem)',
                        margin: 'auto',
                        border: 'var(--border) solid var(--color-base-300)',
                        borderRadius: 'var(--radius-box)',
                        boxShadow: 'var(--shadow-lg)',
                    },
                },
            },
        },
        title: {
            base: {
                margin: '0 0 var(--space-md)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-semibold)',
            },
        },
        description: {
            base: {
                margin: '0 0 var(--space-xl)',
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
    padding: 'var(--space-md) var(--space-xl)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
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
                padding: 'var(--space-xl)',
                minWidth: '14rem',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                boxShadow: 'var(--shadow-md)',
            },
            states: { open: {}, closed: {} },
        },
        title: {
            base: { margin: '0 0 var(--space-md)', fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)' },
        },
        close: {
            base: { ...buttonBase, padding: 'var(--space-xs) var(--space-lg)', fontSize: 'var(--text-xs)' },
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
                boxShadow: 'var(--shadow-sm)',
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
                padding: 'var(--space-sm)',
                minWidth: '12rem',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                boxShadow: 'var(--shadow-md)',
            },
            states: { open: {}, closed: {} },
        },
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
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
                fontWeight: 'var(--weight-semibold)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                color: 'color-mix(in oklab, var(--color-base-content) 55%, transparent)',
            },
        },
        separator: {
            base: {
                height: 'var(--border)',
                margin: 'var(--space-sm) 0',
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
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
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
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer' },
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
            base: { color: 'var(--color-primary-content)', lineHeight: 'var(--leading-none)', fontSize: 'var(--text-xs)' },
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
    // The visible ring lives on `control`; the <label> root only groups the
    // control and its text. Declared rather than left implicit so the
    // delegation reads as a decision.
    skipStates: { root: ['focus-visible'] },
};

export const radioGroup: RecipeInput = {
    component: 'radio-group',
    tokens: { '--radio-size': 'calc(var(--size-selector) * 5)' },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        item: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer' },
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
    // The visible ring lives on `item-control`; `item` is the <label> that
    // wraps it. Declared rather than left implicit so the delegation reads
    // as a decision.
    skipStates: { label: ['invalid', 'required'], item: ['focus-visible'] },
};

export const progress: RecipeInput = {
    component: 'progress',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', width: '100%' },
            states: { loading: {}, complete: {}, indeterminate: {} },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' },
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
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', width: '100%' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
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
                padding: 'var(--space-lg) var(--space-xl)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--weight-medium)',
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
            base: { padding: '0 var(--space-xl) var(--space-lg)', fontSize: 'var(--text-md)' },
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
                gap: 'var(--space-lg)',
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
                padding: 'var(--space-sm)',
                minWidth: '12rem',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                boxShadow: 'var(--shadow-md)',
            },
            states: { open: {}, closed: {} },
        },
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
                padding: '0.375rem 0.625rem',
                fontSize: 'var(--text-sm)',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
            },
            states: {
                highlighted: { background: 'var(--color-primary)', color: 'var(--color-primary-content)' },
                selected: { fontWeight: 'var(--weight-semibold)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        'item-indicator': {
            base: { fontSize: 'var(--text-xs)' },
            states: { selected: {} },
        },
    },
};

export const button: RecipeInput = {
    component: 'button',
    // The two axes meet here instead of multiplying. `color` sets the accent
    // pair; `variant` decides how the accent is used. 8 + 4 + 5 rules rather
    // than 8 × 4.
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
                gap: '0.5em',
                border: 'var(--border) solid transparent',
                borderRadius: 'var(--radius-field)',
                fontFamily: 'inherit',
                fontWeight: 'var(--weight-medium)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), '
                    + 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                'focus-visible': {
                    outline: '2px solid var(--btn-accent)',
                    outlineOffset: '2px',
                },
            },
            selectors: {
                // Pressed: `:active` is a real pseudo-class here, because the
                // anatomy declares no machine state called `active`.
                '&:active:not([data-disabled])': { transform: 'translateY(1px)' },
            },
        },
    },
    variants: {
        // One rule per role rather than per role × fill: the fill
        // variants below read these two tokens, so adding a colour
        // costs one rule instead of four.
        color: Object.fromEntries(
            (['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'] as const).map((c) => [
                c,
                {
                    root: {
                        base: {
                            '--btn-accent': `var(--color-${c})`,
                            '--btn-on-accent': `var(--color-${c}-content)`,
                            '--btn-soft': `var(--color-${c}-soft)`,
                        },
                    },
                },
            ]),
        ),
        variant: {
            solid: {
                root: {
                    base: { background: 'var(--btn-accent)', color: 'var(--btn-on-accent)' },
                    states: { hover: { filter: 'brightness(0.92)' } },
                },
            },
            outline: {
                root: {
                    base: {
                        background: 'transparent',
                        color: 'var(--btn-accent)',
                        borderColor: 'var(--btn-accent)',
                    },
                    states: { hover: { background: 'var(--btn-soft)' } },
                },
            },
            soft: {
                root: {
                    base: { background: 'var(--btn-soft)', color: 'var(--btn-accent)' },
                    states: { hover: { filter: 'brightness(0.95)' } },
                },
            },
            ghost: {
                root: {
                    base: { background: 'transparent', color: 'var(--btn-accent)' },
                    states: { hover: { background: 'var(--btn-soft)' } },
                },
            },
        },
        size: {
            xs: { root: { base: { padding: 'var(--space-2xs) var(--space-xs)', fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--text-sm)' } } },
            md: { root: { base: { padding: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--text-md)' } } },
            lg: { root: { base: { padding: 'var(--space-md) var(--space-xl)', fontSize: 'var(--text-lg)' } } },
            xl: { root: { base: { padding: 'var(--space-lg) var(--space-2xl)', fontSize: 'var(--text-xl)' } } },
        },
    },
    defaultVariants: { color: 'primary', variant: 'solid', size: 'md' },
};

export const recipes: RecipeInput[] = [
    tabs, collapsible, switchRecipe, dialog, popover, tooltip, menu,
    field, checkbox, radioGroup, progress, slider, accordion, select, button,
];
