/**
 * zero-daisyui recipes — daisyUI's component look expressed against the
 * zero anatomy. Pure data; compiled to CSS by build.mjs. The point of this
 * package: a design system is data, and "looks like daisy" is one possible
 * value of that data.
 */
import type { CssProps, PartStyles, RecipeInput, RoleDecl } from '@sigx/zero-kit';
import { roles } from './tokens.js';

/**
 * Every role a consumer can pass as `color`, derived from the declaration
 * rather than retyped — a role declared in `tokens.ts` but missing here would
 * silently render as the default colour instead. Roles opting out of
 * `-content` or `-soft` are fills or hairlines, not action colours; this
 * design system declares none.
 */
const ROLES = Object.entries(roles as Record<string, RoleDecl>)
    .filter(([, decl]) => decl.content !== false && decl.soft !== false)
    .map(([name]) => name);

const focusRing: Record<string, NonNullable<PartStyles['base']>> = {
    'focus-visible': {
        outline: '2px solid var(--color-base-content)',
        outlineOffset: '2px',
    },
};

// daisy "tabs-box" flavor: a rounded container, lifted active tab.
/**
 * Enter/exit presence for a top-layer popup.
 *
 * Zero never unmounts a popup; it toggles `data-state` and calls the native
 * `showPopover()` / `showModal()`. Transitioning `display` and `overlay` with
 * `allow-discrete` is all the platform needs — the browser keeps the element
 * in the top layer for the length of the exit, so two declarations buy both
 * directions. `@starting-style` supplies the state the entry animates FROM.
 *
 * `overlay` is Chromium-only as of writing; elsewhere the entry still animates
 * and the exit is instant.
 */
const popupPresence = (from: string): PartStyles => ({
    base: {
        opacity: '0',
        transform: from,
        transition: 'opacity var(--duration-fast) var(--ease-standard), '
            + 'transform var(--duration-fast) var(--ease-standard), '
            + 'display var(--duration-fast) allow-discrete, '
            + 'overlay var(--duration-fast) allow-discrete',
    },
    states: { open: { opacity: '1', transform: 'none' } },
    at: {
        'starting-style': { states: { open: { opacity: '0', transform: from } } },
        'reduced-motion': { base: { transition: 'none' }, states: { open: { transform: 'none' } } },
    },
});

/**
 * Enter/exit for a disclosure panel, which is not in the top layer.
 *
 * Collapsible and Accordion are native `<details>`, so the panel lives inside
 * the browser's `::details-content`. `interpolate-size: allow-keywords`
 * unlocks `auto` as a transition endpoint — set on the element itself rather
 * than globally, so nothing outside this design system changes behaviour.
 */
const disclosurePresence: PartStyles = {
    base: { interpolateSize: 'allow-keywords' },
    selectors: {
        '&::details-content': {
            blockSize: '0',
            overflow: 'hidden',
            transition: 'block-size var(--duration-normal) var(--ease-standard), '
                + 'content-visibility var(--duration-normal) allow-discrete',
        },
        '&[open]::details-content': { blockSize: 'auto' },
    },
    at: { 'reduced-motion': { selectors: { '&::details-content': { transition: 'none' } } } },
};

/**
 * Merge presence into a part's own styles per KEY, not per block: a recipe
 * that already writes `states: { open: {} }` — the "deliberately unstyled"
 * idiom — would otherwise replace the open state presence needs and silently
 * lose the entry animation.
 */
const mergeKeyed = <T extends Record<string, CssProps>>(a: T | undefined, b: T | undefined): T =>
    Object.fromEntries(
        [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])]
            .map((key) => [key, { ...a?.[key], ...b?.[key] }]),
    ) as T;

const withPresence = (presence: PartStyles, styles: PartStyles): PartStyles => ({
    base: { ...presence.base, ...styles.base },
    states: mergeKeyed(presence.states, styles.states),
    selectors: mergeKeyed(presence.selectors, styles.selectors),
    at: Object.fromEntries(
        [...new Set([...Object.keys(presence.at ?? {}), ...Object.keys(styles.at ?? {})])].map(
            (key) => [key, withPresence(presence.at?.[key] ?? {}, styles.at?.[key] ?? {})],
        ),
    ),
});

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
                fontWeight: 'var(--weight-semibold)',
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
        // Every role, not just primary. `data-color` passes through whatever a
        // consumer sets, so a one-role axis made `<Tabs.Root color="success">`
        // type-check, emit the attribute, and match nothing — the tab just
        // stayed primary with no diagnostic anywhere.
        color: Object.fromEntries(
            ROLES.map((c) => [
                c,
                {
                    tab: {
                        states: {
                            active: {
                                background: `var(--color-${c})`,
                                color: `var(--color-${c}-content)`,
                            },
                        },
                    },
                },
            ]),
        ),
    },
};

// daisy "collapse collapse-arrow" flavor.
export const collapsible: RecipeInput = {
    component: 'collapsible',
    parts: {
        root: withPresence(disclosurePresence, {
            base: {
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                overflow: 'hidden',
            },
            states: { open: {}, closed: {} },
        }),
        trigger: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-xl) var(--space-2xl)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--weight-semibold)',
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
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    variants: {
        color: Object.fromEntries(
            ROLES.map((c) => [
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
    fontWeight: 'var(--weight-semibold)',
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
        popup: withPresence(popupPresence('translateY(8px) scale(0.97)'), {
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
        }),
        backdrop: {
            base: { background: 'oklch(0% 0 0 / 0.4)' },
            states: { open: {}, closed: {} },
        },
        title: {
            base: { margin: '0 0 var(--space-md)', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' },
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
        popup: withPresence(popupPresence('translateY(-4px)'), {
            base: { ...floatingPanel, padding: 'var(--space-2xl)', minWidth: '15rem' },
            states: { open: {}, closed: {} },
        }),
        title: {
            base: { margin: '0 0 var(--space-md)', fontSize: 'var(--text-md)', fontWeight: 'var(--weight-bold)' },
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
        popup: withPresence(popupPresence('translateY(-2px)'), {
            base: {
                padding: 'var(--space-xs) var(--space-lg)',
                maxWidth: '18rem',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                background: 'var(--color-neutral)',
                color: 'var(--color-neutral-content)',
                border: 'none',
                borderRadius: 'var(--radius-field)',
            },
            states: { open: {}, closed: {} },
        }),
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
        popup: withPresence(popupPresence('translateY(-4px)'), {
            base: { ...floatingPanel, padding: 'var(--space-md)', minWidth: '13rem' },
            states: { open: {}, closed: {} },
        }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: 'var(--space-md) var(--space-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
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
        // The item look plus a chevron; `open` keeps it lit while focus is
        // inside the submenu.
        'sub-trigger': {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: 'var(--space-md) var(--space-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                borderRadius: 'var(--radius-field)',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                highlighted: { background: 'var(--color-base-200)' },
                open: { background: 'var(--color-base-200)' },
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&::after': { content: '"\\203A"', marginLeft: 'auto', opacity: '0.6' },
            },
        },
        'sub-popup': withPresence(popupPresence('translateX(-4px)'), {
            base: { ...floatingPanel, padding: 'var(--space-md)', minWidth: '13rem' },
            states: { open: {}, closed: {} },
        }),
        group: { base: {} },
        'group-label': {
            base: {
                padding: 'var(--space-md) var(--space-lg) var(--space-xs)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-bold)',
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
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
            selectors: {
                '&[data-required]::after': { content: '" *"', color: 'var(--color-error)' },
            },
        },
        description: {
            base: { margin: '0', fontSize: 'var(--text-xs)', opacity: '0.6' },
        },
        error: {
            base: { margin: '0', fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: 'var(--weight-medium)' },
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
            base: { color: 'var(--color-primary-content)', lineHeight: 'var(--leading-none)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)' },
            states: { checked: {}, unchecked: {}, indeterminate: {} },
            selectors: {
                '&[data-state="checked"]::after': { content: '"✓"' },
                '&[data-state="indeterminate"]::after': { content: '"−"' },
            },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' },
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
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
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
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' },
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
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
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
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
            states: { disabled: {} },
        },
        control: {
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
        item: withPresence(disclosurePresence, {
            base: {
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                overflow: 'hidden',
            },
            states: { open: {}, closed: {} },
        }),
        trigger: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-xl) var(--space-2xl)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--weight-semibold)',
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
                fontWeight: 'var(--weight-medium)',
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
        popup: withPresence(popupPresence('translateY(-4px)'), {
            base: { ...floatingPanel, padding: 'var(--space-md)', minWidth: '13rem' },
            states: { open: {}, closed: {} },
        }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.625rem',
                padding: 'var(--space-md) var(--space-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                borderRadius: 'var(--radius-field)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                highlighted: { background: 'var(--color-base-200)' },
                selected: { color: 'var(--color-primary)', fontWeight: 'var(--weight-bold)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        'item-indicator': {
            base: { fontSize: 'var(--text-xs)', color: 'var(--color-primary)' },
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
                boxShadow: 'var(--shadow-xs)',
                fontFamily: 'inherit',
                fontWeight: 'var(--weight-semibold)',
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
                // Pressed: the runtime's press feedback, not `:active` — same
                // sink, but with keyboard parity and drag-off semantics the
                // pseudo-class can't guarantee across browsers. The :not
                // keeps specificity EQUAL to the hover rule — pressed then
                // wins by source order, as :active did — and covers a press
                // that goes disabled mid-gesture.
                '&[data-pressed]:not([data-disabled])': { transform: 'translateY(1px)', boxShadow: 'none' },
            },
        },
    },
    variants: {
        // One rule per role rather than per role × fill: the fill
        // variants below read these two tokens, so adding a colour
        // costs one rule instead of four.
        color: Object.fromEntries(
            ROLES.map((c) => [
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

export const avatar: RecipeInput = {
    component: 'avatar',
    parts: {
        root: {
            base: {
                position: 'relative',
                display: 'inline-grid',
                width: 'calc(var(--size-selector) * 10)',
                height: 'calc(var(--size-selector) * 10)',
                borderRadius: '9999px',
                overflow: 'hidden',
                verticalAlign: 'middle',
                background: 'var(--color-base-200)',
                // daisy's avatar ring, in role color.
                boxShadow: '0 0 0 2px var(--color-base-100), 0 0 0 4px var(--color-primary)',
            },
            states: { loading: {}, loaded: {}, error: {} },
        },
        image: {
            base: {
                gridArea: '1 / 1',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
            },
            states: { loading: {}, loaded: {}, error: {} },
        },
        fallback: {
            base: {
                gridArea: '1 / 1',
                placeItems: 'center',
                width: '100%',
                height: '100%',
                background: 'var(--color-neutral)',
                color: 'var(--color-neutral-content)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
                userSelect: 'none',
            },
            // `display` must not defeat the `hidden` zero sets once the image
            // has loaded.
            selectors: { '&:not([hidden])': { display: 'grid' } },
            states: { loading: {}, loaded: {}, error: {} },
        },
    },
};

/**
 * Toast presence is runtime-managed (see the SKILL's Toast section): plain
 * two-state transitions only — no `@starting-style`, no `allow-discrete`.
 */
export const toast: RecipeInput = {
    component: 'toast',
    tokens: {
        '--toast-bg': 'var(--color-base-200)',
        '--toast-ink': 'var(--color-base-content)',
        '--toast-from': '8px',
    },
    parts: {
        viewport: {
            base: {
                position: 'fixed',
                inset: 'auto',
                margin: '0',
                padding: 'var(--space-lg)',
                border: 'none',
                background: 'transparent',
                overflow: 'visible',
                width: 'min(24rem, 100vw)',
                listStyle: 'none',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
                pointerEvents: 'none',
            },
            selectors: {
                '&:popover-open': { display: 'flex' },
                '&[data-placement="top-start"]': { top: '0', left: '0' },
                '&[data-placement="top"]': { top: '0', left: '50%', transform: 'translateX(-50%)' },
                '&[data-placement="top-end"]': { top: '0', right: '0' },
                '&[data-placement="bottom-start"]': { bottom: '0', left: '0', flexDirection: 'column-reverse' },
                '&[data-placement="bottom"]': { bottom: '0', left: '50%', transform: 'translateX(-50%)', flexDirection: 'column-reverse' },
                '&[data-placement="bottom-end"]': { bottom: '0', right: '0', flexDirection: 'column-reverse' },
            },
        },
        // daisy's alert, floating: soft role fill, generous radius.
        root: {
            base: {
                pointerEvents: 'auto',
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                columnGap: 'var(--space-md)',
                padding: 'var(--space-md) var(--space-lg)',
                background: 'var(--toast-bg)',
                color: 'var(--toast-ink)',
                borderRadius: 'var(--radius-box)',
                boxShadow: 'var(--shadow-lg)',
                fontSize: 'var(--text-sm)',
                opacity: '0',
                transform: 'translateY(var(--toast-from))',
                transition: 'opacity var(--duration-normal) var(--ease-standard), '
                    + 'transform var(--duration-normal) var(--ease-standard)',
            },
            selectors: {
                '&[data-placement^="top"]': { '--toast-from': '-8px' },
            },
            states: {
                open: { opacity: '1', transform: 'none' },
                closed: {},
            },
            at: {
                'reduced-motion': { base: { transition: 'none' }, states: { open: { transform: 'none' } } },
            },
        },
        title: {
            base: { gridColumn: '1', fontWeight: 'var(--weight-semibold)' },
        },
        description: {
            base: {
                gridColumn: '1',
                fontSize: 'var(--text-xs)',
                color: 'color-mix(in oklab, var(--toast-ink) 75%, transparent)',
            },
        },
        action: {
            base: {
                gridColumn: '2',
                gridRow: '1',
                appearance: 'none',
                border: 'var(--border) solid color-mix(in oklab, var(--toast-ink) 25%, transparent)',
                background: 'transparent',
                color: 'var(--toast-ink)',
                borderRadius: '9999px',
                padding: 'var(--space-2xs) var(--space-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-semibold)',
                cursor: 'pointer',
            },
            states: {
                hover: { background: 'color-mix(in oklab, var(--toast-ink) 10%, transparent)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
        },
        close: {
            base: {
                gridColumn: '3',
                gridRow: '1',
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--toast-ink)',
                borderRadius: '9999px',
                padding: 'var(--space-2xs) var(--space-xs)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
            },
            states: {
                hover: { background: 'color-mix(in oklab, var(--toast-ink) 10%, transparent)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((role) => [
            role,
            {
                root: {
                    base: {
                        '--toast-bg': `var(--color-${role}-soft)`,
                        '--toast-ink': `var(--color-${role})`,
                    },
                },
            },
        ])),
    },
};

export const combobox: RecipeInput = {
    component: 'combobox',
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column' },
        },
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                minWidth: '13rem',
                background: 'var(--color-base-100)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
                transition: 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { borderColor: 'var(--color-base-content)' },
                open: { borderColor: 'var(--color-primary)' },
                closed: {},
                invalid: { borderColor: 'var(--color-error)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        },
        input: {
            base: {
                flex: '1',
                minWidth: '0',
                appearance: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'inherit',
                font: 'inherit',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                padding: 'var(--space-sm) var(--space-lg)',
            },
            states: {
                disabled: { cursor: 'not-allowed' },
                readonly: {},
                open: {},
                closed: {},
                invalid: {},
                required: {},
            },
            selectors: {
                '&::placeholder': { opacity: '0.5' },
            },
        },
        trigger: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                opacity: '0.6',
                padding: '0 var(--space-lg)',
                cursor: 'pointer',
                transition: 'transform var(--duration-normal) var(--ease-standard)',
            },
            states: {
                open: { transform: 'rotate(180deg)' },
                closed: {},
                disabled: { cursor: 'not-allowed' },
            },
        },
        popup: withPresence(popupPresence('translateY(-4px)'), {
            base: { ...floatingPanel, padding: 'var(--space-md)', minWidth: '13rem' },
            states: { open: {}, closed: {} },
        }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.625rem',
                padding: 'var(--space-md) var(--space-lg)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                borderRadius: 'var(--radius-field)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                highlighted: { background: 'var(--color-base-200)' },
                selected: { color: 'var(--color-primary)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        'item-indicator': {
            base: { fontSize: 'var(--text-xs)' },
            states: { selected: {} },
        },
        empty: {
            base: {
                padding: 'var(--space-lg)',
                fontSize: 'var(--text-sm)',
                textAlign: 'center',
                opacity: '0.6',
            },
        },
    },
    // The visible ring lives on `control`; input and trigger delegate.
    skipStates: {
        input: ['focus-visible'],
        trigger: ['focus-visible'],
    },
};

// daisy "btn" that stays pressed: the off state is the neutral btn, the on
// state is the solid accent fill.
export const toggle: RecipeInput = {
    component: 'toggle',
    // Same accent machinery as button: `color` sets the pair once, the on
    // state consumes it — a role costs one rule, not one per state.
    tokens: {
        '--toggle-accent': 'var(--color-primary)',
        '--toggle-on-accent': 'var(--color-primary-content)',
        '--toggle-soft': 'var(--color-primary-soft)',
    },
    parts: {
        root: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5em',
                color: 'var(--color-base-content)',
                background: 'var(--color-base-200)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
                boxShadow: 'var(--shadow-xs)',
                fontFamily: 'inherit',
                fontWeight: 'var(--weight-semibold)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), '
                    + 'color var(--duration-fast) var(--ease-standard), '
                    + 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: 'var(--color-base-300)' },
                on: {
                    background: 'var(--toggle-accent)',
                    color: 'var(--toggle-on-accent)',
                    borderColor: 'var(--toggle-accent)',
                },
                off: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                'focus-visible': {
                    outline: '2px solid var(--toggle-accent)',
                    outlineOffset: '2px',
                },
            },
            selectors: {
                // Hover on an on toggle must not fade toward the neutral hover
                // wash — equal specificity, later in source, so on wins; the
                // filter supplies daisy's darkened-fill hover instead.
                '&[data-state="on"]:hover': {
                    background: 'var(--toggle-accent)',
                    filter: 'brightness(0.92)',
                },
                // Pressed: the runtime's press feedback, not `:active` — see
                // the button recipe for why the :not matters.
                '&[data-pressed]:not([data-disabled])': { transform: 'translateY(1px)', boxShadow: 'none' },
            },
        },
    },
    variants: {
        color: Object.fromEntries(
            ROLES.map((c) => [
                c,
                {
                    root: {
                        base: {
                            '--toggle-accent': `var(--color-${c})`,
                            '--toggle-on-accent': `var(--color-${c}-content)`,
                            '--toggle-soft': `var(--color-${c}-soft)`,
                        },
                    },
                },
            ]),
        ),
        size: {
            xs: { root: { base: { padding: 'var(--space-2xs) var(--space-xs)', fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--text-sm)' } } },
            md: { root: { base: { padding: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--text-md)' } } },
            lg: { root: { base: { padding: 'var(--space-md) var(--space-xl)', fontSize: 'var(--text-lg)' } } },
            xl: { root: { base: { padding: 'var(--space-lg) var(--space-2xl)', fontSize: 'var(--text-xl)' } } },
        },
    },
    defaultVariants: { color: 'primary', size: 'md' },
};

// daisy "join" of btns: one bordered capsule, hairline seams between items,
// the on item filled with the accent.
export const toggleGroup: RecipeInput = {
    component: 'toggle-group',
    tokens: {
        '--toggle-group-accent': 'var(--color-primary)',
        '--toggle-group-on-accent': 'var(--color-primary-content)',
    },
    parts: {
        root: {
            base: {
                display: 'inline-flex',
                background: 'var(--color-base-200)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
                boxShadow: 'var(--shadow-xs)',
                overflow: 'hidden',
            },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
            selectors: {
                '&[data-orientation="vertical"]': { flexDirection: 'column' },
            },
        },
        item: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5em',
                background: 'transparent',
                color: 'var(--color-base-content)',
                border: 'none',
                padding: 'var(--space-sm) var(--space-lg)',
                fontFamily: 'inherit',
                fontWeight: 'var(--weight-semibold)',
                fontSize: 'var(--text-sm)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), '
                    + 'color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: 'var(--color-base-300)' },
                on: {
                    background: 'var(--toggle-group-accent)',
                    color: 'var(--toggle-group-on-accent)',
                },
                off: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                'focus-visible': {
                    // The group clips its children (joined corners), so an
                    // offset ring would be swallowed — inset it instead.
                    outline: '2px solid var(--toggle-group-accent)',
                    outlineOffset: '-2px',
                },
            },
            selectors: {
                // On beats hover by source order at equal specificity; the
                // filter supplies daisy's darkened-fill hover instead.
                '&[data-state="on"]:hover': {
                    background: 'var(--toggle-group-accent)',
                    filter: 'brightness(0.92)',
                },
                // The join seams, flipping to the block axis when vertical.
                '&[data-orientation="horizontal"] + &': {
                    borderInlineStart: 'var(--border) solid var(--color-base-300)',
                },
                '&[data-orientation="vertical"] + &': {
                    borderBlockStart: 'var(--border) solid var(--color-base-300)',
                },
            },
        },
    },
    variants: {
        color: Object.fromEntries(
            ROLES.map((c) => [
                c,
                {
                    item: {
                        base: {
                            '--toggle-group-accent': `var(--color-${c})`,
                            '--toggle-group-on-accent': `var(--color-${c}-content)`,
                        },
                    },
                },
            ]),
        ),
    },
    defaultVariants: { color: 'primary' },
};

// daisy "join" of an input and two btns: one bordered capsule (the control),
// hairline seams on the triggers' inner edges, neutral btn fills for the steppers.
export const numberInput: RecipeInput = {
    component: 'number-input',
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-sm)' },
            states: { disabled: {}, invalid: {}, required: {}, readonly: {} },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                invalid: { color: 'var(--color-error)' },
                required: {},
            },
        },
        // The field chrome (combobox split): the ring and the invalid border
        // draw on the box; input and triggers sit joined inside it.
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'stretch',
                background: 'var(--color-base-100)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
                overflow: 'hidden',
                transition: 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { borderColor: 'var(--color-base-content)' },
                invalid: { borderColor: 'var(--color-error)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                readonly: {},
                ...focusRing,
            },
        },
        input: {
            base: {
                width: '5rem',
                minWidth: '0',
                appearance: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'inherit',
                font: 'inherit',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                textAlign: 'center',
                padding: 'var(--space-sm) var(--space-md)',
            },
            states: {
                disabled: { cursor: 'not-allowed' },
                readonly: {},
                invalid: {},
                required: {},
            },
            selectors: {
                '&::placeholder': { opacity: '0.5' },
            },
        },
        // Steppers: compact join-item btns flanking the input. The decrement
        // renders before the input, the increment after — each seam is a
        // hairline on the trigger's inner edge.
        'increment-trigger': {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'var(--color-base-200)',
                color: 'var(--color-base-content)',
                fontFamily: 'inherit',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
                lineHeight: 'var(--leading-none)',
                paddingInline: 'var(--space-lg)',
                cursor: 'pointer',
                userSelect: 'none',
                borderInlineStart: 'var(--border) solid var(--color-base-300)',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                // Pressed: the runtime's press feedback, not `:active` — see
                // the button recipe for why the :not matters.
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-300)' },
            },
        },
        'decrement-trigger': {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'var(--color-base-200)',
                color: 'var(--color-base-content)',
                fontFamily: 'inherit',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
                lineHeight: 'var(--leading-none)',
                paddingInline: 'var(--space-lg)',
                cursor: 'pointer',
                userSelect: 'none',
                borderInlineEnd: 'var(--border) solid var(--color-base-300)',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-300)' },
            },
        },
    },
    // The visible ring lives on `control`; the input delegates.
    skipStates: { input: ['focus-visible'] },
};

export const recipes: RecipeInput[] = [
    tabs, collapsible, switchRecipe, dialog, popover, tooltip, menu,
    field, checkbox, radioGroup, progress, slider, accordion, select, button, avatar, toast, combobox,
    toggle, toggleGroup, numberInput,
];
