/**
 * zero-material recipes — Material's look over zero's anatomy.
 *
 * Written to exercise the recipe layer rather than to be exhaustive: the
 * tonal surface roles, the `level1`–`level5` elevation ramp, Material's
 * emphasized easings, and a dialog that goes full-screen below `sm`.
 */
import type { CssProps, PartStyles, RecipeInput, RoleDecl } from '@sigx/zero-kit';
import { roles } from './tokens.js';

/**
 * Every role a consumer can pass as `color`, DERIVED from the declaration.
 *
 * It used to be retyped here, with a comment warning that the two had to be
 * kept in step: a role declared in `tokens.ts` but missing from this list
 * renders primary, because nothing sets `--btn-accent`, which reads as the
 * variant being broken rather than as one role being unwired.
 *
 * The declaration already says which roles are action colours. Material's
 * `surface*` tones opt out of `-soft` and `outline` opts out of `-content`,
 * because they are fills and hairlines — not something a button can be. So
 * the exclusion the hand-written list encoded by hand is exactly this filter.
 */
const ROLES = Object.entries(roles as Record<string, RoleDecl>)
    .filter(([, decl]) => decl.content !== false && decl.soft !== false)
    .map(([name]) => name);

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

// ── Press feedback ────────────────────────────────────────────────────────
// The runtime publishes the press (`data-pressed`, `data-press-animating`,
// `--press-x/y/r`); these fragments are the Material read of it — a held
// state layer plus the ink ripple. Compose onto a part with `withPresence`.

/**
 * Bounded press feedback: state layer + ink ripple clipped to the part.
 * `prefix` must be unique per RECIPE — keyframes are declared per recipe but
 * named globally, and each compiled component file must carry its own copy.
 */
const pressable = (prefix: string, ink = 'var(--color-primary)'): PartStyles => ({
    base: {
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
    },
    selectors: {
        '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0',
            background: ink,
            opacity: '0',
            pointerEvents: 'none',
            transition: 'opacity var(--duration-fast) var(--ease-standard)',
        },
        // MD3 state layers: hover 8%, pressed 12%. Pressed carries the
        // redundant :not so its specificity EQUALS hover's and it wins by
        // source order while both apply.
        '&:hover:not([data-disabled])::before': { opacity: '0.08' },
        '&[data-pressed]:not([data-disabled])::before': { opacity: '0.12' },
        '&::after': {
            content: '""',
            position: 'absolute',
            left: 'var(--press-x, 50%)',
            top: 'var(--press-y, 50%)',
            width: 'calc(var(--press-r, 0px) * 2)',
            height: 'calc(var(--press-r, 0px) * 2)',
            borderRadius: '50%',
            background: ink,
            transform: 'translate(-50%, -50%) scale(0)',
            opacity: '0',
            pointerEvents: 'none',
        },
        '&[data-press-animating]::after': {
            animation: `${prefix}-ripple var(--duration-slow) var(--ease-standard)`,
        },
    },
    at: {
        // A tap on a touch screen must not leave a sticky hover layer.
        'hover-none': {
            selectors: { '&:hover:not([data-disabled])::before': { opacity: '0' } },
        },
        'forced-colors': {
            selectors: {
                '&::before': { display: 'none' },
                '&::after': { display: 'none' },
            },
        },
    },
});

/**
 * Unbounded press feedback for selection controls: a fixed circle centered
 * on the part (MD3's 40dp state layer), press coordinates ignored, and no
 * clipping — the halo extends past the box.
 */
const pressableCentered = (prefix: string, diameter: string, ink = 'var(--color-primary)'): PartStyles => ({
    base: {
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
    },
    selectors: {
        '&::before': {
            content: '""',
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: diameter,
            height: diameter,
            borderRadius: '50%',
            background: ink,
            transform: 'translate(-50%, -50%)',
            opacity: '0',
            pointerEvents: 'none',
            transition: 'opacity var(--duration-fast) var(--ease-standard)',
        },
        '&:hover:not([data-disabled])::before': { opacity: '0.08' },
        '&[data-pressed]:not([data-disabled])::before': { opacity: '0.12' },
        // MD3 ink: on-surface while unselected, the accent once selected.
        '&[data-state="unchecked"]::before': { background: 'var(--color-base-content)' },
        '&[data-state="unchecked"]::after': { background: 'var(--color-base-content)' },
        '&::after': {
            content: '""',
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: diameter,
            height: diameter,
            borderRadius: '50%',
            background: ink,
            transform: 'translate(-50%, -50%) scale(0)',
            opacity: '0',
            pointerEvents: 'none',
        },
        '&[data-press-animating]::after': {
            animation: `${prefix}-ripple var(--duration-slow) var(--ease-standard)`,
        },
    },
    at: {
        'hover-none': {
            selectors: { '&:hover:not([data-disabled])::before': { opacity: '0' } },
        },
        'forced-colors': {
            selectors: {
                '&::before': { display: 'none' },
                '&::after': { display: 'none' },
            },
        },
    },
});

const rippleKeyframes = (prefix: string): Record<string, string> => ({
    [`${prefix}-ripple`]:
        'from { transform: translate(-50%, -50%) scale(0); opacity: 0.12; } '
        + '60% { transform: translate(-50%, -50%) scale(1); opacity: 0.12; } '
        + 'to { transform: translate(-50%, -50%) scale(1); opacity: 0; }',
});

// ── Button ────────────────────────────────────────────────────────────────
// The accent-pair indirection, so Material's larger role vocabulary costs one
// rule per role rather than one per role × fill.
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
        transition: 'opacity var(--duration-normal) var(--ease-emphasized), '
            + 'transform var(--duration-normal) var(--ease-emphasized), '
            + 'display var(--duration-normal) allow-discrete, '
            + 'overlay var(--duration-normal) allow-discrete',
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
            transition: 'block-size var(--duration-normal) var(--ease-emphasized), '
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
        // The state-layer/ripple ink. On a filled button that is the on-color;
        // un-filled variants override to the accent itself.
        '--btn-ripple': 'var(--btn-on-accent)',
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
                // Ripple containment: the ink clips to the pill; box-shadow
                // elevation is unaffected by overflow.
                position: 'relative',
                overflow: 'hidden',
                WebkitTapHighlightColor: 'transparent',
            },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed', boxShadow: 'none' },
                ...focusRing,
            },
            selectors: {
                // Held state layer — Material pressed = ink at 12% while the
                // pointer/key is down. This is the non-motion press feedback,
                // so it also carries reduced-motion.
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: '0',
                    background: 'var(--btn-ripple)',
                    opacity: '0',
                    pointerEvents: 'none',
                    transition: 'opacity var(--duration-fast) var(--ease-standard)',
                },
                '&:hover:not([data-disabled])::before': { opacity: '0.08' },
                '&[data-pressed]:not([data-disabled])::before': { opacity: '0.12' },
                // Ink ripple — a one-shot expansion from the press point the
                // runtime publishes as --press-x/y, sized by --press-r (the
                // farthest-corner radius). data-press-animating outlives
                // release, so a quick tap still plays the full wave.
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 'var(--press-x, 50%)',
                    top: 'var(--press-y, 50%)',
                    width: 'calc(var(--press-r, 0px) * 2)',
                    height: 'calc(var(--press-r, 0px) * 2)',
                    borderRadius: '50%',
                    background: 'var(--btn-ripple)',
                    transform: 'translate(-50%, -50%) scale(0)',
                    opacity: '0',
                    pointerEvents: 'none',
                },
                '&[data-press-animating]::after': {
                    animation: 'btn-ripple var(--duration-slow) var(--ease-standard)',
                },
            },
            at: {
                // Reduced motion needs nothing here: --duration-* collapse to
                // 0.01ms and the ::before tint remains as press feedback.
                'hover-none': {
                    selectors: { '&:hover:not([data-disabled])::before': { opacity: '0' } },
                },
                'forced-colors': {
                    selectors: {
                        '&::before': { display: 'none' },
                        '&::after': { display: 'none' },
                    },
                },
            },
        },
    },
    keyframes: {
        'btn-ripple':
            'from { transform: translate(-50%, -50%) scale(0); opacity: 0.12; } '
            + '60% { transform: translate(-50%, -50%) scale(1); opacity: 0.12; } '
            + 'to { transform: translate(-50%, -50%) scale(1); opacity: 0; }',
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
                        '--btn-ripple': 'var(--btn-accent)',
                    },
                },
            },
            soft: {
                root: {
                    base: {
                        background: 'var(--btn-soft)',
                        color: 'var(--btn-accent)',
                        '--btn-ripple': 'var(--btn-accent)',
                    },
                    states: { hover: { boxShadow: 'var(--shadow-level1)' } },
                },
            },
            ghost: {
                root: {
                    base: {
                        background: 'transparent',
                        color: 'var(--btn-accent)',
                        '--btn-ripple': 'var(--btn-accent)',
                    },
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
        // NOTE: `active` on a tab is the SELECTED anatomy state, not the
        // `:active` pseudo-class — press styling must stay in `selectors`.
        tab: withPresence(pressable('tab'), {
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
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
        }),
        panel: {
            base: { fontFamily: 'var(--font-sans)', fontSize: 'var(--text-md)', lineHeight: 'var(--leading-normal)' },
            states: { active: {}, inactive: {} },
        },
    },
    keyframes: rippleKeyframes('tab'),
};

// ── Disclosure ────────────────────────────────────────────────────────────
// A function of the ripple prefix: collapsible and accordion emit separate
// component stylesheets, so each must name (and declare) its own keyframe.
const disclosureTrigger = (prefix: string): PartStyles => withPresence(pressable(prefix), {
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
        disabled: { opacity: 'var(--disabled-opacity)' },
        ...focusRing,
    },
});

export const collapsible: RecipeInput = {
    component: 'collapsible',
    parts: {
        root: withPresence(disclosurePresence, {
            base: {
                background: 'var(--color-surface-container)',
                color: 'var(--color-surface-container-content)',
                borderRadius: 'var(--radius-box)',
                overflow: 'hidden',
            },
            states: { open: {}, closed: {} },
        }),
        trigger: disclosureTrigger('collapsible'),
        panel: {
            base: { padding: '0 var(--space-md) var(--space-md)', lineHeight: 'var(--leading-normal)' },
            states: { open: {}, closed: {} },
        },
    },
    keyframes: rippleKeyframes('collapsible'),
};

export const accordion: RecipeInput = {
    component: 'accordion',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' } },
        item: withPresence(disclosurePresence, {
            base: {
                background: 'var(--color-surface-container)',
                color: 'var(--color-surface-container-content)',
                borderRadius: 'var(--radius-box)',
                overflow: 'hidden',
            },
            states: { open: {}, closed: {} },
        }),
        trigger: disclosureTrigger('accordion'),
        panel: {
            base: { padding: '0 var(--space-md) var(--space-md)', lineHeight: 'var(--leading-normal)' },
            states: { open: {}, closed: {} },
        },
    },
    keyframes: rippleKeyframes('accordion'),
};

// ── Dialog ────────────────────────────────────────────────────────────────
export const dialog: RecipeInput = {
    component: 'dialog',
    parts: {
        trigger: withPresence(pressable('dialog'), {
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
            states: { open: {}, closed: {}, disabled: {}, ...focusRing },
        }),
        popup: withPresence(popupPresence('translateY(24px) scale(0.94)'), {
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
        }),
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
        close: withPresence(pressable('dialog'), {
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
            states: { disabled: {}, ...focusRing },
        }),
    },
    keyframes: rippleKeyframes('dialog'),
};

// ── Floating surfaces ─────────────────────────────────────────────────────
const floating: CssProps = { ...raised('level2'), padding: 'var(--space-xs)' };

export const popover: RecipeInput = {
    component: 'popover',
    parts: {
        trigger: withPresence(pressable('popover'), {
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
            states: { open: {}, closed: {}, disabled: {}, ...focusRing },
        }),
        popup: withPresence(popupPresence('scale(0.9)'), {
            base: { ...floating, padding: 'var(--space-md)', maxWidth: '20rem' },
            states: { open: {}, closed: {} },
        }),
        title: { base: { margin: '0 0 var(--space-xs)', fontWeight: 'var(--weight-medium)' } },
        close: withPresence(pressable('popover'), {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
                ...label,
            },
            states: { disabled: {}, ...focusRing },
        }),
    },
    keyframes: rippleKeyframes('popover'),
};

export const tooltip: RecipeInput = {
    component: 'tooltip',
    parts: {
        trigger: {
            base: { appearance: 'none', background: 'none', border: 'none', color: 'inherit', cursor: 'help' },
            states: { open: {}, closed: {}, disabled: {}, ...focusRing },
        },
        popup: withPresence(popupPresence('scale(0.85)'), {
            base: {
                background: 'var(--color-neutral)',
                color: 'var(--color-neutral-content)',
                borderRadius: 'var(--radius-selector)',
                padding: 'var(--space-2xs) var(--space-xs)',
                fontSize: 'var(--text-xs)',
                boxShadow: 'var(--shadow-level1)',
            },
            states: { open: {}, closed: {} },
        }),
    },
};

export const menu: RecipeInput = {
    component: 'menu',
    parts: {
        trigger: withPresence(pressable('menu'), {
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
            states: { open: {}, closed: {}, disabled: {}, ...focusRing },
        }),
        popup: withPresence(popupPresence('scale(0.9)'), { base: { ...floating, minWidth: '12rem' }, states: { open: {}, closed: {} } }),
        // The popup keeps no overflow clip; the item's own clips its ripple.
        item: withPresence(pressable('menu'), {
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
        }),
        // The item look plus a chevron; `open` keeps the state layer while
        // focus is inside the submenu.
        'sub-trigger': withPresence(pressable('menu'), {
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
                open: { background: 'var(--color-primary-soft)' },
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
            // No pseudo-element chevron here: pressable() owns BOTH ::before
            // (state layer) and ::after (ripple). The open-state layer is the
            // affordance; a chevron is content the app supplies.
        }),
        'sub-popup': withPresence(popupPresence('translateX(-4px) scale(0.95)'), {
            base: { ...floating, minWidth: '12rem' },
            states: { open: {}, closed: {} },
        }),
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
    keyframes: rippleKeyframes('menu'),
};

export const select: RecipeInput = {
    component: 'select',
    parts: {
        root: { base: { display: 'inline-flex', position: 'relative' } },
        // The ripple clip inherits the field's asymmetric radius.
        trigger: withPresence(pressable('select'), {
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
        }),
        value: { base: { flex: '1', textAlign: 'start' } },
        indicator: { base: { opacity: '0.7', transition: motion('transform') }, states: { open: { transform: 'rotate(180deg)' }, closed: {} } },
        popup: withPresence(popupPresence('scale(0.9)'), { base: { ...floating, minWidth: '12rem' }, states: { open: {}, closed: {} } }),
        item: withPresence(pressable('select'), {
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
        }),
        'item-indicator': { base: { color: 'var(--color-primary)' } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' } },
    },
    keyframes: rippleKeyframes('select'),
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
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
            },
            states: { checked: {}, unchecked: {}, disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' } },
        },
        // Material's switch state layer rides the THUMB (which travels and
        // grows), so the held layer is a thumb pseudo lit from the control's
        // flag via a descendant selector. No one-shot ripple here: the
        // runtime clears `data-press-animating` unless an animation targets
        // the flagged element itself, and the thumb is a descendant.
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
            selectors: {
                '&:hover:not([data-disabled]) [data-part="thumb"]::before': { opacity: '0.08' },
                '&[data-pressed]:not([data-disabled]) [data-part="thumb"]::before': { opacity: '0.12' },
                // MD3 ink: on-surface while unselected, primary once checked.
                '&[data-state="unchecked"] [data-part="thumb"]::before': { background: 'var(--color-base-content)' },
            },
            at: {
                'hover-none': {
                    selectors: { '&:hover:not([data-disabled]) [data-part="thumb"]::before': { opacity: '0' } },
                },
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
            selectors: {
                // Fixed halo (the thumb itself grows 4→6 units) that travels
                // with the thumb by construction.
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 'calc(var(--size-selector) * 10)',
                    height: 'calc(var(--size-selector) * 10)',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    transform: 'translate(-50%, -50%)',
                    opacity: '0',
                    pointerEvents: 'none',
                    transition: 'opacity var(--duration-fast) var(--ease-standard)',
                },
            },
            at: {
                'forced-colors': { selectors: { '&::before': { display: 'none' } } },
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
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
            },
            states: { checked: {}, unchecked: {}, indeterminate: {}, disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' } },
        },
        // MD3 selection-control halo: unbounded, centered, coords ignored.
        control: withPresence(pressableCentered('checkbox', 'calc(var(--size-selector) * 15)'), {
            ...tickBox,
            base: { ...tickBox.base, borderRadius: 'var(--radius-selector)' },
        }),
        indicator: {
            base: { color: 'var(--color-primary-content)', fontSize: 'var(--text-xs)' },
            states: { checked: {}, unchecked: {}, indeterminate: {} },
        },
        label: { base: { fontSize: 'var(--text-md)' }, states: { checked: {}, unchecked: {}, indeterminate: {} } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    keyframes: rippleKeyframes('checkbox'),
    skipStates: { root: ['focus-visible'] },
};

export const radioGroup: RecipeInput = {
    component: 'radio-group',
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' } },
        label: { base: { ...label, fontSize: 'var(--text-md)' } },
        item: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
            },
            states: { disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' } },
        },
        // Not `tickBox`: a radio has no indeterminate state, and reusing the
        // checkbox's styles smuggled one in — which the compiler rejected.
        'item-control': withPresence(pressableCentered('radio', 'calc(var(--size-selector) * 15)'), {
            base: { ...tickBox.base, borderRadius: '624rem' },
            states: {
                checked: { borderColor: 'var(--color-primary)' },
                unchecked: {},
                ...focusRing,
            },
        }),
        'item-indicator': {
            // The dot is always in the DOM, so it has to be hidden when
            // unchecked rather than left to the absence of a rule.
            base: {
                width: 'calc(var(--size-selector) * 3)',
                height: 'calc(var(--size-selector) * 3)',
                borderRadius: '624rem',
                background: 'var(--color-primary-content)',
                transform: 'scale(0)',
                transition: motion('transform'),
            },
            states: {
                checked: { transform: 'scale(1)' },
                unchecked: {},
            },
        },
        'item-label': { base: { fontSize: 'var(--text-md)' } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    keyframes: rippleKeyframes('radio'),
    // The tick itself carries the selected state; the row, dot and text have
    // no appearance of their own that depends on it.
    skipStates: {
        item: ['focus-visible', 'checked', 'unchecked'],
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
        // A custom skin (`appearance: none`), for two reasons at once. Blink
        // ignores thumb-pseudo styling on a native slider, so the MD3 handle
        // halo could never render there; and Chrome treats range inputs as
        // always `:focus-visible`, so the generic focus RING appeared on a
        // mouse press and stayed — MD3's focus indicator for a slider is the
        // handle halo, not a ring around the track.
        //
        // Both halo states set one custom property the thumb pseudos read:
        // vendor thumb pseudos cannot share a selector list (an unrecognized
        // selector invalidates the whole rule), and the variable keeps the
        // halo defined once per engine instead of once per state per engine.
        // The filled track reads the runtime-published `--slider-percent`
        // (set on the slider root, inherited here) as a gradient stop.
        input: {
            base: {
                appearance: 'none',
                width: '100%',
                height: 'calc(var(--size-selector) * 10)',
                margin: '0',
                background: 'transparent',
                cursor: 'pointer',
                outline: 'none',
                accentColor: 'var(--color-primary)',
                '--slider-halo': 'transparent',
                '--slider-track':
                    'linear-gradient(to right, var(--color-primary) var(--slider-percent, 50%), var(--color-secondary-soft) 0)',
            },
            states: {
                'focus-visible': {
                    '--slider-halo': 'color-mix(in oklab, var(--color-primary) 10%, transparent)',
                },
                pressed: {
                    '--slider-halo': 'color-mix(in oklab, var(--color-primary) 12%, transparent)',
                },
                disabled: { cursor: 'not-allowed' },
            },
            selectors: {
                '&::-webkit-slider-runnable-track': {
                    height: 'calc(var(--size-selector) * 2)',
                    borderRadius: '624rem',
                    background: 'var(--slider-track)',
                },
                '&::-webkit-slider-thumb': {
                    appearance: 'none',
                    width: 'calc(var(--size-selector) * 5)',
                    height: 'calc(var(--size-selector) * 5)',
                    marginTop: 'calc(var(--size-selector) * -1.5)',
                    borderRadius: '624rem',
                    border: 'none',
                    background: 'var(--color-primary)',
                    boxShadow: '0 0 0 calc(var(--size-selector) * 2.5) var(--slider-halo)',
                    transition: 'box-shadow var(--duration-fast) var(--ease-standard)',
                },
                // Keyboard focus must be discernible, not just a 10% wash:
                // a crisp two-tone ring (surface gap + the focus ink used by
                // every other part) sits inside the halo.
                '&[data-focus-visible]::-webkit-slider-thumb': {
                    boxShadow: '0 0 0 2px var(--color-base-100), '
                        + '0 0 0 4px var(--color-secondary), '
                        + '0 0 0 calc(var(--size-selector) * 2.5) var(--slider-halo)',
                },
                '&::-moz-range-track': {
                    height: 'calc(var(--size-selector) * 2)',
                    borderRadius: '624rem',
                    background: 'var(--slider-track)',
                },
                '&::-moz-range-thumb': {
                    width: 'calc(var(--size-selector) * 5)',
                    height: 'calc(var(--size-selector) * 5)',
                    borderRadius: '624rem',
                    border: 'none',
                    background: 'var(--color-primary)',
                    boxShadow: '0 0 0 calc(var(--size-selector) * 2.5) var(--slider-halo)',
                    transition: 'box-shadow var(--duration-fast) var(--ease-standard)',
                },
                '&[data-focus-visible]::-moz-range-thumb': {
                    boxShadow: '0 0 0 2px var(--color-base-100), '
                        + '0 0 0 4px var(--color-secondary), '
                        + '0 0 0 calc(var(--size-selector) * 2.5) var(--slider-halo)',
                },
            },
            at: {
                // Native rendering knows forced colors better than we do; the
                // retained accentColor keeps the fallback branded elsewhere.
                'forced-colors': {
                    base: { appearance: 'auto', '--slider-halo': 'transparent' },
                },
            },
        },
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
                background: 'var(--color-surface-container)',
            },
            states: { loading: {}, loaded: {}, error: {} },
        },
        image: {
            base: {
                gridArea: '1 / 1',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                // Cross-fade over the tonal fallback as the image reports in.
                opacity: '0',
                transition: motion('opacity'),
            },
            states: { loading: {}, loaded: { opacity: '1' }, error: {} },
        },
        fallback: {
            base: {
                ...label,
                gridArea: '1 / 1',
                placeItems: 'center',
                width: '100%',
                height: '100%',
                background: 'var(--color-surface-container-high)',
                color: 'var(--color-surface-container-high-content)',
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
 * Toast presence is runtime-managed — plain two-state transitions, no
 * `@starting-style`/`allow-discrete`. The M3 snackbar: a raised
 * surface-container card sliding in from the nearest edge, ripples on its
 * buttons.
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
                ...raised('level3'),
                pointerEvents: 'auto',
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                columnGap: 'var(--space-md)',
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-field)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                opacity: '0',
                transform: 'translateY(var(--toast-from))',
                transition: 'opacity var(--duration-normal) var(--ease-emphasized), '
                    + 'transform var(--duration-normal) var(--ease-emphasized)',
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
            base: { gridColumn: '1', ...label },
        },
        description: {
            base: {
                gridColumn: '1',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                color: 'color-mix(in oklab, var(--color-surface-container-high-content) 80%, transparent)',
            },
        },
        action: withPresence(pressable('toast', 'var(--toast-accent)'), {
            base: {
                gridColumn: '2',
                gridRow: '1',
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--toast-accent)',
                borderRadius: '624rem',
                padding: 'var(--space-2xs) var(--space-md)',
                ...label,
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
            },
            states: { disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' }, ...focusRing },
        }),
        close: withPresence(pressable('toast', 'var(--color-surface-container-high-content)'), {
            base: {
                gridColumn: '3',
                gridRow: '1',
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-surface-container-high-content)',
                borderRadius: '624rem',
                padding: 'var(--space-2xs) var(--space-xs)',
                ...label,
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
            },
            states: { disabled: { opacity: 'var(--disabled-opacity)' }, ...focusRing },
        }),
    },
    variants: {
        color: Object.fromEntries(ROLES.map((role) => [
            role,
            { root: { base: { '--toast-accent': `var(--color-${role})` } } },
        ])),
    },
    keyframes: rippleKeyframes('toast'),
};

export const combobox: RecipeInput = {
    component: 'combobox',
    parts: {
        root: { base: { display: 'inline-flex', position: 'relative' } },
        // Material's filled text field: rounded top, flat bottom, underline.
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                minWidth: '12rem',
                background: 'var(--color-surface-container)',
                color: 'var(--color-surface-container-content)',
                borderBottom: '2px solid var(--color-outline)',
                borderRadius: 'var(--radius-selector) var(--radius-selector) 0 0',
                transition: motion('border-color'),
            },
            states: {
                open: { borderBottomColor: 'var(--color-primary)' },
                closed: {},
                invalid: { borderBottomColor: 'var(--color-error)' },
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
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-md)',
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
                '&::placeholder': { color: 'var(--color-outline)' },
            },
        },
        trigger: withPresence(pressableCentered('combobox', '2.5rem'), {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-surface-container-content)',
                opacity: '0.7',
                padding: '0 var(--space-md)',
                cursor: 'pointer',
                transition: motion('transform'),
            },
            states: {
                open: { transform: 'rotate(180deg)' },
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        }),
        popup: withPresence(popupPresence('scale(0.9)'), { base: { ...floating, minWidth: '12rem' }, states: { open: {}, closed: {} } }),
        item: withPresence(pressable('combobox'), {
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
            },
        }),
        'item-indicator': { base: { color: 'var(--color-primary)' } },
        empty: {
            base: {
                padding: 'var(--space-md)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                textAlign: 'center',
                color: 'var(--color-outline)',
            },
        },
    },
    // The visible ring lives on `control`; input and trigger delegate.
    skipStates: {
        input: ['focus-visible'],
        trigger: ['focus-visible'],
    },
    keyframes: rippleKeyframes('combobox'),
};

export const recipes: RecipeInput[] = [
    button, tabs, collapsible, accordion, dialog, popover, tooltip, menu, select,
    switchRecipe, checkbox, radioGroup, field, slider, progress, avatar, toast, combobox,
];
