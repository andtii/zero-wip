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
    // Accent defaults live in `tokens:` so the un-attributed render IS the
    // primary variant and `variants.color` only rebinds custom properties —
    // the toast shape.
    tokens: {
        '--tabs-accent': 'var(--color-primary)',
        '--tabs-on-accent': 'var(--color-primary-content)',
    },
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
                    background: 'var(--tabs-accent)',
                    color: 'var(--tabs-on-accent)',
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
    variants: {
        size: {
            xs: { tab: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-sm)' } } },
            sm: { tab: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-xs) var(--space-md)' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { tab: { base: { fontSize: 'var(--text-sm)', padding: 'var(--space-md) var(--space-xl)' } } },
            xl: { tab: { base: { fontSize: 'var(--text-md)', padding: 'var(--space-lg) var(--space-2xl)' } } },
        },
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--tabs-accent': `var(--color-${c})`,
            '--tabs-on-accent': `var(--color-${c}-content)`,
        } } }])),
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
            at: {
                sm: {
                    base: {
                        width: 'calc(100% - var(--space-2xl))',
                        maxWidth: '34rem',
                        // `auto` stretches an inset-positioned modal to fill; `fit-content`
                        // is the UA's own dialog default and hugs the content (#114).
                        height: 'fit-content',
                        maxHeight: 'calc(100% - var(--space-2xl))',
                        margin: 'auto',
                        border: 'var(--border) solid var(--color-base-content)',
                        boxShadow: 'var(--shadow-xl)',
                    },
                },
            },
        }),
        backdrop: {
            base: { background: 'oklch(0% 0 0 / 0.55)' },
            states: { open: {}, closed: {} },
        },
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
        // The item look plus a hard chevron; `open` inverts like highlight.
        'sub-trigger': {
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
                // `open` before `highlighted` — the pointer state must win both
                // background and color when the submenu is open (#116).
                open: { background: 'var(--color-base-200)' },
                closed: {},
                highlighted: { background: 'var(--color-primary)', color: 'var(--color-primary-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
            selectors: {
                '&::after': { content: '"\\203A"', marginLeft: 'auto' },
            },
        },
        'sub-popup': withPresence(popupPresence('translate(4px, 4px)'), {
            base: { ...slab, padding: 'var(--space-xs)', minWidth: '12rem' },
            states: { open: {}, closed: {} },
        }),
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
    // Accent defaults live in `tokens:` so the un-attributed render IS the
    // primary variant and `variants.color` only rebinds custom properties —
    // the toast shape.
    tokens: {
        '--select-accent': 'var(--color-primary)',
        '--select-on-accent': 'var(--color-primary-content)',
    },
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
                highlighted: { background: 'var(--select-accent)', color: 'var(--select-on-accent)' },
                // Deliberate two-accent design: selected stays the fixed `accent`
                // role — semantic contrast against highlighted, not the component
                // accent, so it does not follow `color`.
                selected: { background: 'var(--color-accent)', color: 'var(--color-accent-content)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        },
        'item-indicator': { base: { fontWeight: 'var(--weight-bold)' } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' } },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--select-accent': `var(--color-${c})`,
            '--select-on-accent': `var(--color-${c}-content)`,
        } } }])),
        // The button ramp's shape, anchored so md IS the resting look:
        // vertical and horizontal padding one space step apart.
        size: {
            xs: { trigger: { base: { padding: 'var(--space-2xs) var(--space-xs)', fontSize: 'var(--text-xs)' } } },
            sm: { trigger: { base: { padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--text-xs)' } } },
            md: { trigger: { base: { padding: 'var(--space-sm) var(--space-md)', fontSize: 'var(--text-xs)' } } },
            lg: { trigger: { base: { padding: 'var(--space-md) var(--space-lg)', fontSize: 'var(--text-sm)' } } },
            xl: { trigger: { base: { padding: 'var(--space-lg) var(--space-xl)', fontSize: 'var(--text-md)' } } },
        },
    },
};

// ── Selection controls ────────────────────────────────────────────────────
export const switchRecipe: RecipeInput = {
    component: 'switch',
    // The accent default lives in `tokens:` so the un-attributed render IS the
    // primary variant and `variants.color` only rebinds a custom property —
    // the toast shape.
    tokens: {
        '--switch-width': 'calc(var(--size-selector) * 14)',
        '--switch-height': 'calc(var(--size-selector) * 7)',
        '--switch-accent': 'var(--color-primary)',
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
                checked: { background: 'var(--switch-accent)' },
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
    variants: {
        size: {
            xs: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 10)', '--switch-height': 'calc(var(--size-selector) * 5)' } } },
            sm: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 12)', '--switch-height': 'calc(var(--size-selector) * 6)' } } },
            // `md` is the un-attributed render — the defaults in `tokens:`
            // already ARE the middle step.
            md: {},
            lg: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 16)', '--switch-height': 'calc(var(--size-selector) * 8)' } } },
            xl: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 18)', '--switch-height': 'calc(var(--size-selector) * 9)' } } },
        },
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--switch-accent': `var(--color-${c})`,
        } } }])),
    },
    skipStates: { root: ['focus-visible'] },
};

/**
 * The shared square control chrome, parameterized on the owning component's
 * size token so `variants.size` can rebind each independently.
 */
const tickBox = (size: string): CssProps => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    ...inked,
    boxShadow: 'var(--shadow-xs)',
    transition: motion('background'),
});

export const checkbox: RecipeInput = {
    component: 'checkbox',
    // Accent defaults live in `tokens:` so the un-attributed render IS the
    // primary variant and `variants.color` only rebinds custom properties —
    // the toast shape.
    tokens: {
        '--checkbox-size': 'calc(var(--size-selector) * 6)',
        '--checkbox-accent': 'var(--color-primary)',
        '--checkbox-on-accent': 'var(--color-primary-content)',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' },
            states: { checked: {}, unchecked: {}, indeterminate: {}, disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' } },
        },
        control: {
            base: tickBox('var(--checkbox-size)'),
            states: {
                checked: { background: 'var(--checkbox-accent)' },
                unchecked: {},
                // Deliberate two-accent design: indeterminate stays the fixed
                // `accent` role — semantic contrast against checked, not the
                // component accent, so it does not follow `color`.
                indeterminate: { background: 'var(--color-accent)' },
                ...focusRing,
            },
        },
        indicator: {
            base: { color: 'var(--checkbox-on-accent)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-xs)' },
            // Deliberate two-accent design: the indeterminate glyph stays the
            // fixed `accent-content`, pairing the fixed `accent` fill above.
            states: { checked: {}, unchecked: {}, indeterminate: { color: 'var(--color-accent-content)' } },
        },
        label: { base: { ...label, fontSize: 'var(--text-xs)' }, states: { checked: {}, unchecked: {}, indeterminate: {} } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--checkbox-accent': `var(--color-${c})`,
            '--checkbox-on-accent': `var(--color-${c}-content)`,
        } } }])),
        size: {
            xs: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 4)' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 5)' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            md: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 6)' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            lg: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 7)' } }, label: { base: { fontSize: 'var(--text-sm)' } } },
            xl: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 8)' } }, label: { base: { fontSize: 'var(--text-md)' } } },
        },
    },
    skipStates: { root: ['focus-visible'] },
};

export const radioGroup: RecipeInput = {
    component: 'radio-group',
    // Accent defaults live in `tokens:` so the un-attributed render IS the
    // primary variant and `variants.color` only rebinds custom properties —
    // the toast shape.
    tokens: {
        '--radio-size': 'calc(var(--size-selector) * 6)',
        '--radio-accent': 'var(--color-primary)',
        '--radio-on-accent': 'var(--color-primary-content)',
    },
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' } },
        label: { base: { ...label, fontSize: 'var(--text-sm)' } },
        item: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' },
            states: { disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' } },
        },
        // Square, like everything else. A brutalist radio is not a circle.
        'item-control': {
            base: tickBox('var(--radio-size)'),
            states: { checked: { background: 'var(--radio-accent)' }, unchecked: {}, ...focusRing },
        },
        'item-indicator': {
            base: {
                // /2.4 keeps the resting dot at the original selector * 2.5
                // while letting it follow the box through the size ramp.
                width: 'calc(var(--radio-size) / 2.4)',
                height: 'calc(var(--radio-size) / 2.4)',
                background: 'var(--radio-on-accent)',
                transform: 'scale(0)',
                transition: motion('transform'),
            },
            states: { checked: { transform: 'scale(1)' }, unchecked: {} },
        },
        'item-label': { base: { ...label, fontSize: 'var(--text-xs)' } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--radio-accent': `var(--color-${c})`,
            '--radio-on-accent': `var(--color-${c}-content)`,
        } } }])),
        size: {
            xs: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 4)' } }, 'item-label': { base: { fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 5)' } }, 'item-label': { base: { fontSize: 'var(--text-xs)' } } },
            md: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 6)' } }, 'item-label': { base: { fontSize: 'var(--text-xs)' } } },
            lg: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 7)' } }, 'item-label': { base: { fontSize: 'var(--text-sm)' } } },
            xl: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 8)' } }, 'item-label': { base: { fontSize: 'var(--text-md)' } } },
        },
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
    // The accent default lives in `tokens:` so the un-attributed render IS the
    // primary variant and `variants.color` only rebinds a custom property —
    // the toast shape.
    tokens: { '--slider-accent': 'var(--color-primary)' },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        label: { base: { ...label, fontSize: 'var(--text-xs)' } },
        control: { base: { width: '100%', accentColor: 'var(--slider-accent)' }, states: { ...focusRing } },
        'value-text': { base: { ...label, fontSize: 'var(--text-xs)' } },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--slider-accent': `var(--color-${c})`,
        } } }])),
        // A native range widget: only its box height is size-able without an
        // appearance:none rebuild, so the ramp moves the box and the text.
        size: {
            xs: { control: { base: { height: 'calc(var(--size-selector) * 3)' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            sm: { control: { base: { height: 'calc(var(--size-selector) * 4)' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            md: { label: { base: { fontSize: 'var(--text-xs)' } } },
            lg: { control: { base: { height: 'calc(var(--size-selector) * 7)' } }, label: { base: { fontSize: 'var(--text-sm)' } } },
            xl: { control: { base: { height: 'calc(var(--size-selector) * 8)' } }, label: { base: { fontSize: 'var(--text-md)' } } },
        },
    },
    skipStates: { root: ['invalid', 'focus-visible'] },
};

export const progress: RecipeInput = {
    component: 'progress',
    // Accent defaults live in `tokens:` so the un-attributed render IS the
    // primary variant and `variants.color` only rebinds custom properties —
    // the toast shape.
    tokens: {
        '--progress-accent': 'var(--color-primary)',
        '--progress-track-size': 'calc(var(--size-field) * 5)',
    },
    keyframes: {
        'brutalist-indeterminate': 'from { transform: translateX(-100%); } to { transform: translateX(250%); }',
    },
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' } },
        label: { base: { ...label, fontSize: 'var(--text-xs)' } },
        track: {
            base: {
                position: 'relative',
                height: 'var(--progress-track-size)',
                ...inked,
                boxShadow: 'var(--shadow-xs)',
                overflow: 'hidden',
            },
        },
        range: {
            base: { height: '100%', background: 'var(--progress-accent)', transition: motion('width') },
            states: {
                // `complete` is a semantic state, not an accent: it stays
                // success regardless of the colour variant, on purpose.
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
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--progress-accent': `var(--color-${c})`,
        } } }])),
        size: {
            xs: { root: { base: { '--progress-track-size': 'calc(var(--size-field) * 2)' } } },
            sm: { root: { base: { '--progress-track-size': 'calc(var(--size-field) * 3)' } } },
            md: { root: { base: { '--progress-track-size': 'calc(var(--size-field) * 5)' } } },
            lg: { root: { base: { '--progress-track-size': 'calc(var(--size-field) * 7)' } } },
            xl: { root: { base: { '--progress-track-size': 'calc(var(--size-field) * 9)' } } },
        },
    },
    skipStates: { root: ['loading', 'complete', 'indeterminate'] },
};

export const avatar: RecipeInput = {
    component: 'avatar',
    tokens: {
        '--avatar-size': 'calc(var(--size-selector) * 10)',
        '--avatar-text': 'var(--text-sm)',
        '--avatar-accent': 'var(--color-base-200)',
        '--avatar-on-accent': 'var(--color-base-content)',
    },
    parts: {
        root: {
            base: {
                ...inked,
                position: 'relative',
                display: 'inline-grid',
                width: 'var(--avatar-size)',
                height: 'var(--avatar-size)',
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
                background: 'var(--avatar-accent)',
                color: 'var(--avatar-on-accent)',
                fontSize: 'var(--avatar-text)',
                userSelect: 'none',
            },
            // `display` must not defeat the `hidden` zero sets once the image
            // has loaded.
            selectors: { '&:not([hidden])': { display: 'grid' } },
            states: { loading: {}, loaded: {}, error: {} },
        },
    },
    variants: {
        // A flat fill in the role itself — brutalism has no tints, so the
        // fallback takes the full colour and its own content ink.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--avatar-accent': `var(--color-${c})`,
            '--avatar-on-accent': `var(--color-${c}-content)`,
        } } }])),
        size: {
            xs: { root: { base: { '--avatar-size': 'calc(var(--size-selector) * 6)', '--avatar-text': 'var(--text-xs)' } } },
            sm: { root: { base: { '--avatar-size': 'calc(var(--size-selector) * 8)', '--avatar-text': 'var(--text-xs)' } } },
            // `md` is the un-attributed render — the defaults in `tokens:`
            // already ARE the middle step.
            md: {},
            lg: { root: { base: { '--avatar-size': 'calc(var(--size-selector) * 12)', '--avatar-text': 'var(--text-md)' } } },
            xl: { root: { base: { '--avatar-size': 'calc(var(--size-selector) * 16)', '--avatar-text': 'var(--text-lg)' } } },
        },
    },
};

/**
 * Toast presence is runtime-managed — plain two-state transitions, no
 * `@starting-style`/`allow-discrete`. Brutalism doesn't glide anyway: the
 * card snaps in with the steps easing and drops into its shadow on exit.
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
                ...inked,
                pointerEvents: 'auto',
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                columnGap: 'var(--space-md)',
                padding: 'var(--space-md) var(--space-lg)',
                borderLeft: 'calc(var(--border) * 2) solid var(--toast-accent)',
                boxShadow: 'var(--shadow-md)',
                fontSize: 'var(--text-sm)',
                opacity: '0',
                transform: 'translateY(var(--toast-from))',
                transition: 'opacity var(--duration-fast) var(--ease-standard), '
                    + 'transform var(--duration-fast) var(--ease-standard)',
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
            base: { gridColumn: '1', ...label, fontSize: 'var(--text-sm)' },
        },
        description: {
            base: {
                gridColumn: '1',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'color-mix(in oklab, var(--color-base-content) 75%, transparent)',
            },
        },
        action: {
            base: {
                gridColumn: '2',
                gridRow: '1',
                appearance: 'none',
                ...inked,
                ...label,
                fontSize: 'var(--text-xs)',
                padding: 'var(--space-2xs) var(--space-sm)',
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
            },
            states: {
                hover: shift('1px'),
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { boxShadow: 'none', transform: 'translate(3px, 3px)' },
            },
        },
        close: {
            base: {
                gridColumn: '3',
                gridRow: '1',
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                ...label,
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
            },
            states: {
                hover: { color: 'var(--toast-accent)' },
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
    // Accent defaults live in `tokens:` so the un-attributed render IS the
    // primary variant and `variants.color` only rebinds custom properties —
    // the toast shape.
    tokens: {
        '--combobox-accent': 'var(--color-primary)',
        '--combobox-on-accent': 'var(--color-primary-content)',
    },
    parts: {
        root: { base: { display: 'inline-flex', position: 'relative' } },
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                minWidth: '12rem',
                ...inked,
                boxShadow: 'var(--shadow-xs)',
            },
            states: {
                open: { boxShadow: 'none', transform: 'translate(2px, 2px)' },
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
                ...label,
                fontSize: 'var(--text-xs)',
                padding: 'var(--space-sm) var(--space-md)',
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
                '&::placeholder': { color: 'color-mix(in oklab, var(--color-base-content) 55%, transparent)', textTransform: 'uppercase' },
            },
        },
        trigger: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                padding: '0 var(--space-md)',
                cursor: 'pointer',
                transition: motion('transform'),
            },
            states: {
                open: { transform: 'rotate(180deg)' },
                closed: {},
                disabled: { cursor: 'not-allowed' },
            },
        },
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
                highlighted: { background: 'var(--combobox-accent)', color: 'var(--combobox-on-accent)' },
                // Deliberate two-accent design: selected stays the fixed `accent`
                // role — semantic contrast against highlighted, not the component
                // accent, so it does not follow `color`.
                selected: { background: 'var(--color-accent)', color: 'var(--color-accent-content)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
            },
        },
        'item-indicator': { base: { fontSize: 'var(--text-xs)' } },
        empty: {
            base: {
                padding: 'var(--space-md)',
                ...label,
                fontSize: 'var(--text-xs)',
                textAlign: 'center',
                opacity: '0.7',
            },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--combobox-accent': `var(--color-${c})`,
            '--combobox-on-accent': `var(--color-${c}-content)`,
        } } }])),
        // The button ramp's shape, anchored so md IS the resting look:
        // vertical and horizontal padding one space step apart.
        size: {
            xs: { input: { base: { padding: 'var(--space-2xs) var(--space-xs)', fontSize: 'var(--text-xs)' } } },
            sm: { input: { base: { padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--text-xs)' } } },
            md: { input: { base: { padding: 'var(--space-sm) var(--space-md)', fontSize: 'var(--text-xs)' } } },
            lg: { input: { base: { padding: 'var(--space-md) var(--space-lg)', fontSize: 'var(--text-sm)' } } },
            xl: { input: { base: { padding: 'var(--space-lg) var(--space-xl)', fontSize: 'var(--text-md)' } } },
        },
    },
    // The visible ring lives on `control`; input and trigger delegate.
    skipStates: {
        input: ['focus-visible'],
        trigger: ['focus-visible'],
    },
};

// ── Toggle ────────────────────────────────────────────────────────────────
/**
 * A two-state slab. Off is the outlined button look; on is inverted and
 * collapsed into its own shadow — a plate stamped down and left there. The
 * accent machinery mirrors button: `color` sets the pair once, `on` reads it.
 */
export const toggle: RecipeInput = {
    component: 'toggle',
    tokens: {
        '--toggle-accent': 'var(--color-primary)',
        '--toggle-on-accent': 'var(--color-primary-content)',
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
                transition: motion('box-shadow, transform, background, color'),
            },
            states: {
                disabled: {
                    opacity: 'var(--disabled-opacity)',
                    cursor: 'not-allowed',
                    boxShadow: 'none',
                    transform: 'none',
                },
                hover: shift('1px'),
                // On = stamped down: inverted fill, shadow gone, sitting where
                // the shadow was.
                on: {
                    background: 'var(--toggle-accent)',
                    color: 'var(--toggle-on-accent)',
                    boxShadow: 'none',
                    transform: 'translate(2px, 2px)',
                },
                off: {},
                ...focusRing,
            },
            selectors: {
                // Hovering an on toggle must not lift it back out of its
                // shadow — restate the stamped look at higher specificity.
                '&[data-state="on"]:hover': {
                    background: 'var(--toggle-accent)',
                    boxShadow: 'none',
                    transform: 'translate(2px, 2px)',
                },
                // The button stamp: full shove while the press is held.
                '&[data-pressed]:not([data-disabled])': { boxShadow: 'none', transform: 'translate(3px, 3px)' },
            },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [
            c,
            {
                root: {
                    base: {
                        '--toggle-accent': `var(--color-${c})`,
                        '--toggle-on-accent': `var(--color-${c}-content)`,
                    },
                },
            },
        ])),
        size: {
            xs: { root: { base: { padding: 'var(--space-2xs) var(--space-sm)', fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-xs)' } } },
            md: { root: { base: { padding: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--text-sm)' } } },
            lg: { root: { base: { padding: 'var(--space-md) var(--space-xl)', fontSize: 'var(--text-md)' } } },
            xl: { root: { base: { padding: 'var(--space-lg) var(--space-2xl)', fontSize: 'var(--text-lg)' } } },
        },
    },
    defaultVariants: { color: 'primary', size: 'md' },
};

// ── Toggle group ──────────────────────────────────────────────────────────
/**
 * One framed slab, items joined by hard interior rules; the on item inverts.
 * The frame clips (`overflow: hidden`), so the press stamp stays inside it
 * and the focus ring is inset rather than offset out into the clip.
 */
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
                ...inked,
                boxShadow: 'var(--shadow-sm)',
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
                gap: 'var(--space-sm)',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                padding: 'var(--space-sm) var(--space-lg)',
                ...label,
                fontSize: 'var(--text-xs)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: motion('background, color, transform'),
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
                on: {
                    background: 'var(--toggle-group-accent)',
                    color: 'var(--toggle-group-on-accent)',
                },
                off: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                // The frame clips its children, so an offset ring would be
                // swallowed — inset it. currentColor keeps it visible on both
                // the base and the inverted on fill.
                'focus-visible': {
                    outline: 'var(--border) solid currentColor',
                    outlineOffset: 'calc(-2 * var(--border))',
                },
            },
            selectors: {
                // Equal footing with hover is not enough — the on fill must
                // win the hover wash outright.
                '&[data-state="on"]:hover': { background: 'var(--toggle-group-accent)' },
                '&[data-orientation="horizontal"] + &': {
                    borderInlineStart: 'var(--border) solid var(--color-base-content)',
                },
                '&[data-orientation="vertical"] + &': {
                    borderBlockStart: 'var(--border) solid var(--color-base-content)',
                },
                // A shallower stamp than the free-standing button: the item
                // has no shadow to collapse into, and the frame clips it.
                '&[data-pressed]:not([data-disabled])': { transform: 'translate(1px, 1px)' },
            },
        },
    },
    variants: {
        // The group is a frame around its items, so the ramp lands on the
        // items and the frame follows their box.
        size: {
            xs: { item: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-sm)' } } },
            sm: { item: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-xs) var(--space-md)' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { item: { base: { fontSize: 'var(--text-sm)', padding: 'var(--space-md) var(--space-xl)' } } },
            xl: { item: { base: { fontSize: 'var(--text-md)', padding: 'var(--space-lg) var(--space-2xl)' } } },
        },
        color: Object.fromEntries(ROLES.map((c) => [
            c,
            {
                item: {
                    base: {
                        '--toggle-group-accent': `var(--color-${c})`,
                        '--toggle-group-on-accent': `var(--color-${c}-content)`,
                    },
                },
            },
        ])),
    },
    defaultVariants: { color: 'primary' },
};

// ── Number input ──────────────────────────────────────────────────────────
/**
 * A framed counting slab: the `control` is one inked box holding the two
 * stepper plates and the readout between them. The ring and the invalid
 * frame draw on the box (the combobox split — input delegates focus), and
 * a stepper press is the stamp, kept shallow because the frame clips it.
 */
export const numberInput: RecipeInput = {
    component: 'number-input',
    tokens: { '--number-input-accent': 'var(--color-primary)' },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-xs)' },
            states: { disabled: {}, invalid: {}, required: {}, readonly: {} },
        },
        label: {
            base: { ...label, fontSize: 'var(--text-xs)' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                invalid: { color: 'var(--color-error)' },
                required: {},
            },
            selectors: { '&[data-required]::after': { content: '" *"', color: 'var(--color-error)' } },
        },
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'stretch',
                ...inked,
                boxShadow: 'var(--shadow-xs)',
                // The frame clips its children, so the stepper stamp stays
                // inside the slab instead of poking through the border.
                overflow: 'hidden',
            },
            states: {
                invalid: { borderColor: 'var(--color-error)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                readonly: {},
                'focus-visible': {
                    outline: 'var(--border) solid var(--number-input-accent)',
                    outlineOffset: '3px',
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
                ...label,
                fontSize: 'var(--text-xs)',
                textAlign: 'center',
                padding: 'var(--space-sm) var(--space-xs)',
            },
            states: {
                disabled: { cursor: 'not-allowed' },
                readonly: {},
                invalid: {},
                required: {},
            },
            selectors: {
                '&::placeholder': { color: 'color-mix(in oklab, var(--color-base-content) 55%, transparent)', textTransform: 'uppercase' },
            },
        },
        // The stepper plates: hard interior rules against the readout, a
        // hover wash, and the press stamp — shallow, since the frame clips.
        'decrement-trigger': {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                ...label,
                fontSize: 'var(--text-xs)',
                padding: '0 var(--space-md)',
                cursor: 'pointer',
                userSelect: 'none',
                borderInlineEnd: 'var(--border) solid var(--color-base-content)',
                transition: motion('background, transform'),
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-200)', transform: 'translate(1px, 1px)' },
            },
        },
        'increment-trigger': {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                ...label,
                fontSize: 'var(--text-xs)',
                padding: '0 var(--space-md)',
                cursor: 'pointer',
                userSelect: 'none',
                borderInlineStart: 'var(--border) solid var(--color-base-content)',
                transition: motion('background, transform'),
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-200)', transform: 'translate(1px, 1px)' },
            },
        },
    },
    // The visible ring lives on `control`; the input delegates.
    skipStates: { input: ['focus-visible'] },
    variants: {
        // The field's own ring carries the role — the chrome is neutral, so
        // the focus state is the only place a number input can show colour.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--number-input-accent': `var(--color-${c})`,
        } } }])),
        // The readout carries the ramp; the steppers follow it so the frame
        // stays proportional.
        size: {
            xs: { input: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-2xs)' } } },
            sm: { input: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-xs) var(--space-2xs)' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { input: { base: { fontSize: 'var(--text-sm)', padding: 'var(--space-md) var(--space-sm)' } } },
            xl: { input: { base: { fontSize: 'var(--text-md)', padding: 'var(--space-lg) var(--space-md)' } } },
        },
    },
};

export const ratingGroup: RecipeInput = {
    component: 'rating-group',
    tokens: {
        '--rating-size': 'var(--text-xl)',
        '--rating-fill': 'var(--color-base-content)',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-xs)' },
            states: { disabled: {}, invalid: {}, required: {}, readonly: {} },
        },
        label: {
            base: { ...label, fontSize: 'var(--text-xs)' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                invalid: { color: 'var(--color-error)' },
                required: {},
            },
            selectors: { '&[data-required]::after': { content: '" *"', color: 'var(--color-error)' } },
        },
        control: {
            base: { display: 'inline-flex', gap: 'var(--space-2xs)' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                readonly: {},
                ...focusRing,
            },
        },
        item: {
            base: {
                fontSize: 'var(--rating-size)',
                lineHeight: '1',
                fontWeight: 'var(--weight-bold)',
                cursor: 'pointer',
                userSelect: 'none',
                // Empty is the ink at outline strength — same hue, faded hard,
                // so full vs empty reads as stamped vs ghosted.
                color: 'color-mix(in oklab, var(--color-base-content) 30%, transparent)',
                transition: motion('color, background'),
            },
            states: {
                full: { color: 'var(--rating-fill)' },
                half: { color: 'var(--rating-fill)' },
                empty: {},
                // Hover preview: a hard wash behind the glyph. Brutalism does
                // not swell — no scaling.
                highlighted: { background: 'var(--color-base-200)' },
                disabled: { cursor: 'not-allowed' },
                readonly: { cursor: 'default' },
                // The group ring lives on control; the value-following tab
                // stop still gets its own tight frame.
                'focus-visible': { outline: 'var(--border) solid var(--color-primary)', outlineOffset: '1px' },
            },
        },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    variants: {
        // A rating glyph is text on the page background, so the raw role is
        // not always safe: daisy measured `--color-warning` at 1.62:1 on light
        // base-100. Deepening every role toward its own content pair keeps the
        // hue and clears 3:1 in both schemes — the same 70/30 mix daisy's
        // default already uses.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--rating-fill': `color-mix(in oklab, var(--color-${c}) 70%, var(--color-${c}-content))`,
        } } }])),
        size: {
            xs: { root: { base: { '--rating-size': 'var(--text-sm)' } } },
            sm: { root: { base: { '--rating-size': 'var(--text-md)' } } },
            // `md` is the un-attributed render — the defaults in `tokens:`
            // already ARE the middle step.
            md: {},
            lg: { root: { base: { '--rating-size': 'var(--text-2xl)' } } },
            xl: { root: { base: { '--rating-size': 'var(--text-3xl)' } } },
        },
    },
};

// ── Tree view ─────────────────────────────────────────────────────────────
/**
 * The menu row grammar walking a hierarchy: an inked frame around the tree,
 * hard-washed rows inside it, and the selected row stamped in full ink —
 * the page inverts under it. Depth is the DOM nesting: `branch-content`
 * indents once behind a hard left rule, so every level draws its own rule.
 */
const treeRow: PartStyles = {
    base: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-xs) var(--space-sm)',
        ...label,
        fontSize: 'var(--tree-text)',
        cursor: 'pointer',
        transition: motion('background, color, transform'),
    },
    states: {
        hover: { background: 'var(--color-base-200)' },
        // Selected = stamped: full ink slab, page colour for the glyphs.
        selected: { background: 'var(--tree-accent)', color: 'var(--tree-on-accent)' },
        disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
        ...focusRing,
    },
    selectors: {
        // The hover wash must not fade a selected row back toward the page.
        '&[data-selected]:hover': { background: 'var(--color-base-content)' },
        // A shallow stamp — rows carry no shadow to collapse into.
        '&[data-pressed]:not([data-disabled])': { transform: 'translate(1px, 1px)' },
    },
};

export const treeView: RecipeInput = {
    component: 'tree-view',
    tokens: {
        '--tree-accent': 'var(--color-base-content)',
        '--tree-text': 'var(--text-xs)',
        '--tree-on-accent': 'var(--color-base-100)',
    },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        label: { base: { ...label, fontSize: 'var(--text-sm)' } },
        tree: {
            base: {
                display: 'flex',
                flexDirection: 'column',
                ...inked,
                boxShadow: 'var(--shadow-sm)',
                padding: 'var(--space-xs)',
            },
        },
        item: treeRow,
        branch: {
            base: { display: 'flex', flexDirection: 'column', outline: 'none' },
            states: { open: {}, closed: {}, selected: {}, disabled: {} },
        },
        'branch-trigger': {
            base: { ...treeRow.base, userSelect: 'none' },
            states: { open: {}, closed: {}, ...treeRow.states },
            selectors: treeRow.selectors,
        },
        // A hard quarter-turn, on the same tokenized motion as everything
        // else — the durations collapse under reduced motion.
        'branch-indicator': {
            base: { display: 'inline-block', transition: motion('transform') },
            states: { open: { transform: 'rotate(90deg)' }, closed: {} },
        },
        'branch-content': {
            base: {
                display: 'flex',
                flexDirection: 'column',
                marginInlineStart: 'var(--space-sm)',
                paddingInlineStart: 'var(--space-sm)',
                borderInlineStart: 'var(--border) solid var(--color-base-content)',
            },
            states: { open: {}, closed: {} },
        },
    },
    variants: {
        // A tree colours one thing: the selected row. Everything else is
        // structure, and tinting it would fight the content.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--tree-accent': `var(--color-${c})`,
            '--tree-on-accent': `var(--color-${c}-content)`,
        } } }])),
        size: {
            xs: { root: { base: { '--tree-text': 'var(--text-xs)' } } },
            sm: { root: { base: { '--tree-text': 'var(--text-xs)' } } },
            // `md` is the un-attributed render: `--tree-text`'s default in
            // `tokens:` already IS the middle step.
            md: {},
            lg: { root: { base: { '--tree-text': 'var(--text-md)' } } },
            xl: { root: { base: { '--tree-text': 'var(--text-lg)' } } },
        },
    },
};

export const recipes: RecipeInput[] = [
    button, tabs, collapsible, accordion, dialog, popover, tooltip, menu, select,
    switchRecipe, checkbox, radioGroup, field, slider, progress, avatar, toast, combobox,
    toggle, toggleGroup, numberInput, ratingGroup, treeView,
];
