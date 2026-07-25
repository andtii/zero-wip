/**
 * zero-material recipes — Material's look over zero's anatomy.
 *
 * Written to exercise the recipe layer rather than to be exhaustive: the
 * tonal surface roles, the `level1`–`level5` elevation ramp, Material's
 * emphasized easings, and a dialog that goes full-screen below `sm`.
 */
import type { CssProps, PartStyles, RecipeInput } from '@sigx/zero-kit';

/**
 * Every role a consumer can pass as `color`. Must stay in step with the
 * `roles` declaration: a role that is declared but missing here silently
 * falls back to the default accent, which looks like the variant simply not
 * working. `surface*` and `outline` are excluded deliberately — they are
 * fills and hairlines, not action colours.
 */
const ROLES = [
    'primary', 'secondary', 'tertiary', 'accent',
    'error', 'info', 'success', 'warning', 'neutral',
] as const;

const focusRing: Record<string, CssProps> = {
    'focus-visible': {
        outline: '3px solid var(--color-secondary)',
        outlineOffset: '2px',
    },
};

const motion = (props: string): string =>
    props.split(', ').map((p) => `${p} var(--duration-fast) var(--ease-standard)`).join(', ');

/** Material's raised container: a tonal fill plus an elevation step. */
const raised = (level: 'level2' | 'level3'): CssProps => ({
    background: 'var(--color-surface-container-high)',
    color: 'var(--color-surface-container-high-content)',
    border: 'none',
    borderRadius: 'var(--radius-box)',
    boxShadow: `var(--shadow-${level})`,
});

const label: CssProps = {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    letterSpacing: 'var(--tracking-wide)',
};

// ── Button ────────────────────────────────────────────────────────────────
// The accent-pair indirection, so Material's larger role vocabulary costs one
// rule per role rather than one per role × fill.
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
                gap: 'var(--space-xs)',
                border: 'var(--border) solid transparent',
                // Material's fully-rounded action shape.
                borderRadius: '624rem',
                ...label,
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: motion('background, box-shadow, border-color'),
            },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed', boxShadow: 'none' },
                ...focusRing,
            },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [
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
        ])),
        variant: {
            // Material calls these filled / outlined / tonal / text.
            solid: {
                root: {
                    base: {
                        background: 'var(--btn-accent)',
                        color: 'var(--btn-on-accent)',
                        boxShadow: 'var(--shadow-level1)',
                    },
                    states: { hover: { boxShadow: 'var(--shadow-level2)' } },
                },
            },
            outline: {
                root: {
                    base: {
                        background: 'transparent',
                        color: 'var(--btn-accent)',
                        borderColor: 'var(--color-outline)',
                    },
                    states: { hover: { background: 'var(--btn-soft)' } },
                },
            },
            soft: {
                root: {
                    base: { background: 'var(--btn-soft)', color: 'var(--btn-accent)' },
                    states: { hover: { boxShadow: 'var(--shadow-level1)' } },
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
            xs: { root: { base: { padding: 'var(--space-2xs) var(--space-sm)', fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)' } } },
            md: { root: { base: { padding: 'var(--space-xs) var(--space-lg)', fontSize: 'var(--text-sm)' } } },
            lg: { root: { base: { padding: 'var(--space-sm) var(--space-xl)', fontSize: 'var(--text-md)' } } },
            xl: { root: { base: { padding: 'var(--space-md) var(--space-2xl)', fontSize: 'var(--text-lg)' } } },
        },
    },
    defaultVariants: { color: 'primary', variant: 'solid', size: 'md' },
};

// ── Tabs ──────────────────────────────────────────────────────────────────
export const tabs: RecipeInput = {
    component: 'tabs',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' } },
        list: {
            base: {
                display: 'flex',
                background: 'var(--color-surface)',
                borderBottom: 'var(--border) solid var(--color-outline)',
            },
        },
        tab: {
            base: {
                appearance: 'none',
                background: 'none',
                border: 'none',
                borderBottom: '3px solid transparent',
                marginBottom: 'calc(-1 * var(--border))',
                padding: 'var(--space-sm) var(--space-md)',
                ...label,
                color: 'var(--color-base-content)',
                cursor: 'pointer',
                transition: motion('color, border-color'),
            },
            states: {
                active: { color: 'var(--color-primary)', borderBottomColor: 'var(--color-primary)' },
                inactive: {},
                hover: { background: 'var(--color-primary-soft)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
        },
        panel: {
            base: { fontFamily: 'var(--font-sans)', fontSize: 'var(--text-md)', lineHeight: 'var(--leading-normal)' },
            states: { active: {}, inactive: {} },
        },
    },
};

// ── Disclosure ────────────────────────────────────────────────────────────
const disclosureTrigger: PartStyles = {
    base: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-md)',
        ...label,
        fontSize: 'var(--text-md)',
        cursor: 'pointer',
        transition: motion('background'),
    },
    states: {
        open: {},
        closed: {},
        hover: { background: 'var(--color-primary-soft)' },
        disabled: { opacity: 'var(--disabled-opacity)' },
        ...focusRing,
    },
};

export const collapsible: RecipeInput = {
    component: 'collapsible',
    parts: {
        root: {
            base: {
                background: 'var(--color-surface-container)',
                color: 'var(--color-surface-container-content)',
                borderRadius: 'var(--radius-box)',
                overflow: 'hidden',
            },
            states: { open: {}, closed: {} },
        },
        trigger: disclosureTrigger,
        panel: {
            base: { padding: '0 var(--space-md) var(--space-md)', lineHeight: 'var(--leading-normal)' },
            states: { open: {}, closed: {} },
        },
    },
};

export const accordion: RecipeInput = {
    component: 'accordion',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' } },
        item: {
            base: {
                background: 'var(--color-surface-container)',
                color: 'var(--color-surface-container-content)',
                borderRadius: 'var(--radius-box)',
                overflow: 'hidden',
            },
            states: { open: {}, closed: {} },
        },
        trigger: disclosureTrigger,
        panel: {
            base: { padding: '0 var(--space-md) var(--space-md)', lineHeight: 'var(--leading-normal)' },
            states: { open: {}, closed: {} },
        },
    },
};

// ── Dialog ────────────────────────────────────────────────────────────────
export const dialog: RecipeInput = {
    component: 'dialog',
    parts: {
        trigger: {
            base: {
                appearance: 'none',
                borderRadius: '624rem',
                border: 'var(--border) solid var(--color-outline)',
                background: 'transparent',
                color: 'var(--color-primary)',
                padding: 'var(--space-xs) var(--space-lg)',
                ...label,
                cursor: 'pointer',
            },
            states: { open: {}, closed: {}, hover: { background: 'var(--color-primary-soft)' }, disabled: {}, ...focusRing },
        },
        popup: {
            // Mobile-first: Material's full-screen dialog below `sm`.
            base: {
                width: '100%',
                height: '100dvh',
                maxWidth: 'none',
                maxHeight: 'none',
                margin: '0',
                padding: 'var(--space-lg)',
                background: 'var(--color-surface-container-high)',
                color: 'var(--color-surface-container-high-content)',
                border: 'none',
                borderRadius: '0',
                boxShadow: 'none',
            },
            states: { open: {}, closed: {} },
            selectors: { '&::backdrop': { background: 'oklch(0% 0 0 / 0.32)' } },
            at: {
                sm: {
                    base: {
                        width: 'calc(100% - var(--space-2xl))',
                        maxWidth: '35rem',
                        height: 'auto',
                        maxHeight: 'calc(100% - var(--space-2xl))',
                        margin: 'auto',
                        ...raised('level3'),
                    },
                },
            },
        },
        title: {
            base: {
                margin: '0 0 var(--space-md)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--weight-normal)',
                lineHeight: 'var(--leading-tight)',
            },
        },
        description: {
            base: {
                margin: '0 0 var(--space-lg)',
                fontSize: 'var(--text-sm)',
                lineHeight: 'var(--leading-normal)',
                color: 'var(--color-base-content)',
            },
        },
        close: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-primary)',
                borderRadius: '624rem',
                padding: 'var(--space-xs) var(--space-lg)',
                ...label,
                cursor: 'pointer',
            },
            states: { hover: { background: 'var(--color-primary-soft)' }, disabled: {}, ...focusRing },
        },
    },
};

// ── Floating surfaces ─────────────────────────────────────────────────────
const floating: CssProps = { ...raised('level2'), padding: 'var(--space-xs)' };

export const popover: RecipeInput = {
    component: 'popover',
    parts: {
        trigger: {
            base: {
                appearance: 'none',
                borderRadius: '624rem',
                border: 'var(--border) solid var(--color-outline)',
                background: 'transparent',
                color: 'var(--color-primary)',
                padding: 'var(--space-xs) var(--space-lg)',
                ...label,
                cursor: 'pointer',
            },
            states: { open: {}, closed: {}, hover: { background: 'var(--color-primary-soft)' }, disabled: {}, ...focusRing },
        },
        popup: {
            base: { ...floating, padding: 'var(--space-md)', maxWidth: '20rem' },
            states: { open: {}, closed: {} },
        },
        title: { base: { margin: '0 0 var(--space-xs)', fontWeight: 'var(--weight-medium)' } },
        close: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                ...label,
            },
            states: { disabled: {}, ...focusRing },
        },
    },
};

export const tooltip: RecipeInput = {
    component: 'tooltip',
    parts: {
        trigger: {
            base: { appearance: 'none', background: 'none', border: 'none', color: 'inherit', cursor: 'help' },
            states: { open: {}, closed: {}, disabled: {}, ...focusRing },
        },
        popup: {
            base: {
                background: 'var(--color-neutral)',
                color: 'var(--color-neutral-content)',
                borderRadius: 'var(--radius-selector)',
                padding: 'var(--space-2xs) var(--space-xs)',
                fontSize: 'var(--text-xs)',
                boxShadow: 'var(--shadow-level1)',
            },
            states: { open: {}, closed: {} },
        },
    },
};

export const menu: RecipeInput = {
    component: 'menu',
    parts: {
        trigger: {
            base: {
                appearance: 'none',
                borderRadius: '624rem',
                border: 'var(--border) solid var(--color-outline)',
                background: 'transparent',
                color: 'var(--color-primary)',
                padding: 'var(--space-xs) var(--space-lg)',
                ...label,
                cursor: 'pointer',
            },
            states: { open: {}, closed: {}, hover: { background: 'var(--color-primary-soft)' }, disabled: {}, ...focusRing },
        },
        popup: { base: { ...floating, minWidth: '12rem' }, states: { open: {}, closed: {} } },
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-xs) var(--space-md)',
                borderRadius: 'var(--radius-selector)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: motion('background'),
            },
            states: {
                highlighted: { background: 'var(--color-primary-soft)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
        },
        group: { base: { padding: 'var(--space-2xs) 0' } },
        'group-label': {
            base: {
                padding: 'var(--space-2xs) var(--space-md)',
                fontSize: 'var(--text-xs)',
                letterSpacing: 'var(--tracking-wide)',
                color: 'var(--color-outline)',
            },
        },
        separator: {
            base: { height: 'var(--border)', margin: 'var(--space-2xs) 0', background: 'var(--color-outline)' },
        },
    },
};

export const select: RecipeInput = {
    component: 'select',
    parts: {
        root: { base: { display: 'inline-flex', position: 'relative' } },
        trigger: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                minWidth: '12rem',
                padding: 'var(--space-sm) var(--space-md)',
                // Material's filled field: rounded top, flat bottom, underline.
                background: 'var(--color-surface-container)',
                color: 'var(--color-surface-container-content)',
                border: 'none',
                borderBottom: '2px solid var(--color-outline)',
                borderRadius: 'var(--radius-selector) var(--radius-selector) 0 0',
                fontSize: 'var(--text-md)',
                cursor: 'pointer',
                transition: motion('border-color'),
            },
            states: {
                open: { borderBottomColor: 'var(--color-primary)' },
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                invalid: { borderBottomColor: 'var(--color-error)' },
                ...focusRing,
            },
        },
        value: { base: { flex: '1', textAlign: 'start' } },
        indicator: { base: { opacity: '0.7', transition: motion('transform') }, states: { open: { transform: 'rotate(180deg)' }, closed: {} } },
        popup: { base: { ...floating, minWidth: '12rem' }, states: { open: {}, closed: {} } },
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-xs) var(--space-md)',
                borderRadius: 'var(--radius-selector)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
            },
            states: {
                highlighted: { background: 'var(--color-primary-soft)' },
                selected: { background: 'var(--color-secondary-soft)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        },
        'item-indicator': { base: { color: 'var(--color-primary)' } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' } },
    },
};

// ── Selection controls ────────────────────────────────────────────────────
export const switchRecipe: RecipeInput = {
    component: 'switch',
    tokens: {
        '--switch-width': 'calc(var(--size-selector) * 13)',
        '--switch-height': 'calc(var(--size-selector) * 8)',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' },
            states: { checked: {}, unchecked: {}, disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' } },
        },
        control: {
            base: {
                display: 'inline-block',
                position: 'relative',
                width: 'var(--switch-width)',
                height: 'var(--switch-height)',
                borderRadius: '624rem',
                background: 'var(--color-surface-container-high)',
                border: '2px solid var(--color-outline)',
                transition: motion('background, border-color'),
            },
            states: {
                checked: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' },
                unchecked: {},
                ...focusRing,
            },
        },
        thumb: {
            base: {
                position: 'absolute',
                top: '50%',
                left: 'var(--size-selector)',
                width: 'calc(var(--size-selector) * 4)',
                height: 'calc(var(--size-selector) * 4)',
                borderRadius: '624rem',
                background: 'var(--color-outline)',
                transform: 'translateY(-50%)',
                transition: motion('transform, background, width, height'),
            },
            states: {
                checked: {
                    background: 'var(--color-primary-content)',
                    width: 'calc(var(--size-selector) * 6)',
                    height: 'calc(var(--size-selector) * 6)',
                    transform: 'translate(calc(var(--switch-width) - 100% - var(--size-selector) * 2), -50%)',
                },
                unchecked: {},
            },
        },
        label: { base: { fontSize: 'var(--text-md)' }, states: { checked: {}, unchecked: {} } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    skipStates: { root: ['focus-visible'] },
};

const tickBox: PartStyles = {
    base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'calc(var(--size-selector) * 6)',
        height: 'calc(var(--size-selector) * 6)',
        border: '2px solid var(--color-outline)',
        background: 'transparent',
        transition: motion('background, border-color'),
    },
    states: {
        checked: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' },
        unchecked: {},
        indeterminate: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' },
        ...focusRing,
    },
};

export const checkbox: RecipeInput = {
    component: 'checkbox',
    parts: {
        root: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' },
            states: { checked: {}, unchecked: {}, indeterminate: {}, disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' } },
        },
        control: { ...tickBox, base: { ...tickBox.base, borderRadius: 'var(--radius-selector)' } },
        indicator: {
            base: { color: 'var(--color-primary-content)', fontSize: 'var(--text-xs)' },
            states: { checked: {}, unchecked: {}, indeterminate: {} },
        },
        label: { base: { fontSize: 'var(--text-md)' }, states: { checked: {}, unchecked: {}, indeterminate: {} } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    skipStates: { root: ['focus-visible'] },
};

export const radioGroup: RecipeInput = {
    component: 'radio-group',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' } },
        label: { base: { ...label, fontSize: 'var(--text-md)' } },
        item: { base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }, states: { disabled: { opacity: 'var(--disabled-opacity)' } } },
        // Not `tickBox`: a radio has no indeterminate state, and reusing the
        // checkbox's styles smuggled one in — which the compiler rejected.
        'item-control': {
            base: { ...tickBox.base, borderRadius: '624rem' },
            states: {
                checked: { borderColor: 'var(--color-primary)' },
                unchecked: {},
                ...focusRing,
            },
        },
        'item-indicator': {
            base: {
                width: 'calc(var(--size-selector) * 3)',
                height: 'calc(var(--size-selector) * 3)',
                borderRadius: '624rem',
                background: 'var(--color-primary-content)',
            },
        },
        'item-label': { base: { fontSize: 'var(--text-md)' } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    // The tick itself carries the selected state; the row, dot and text have
    // no appearance of their own that depends on it.
    skipStates: {
        item: ['focus-visible', 'checked', 'unchecked'],
        'item-indicator': ['checked', 'unchecked'],
        'item-label': ['checked', 'unchecked'],
    },
};

// ── Field, slider, progress ───────────────────────────────────────────────
export const field: RecipeInput = {
    component: 'field',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' } },
        label: {
            base: { ...label, color: 'var(--color-base-content)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
            selectors: { '&[data-required]::after': { content: '" *"', color: 'var(--color-error)' } },
        },
        description: { base: { margin: '0', fontSize: 'var(--text-xs)', color: 'var(--color-outline)' } },
        error: { base: { margin: '0', fontSize: 'var(--text-xs)', color: 'var(--color-error)' } },
    },
    skipStates: { label: ['invalid', 'required'], error: ['invalid'] },
};

export const slider: RecipeInput = {
    component: 'slider',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' }, states: { disabled: { opacity: 'var(--disabled-opacity)' } } },
        label: { base: { ...label } },
        input: { base: { width: '100%', accentColor: 'var(--color-primary)' }, states: { ...focusRing } },
        'value-text': { base: { fontSize: 'var(--text-xs)', color: 'var(--color-outline)' } },
    },
    skipStates: { root: ['invalid', 'focus-visible'] },
};

export const progress: RecipeInput = {
    component: 'progress',
    keyframes: {
        'material-indeterminate': 'from { transform: translateX(-100%); } to { transform: translateX(300%); }',
    },
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' } },
        label: { base: { ...label } },
        track: {
            base: {
                position: 'relative',
                height: 'calc(var(--size-field) * 1.5)',
                borderRadius: '624rem',
                background: 'var(--color-secondary-soft)',
                overflow: 'hidden',
            },
        },
        range: {
            base: {
                height: '100%',
                borderRadius: '624rem',
                background: 'var(--color-primary)',
                transition: motion('width'),
            },
            states: {
                complete: {},
                loading: {},
                indeterminate: { width: '40%', animation: 'material-indeterminate 1.4s var(--ease-emphasized) infinite' },
            },
            // A loop must stop under reduced motion, not accelerate.
            at: { 'reduced-motion': { states: { indeterminate: { animation: 'none', width: '100%' } } } },
        },
        'value-text': { base: { fontSize: 'var(--text-xs)', color: 'var(--color-outline)' } },
    },
    // The track and range carry the state; the wrapper has no appearance of
    // its own that changes with it.
    skipStates: { root: ['loading', 'complete', 'indeterminate'] },
};

export const recipes: RecipeInput[] = [
    button, tabs, collapsible, accordion, dialog, popover, tooltip, menu, select,
    switchRecipe, checkbox, radioGroup, field, slider, progress,
];
