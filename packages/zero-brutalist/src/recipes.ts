/**
 * zero-brutalist recipes — the brief, applied to zero's anatomy.
 *
 * Brutalism is mostly three moves repeated: a thick black border, a hard
 * offset shadow, and uppercase tracked-out mono labels. Pressing something
 * shoves it into its own shadow.
 */
import type { CssProps, PartStyles, RecipeInput, RoleDecl } from '@sigx/zero-kit';
import { roles } from './tokens.js';

/**
 * Every role a consumer can pass as `color`, derived from the declaration
 * rather than retyped — a role declared in `tokens.ts` but missing here would
 * silently render primary. Roles opting out of `-content` or `-soft` are
 * fills or hairlines, not action colours; this design system declares none.
 */
const ROLES = Object.entries(roles as Record<string, RoleDecl>)
    .filter(([, decl]) => decl.content !== false && decl.soft !== false)
    .map(([name]) => name);

/** Uppercase, tracked out, mono, heavy — the brief's label treatment. */
const label: CssProps = {
    fontFamily: 'var(--font-mono)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
};

const inked: CssProps = {
    border: 'var(--border) solid var(--color-base-content)',
    borderRadius: '0',
    background: 'var(--color-base-100)',
    color: 'var(--color-base-content)',
};

const focusRing: Record<string, CssProps> = {
    'focus-visible': {
        outline: 'var(--border) solid var(--color-primary)',
        outlineOffset: '3px',
    },
};

/** Hovering shoves the element part-way into its own shadow. */
const shift = (n: string): CssProps => ({
    boxShadow: 'var(--shadow-xs)',
    transform: `translate(${n}, ${n})`,
});

const motion = (props: string): string =>
    props.split(', ').map((p) => `${p} var(--duration-fast) var(--ease-standard)`).join(', ');

// ── Button ────────────────────────────────────────────────────────────────
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
                gap: 'var(--space-sm)',
                ...inked,
                ...label,
                lineHeight: 'var(--leading-none)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: motion('box-shadow, transform, background'),
            },
            states: {
                disabled: {
                    opacity: 'var(--disabled-opacity)',
                    cursor: 'not-allowed',
                    boxShadow: 'none',
                    transform: 'none',
                },
                hover: shift('1px'),
                ...focusRing,
            },
            // The stamp rides the runtime's press feedback, not `:active`:
            // same collapse of the hard shadow, but with keyboard parity and
            // drag-off semantics the pseudo-class can't guarantee. The :not
            // keeps specificity EQUAL to hover; pressed wins by source
            // order, exactly as :active did.
            selectors: { '&[data-pressed]:not([data-disabled])': { boxShadow: 'none', transform: 'translate(3px, 3px)' } },
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
            solid: { root: { base: { background: 'var(--btn-accent)', color: 'var(--btn-on-accent)' } } },
            outline: { root: { base: { background: 'var(--color-base-100)', color: 'var(--color-base-content)' } } },
            soft: { root: { base: { background: 'var(--btn-soft)', color: 'var(--color-base-content)' } } },
            // Even "ghost" keeps the border. Brutalism has no invisible states.
            ghost: {
                root: {
                    base: { background: 'transparent', color: 'var(--color-base-content)', boxShadow: 'none' },
                    states: { hover: { background: 'var(--btn-soft)', transform: 'none' } },
                },
            },
        },
        size: {
            xs: { root: { base: { padding: 'var(--space-2xs) var(--space-sm)', fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-xs)' } } },
            md: { root: { base: { padding: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--text-sm)' } } },
            lg: { root: { base: { padding: 'var(--space-md) var(--space-xl)', fontSize: 'var(--text-md)' } } },
            xl: { root: { base: { padding: 'var(--space-lg) var(--space-2xl)', fontSize: 'var(--text-lg)' } } },
        },
    },
    defaultVariants: { color: 'primary', variant: 'solid', size: 'md' },
};

// ── Tabs ──────────────────────────────────────────────────────────────────
export const tabs: RecipeInput = {
    component: 'tabs',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' } },
        list: { base: { display: 'flex', gap: 'var(--space-sm)' } },
        tab: {
            base: {
                appearance: 'none',
                ...inked,
                ...label,
                fontSize: 'var(--text-xs)',
                padding: 'var(--space-sm) var(--space-lg)',
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
                transition: motion('box-shadow, transform, background'),
            },
            states: {
                active: {
                    background: 'var(--color-primary)',
                    color: 'var(--color-primary-content)',
                    boxShadow: 'var(--shadow-sm)',
                },
                inactive: {},
                hover: shift('1px'),
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed', boxShadow: 'none' },
                ...focusRing,
            },
        },
        panel: {
            base: { ...inked, padding: 'var(--space-lg)', boxShadow: 'var(--shadow-md)', lineHeight: 'var(--leading-normal)' },
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
        fontSize: 'var(--text-sm)',
        cursor: 'pointer',
        transition: motion('background'),
    },
    states: {
        open: { background: 'var(--color-accent)', color: 'var(--color-accent-content)' },
        closed: {},
        hover: { background: 'var(--color-base-200)' },
        disabled: { opacity: 'var(--disabled-opacity)' },
        ...focusRing,
    },
};

export const collapsible: RecipeInput = {
    component: 'collapsible',
    parts: {
        root: withPresence(disclosurePresence, { base: { ...inked, boxShadow: 'var(--shadow-sm)' }, states: { open: {}, closed: {} } }),
        trigger: disclosureTrigger,
        panel: {
            base: {
                padding: 'var(--space-md)',
                borderTop: 'var(--border) solid var(--color-base-content)',
                lineHeight: 'var(--leading-normal)',
            },
            states: { open: {}, closed: {} },
        },
    },
};

export const accordion: RecipeInput = {
    component: 'accordion',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' } },
        item: withPresence(disclosurePresence, { base: { ...inked, boxShadow: 'var(--shadow-sm)' }, states: { open: {}, closed: {} } }),
        trigger: disclosureTrigger,
        panel: {
            base: {
                padding: 'var(--space-md)',
                borderTop: 'var(--border) solid var(--color-base-content)',
                lineHeight: 'var(--leading-normal)',
            },
            states: { open: {}, closed: {} },
        },
    },
};

// ── Overlays ──────────────────────────────────────────────────────────────
const overlayTrigger: PartStyles = {
    base: {
        appearance: 'none',
        ...inked,
        ...label,
        fontSize: 'var(--text-xs)',
        padding: 'var(--space-sm) var(--space-lg)',
        boxShadow: 'var(--shadow-xs)',
        cursor: 'pointer',
    },
    states: { open: {}, closed: {}, hover: shift('1px'), disabled: { opacity: 'var(--disabled-opacity)' }, ...focusRing },
};

export const dialog: RecipeInput = {
    component: 'dialog',
    parts: {
        trigger: overlayTrigger,
        popup: withPresence(popupPresence('translate(8px, 8px)'), {
            // Mobile-first: a full-bleed slab, then a shadowed card from `sm`.
            base: {
                width: '100%',
                height: '100dvh',
                maxWidth: 'none',
                maxHeight: 'none',
                margin: '0',
                padding: 'var(--space-xl)',
                ...inked,
                border: 'none',
                boxShadow: 'none',
            },
            states: { open: {}, closed: {} },
            selectors: { '&::backdrop': { background: 'oklch(0% 0 0 / 0.55)' } },
            at: {
                sm: {
                    base: {
                        width: 'calc(100% - var(--space-2xl))',
                        maxWidth: '34rem',
                        height: 'auto',
                        maxHeight: 'calc(100% - var(--space-2xl))',
                        margin: 'auto',
                        border: 'var(--border) solid var(--color-base-content)',
                        boxShadow: 'var(--shadow-xl)',
                    },
                },
            },
        }),
        title: {
            base: {
                margin: '0 0 var(--space-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--weight-bold)',
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 'var(--leading-none)',
                textTransform: 'uppercase',
            },
        },
        description: {
            base: { margin: '0 0 var(--space-lg)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-normal)' },
        },
        close: {
            base: {
                appearance: 'none',
                ...inked,
                ...label,
                fontSize: 'var(--text-xs)',
                padding: 'var(--space-sm) var(--space-lg)',
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
            },
            states: { hover: shift('1px'), disabled: {}, ...focusRing },
        },
    },
};

const slab: CssProps = { ...inked, boxShadow: 'var(--shadow-md)', padding: 'var(--space-md)' };

export const popover: RecipeInput = {
    component: 'popover',
    parts: {
        trigger: overlayTrigger,
        popup: withPresence(popupPresence('translate(4px, 4px)'), { base: { ...slab, maxWidth: '20rem' }, states: { open: {}, closed: {} } }),
        title: { base: { margin: '0 0 var(--space-sm)', ...label, fontSize: 'var(--text-sm)' } },
        close: {
            base: { appearance: 'none', border: 'none', background: 'transparent', ...label, fontSize: 'var(--text-xs)', cursor: 'pointer' },
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
        popup: withPresence(popupPresence('translate(3px, 3px)'), {
            base: {
                background: 'var(--color-neutral)',
                color: 'var(--color-neutral-content)',
                border: 'var(--border) solid var(--color-base-content)',
                padding: 'var(--space-2xs) var(--space-sm)',
                ...label,
                fontSize: 'var(--text-xs)',
            },
            states: { open: {}, closed: {} },
        }),
    },
};

export const menu: RecipeInput = {
    component: 'menu',
    parts: {
        trigger: overlayTrigger,
        popup: withPresence(popupPresence('translate(4px, 4px)'), { base: { ...slab, padding: 'var(--space-xs)', minWidth: '12rem' }, states: { open: {}, closed: {} } }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-xs) var(--space-sm)',
                ...label,
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
            },
            states: {
                highlighted: { background: 'var(--color-primary)', color: 'var(--color-primary-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
        },
        group: { base: { padding: 'var(--space-2xs) 0' } },
        'group-label': {
            base: { padding: 'var(--space-2xs) var(--space-sm)', ...label, fontSize: 'var(--text-xs)', opacity: '0.7' },
        },
        separator: {
            base: { height: 'var(--border)', margin: 'var(--space-2xs) 0', background: 'var(--color-base-content)' },
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
                gap: 'var(--space-sm)',
                minWidth: '12rem',
                padding: 'var(--space-sm) var(--space-md)',
                ...inked,
                ...label,
                fontSize: 'var(--text-xs)',
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
            },
            states: {
                open: { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                invalid: { borderColor: 'var(--color-error)' },
                ...focusRing,
            },
        },
        value: { base: { flex: '1', textAlign: 'start' } },
        indicator: { base: { transition: motion('transform') }, states: { open: { transform: 'rotate(180deg)' }, closed: {} } },
        popup: withPresence(popupPresence('translate(4px, 4px)'), { base: { ...slab, padding: 'var(--space-xs)', minWidth: '12rem' }, states: { open: {}, closed: {} } }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-xs) var(--space-sm)',
                ...label,
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
            },
            states: {
                highlighted: { background: 'var(--color-primary)', color: 'var(--color-primary-content)' },
                selected: { background: 'var(--color-accent)', color: 'var(--color-accent-content)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        },
        'item-indicator': { base: { fontWeight: 'var(--weight-bold)' } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' } },
    },
};

// ── Selection controls ────────────────────────────────────────────────────
export const switchRecipe: RecipeInput = {
    component: 'switch',
    tokens: {
        '--switch-width': 'calc(var(--size-selector) * 14)',
        '--switch-height': 'calc(var(--size-selector) * 7)',
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
                ...inked,
                boxShadow: 'var(--shadow-xs)',
                transition: motion('background'),
            },
            states: {
                checked: { background: 'var(--color-primary)' },
                unchecked: {},
                ...focusRing,
            },
        },
        thumb: {
            base: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: 'calc(var(--size-selector) * 7)',
                height: '100%',
                background: 'var(--color-base-content)',
                transition: motion('transform'),
            },
            states: {
                checked: { transform: 'translateX(calc(var(--switch-width) - 100%))' },
                unchecked: {},
            },
        },
        label: { base: { ...label, fontSize: 'var(--text-xs)' }, states: { checked: {}, unchecked: {} } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    skipStates: { root: ['focus-visible'] },
};

const tickBox: CssProps = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'calc(var(--size-selector) * 6)',
    height: 'calc(var(--size-selector) * 6)',
    ...inked,
    boxShadow: 'var(--shadow-xs)',
    transition: motion('background'),
};

export const checkbox: RecipeInput = {
    component: 'checkbox',
    parts: {
        root: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' },
            states: { checked: {}, unchecked: {}, indeterminate: {}, disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' } },
        },
        control: {
            base: tickBox,
            states: {
                checked: { background: 'var(--color-primary)' },
                unchecked: {},
                indeterminate: { background: 'var(--color-accent)' },
                ...focusRing,
            },
        },
        indicator: {
            base: { color: 'var(--color-primary-content)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-xs)' },
            states: { checked: {}, unchecked: {}, indeterminate: { color: 'var(--color-accent-content)' } },
        },
        label: { base: { ...label, fontSize: 'var(--text-xs)' }, states: { checked: {}, unchecked: {}, indeterminate: {} } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    skipStates: { root: ['focus-visible'] },
};

export const radioGroup: RecipeInput = {
    component: 'radio-group',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' } },
        label: { base: { ...label, fontSize: 'var(--text-sm)' } },
        item: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' },
            states: { disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' } },
        },
        // Square, like everything else. A brutalist radio is not a circle.
        'item-control': {
            base: tickBox,
            states: { checked: { background: 'var(--color-primary)' }, unchecked: {}, ...focusRing },
        },
        'item-indicator': {
            base: {
                width: 'calc(var(--size-selector) * 2.5)',
                height: 'calc(var(--size-selector) * 2.5)',
                background: 'var(--color-primary-content)',
                transform: 'scale(0)',
                transition: motion('transform'),
            },
            states: { checked: { transform: 'scale(1)' }, unchecked: {} },
        },
        'item-label': { base: { ...label, fontSize: 'var(--text-xs)' } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    skipStates: { item: ['focus-visible', 'checked', 'unchecked'], 'item-label': ['checked', 'unchecked'] },
};

// ── Field, slider, progress ───────────────────────────────────────────────
export const field: RecipeInput = {
    component: 'field',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' } },
        label: {
            base: { ...label, fontSize: 'var(--text-xs)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
            selectors: { '&[data-required]::after': { content: '" *"', color: 'var(--color-error)' } },
        },
        description: { base: { margin: '0', fontSize: 'var(--text-xs)', opacity: '0.75' } },
        error: { base: { margin: '0', ...label, fontSize: 'var(--text-xs)', color: 'var(--color-error)' } },
    },
    skipStates: { label: ['invalid', 'required'], error: ['invalid'] },
};

export const slider: RecipeInput = {
    component: 'slider',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        label: { base: { ...label, fontSize: 'var(--text-xs)' } },
        input: { base: { width: '100%', accentColor: 'var(--color-primary)' }, states: { ...focusRing } },
        'value-text': { base: { ...label, fontSize: 'var(--text-xs)' } },
    },
    skipStates: { root: ['invalid', 'focus-visible'] },
};

export const progress: RecipeInput = {
    component: 'progress',
    keyframes: {
        'brutalist-indeterminate': 'from { transform: translateX(-100%); } to { transform: translateX(250%); }',
    },
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' } },
        label: { base: { ...label, fontSize: 'var(--text-xs)' } },
        track: {
            base: {
                position: 'relative',
                height: 'calc(var(--size-field) * 5)',
                ...inked,
                boxShadow: 'var(--shadow-xs)',
                overflow: 'hidden',
            },
        },
        range: {
            base: { height: '100%', background: 'var(--color-primary)', transition: motion('width') },
            states: {
                complete: { background: 'var(--color-success)' },
                loading: {},
                // Literal duration on purpose: a loop must stop under reduced
                // motion, not accelerate — see `at` below.
                indeterminate: { width: '40%', animation: 'brutalist-indeterminate 1s var(--ease-standard) infinite' },
            },
            at: { 'reduced-motion': { states: { indeterminate: { animation: 'none', width: '100%' } } } },
        },
        'value-text': { base: { ...label, fontSize: 'var(--text-xs)' } },
    },
    skipStates: { root: ['loading', 'complete', 'indeterminate'] },
};

export const avatar: RecipeInput = {
    component: 'avatar',
    parts: {
        root: {
            base: {
                ...inked,
                position: 'relative',
                display: 'inline-grid',
                width: 'calc(var(--size-selector) * 10)',
                height: 'calc(var(--size-selector) * 10)',
                overflow: 'hidden',
                verticalAlign: 'middle',
                boxShadow: 'var(--shadow-sm)',
            },
            states: { loading: {}, loaded: {}, error: {} },
        },
        image: {
            base: {
                gridArea: '1 / 1',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'grayscale(100%) contrast(1.1)',
            },
            states: { loading: {}, loaded: {}, error: {} },
        },
        fallback: {
            base: {
                ...label,
                gridArea: '1 / 1',
                placeItems: 'center',
                width: '100%',
                height: '100%',
                background: 'var(--color-base-200)',
                color: 'var(--color-base-content)',
                fontSize: 'var(--text-sm)',
                userSelect: 'none',
            },
            // `display` must not defeat the `hidden` zero sets once the image
            // has loaded.
            selectors: { '&:not([hidden])': { display: 'grid' } },
            states: { loading: {}, loaded: {}, error: {} },
        },
    },
};

export const recipes: RecipeInput[] = [
    button, tabs, collapsible, accordion, dialog, popover, tooltip, menu, select,
    switchRecipe, checkbox, radioGroup, field, slider, progress, avatar,
];
