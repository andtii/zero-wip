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
    // Accent default in `tokens:` — the un-attributed render IS the primary
    // variant; `variants.color` only rebinds the custom property.
    tokens: { '--tabs-accent': 'var(--color-primary)' },
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
        tab: withPresence(pressable('tab', 'var(--tabs-accent)'), {
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
                active: { color: 'var(--tabs-accent)', borderBottomColor: 'var(--tabs-accent)' },
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
    variants: {
        size: {
            xs: { tab: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-2xs)' } } },
            sm: { tab: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-xs)' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { tab: { base: { fontSize: 'var(--text-sm)', padding: 'var(--space-xs) var(--space-md)' } } },
            xl: { tab: { base: { fontSize: 'var(--text-md)', padding: 'var(--space-sm) var(--space-lg)' } } },
        },
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--tabs-accent': `var(--color-${c})`,
        } } }])),
    },
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
            at: {
                sm: {
                    base: {
                        width: 'calc(100% - var(--space-2xl))',
                        maxWidth: '35rem',
                        // `auto` stretches an inset-positioned modal to fill; `fit-content`
                        // is the UA's own dialog default and hugs the content (#114).
                        height: 'fit-content',
                        maxHeight: 'calc(100% - var(--space-2xl))',
                        margin: 'auto',
                        ...raised('level3'),
                    },
                },
            },
        }),
        backdrop: {
            base: { background: 'oklch(0% 0 0 / 0.32)' },
            states: { open: {}, closed: {} },
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
    // Accent defaults in `tokens:` — the un-attributed render IS the primary
    // variant; `variants.color` only rebinds the custom properties.
    tokens: {
        '--select-accent': 'var(--color-primary)',
        '--select-soft': 'var(--color-primary-soft)',
    },
    parts: {
        root: { base: { display: 'inline-flex', position: 'relative' } },
        // The ripple clip inherits the field's asymmetric radius.
        trigger: withPresence(pressable('select', 'var(--select-accent)'), {
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
                open: { borderBottomColor: 'var(--select-accent)' },
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                // Semantic role state, deliberately NOT the accent.
                invalid: { borderBottomColor: 'var(--color-error)' },
                ...focusRing,
            },
        }),
        value: { base: { flex: '1', textAlign: 'start' } },
        indicator: { base: { opacity: '0.7', transition: motion('transform') }, states: { open: { transform: 'rotate(180deg)' }, closed: {} } },
        popup: withPresence(popupPresence('scale(0.9)'), { base: { ...floating, minWidth: '12rem' }, states: { open: {}, closed: {} } }),
        item: withPresence(pressable('select', 'var(--select-accent)'), {
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
                highlighted: { background: 'var(--select-soft)' },
                // MD3's secondary-container fill for a selected row — the
                // pairing tree-view and the segmented button use. Deliberately
                // NOT the accent.
                selected: { background: 'var(--color-secondary-soft)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
        }),
        'item-indicator': { base: { color: 'var(--select-accent)' } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' } },
    },
    keyframes: rippleKeyframes('select'),
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--select-accent': `var(--color-${c})`,
            '--select-soft': `var(--color-${c}-soft)`,
        } } }])),
        // The button's ramp rhythm anchored on the field's resting values
        // (md = the base's padding/fontSize).
        size: {
            xs: { trigger: { base: { padding: 'var(--space-2xs) var(--space-xs)', fontSize: 'var(--text-xs)' } } },
            sm: { trigger: { base: { padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--text-sm)' } } },
            md: { trigger: { base: { padding: 'var(--space-sm) var(--space-md)', fontSize: 'var(--text-md)' } } },
            lg: { trigger: { base: { padding: 'var(--space-md) var(--space-lg)', fontSize: 'var(--text-lg)' } } },
            xl: { trigger: { base: { padding: 'var(--space-lg) var(--space-xl)', fontSize: 'var(--text-xl)' } } },
        },
    },
};

// ── Selection controls ────────────────────────────────────────────────────
export const switchRecipe: RecipeInput = {
    component: 'switch',
    tokens: {
        '--switch-width': 'calc(var(--size-selector) * 13)',
        '--switch-height': 'calc(var(--size-selector) * 8)',
        // Accent defaults — the un-attributed render IS the primary variant;
        // `variants.color` only rebinds these (the toast shape).
        '--switch-accent': 'var(--color-primary)',
        '--switch-on-accent': 'var(--color-primary-content)',
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
                checked: { background: 'var(--switch-accent)', borderColor: 'var(--switch-accent)' },
                unchecked: {},
                ...focusRing,
            },
            selectors: {
                '&:hover:not([data-disabled]) [data-part="thumb"]::before': { opacity: '0.08' },
                '&[data-pressed]:not([data-disabled]) [data-part="thumb"]::before': { opacity: '0.12' },
                // MD3 ink: on-surface while unselected (deliberately NOT the
                // accent), the accent once checked (the thumb's own ::before).
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
                    background: 'var(--switch-on-accent)',
                    width: 'calc(var(--size-selector) * 6)',
                    height: 'calc(var(--size-selector) * 6)',
                    transform: 'translate(calc(var(--switch-width) - 100% - var(--size-selector) * 2), -50%)',
                },
                unchecked: {},
            },
            selectors: {
                // Fixed halo (the thumb itself grows 4→6 units) that travels
                // with the thumb by construction. Accent ink; the control's
                // descendant selector overrides it to on-surface while
                // unchecked.
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 'calc(var(--size-selector) * 10)',
                    height: 'calc(var(--size-selector) * 10)',
                    borderRadius: '50%',
                    background: 'var(--switch-accent)',
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
    variants: {
        size: {
            xs: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 9)', '--switch-height': 'calc(var(--size-selector) * 5.5)' } } },
            sm: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 11)', '--switch-height': 'calc(var(--size-selector) * 6.5)' } } },
            // `md` is the un-attributed render — the defaults in `tokens:`
            // already ARE the middle step.
            md: {},
            lg: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 15)', '--switch-height': 'calc(var(--size-selector) * 9)' } } },
            xl: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 17)', '--switch-height': 'calc(var(--size-selector) * 10)' } } },
        },
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--switch-accent': `var(--color-${c})`,
            '--switch-on-accent': `var(--color-${c}-content)`,
        } } }])),
    },
    skipStates: { root: ['focus-visible'] },
};

/**
 * The tick container shared by checkbox and radio. Parameterised because the
 * two components carry their OWN accent and size tokens (`--checkbox-*` vs
 * `--radio-*`) — a hardcoded primary here would pin both to one colour and
 * defeat their `variants.color`. The focus ring stays `--color-secondary`
 * (via `focusRing`) on purpose: Material's focus indicator does not follow
 * the accent.
 */
const tickBox = (accent: string, size: string): PartStyles => ({
    base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        border: '2px solid var(--color-outline)',
        background: 'transparent',
        transition: motion('background, border-color'),
    },
    states: {
        checked: { background: accent, borderColor: accent },
        unchecked: {},
        indeterminate: { background: accent, borderColor: accent },
        ...focusRing,
    },
});

const checkboxTick = tickBox('var(--checkbox-accent)', 'var(--checkbox-size)');

export const checkbox: RecipeInput = {
    component: 'checkbox',
    // Accent defaults live in `tokens:` — the un-attributed render IS the
    // primary variant, and `variants.color` only rebinds custom properties
    // (the toast shape).
    tokens: {
        '--checkbox-size': 'calc(var(--size-selector) * 6)',
        '--checkbox-accent': 'var(--color-primary)',
        '--checkbox-on-accent': 'var(--color-primary-content)',
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
            states: { checked: {}, unchecked: {}, indeterminate: {}, disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' } },
        },
        // MD3 selection-control halo: unbounded, centered, coords ignored.
        // 2.5 × the tick keeps the 15-unit resting diameter and scales with
        // the size variant.
        control: withPresence(pressableCentered('checkbox', 'calc(var(--checkbox-size) * 2.5)', 'var(--checkbox-accent)'), {
            ...checkboxTick,
            base: { ...checkboxTick.base, borderRadius: 'var(--radius-selector)' },
        }),
        indicator: {
            base: { color: 'var(--checkbox-on-accent)', fontSize: 'var(--text-xs)' },
            states: { checked: {}, unchecked: {}, indeterminate: {} },
        },
        label: { base: { fontSize: 'var(--text-md)' }, states: { checked: {}, unchecked: {}, indeterminate: {} } },
        'hidden-input': { base: { position: 'absolute', width: '1px', height: '1px', opacity: '0' } },
    },
    keyframes: rippleKeyframes('checkbox'),
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--checkbox-accent': `var(--color-${c})`,
            '--checkbox-on-accent': `var(--color-${c}-content)`,
        } } }])),
        size: {
            xs: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 4)' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 5)' } }, label: { base: { fontSize: 'var(--text-sm)' } } },
            md: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 6)' } }, label: { base: { fontSize: 'var(--text-md)' } } },
            lg: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 7)' } }, label: { base: { fontSize: 'var(--text-lg)' } } },
            xl: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 8)' } }, label: { base: { fontSize: 'var(--text-xl)' } } },
        },
    },
    skipStates: { root: ['focus-visible'] },
};

const radioTick = tickBox('var(--radio-accent)', 'var(--radio-size)');

export const radioGroup: RecipeInput = {
    component: 'radio-group',
    tokens: {
        '--radio-size': 'calc(var(--size-selector) * 6)',
        '--radio-accent': 'var(--color-primary)',
        '--radio-on-accent': 'var(--color-primary-content)',
    },
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
        // Not the full `tickBox`: a radio has no indeterminate state, and
        // reusing the checkbox's states smuggled one in — which the compiler
        // rejected. The halo diameter is 2.5 × the tick (15 units resting),
        // scaling with the size variant.
        'item-control': withPresence(pressableCentered('radio', 'calc(var(--radio-size) * 2.5)', 'var(--radio-accent)'), {
            base: { ...radioTick.base, borderRadius: '624rem' },
            states: {
                checked: { borderColor: 'var(--radio-accent)' },
                unchecked: {},
                ...focusRing,
            },
        }),
        'item-indicator': {
            // The dot is always in the DOM, so it has to be hidden when
            // unchecked rather than left to the absence of a rule.
            base: {
                width: 'calc(var(--radio-size) / 2)',
                height: 'calc(var(--radio-size) / 2)',
                borderRadius: '624rem',
                background: 'var(--radio-on-accent)',
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
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--radio-accent': `var(--color-${c})`,
            '--radio-on-accent': `var(--color-${c}-content)`,
        } } }])),
        size: {
            xs: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 4)' } }, 'item-label': { base: { fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 5)' } }, 'item-label': { base: { fontSize: 'var(--text-sm)' } } },
            md: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 6)' } }, 'item-label': { base: { fontSize: 'var(--text-md)' } } },
            lg: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 7)' } }, 'item-label': { base: { fontSize: 'var(--text-lg)' } } },
            xl: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 8)' } }, 'item-label': { base: { fontSize: 'var(--text-xl)' } } },
        },
    },
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
    // Accent default in `tokens:` — the un-attributed render IS the primary
    // variant; `variants.color` only rebinds the custom property.
    tokens: { '--slider-accent': 'var(--color-primary)' },
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
        control: {
            base: {
                appearance: 'none',
                width: '100%',
                height: 'calc(var(--size-selector) * 10)',
                margin: '0',
                background: 'transparent',
                cursor: 'pointer',
                outline: 'none',
                accentColor: 'var(--slider-accent)',
                '--slider-halo': 'transparent',
                // The remaining track keeps MD3's secondary-container tone —
                // deliberately NOT the accent (matches the progress track).
                '--slider-track':
                    'linear-gradient(to right, var(--slider-accent) var(--slider-percent, 50%), var(--color-secondary-soft) 0)',
            },
            states: {
                'focus-visible': {
                    '--slider-halo': 'color-mix(in oklab, var(--slider-accent) 10%, transparent)',
                },
                pressed: {
                    '--slider-halo': 'color-mix(in oklab, var(--slider-accent) 12%, transparent)',
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
                    background: 'var(--slider-accent)',
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
                    background: 'var(--slider-accent)',
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
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--slider-accent': `var(--color-${c})`,
        } } }])),
        // The control's box height is the size lever (track and thumb keep
        // their MD3 metrics); md is the resting height, so it only steps the
        // label.
        size: {
            xs: { control: { base: { height: 'calc(var(--size-selector) * 6)' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            sm: { control: { base: { height: 'calc(var(--size-selector) * 8)' } }, label: { base: { fontSize: 'var(--text-sm)' } } },
            md: { label: { base: { fontSize: 'var(--text-sm)' } } },
            lg: { control: { base: { height: 'calc(var(--size-selector) * 12)' } }, label: { base: { fontSize: 'var(--text-md)' } } },
            xl: { control: { base: { height: 'calc(var(--size-selector) * 14)' } }, label: { base: { fontSize: 'var(--text-lg)' } } },
        },
    },
    skipStates: { root: ['invalid', 'focus-visible'] },
};

export const progress: RecipeInput = {
    component: 'progress',
    // Accent default in `tokens:` — the un-attributed render IS the primary
    // variant; `variants.color` only rebinds the custom properties.
    tokens: {
        '--progress-accent': 'var(--color-primary)',
        '--progress-track-size': 'calc(var(--size-field) * 1.5)',
    },
    keyframes: {
        'material-indeterminate': 'from { transform: translateX(-100%); } to { transform: translateX(300%); }',
    },
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' } },
        label: { base: { ...label } },
        track: {
            base: {
                position: 'relative',
                height: 'var(--progress-track-size)',
                borderRadius: '624rem',
                // MD3's secondary-container track tone — deliberately NOT the
                // accent (matches the slider's remaining-track colour).
                background: 'var(--color-secondary-soft)',
                overflow: 'hidden',
            },
        },
        range: {
            base: {
                height: '100%',
                borderRadius: '624rem',
                background: 'var(--progress-accent)',
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
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--progress-accent': `var(--color-${c})`,
        } } }])),
        size: {
            xs: { root: { base: { '--progress-track-size': 'calc(var(--size-field) * 0.75)' } } },
            sm: { root: { base: { '--progress-track-size': 'var(--size-field)' } } },
            md: { root: { base: { '--progress-track-size': 'calc(var(--size-field) * 1.5)' } } },
            lg: { root: { base: { '--progress-track-size': 'calc(var(--size-field) * 2)' } } },
            xl: { root: { base: { '--progress-track-size': 'calc(var(--size-field) * 3)' } } },
        },
    },
    // The track and range carry the state; the wrapper has no appearance of
    // its own that changes with it.
    skipStates: { root: ['loading', 'complete', 'indeterminate'] },
};

export const avatar: RecipeInput = {
    component: 'avatar',
    tokens: {
        '--avatar-size': 'calc(var(--size-selector) * 10)',
        '--avatar-accent': 'var(--color-surface-container-high)',
        '--avatar-on-accent': 'var(--color-surface-container-high-content)',
    },
    parts: {
        root: {
            base: {
                position: 'relative',
                display: 'inline-grid',
                width: 'var(--avatar-size)',
                height: 'var(--avatar-size)',
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
                background: 'var(--avatar-accent)',
                color: 'var(--avatar-on-accent)',
                userSelect: 'none',
            },
            // `display` must not defeat the `hidden` zero sets once the image
            // has loaded.
            selectors: { '&:not([hidden])': { display: 'grid' } },
            states: { loading: {}, loaded: {}, error: {} },
        },
    },
    variants: {
        // A tonal container, per Material's own avatar/monogram treatment —
        // the tint carries the role, the ink is the role itself. Unattributed
        // it stays on the neutral surface container it always used.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--avatar-accent': `var(--color-${c}-soft)`,
            '--avatar-on-accent': `var(--color-${c})`,
        } } }])),
        size: {
            xs: { root: { base: { '--avatar-size': 'calc(var(--size-selector) * 6)' } }, fallback: { base: { fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { '--avatar-size': 'calc(var(--size-selector) * 8)' } }, fallback: { base: { fontSize: 'var(--text-xs)' } } },
            // `md` is the un-attributed render — the defaults in `tokens:`
            // already ARE the middle step.
            md: {},
            lg: { root: { base: { '--avatar-size': 'calc(var(--size-selector) * 12)' } }, fallback: { base: { fontSize: 'var(--text-md)' } } },
            xl: { root: { base: { '--avatar-size': 'calc(var(--size-selector) * 16)' } }, fallback: { base: { fontSize: 'var(--text-lg)' } } },
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
    // Accent defaults in `tokens:` — the un-attributed render IS the primary
    // variant; `variants.color` only rebinds the custom properties.
    tokens: {
        '--combobox-accent': 'var(--color-primary)',
        '--combobox-soft': 'var(--color-primary-soft)',
    },
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
                open: { borderBottomColor: 'var(--combobox-accent)' },
                closed: {},
                // Semantic role state, deliberately NOT the accent.
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
        trigger: withPresence(pressableCentered('combobox', '2.5rem', 'var(--combobox-accent)'), {
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
        item: withPresence(pressable('combobox', 'var(--combobox-accent)'), {
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
                highlighted: { background: 'var(--combobox-soft)' },
                // MD3's secondary-container fill for a selected row —
                // deliberately NOT the accent.
                selected: { background: 'var(--color-secondary-soft)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
            },
        }),
        'item-indicator': { base: { color: 'var(--combobox-accent)' } },
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
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--combobox-accent': `var(--color-${c})`,
            '--combobox-soft': `var(--color-${c}-soft)`,
        } } }])),
        // The button's ramp rhythm anchored on the field's resting values
        // (md = the base's padding/fontSize).
        size: {
            xs: { input: { base: { padding: 'var(--space-2xs) var(--space-xs)', fontSize: 'var(--text-xs)' } } },
            sm: { input: { base: { padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--text-sm)' } } },
            md: { input: { base: { padding: 'var(--space-sm) var(--space-md)', fontSize: 'var(--text-md)' } } },
            lg: { input: { base: { padding: 'var(--space-md) var(--space-lg)', fontSize: 'var(--text-lg)' } } },
            xl: { input: { base: { padding: 'var(--space-lg) var(--space-xl)', fontSize: 'var(--text-xl)' } } },
        },
    },
    // The visible ring lives on `control`; input and trigger delegate.
    skipStates: {
        input: ['focus-visible'],
        trigger: ['focus-visible'],
    },
    keyframes: rippleKeyframes('combobox'),
};

// ── Toggle, toggle group ──────────────────────────────────────────────────
/**
 * Material's outlined toggle button: a hairline pill while off, the accent
 * fill once on. Same accent-pair indirection as button, plus a `--toggle-ink`
 * the on state flips so the state layer/ripple is on-surface while outlined
 * and the on-color once filled.
 */
export const toggle: RecipeInput = {
    component: 'toggle',
    tokens: {
        '--toggle-accent': 'var(--color-primary)',
        '--toggle-on-accent': 'var(--color-primary-content)',
        '--toggle-ink': 'var(--color-base-content)',
    },
    parts: {
        root: withPresence(pressable('toggle', 'var(--toggle-ink)'), {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-xs)',
                background: 'transparent',
                color: 'var(--color-base-content)',
                border: 'var(--border) solid var(--color-outline)',
                borderRadius: 'var(--radius-field)',
                ...label,
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: motion('background, color, border-color'),
            },
            states: {
                on: {
                    background: 'var(--toggle-accent)',
                    color: 'var(--toggle-on-accent)',
                    borderColor: 'var(--toggle-accent)',
                    '--toggle-ink': 'var(--toggle-on-accent)',
                },
                off: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
        }),
    },
    keyframes: rippleKeyframes('toggle'),
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
            sm: { root: { base: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)' } } },
            md: { root: { base: { padding: 'var(--space-xs) var(--space-lg)', fontSize: 'var(--text-sm)' } } },
            lg: { root: { base: { padding: 'var(--space-sm) var(--space-xl)', fontSize: 'var(--text-md)' } } },
            xl: { root: { base: { padding: 'var(--space-md) var(--space-2xl)', fontSize: 'var(--text-lg)' } } },
        },
    },
    defaultVariants: { color: 'primary', size: 'md' },
};

/**
 * Material's segmented button: connected outlined segments in one fully
 * rounded pill, hairlines between them, and the on segment taking the
 * container fill. MD3 names that fill secondary-container; in this
 * vocabulary it is the `secondary` soft/role pair — the same pairing the
 * button's soft variant uses.
 */
export const toggleGroup: RecipeInput = {
    component: 'toggle-group',
    tokens: {
        '--toggle-group-fill': 'var(--color-secondary-soft)',
        '--toggle-group-on-fill': 'var(--color-secondary)',
        '--toggle-group-ink': 'var(--color-base-content)',
    },
    parts: {
        root: {
            base: {
                display: 'inline-flex',
                border: 'var(--border) solid var(--color-outline)',
                // The segmented pill: Material's fully-rounded action shape.
                borderRadius: '624rem',
                overflow: 'hidden',
            },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
            selectors: {
                '&[data-orientation="vertical"]': { flexDirection: 'column' },
            },
        },
        item: withPresence(pressable('toggle-group', 'var(--toggle-group-ink)'), {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-xs)',
                background: 'transparent',
                color: 'var(--color-base-content)',
                border: 'none',
                padding: 'var(--space-xs) var(--space-lg)',
                ...label,
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: motion('background, color'),
            },
            states: {
                on: {
                    background: 'var(--toggle-group-fill)',
                    color: 'var(--toggle-group-on-fill)',
                    '--toggle-group-ink': 'var(--toggle-group-on-fill)',
                },
                off: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                'focus-visible': {
                    // The pill clips its segments (joined corners), so an
                    // offset ring would be swallowed — inset it instead.
                    outline: '3px solid var(--color-secondary)',
                    outlineOffset: '-3px',
                },
            },
            selectors: {
                '&[data-orientation="horizontal"] + &': {
                    borderInlineStart: 'var(--border) solid var(--color-outline)',
                },
                '&[data-orientation="vertical"] + &': {
                    borderBlockStart: 'var(--border) solid var(--color-outline)',
                },
            },
        }),
    },
    keyframes: rippleKeyframes('toggle-group'),
    variants: {
        // The group is a frame around its items, so the ramp lands on the
        // items and the frame follows their box.
        size: {
            xs: { item: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-2xs)' } } },
            sm: { item: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-xs)' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { item: { base: { fontSize: 'var(--text-sm)', padding: 'var(--space-xs) var(--space-md)' } } },
            xl: { item: { base: { fontSize: 'var(--text-md)', padding: 'var(--space-sm) var(--space-lg)' } } },
        },
        color: Object.fromEntries(ROLES.map((c) => [
            c,
            {
                item: {
                    base: {
                        '--toggle-group-fill': `var(--color-${c}-soft)`,
                        '--toggle-group-on-fill': `var(--color-${c})`,
                    },
                },
            },
        ])),
    },
    defaultVariants: { color: 'secondary' },
};

// ── Number input ──────────────────────────────────────────────────────────
/**
 * The stepper: an icon button riding inside the outlined field. Bounded
 * MD3 press feedback (state layer + ripple) clipped to its own pill; the
 * margin keeps the pill off the field's hairline.
 */
const stepper: PartStyles = withPresence(pressable('number-input'), {
    base: {
        appearance: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        border: 'none',
        background: 'transparent',
        color: 'var(--color-primary)',
        borderRadius: '624rem',
        margin: 'var(--space-2xs)',
        padding: '0 var(--space-md)',
        ...label,
        fontSize: 'var(--text-md)',
        cursor: 'pointer',
        userSelect: 'none',
    },
    states: {
        disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
    },
});

/**
 * Material's outlined text field over the number-input anatomy: a hairline
 * box, the focus indicator and error tint drawing on the chrome (the
 * Combobox control/input split), steppers flanking the centered input.
 */
export const numberInput: RecipeInput = {
    component: 'number-input',
    tokens: { '--number-input-accent': 'var(--color-secondary)' },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
            states: { disabled: {}, invalid: {}, required: {}, readonly: {} },
        },
        label: {
            base: { ...label, color: 'var(--color-base-content)' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                invalid: { color: 'var(--color-error)' },
                required: {},
            },
            selectors: { '&[data-required]::after': { content: '" *"', color: 'var(--color-error)' } },
        },
        // The field chrome: the ring and the invalid tint draw on the box;
        // input and steppers sit inside the outline.
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                background: 'transparent',
                color: 'var(--color-base-content)',
                border: 'var(--border) solid var(--color-outline)',
                borderRadius: 'var(--radius-field)',
                transition: motion('border-color'),
            },
            states: {
                invalid: { borderColor: 'var(--color-error)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                readonly: {},
                'focus-visible': {
                    outline: '3px solid var(--number-input-accent)',
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
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-md)',
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
                '&::placeholder': { color: 'var(--color-outline)' },
            },
        },
        'increment-trigger': stepper,
        'decrement-trigger': stepper,
    },
    // The visible ring lives on `control`; the input delegates.
    skipStates: { input: ['focus-visible'] },
    keyframes: rippleKeyframes('number-input'),
    variants: {
        // The field's own ring carries the role — the chrome is neutral, so
        // the focus state is the only place a number input can show colour.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--number-input-accent': `var(--color-${c})`,
        } } }])),
        // The readout carries the ramp; the steppers follow it so the frame
        // stays proportional.
        size: {
            xs: { input: { base: { fontSize: 'var(--text-sm)', padding: 'var(--space-2xs) var(--space-2xs)' } } },
            sm: { input: { base: { fontSize: 'var(--text-sm)', padding: 'var(--space-xs) var(--space-2xs)' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { input: { base: { fontSize: 'var(--text-lg)', padding: 'var(--space-md) var(--space-sm)' } } },
            xl: { input: { base: { fontSize: 'var(--text-xl)', padding: 'var(--space-lg) var(--space-md)' } } },
        },
    },
};

// ── Rating group ──────────────────────────────────────────────────────────
/**
 * Radio semantics over a row of glyphs. The item's content is a text star,
 * so colour and font-size ARE the fill: primary once full/half (the same
 * selected ink as every other selection control here), outline while empty
 * (Material's inactive hairline tone). A glyph can't host a bounded state
 * layer, so `highlighted` — the hover preview range — reads as a subtle
 * scale emphasis instead, with the reduced-motion guard that implies.
 */
export const ratingGroup: RecipeInput = {
    component: 'rating-group',
    tokens: {
        '--rating-size': 'var(--text-xl)',
        '--rating-fill': 'var(--color-primary)',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
            states: { disabled: {}, invalid: {}, required: {}, readonly: {} },
        },
        label: {
            base: { ...label, color: 'var(--color-base-content)' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                invalid: { color: 'var(--color-error)' },
                required: {},
            },
            selectors: { '&[data-required]::after': { content: '" *"', color: 'var(--color-error)' } },
        },
        // role=radiogroup — one tab stop, so the group ring is the focus
        // indicator, drawn Material-style around the whole row.
        control: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2xs)' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                readonly: {},
                'focus-visible': {
                    outline: '3px solid var(--color-secondary)',
                    outlineOffset: '2px',
                    borderRadius: 'var(--radius-selector)',
                },
            },
        },
        item: {
            base: {
                fontSize: 'var(--rating-size)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                userSelect: 'none',
                color: 'var(--color-outline)',
                transition: motion('color, transform'),
            },
            states: {
                full: { color: 'var(--rating-fill)' },
                half: { color: 'var(--rating-fill)' },
                empty: {},
                highlighted: { transform: 'scale(1.12)' },
                disabled: { cursor: 'not-allowed' },
                readonly: { cursor: 'default' },
                // The group ring lives on control; the value-following tab
                // stop still gets a discernible per-item marker.
                'focus-visible': {
                    outline: '2px solid var(--color-secondary)',
                    outlineOffset: '1px',
                    borderRadius: 'var(--radius-selector)',
                },
            },
            at: {
                'reduced-motion': { base: { transition: 'none' }, states: { highlighted: { transform: 'none' } } },
            },
        },
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
 * Material's list-item treatment over the tree anatomy: every row (leaf item
 * and branch trigger alike) is a menu-style row with the MD3 state layer and
 * ink ripple, and a selected row takes the secondary-container fill — the
 * same `secondary-soft` pairing the select item and segmented button use.
 *
 * Selected never fights hover here: hover is `pressable`'s ::before state
 * layer compositing OVER the fill (MD3's state-layer-on-container), not a
 * competing background declaration — so no `&[data-selected]:hover` guard is
 * needed. Depth is the DOM nesting; branch-content's inline padding is the
 * only indentation rule.
 */
const treeRow: PartStyles = {
    base: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-xs) var(--space-md)',
        borderRadius: 'var(--radius-selector)',
        fontSize: 'var(--tree-text)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: motion('background'),
    },
    states: {
        selected: { background: 'var(--tree-accent)', color: 'var(--tree-on-accent)' },
        disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
        ...focusRing,
    },
};

export const treeView: RecipeInput = {
    component: 'tree-view',
    tokens: {
        '--tree-accent': 'var(--color-secondary-soft)',
        '--tree-text': 'var(--text-sm)',
        '--tree-on-accent': 'var(--color-base-content)',
    },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        label: {
            base: { ...label, color: 'var(--color-base-content)', padding: 'var(--space-2xs) var(--space-md)' },
        },
        tree: {
            base: { display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' },
        },
        item: withPresence(pressable('tree-view'), treeRow),
        // The treeitem ELEMENT (row + subtree); the row look lives on the
        // trigger inside it, so the ring and the fill draw on the row only.
        branch: {
            base: { display: 'flex', flexDirection: 'column', outline: 'none' },
            states: { open: {}, closed: {}, selected: {}, disabled: {} },
        },
        'branch-trigger': withPresence(pressable('tree-view'), {
            ...treeRow,
            states: { ...treeRow.states, open: {}, closed: {} },
        }),
        'branch-indicator': {
            base: {
                display: 'inline-flex',
                transition: motion('transform'),
            },
            states: { open: { transform: 'rotate(90deg)' }, closed: {} },
            // --duration-* already collapses under reduced motion; `none`
            // makes the intent explicit rather than relying on 0.01ms.
            at: { 'reduced-motion': { base: { transition: 'none' } } },
        },
        'branch-content': {
            base: { display: 'flex', flexDirection: 'column', paddingInlineStart: 'var(--space-lg)' },
            states: { open: {}, closed: {} },
        },
    },
    keyframes: rippleKeyframes('tree-view'),
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
