/**
 * zero-basic recipes — readable neutral styling for every zero component.
 * Pure data (type-only kit imports); compiled to CSS by build.mjs.
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

const focusRing: Record<string, PartStyles['base']> = {
    'focus-visible': {
        outline: '2px solid var(--color-primary)',
        outlineOffset: '2px',
    },
};

/**
 * Enter/exit presence for a top-layer popup — dialog, popover, menu, select,
 * tooltip.
 *
 * Zero never unmounts a popup; it toggles `data-state` and calls the native
 * `showPopover()` / `showModal()`. That is all the platform needs: transition
 * `display` and `overlay` with `allow-discrete` and the browser keeps the
 * element in the top layer for the duration of the exit, so the same two
 * declarations buy both directions. `@starting-style` supplies the state the
 * entry animates FROM — without it the element simply appears at its open
 * value.
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
        // A looping animation would be sped up by the collapsed durations, but
        // a one-shot transition just becomes instant — which is what reduced
        // motion asks for. Stating it anyway keeps the intent explicit and
        // covers the discrete properties, which have no duration to collapse.
        'reduced-motion': { base: { transition: 'none' }, states: { open: { transform: 'none' } } },
    },
});

/**
 * Enter/exit for a disclosure panel, which is not in the top layer.
 *
 * Collapsible and Accordion are native `<details>`, so the panel is inside the
 * browser's `::details-content`. `interpolate-size: allow-keywords` unlocks
 * `auto` as a transition endpoint — set on the element itself rather than
 * globally, so nothing outside this design system changes behaviour.
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
    at: {
        'reduced-motion': { selectors: { '&::details-content': { transition: 'none' } } },
    },
};

/**
 * Merge presence into a part's own styles without either clobbering the other.
 *
 * Per KEY, not per block: a recipe that already writes `states: { open: {} }`
 * — the "deliberately unstyled" idiom every popup here uses — would otherwise
 * replace the open state presence needs and silently lose the entry animation.
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
    tokens: { '--tabs-accent': 'var(--color-primary)' },
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
                active: { color: 'var(--tabs-accent)', borderBottomColor: 'var(--tabs-accent)' },
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
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--tabs-accent': `var(--color-${c})`,
        } } }])),
    },
};

export const collapsible: RecipeInput = {
    component: 'collapsible',
    parts: {
        root: withPresence(disclosurePresence, {
            base: {
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
            },
            states: { open: {}, closed: {} },
        }),
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
            ROLES.map((c) => [
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
        popup: withPresence(popupPresence('translateY(8px) scale(0.98)'), {
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
            at: {
                sm: {
                    base: {
                        width: 'calc(100% - 2rem)',
                        maxWidth: '32rem',
                        // `auto` stretches an inset-positioned modal to fill; `fit-content`
                        // is the UA's own dialog default and hugs the content (#114).
                        height: 'fit-content',
                        maxHeight: 'calc(100% - 2rem)',
                        margin: 'auto',
                        border: 'var(--border) solid var(--color-base-300)',
                        borderRadius: 'var(--radius-box)',
                        boxShadow: 'var(--shadow-lg)',
                    },
                },
            },
        }),
        backdrop: {
            base: { background: 'color-mix(in oklab, var(--color-neutral) 45%, transparent)' },
            states: { open: {}, closed: {} },
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
        popup: withPresence(popupPresence('translateY(-4px)'), {
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
        }),
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
        popup: withPresence(popupPresence('translateY(-2px)'), {
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
        }),
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
        popup: withPresence(popupPresence('translateY(-4px)'), {
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
        }),
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
        // The item look, plus a chevron and an `open` state that keeps it
        // visually active after focus moves into the submenu.
        'sub-trigger': {
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
                // `open` before `highlighted`: when both apply (pointer on the
                // trigger while its submenu is open) the later-emitted
                // `highlighted` must win BOTH properties — declared the other
                // way round, `open` stole the background while `highlighted`
                // kept the color: primary-content on base-200, unreadable (#116).
                open: { background: 'var(--color-base-200)' },
                closed: {},
                highlighted: { background: 'var(--color-primary)', color: 'var(--color-primary-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&::after': { content: '"\\203A"', marginLeft: 'auto', opacity: '0.6' },
            },
        },
        // The popup surface, entering from the side it attaches on.
        'sub-popup': withPresence(popupPresence('translateX(-4px)'), {
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
        }),
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
    // The accent defaults live in `tokens:` (emitted flat on the carrier, no
    // added specificity), so the un-attributed render IS the primary variant
    // and `variants.color` only rebinds custom properties — the toast shape.
    tokens: {
        '--checkbox-size': 'calc(var(--size-selector) * 5)',
        '--checkbox-accent': 'var(--color-primary)',
        '--checkbox-on-accent': 'var(--color-primary-content)',
    },
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
                checked: { background: 'var(--checkbox-accent)', borderColor: 'var(--checkbox-accent)' },
                indeterminate: { background: 'var(--checkbox-accent)', borderColor: 'var(--checkbox-accent)' },
                unchecked: {},
                'focus-visible': { outline: '2px solid var(--checkbox-accent)', outlineOffset: '2px' },
                invalid: { borderColor: 'var(--color-error)' },
                disabled: {},
            },
        },
        indicator: {
            base: { color: 'var(--checkbox-on-accent)', lineHeight: 'var(--leading-none)', fontSize: 'var(--text-xs)' },
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
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--checkbox-accent': `var(--color-${c})`,
            '--checkbox-on-accent': `var(--color-${c}-content)`,
        } } }])),
        size: {
            xs: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 4)' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 4.5)' } }, label: { base: { fontSize: 'var(--text-sm)' } } },
            md: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 5)' } }, label: { base: { fontSize: 'var(--text-sm)' } } },
            lg: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 6)' } }, label: { base: { fontSize: 'var(--text-md)' } } },
            xl: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 7)' } }, label: { base: { fontSize: 'var(--text-lg)' } } },
        },
    },
    // The visible ring lives on `control`; the <label> root only groups the
    // control and its text. Declared rather than left implicit so the
    // delegation reads as a decision.
    skipStates: { root: ['focus-visible'] },
};

export const radioGroup: RecipeInput = {
    component: 'radio-group',
    tokens: {
        '--radio-size': 'calc(var(--size-selector) * 5)',
        '--radio-accent': 'var(--color-primary)',
    },
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
                checked: { borderColor: 'var(--radio-accent)' },
                unchecked: {},
                'focus-visible': { outline: '2px solid var(--radio-accent)', outlineOffset: '2px' },
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
                checked: { background: 'var(--radio-accent)' },
                unchecked: {},
            },
        },
        'item-label': {
            base: { fontSize: 'var(--text-sm)' },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--radio-accent': `var(--color-${c})`,
        } } }])),
        size: {
            xs: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 4)' } }, 'item-label': { base: { fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 4.5)' } }, 'item-label': { base: { fontSize: 'var(--text-sm)' } } },
            md: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 5)' } }, 'item-label': { base: { fontSize: 'var(--text-sm)' } } },
            lg: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 6)' } }, 'item-label': { base: { fontSize: 'var(--text-md)' } } },
            xl: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 7)' } }, 'item-label': { base: { fontSize: 'var(--text-lg)' } } },
        },
    },
    // The visible ring lives on `item-control`; `item` is the <label> that
    // wraps it. Declared rather than left implicit so the delegation reads
    // as a decision.
    skipStates: { label: ['invalid', 'required'], item: ['focus-visible'] },
};

export const progress: RecipeInput = {
    component: 'progress',
    tokens: {
        '--progress-accent': 'var(--color-primary)',
        '--progress-track-size': 'calc(var(--size-selector) * 2)',
    },
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
                height: 'var(--progress-track-size)',
                background: 'var(--color-base-300)',
                borderRadius: '9999px',
                overflow: 'hidden',
            },
        },
        range: {
            base: {
                height: '100%',
                background: 'var(--progress-accent)',
                borderRadius: '9999px',
                transition: 'width var(--duration-normal) var(--ease-standard)',
            },
            states: {
                // `complete` is a semantic state, not an accent: it stays
                // success regardless of the colour variant, on purpose.
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
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--progress-accent': `var(--color-${c})`,
        } } }])),
        size: {
            xs: { root: { base: { '--progress-track-size': 'var(--size-selector)' } } },
            sm: { root: { base: { '--progress-track-size': 'calc(var(--size-selector) * 1.5)' } } },
            md: { root: { base: { '--progress-track-size': 'calc(var(--size-selector) * 2)' } } },
            lg: { root: { base: { '--progress-track-size': 'calc(var(--size-selector) * 3)' } } },
            xl: { root: { base: { '--progress-track-size': 'calc(var(--size-selector) * 4)' } } },
        },
    },
    keyframes: {
        'zero-basic-indeterminate': 'from { margin-left: -40%; } to { margin-left: 100%; }',
    },
};

export const slider: RecipeInput = {
    component: 'slider',
    tokens: { '--slider-accent': 'var(--color-primary)' },
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
            base: { width: '100%', accentColor: 'var(--slider-accent)', cursor: 'pointer' },
            states: {
                disabled: { cursor: 'not-allowed' },
                'focus-visible': { outline: '2px solid var(--slider-accent)', outlineOffset: '2px' },
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
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--slider-accent': `var(--color-${c})`,
        } } }])),
        // A native range widget: only its box height is size-able without an
        // appearance:none rebuild, so the ramp moves the box and the text.
        size: {
            xs: { control: { base: { height: 'calc(var(--size-selector) * 3)' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            sm: { control: { base: { height: 'calc(var(--size-selector) * 4)' } }, label: { base: { fontSize: 'var(--text-sm)' } } },
            md: { label: { base: { fontSize: 'var(--text-sm)' } } },
            lg: { control: { base: { height: 'calc(var(--size-selector) * 7)' } }, label: { base: { fontSize: 'var(--text-md)' } } },
            xl: { control: { base: { height: 'calc(var(--size-selector) * 8)' } }, label: { base: { fontSize: 'var(--text-lg)' } } },
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
        item: withPresence(disclosurePresence, {
            base: { borderBottom: 'var(--border) solid var(--color-base-300)' },
            states: { open: {}, closed: {} },
            selectors: {
                '&:last-child': { borderBottom: 'none' },
            },
        }),
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
    tokens: {
        '--select-accent': 'var(--color-primary)',
        '--select-on-accent': 'var(--color-primary-content)',
    },
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
                open: { borderColor: 'var(--select-accent)' },
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
        popup: withPresence(popupPresence('translateY(-4px)'), {
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
        }),
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
                highlighted: { background: 'var(--select-accent)', color: 'var(--select-on-accent)' },
                selected: { fontWeight: 'var(--weight-semibold)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        'item-indicator': {
            base: { fontSize: 'var(--text-xs)' },
            states: { selected: {} },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--select-accent': `var(--color-${c})`,
            '--select-on-accent': `var(--color-${c}-content)`,
        } } }])),
        size: {
            xs: { trigger: { base: { padding: 'var(--space-2xs) var(--space-xs)', fontSize: 'var(--text-xs)' } } },
            sm: { trigger: { base: { padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--text-sm)' } } },
            md: { trigger: { base: { padding: 'var(--space-md) var(--space-xl)', fontSize: 'var(--text-sm)' } } },
            lg: { trigger: { base: { padding: 'var(--space-lg) var(--space-xl)', fontSize: 'var(--text-md)' } } },
            xl: { trigger: { base: { padding: 'var(--space-xl) var(--space-2xl)', fontSize: 'var(--text-lg)' } } },
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
                // Pressed: the runtime's press feedback, not `:active` — same
                // sink, but with keyboard parity and drag-off semantics the
                // pseudo-class can't guarantee across browsers. The :not
                // keeps specificity EQUAL to the hover rule — pressed then
                // wins by source order, as :active did — and covers a press
                // that goes disabled mid-gesture.
                '&[data-pressed]:not([data-disabled])': { transform: 'translateY(1px)' },
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
                borderRadius: 'var(--radius-selector)',
                overflow: 'hidden',
                verticalAlign: 'middle',
                background: 'var(--color-base-200)',
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
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
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
 * Toast presence is runtime-managed — the one popup-shaped component where
 * `@starting-style`/`allow-discrete` must NOT be used: zero mounts the root
 * `closed`, flips it `open` a frame later, and keeps it mounted after
 * dismissal until the longest transition here finishes. Both directions are
 * the ordinary two-state transition.
 */
export const toast: RecipeInput = {
    component: 'toast',
    tokens: {
        '--toast-accent': 'var(--color-primary)',
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
                // The UA hides closed popovers by unsetting display — an
                // unconditional `display: flex` would defeat that.
                '&:popover-open': { display: 'flex' },
                '&[data-placement="top-start"]': { top: '0', left: '0' },
                '&[data-placement="top"]': { top: '0', left: '50%', transform: 'translateX(-50%)' },
                '&[data-placement="top-end"]': { top: '0', right: '0' },
                '&[data-placement="bottom-start"]': { bottom: '0', left: '0', flexDirection: 'column-reverse' },
                '&[data-placement="bottom"]': { bottom: '0', left: '50%', transform: 'translateX(-50%)', flexDirection: 'column-reverse' },
                '&[data-placement="bottom-end"]': { bottom: '0', right: '0', flexDirection: 'column-reverse' },
            },
        },
        root: {
            base: {
                pointerEvents: 'auto',
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                columnGap: 'var(--space-md)',
                padding: 'var(--space-md) var(--space-lg)',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                border: 'var(--border) solid var(--color-base-300)',
                borderLeft: 'calc(var(--border) * 3) solid var(--toast-accent)',
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
                color: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)',
            },
        },
        action: {
            base: {
                ...buttonBase,
                gridColumn: '2',
                gridRow: '1',
                padding: 'var(--space-2xs) var(--space-sm)',
                fontSize: 'var(--text-xs)',
                color: 'var(--toast-accent)',
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
        },
        close: {
            base: {
                ...buttonBase,
                gridColumn: '3',
                gridRow: '1',
                padding: 'var(--space-2xs) var(--space-xs)',
                fontSize: 'var(--text-xs)',
                border: 'none',
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((role) => [
            role,
            { root: { base: { '--toast-accent': `var(--color-${role})` } } },
        ])),
    },
};

export const combobox: RecipeInput = {
    component: 'combobox',
    tokens: {
        '--combobox-accent': 'var(--color-primary)',
        '--combobox-on-accent': 'var(--color-primary-content)',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column' },
        },
        // The field chrome lives on the box wrapping input + trigger; the
        // focus ring draws here from the input's forwarded focus-visible.
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                minWidth: '12rem',
                background: 'var(--color-base-100)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
            },
            states: {
                hover: { borderColor: 'var(--color-base-content)' },
                open: { borderColor: 'var(--combobox-accent)' },
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
                padding: '0.5rem 0.75rem',
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
                '&::placeholder': { color: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)' },
            },
        },
        trigger: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                opacity: '0.6',
                padding: '0 0.625rem',
                cursor: 'pointer',
                transition: 'transform var(--duration-fast) var(--ease-standard)',
            },
            states: {
                open: { transform: 'rotate(180deg)' },
                closed: {},
                disabled: { cursor: 'not-allowed' },
            },
        },
        popup: withPresence(popupPresence('translateY(-4px)'), {
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
        }),
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
                highlighted: { background: 'var(--combobox-accent)', color: 'var(--combobox-on-accent)' },
                selected: { fontWeight: 'var(--weight-semibold)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        'item-indicator': {
            base: { fontSize: 'var(--text-xs)' },
            states: { selected: {} },
        },
        empty: {
            base: {
                padding: 'var(--space-md)',
                fontSize: 'var(--text-sm)',
                textAlign: 'center',
                color: 'color-mix(in oklab, var(--color-base-content) 55%, transparent)',
            },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--combobox-accent': `var(--color-${c})`,
            '--combobox-on-accent': `var(--color-${c}-content)`,
        } } }])),
        size: {
            xs: { input: { base: { padding: '0.25rem 0.5rem', fontSize: 'var(--text-xs)' } } },
            sm: { input: { base: { padding: '0.375rem 0.625rem', fontSize: 'var(--text-sm)' } } },
            md: { input: { base: { padding: '0.5rem 0.75rem', fontSize: 'var(--text-sm)' } } },
            lg: { input: { base: { padding: '0.625rem 0.875rem', fontSize: 'var(--text-md)' } } },
            xl: { input: { base: { padding: '0.75rem 1rem', fontSize: 'var(--text-lg)' } } },
        },
    },
    // The visible ring lives on `control`; input and trigger delegate.
    skipStates: {
        input: ['focus-visible'],
        trigger: ['focus-visible'],
    },
};

export const numberInput: RecipeInput = {
    component: 'number-input',
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
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
        // The field chrome (combobox split): the ring and the invalid tint
        // draw on the box, input and triggers sit inside it.
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'stretch',
                background: 'var(--color-base-100)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
                overflow: 'hidden',
            },
            states: {
                hover: { borderColor: 'var(--color-base-content)' },
                invalid: { borderColor: 'var(--color-error)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                readonly: {},
                'focus-visible': {
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: '2px',
                },
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
                textAlign: 'center',
                padding: '0.5rem 0.5rem',
            },
            states: {
                disabled: { cursor: 'not-allowed' },
                readonly: {},
                invalid: {},
                required: {},
            },
            selectors: {
                '&::placeholder': { color: 'color-mix(in oklab, var(--color-base-content) 50%, transparent)' },
            },
        },
        'increment-trigger': {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'var(--color-base-200)',
                color: 'inherit',
                padding: '0 0.75rem',
                cursor: 'pointer',
                userSelect: 'none',
                borderInlineStart: 'var(--border) solid var(--color-base-300)',
            },
            states: {
                hover: { background: 'var(--color-base-300)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-300)' },
            },
        },
        'decrement-trigger': {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'var(--color-base-200)',
                color: 'inherit',
                padding: '0 0.75rem',
                cursor: 'pointer',
                userSelect: 'none',
                borderInlineEnd: 'var(--border) solid var(--color-base-300)',
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

export const ratingGroup: RecipeInput = {
    component: 'rating-group',
    tokens: { '--rating-size': 'var(--text-xl)' },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
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
        control: {
            base: { display: 'inline-flex', gap: '0.125rem' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                readonly: {},
                'focus-visible': {
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: '2px',
                    borderRadius: 'var(--radius-selector)',
                },
            },
        },
        item: {
            base: {
                fontSize: 'var(--rating-size)',
                lineHeight: '1',
                cursor: 'pointer',
                userSelect: 'none',
                color: 'var(--color-base-300)',
                transition: 'color var(--duration-fast) var(--ease-standard), '
                    + 'transform var(--duration-fast) var(--ease-standard)',
            },
            states: {
                full: { color: 'var(--color-warning)' },
                half: { color: 'var(--color-warning)' },
                empty: {},
                highlighted: { transform: 'scale(1.15)' },
                disabled: { cursor: 'not-allowed' },
                readonly: { cursor: 'default' },
                // The group ring lives on control; per-item focus still gets
                // a subtle marker for the value-following tab stop.
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '1px', borderRadius: 'var(--radius-selector)' },
            },
            at: {
                'reduced-motion': { base: { transition: 'none' }, states: { highlighted: { transform: 'none' } } },
            },
        },
    },
};

export const treeView: RecipeInput = {
    component: 'tree-view',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
        },
        tree: {
            base: { display: 'flex', flexDirection: 'column', fontSize: 'var(--text-sm)' },
        },
        // Indentation comes from branch-content's inline padding — depth is
        // the DOM nesting, no per-level rules needed.
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
                selected: { background: 'var(--color-primary)', color: 'var(--color-primary-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '-2px' },
            },
            selectors: {
                '&[data-selected]:hover': { background: 'var(--color-primary)' },
            },
        },
        branch: {
            base: { display: 'flex', flexDirection: 'column', outline: 'none' },
            states: { open: {}, closed: {}, selected: {}, disabled: {} },
        },
        'branch-trigger': {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
                userSelect: 'none',
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
                open: {},
                closed: {},
                selected: { background: 'var(--color-primary)', color: 'var(--color-primary-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '-2px' },
            },
            selectors: {
                '&[data-selected]:hover': { background: 'var(--color-primary)' },
            },
        },
        'branch-indicator': {
            base: {
                display: 'inline-block',
                transition: 'transform var(--duration-fast) var(--ease-standard)',
            },
            states: { open: { transform: 'rotate(90deg)' }, closed: {} },
            at: {
                'reduced-motion': { base: { transition: 'none' } },
            },
        },
        'branch-content': {
            base: { display: 'flex', flexDirection: 'column', paddingInlineStart: '1rem' },
            states: { open: {}, closed: {} },
        },
    },
};

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
                background: 'transparent',
                color: 'var(--color-base-content)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
                fontFamily: 'inherit',
                fontWeight: 'var(--weight-medium)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), '
                    + 'color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
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
                // Hover on an on toggle must not fade toward the hover wash —
                // equal specificity, later in source, so on wins.
                '&[data-state="on"]:hover': { background: 'var(--toggle-accent)' },
                '&[data-pressed]:not([data-disabled])': { transform: 'translateY(1px)' },
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
            md: { root: { base: { padding: 'var(--space-sm) var(--space-md)', fontSize: 'var(--text-md)' } } },
            lg: { root: { base: { padding: 'var(--space-md) var(--space-lg)', fontSize: 'var(--text-lg)' } } },
            xl: { root: { base: { padding: 'var(--space-lg) var(--space-xl)', fontSize: 'var(--text-xl)' } } },
        },
    },
    defaultVariants: { color: 'primary', size: 'md' },
};

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
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-field)',
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
                padding: 'var(--space-xs) var(--space-md)',
                fontFamily: 'inherit',
                fontWeight: 'var(--weight-medium)',
                fontSize: 'var(--text-sm)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), '
                    + 'color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
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
                '&[data-state="on"]:hover': { background: 'var(--toggle-group-accent)' },
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

export const recipes: RecipeInput[] = [
    tabs, collapsible, switchRecipe, dialog, popover, tooltip, menu,
    field, checkbox, radioGroup, progress, slider, accordion, select, button, avatar, toast, combobox,
    toggle, toggleGroup, numberInput, ratingGroup, treeView,
];
