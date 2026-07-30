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
        size: {
            xs: { tab: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-md)' } } },
            sm: { tab: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-xs) var(--space-lg)' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { tab: { base: { fontSize: 'var(--text-md)', padding: 'var(--space-md) var(--space-2xl)' } } },
            xl: { tab: { base: { fontSize: 'var(--text-lg)', padding: 'var(--space-lg) var(--space-2xl)' } } },
        },
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
    /**
     * daisy drives the whole toggle off ONE size, exactly as it drives the
     * checkbox: `--size` is the height, the padding is a fixed eighth of it,
     * and the WIDTH is derived — `(size × 2) − (border + pad) × 2`. Declaring
     * width and height independently (as this recipe used to) puts the knob's
     * travel and the box's proportions out of daisy's lockstep.
     *
     * `--switch-ink` is what the colour axis rebinds: daisy's `--input-color`,
     * read through `color`, so ONE property drives the border, the knob fill
     * and the focus ring — its unchecked value is a half-strength base-content
     * hairline, and checking swaps it for the accent.
     */
    tokens: {
        '--switch-size': 'calc(var(--size-selector) * 6)',
        '--switch-p': 'calc(var(--switch-size) * 0.125)',
        '--switch-accent': 'var(--color-primary)',
        // daisy's `--input-color` default is a 50% base-content mix, which puts
        // the unchecked knob at 2.74:1 on `nord` and 3.13:1 on `sunset` —
        // under the 3:1 floor for a non-text mark. 60% clears every theme this
        // package ships (light 4.66, dark 6.23, dim 3.85, nord 3.49,
        // sunset 3.88) and is invisible against daisy at the same hue, the same
        // deepening `--rating-fill` already makes for the same reason.
        '--switch-ink': 'color-mix(in oklab, var(--color-base-content) 60%, #0000)',
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
                // The knob slides because the grid's leading column GROWS:
                // `0fr 1fr 1fr` → `1fr 1fr 0fr`, with the knob parked in
                // column 2. That is daisy's own mechanism, and unlike a
                // `translateX` it is RTL-correct for free.
                display: 'inline-grid',
                gridTemplateColumns: '0fr 1fr 1fr',
                placeContent: 'center',
                position: 'relative',
                verticalAlign: 'middle',
                flexShrink: '0',
                boxSizing: 'border-box',
                width: 'calc((var(--switch-size) * 2) - (var(--border) + var(--switch-p)) * 2)',
                height: 'var(--switch-size)',
                padding: 'var(--switch-p)',
                // daisy's radius formula: the selector radius GROWN by the
                // padding and the border so the knob's own corner and the
                // track's stay concentric, each clamped at 3× the token so a
                // square-cornered theme (cyberpunk, wireframe) stays square.
                '--switch-radius-max': 'calc(var(--radius-selector) + var(--radius-selector) + var(--radius-selector))',
                borderRadius: 'calc(var(--radius-selector) + min(var(--switch-p), var(--switch-radius-max)) + min(var(--border), var(--switch-radius-max)))',
                border: 'var(--border) solid currentColor',
                color: 'var(--switch-ink)',
                boxShadow: '0 1px color-mix(in oklab, currentColor calc(var(--depth) * 10%), #0000) inset',
                userSelect: 'none',
                transition: 'color var(--duration-slow) var(--ease-standard), '
                    + 'background-color var(--duration-normal) var(--ease-standard), '
                    + 'grid-template-columns var(--duration-normal) var(--ease-standard)',
            },
            states: {
                // daisy's checked toggle empties its track to base-100 and paints
                // the KNOB with the accent — so the checked knob's contrast is
                // accent-on-base-100, not accent-content-on-accent. Same
                // trade-off as the checkbox's unchecked outline: 1.11:1 at worst
                // (sunset/`neutral`), 7.68 at best, daisy's own numbers.
                checked: {
                    gridTemplateColumns: '1fr 1fr 0fr',
                    color: 'var(--switch-accent)',
                    backgroundColor: 'var(--color-base-100)',
                },
                unchecked: {},
                'focus-visible': { outline: '2px solid var(--switch-accent)', outlineOffset: '2px' },
                disabled: {},
            },
        },
        thumb: {
            base: {
                // daisy's `.toggle:before`: a square knob that fills its grid
                // cell and takes the UNGROWN selector radius, so it is a
                // rounded square in daisy's rounded-square themes and a circle
                // only where the theme says so.
                gridRowStart: '1',
                gridColumnStart: '2',
                aspectRatio: '1',
                width: '100%',
                height: '100%',
                borderRadius: 'var(--radius-selector)',
                backgroundColor: 'currentColor',
                backgroundSize: 'auto, calc(var(--noise) * 100%)',
                backgroundImage: 'none, var(--fx-noise)',
                boxShadow: '0 -1px var(--depth-shade) inset, 0 8px 0 -4px var(--depth-sheen) inset, '
                    + '0 1px color-mix(in oklab, currentColor calc(var(--depth) * 10%), #0000)',
                transition: 'background-color var(--duration-instant) var(--ease-standard)',
            },
            states: {
                checked: {},
                unchecked: {},
            },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    variants: {
        // daisy's toggle ramp is the selector ramp — ×4…×8 of ONE size, with
        // everything else derived from it.
        size: {
            xs: { root: { base: { '--switch-size': 'calc(var(--size-selector) * 4)' } } },
            sm: { root: { base: { '--switch-size': 'calc(var(--size-selector) * 5)' } } },
            // `md` is the un-attributed render — the defaults in `tokens:`
            // already ARE the middle step.
            md: {},
            lg: { root: { base: { '--switch-size': 'calc(var(--size-selector) * 7)' } } },
            xl: { root: { base: { '--switch-size': 'calc(var(--size-selector) * 8)' } } },
        },
        color: Object.fromEntries(
            ROLES.map((c) => [c, { root: { base: { '--switch-accent': `var(--color-${c})` } } }]),
        ),
    },
    defaultVariants: { color: 'primary' },
    // The visible ring lives on `control`; the <label> root only groups the
    // control and its text. Declared rather than left implicit so the
    // delegation reads as a decision.
    skipStates: { root: ['focus-visible'] },
};

// --------------------------------------------------------------------------
// 2. checkbox — the three clip-paths, the fallback helper, then the recipe
// --------------------------------------------------------------------------

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

/**
 * daisy's tick, drawn by a clip-path that GROWS.
 *
 * The mark is a 45°-rotated bar pair clipped out of a solid box: six points,
 * three of which start collapsed onto their neighbours, so the "unchecked"
 * polygon is a degenerate sliver. Checking moves two of them to the top edge
 * and the tick draws itself — point counts match, so `clip-path` interpolates
 * instead of popping. Indeterminate un-rotates the same six points into a
 * horizontal bar and lifts it to the middle. All three verbatim from daisyUI
 * 5.7.8's `.checkbox:before` / `:checked` / `:indeterminate`.
 */
const TICK_COLLAPSED = 'polygon(20% 100%, 20% 80%, 50% 80%, 50% 80%, 70% 80%, 70% 100%)';
const TICK_DRAWN = 'polygon(20% 100%, 20% 80%, 50% 80%, 50% 0%, 70% 0%, 70% 100%)';
const DASH_DRAWN = 'polygon(20% 100%, 20% 80%, 50% 80%, 50% 80%, 80% 80%, 80% 100%)';

/**
 * The geometry-for-glyph swap daisy ships for forced colours and print, where
 * a clip-path painted with `currentColor` can disappear.
 *
 * daisy hangs the glyph on the same `::before` it uses for the geometry, via
 * `--tw-content`. Our indicator is a real element, and `content` on a
 * non-pseudo element is Chromium/WebKit-only — so the glyph goes on the
 * `::after` this recipe already had, and the indicator itself just drops the
 * geometry. daisyUI 5.7.8 emits the two at-rules as separate blocks; so do we.
 *
 * Both are named built-in conditions since #226, so both sort into the
 * preference tier and land after the flat state rules they override.
 *
 * One object under both, and — unlike every other system here — no `color` of
 * its own: daisy declares none either. Its fallback sets `--tw-content`,
 * `clip-path: none`, `background-color: #0000` and `rotate` and nothing else,
 * leaving the glyph to inherit the control's `color` (the on-accent role, or
 * `base-content` unskinned) and letting the forced palette revalue it. Naming
 * `CanvasText` here would be a truer forced-colors render and a divergence from
 * the thing this package exists to reproduce, so it stays daisy's. Verified
 * against daisyUI 5's own `checkbox.css`, both at-rules.
 *
 * Forced colours are fine either way — the UA revalues the inherited ink to its
 * own text colour, measured at 21:1 against the forced backdrop. On paper it is
 * not: `primary-content` is a pale lavender over a fill that did not print,
 * 1.37:1, exactly as real daisy prints it. Same trade as brutalist's, same
 * issue — #233.
 */
const tickGlyphFallback: PartStyles = {
    states: {
        checked: { opacity: '1', clipPath: 'none', backgroundColor: '#0000', rotate: '0deg' },
        indeterminate: { opacity: '1', clipPath: 'none', backgroundColor: '#0000', rotate: '0deg', translate: 'none' },
    },
    selectors: {
        '&[data-state="checked"]::after': { content: '"✔︎"' },
        '&[data-state="indeterminate"]::after': { content: '"−"' },
    },
};

export const checkbox: RecipeInput = {
    component: 'checkbox',
    // The accent defaults live in `tokens:` (emitted flat on the carrier, no
    // added specificity), so the un-attributed render IS the primary variant
    // and `variants.color` only rebinds custom properties — the toast shape.
    //
    // `--checkbox-pad` is daisy's `padding`, and it is load-bearing: the
    // indicator is `100%`/`100%` of the control's CONTENT box, so the padding
    // is what sizes the tick and what centres it. daisy ramps it with the box.
    tokens: {
        '--checkbox-size': 'calc(var(--size-selector) * 6)',
        '--checkbox-pad': '0.25rem',
        '--checkbox-accent': 'var(--color-primary)',
        '--checkbox-on-accent': 'var(--color-primary-content)',
    },
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
                // daisy's own box: `inline-block` + padding, NOT a flex
                // centring box. The padding does the centring, which is the
                // whole geometric trick — as a flex item the indicator would
                // get `align-self: center` and shrink instead of filling.
                display: 'inline-block',
                position: 'relative',
                verticalAlign: 'middle',
                flexShrink: '0',
                // daisy inherits this from Tailwind's global reset; zero's
                // base.css does not set it, and without it `--checkbox-size`
                // would be the CONTENT box and every checkbox 2×(pad+border)
                // too large.
                boxSizing: 'border-box',
                width: 'var(--checkbox-size)',
                height: 'var(--checkbox-size)',
                padding: 'var(--checkbox-pad)',
                // daisy's `--input-color` border, fallback included: the accent
                // is the UNCHECKED outline too, which is what `.checkbox-primary`
                // does. Faithful, and faithfully weak for the pale roles —
                // measured against base-100 the outline is 1.66:1 on
                // light/`warning`, 1.83 light/`accent`, 1.22 dark/`neutral`
                // (worst 1.11 on sunset/`neutral`), the same numbers real daisy
                // ships and the same ones the checked fill, the radio dot and
                // the toggle knob carry. It is a palette fact, not a geometry
                // one — the tick itself clears 3:1 in all forty cells — and it
                // belongs to the indicator-contrast audit (#228).
                border: 'var(--border) solid var(--checkbox-accent, color-mix(in oklab, var(--color-base-content) 20%, #0000))',
                borderRadius: 'var(--radius-selector)',
                // One `color` declaration drives the tick's `currentColor` fill
                // and the forced-colors glyph, exactly as daisy's does.
                color: 'var(--checkbox-on-accent)',
                // No `background-color`: daisy's unchecked `.checkbox` is
                // TRANSPARENT (computed `rgba(0, 0, 0, 0)`), so the surface it
                // sits on shows through. Painting `--color-base-100` here is
                // invisible on a base-100 page and wrong on every tinted one —
                // a checkbox in a `card` or a `base-200` panel would be an
                // opaque white chip. `checked`/`indeterminate` fill themselves.
                boxShadow: '0 1px var(--depth-shade) inset, 0 0 #0000 inset, 0 0 #0000',
                backgroundSize: 'auto, calc(var(--noise) * 100%)',
                backgroundImage: 'none, var(--fx-noise)',
                cursor: 'pointer',
                transition: 'background-color var(--duration-normal) var(--ease-standard), '
                    + 'box-shadow var(--duration-normal) var(--ease-standard)',
            },
            states: {
                // `checked` is the one state daisy restates the shadow list in,
                // and this IS its list, in its order: the inset relief drops
                // out, a sheen band lights the top of the fill, and the box
                // gains a 1px drop. Three shadows, matching `base`'s three, so
                // the depth interpolates rather than switching.
                checked: {
                    backgroundColor: 'var(--checkbox-accent)',
                    boxShadow: '0 0 #0000 inset, 0 8px 0 -4px var(--depth-sheen) inset, 0 1px var(--depth-shade)',
                },
                // `indeterminate` takes the fill and NOTHING else: daisy's
                // `.checkbox:indeterminate` declares no `box-shadow`, so it
                // keeps the recessed base list — no sheen band, no outer drop.
                // Restating `checked`'s list here (as this recipe did before)
                // put a bright band across the top of the bar that real daisy
                // does not have.
                indeterminate: { backgroundColor: 'var(--checkbox-accent)' },
                unchecked: {},
                'focus-visible': { outline: '2px solid var(--checkbox-accent)', outlineOffset: '2px' },
                // `invalid` is semantic, not an accent: it stays error under
                // every colour variant, on purpose.
                invalid: { borderColor: 'var(--color-error)' },
                disabled: {},
            },
        },
        indicator: {
            base: {
                // daisy's `.checkbox:before`, declaration for declaration.
                display: 'block',
                width: '100%',
                height: '100%',
                opacity: '0',
                rotate: '45deg',
                backgroundColor: 'currentColor',
                clipPath: TICK_COLLAPSED,
                boxShadow: '0 3px 0 0 var(--depth-sheen) inset',
                // Metrics for the forced-colors/print glyph only — daisy
                // carries them on the same element for the same reason.
                fontSize: '1rem',
                lineHeight: '0.75',
                // daisy's staggered four-property transition: the tick's draw
                // and rotation are slow, its fade is instant, and everything
                // waits out the control's fill first. daisy spells the delay
                // `.1s`; the `instant` duration token is the same 100ms AND
                // collapses under prefers-reduced-motion, which a literal
                // cannot.
                transition: 'clip-path var(--duration-slow) var(--ease-standard) var(--duration-instant), '
                    + 'opacity var(--duration-instant) var(--ease-standard) var(--duration-instant), '
                    + 'rotate var(--duration-slow) var(--ease-standard) var(--duration-instant), '
                    + 'translate var(--duration-slow) var(--ease-standard) var(--duration-instant)',
            },
            states: {
                checked: { clipPath: TICK_DRAWN, opacity: '1' },
                indeterminate: { clipPath: DASH_DRAWN, opacity: '1', translate: '0 -35%', rotate: '0deg' },
                unchecked: {},
            },
            at: { 'forced-colors': tickGlyphFallback, print: tickGlyphFallback },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' },
            states: { checked: {}, unchecked: {}, indeterminate: {}, disabled: {} },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--checkbox-accent': `var(--color-${c})`,
            '--checkbox-on-accent': `var(--color-${c}-content)`,
        } } }])),
        // daisy's own selector ramp — ×4…×8 of `--size-selector`, i.e.
        // 1 / 1.25 / 1.5 / 1.75 / 2rem, each with its own padding step.
        size: {
            xs: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 4)', '--checkbox-pad': '0.125rem' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 5)', '--checkbox-pad': '0.1875rem' } }, label: { base: { fontSize: 'var(--text-sm)' } } },
            md: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 6)', '--checkbox-pad': '0.25rem' } }, label: { base: { fontSize: 'var(--text-sm)' } } },
            lg: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 7)', '--checkbox-pad': '0.3125rem' } }, label: { base: { fontSize: 'var(--text-md)' } } },
            xl: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 8)', '--checkbox-pad': '0.375rem' } }, label: { base: { fontSize: 'var(--text-lg)' } } },
        },
    },
    // The visible ring lives on `control`; the <label> root only groups the
    // control and its text. Declared rather than left implicit so the
    // delegation reads as a decision.
    skipStates: { root: ['focus-visible'] },
};

// --------------------------------------------------------------------------
// 3. radioGroup — replace the whole export
// --------------------------------------------------------------------------

export const radioGroup: RecipeInput = {
    component: 'radio-group',
    // Same padding-derived geometry as the checkbox: daisy's `.radio:before` is
    // `100%`/`100%` of the padded box, so `--radio-pad` IS the dot's size.
    tokens: {
        '--radio-size': 'calc(var(--size-selector) * 6)',
        '--radio-pad': '0.25rem',
        '--radio-accent': 'var(--color-primary)',
    },
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
                // daisy's `.radio`: an inline-block padded box, not a flex
                // centring box — the padding is what insets the dot.
                display: 'inline-block',
                position: 'relative',
                verticalAlign: 'middle',
                flexShrink: '0',
                boxSizing: 'border-box',
                width: 'var(--radio-size)',
                height: 'var(--radio-size)',
                padding: 'var(--radio-pad)',
                border: 'var(--border) solid var(--radio-accent, color-mix(in srgb, currentColor 20%, #0000))',
                borderRadius: '9999px',
                color: 'var(--radio-accent)',
                backgroundColor: 'var(--color-base-100)',
                boxShadow: '0 1px var(--depth-shade) inset',
                transition: 'border-color var(--duration-normal) var(--ease-standard), '
                    + 'box-shadow var(--duration-normal) var(--ease-standard)',
            },
            states: {
                // daisy's checked radio squeezes its padding — the dot pops in
                // rather than fading. The keyframe is daisy's own (5px → 3px
                // against a 4px base), rewritten as a ratio so it tracks the
                // size ramp instead of only being right at `md`.
                checked: {
                    borderColor: 'currentColor',
                    animation: 'var(--duration-fast) var(--ease-standard) zero-daisy-radio',
                },
                unchecked: {},
                'focus-visible': { outline: '2px solid var(--radio-accent)', outlineOffset: '2px' },
                disabled: {},
            },
        },
        'item-indicator': {
            base: {
                // daisy's `.radio:before` — the dot IS the content box.
                display: 'block',
                width: '100%',
                height: '100%',
                borderRadius: '9999px',
                backgroundColor: 'transparent',
                backgroundSize: 'auto, calc(var(--noise) * 100%)',
                backgroundImage: 'none, var(--fx-noise)',
                transition: 'background-color var(--duration-instant) var(--ease-standard)',
            },
            states: {
                checked: {
                    backgroundColor: 'currentColor',
                    boxShadow: '0 -1px var(--depth-shade) inset, 0 8px 0 -4px var(--depth-sheen) inset, 0 1px var(--depth-shade)',
                },
                unchecked: {},
            },
        },
        'item-label': {
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--radio-accent': `var(--color-${c})`,
        } } }])),
        // Same selector ramp daisy gives its radios — ×4…×8 with daisy's own
        // padding step, which is what sizes the dot.
        size: {
            xs: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 4)', '--radio-pad': '0.125rem' } }, 'item-label': { base: { fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 5)', '--radio-pad': '0.1875rem' } }, 'item-label': { base: { fontSize: 'var(--text-sm)' } } },
            md: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 6)', '--radio-pad': '0.25rem' } }, 'item-label': { base: { fontSize: 'var(--text-sm)' } } },
            lg: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 7)', '--radio-pad': '0.3125rem' } }, 'item-label': { base: { fontSize: 'var(--text-md)' } } },
            xl: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 8)', '--radio-pad': '0.375rem' } }, 'item-label': { base: { fontSize: 'var(--text-lg)' } } },
        },
    },
    keyframes: {
        'zero-daisy-radio': '0% { padding: calc(var(--radio-pad) * 1.25); } 50% { padding: calc(var(--radio-pad) * 0.75); }',
    },
    // The visible ring lives on `item-control`; `item` is the <label> that
    // wraps it. Declared rather than left implicit so the delegation reads
    // as a decision.
    skipStates: { item: ['focus-visible'] },
};

// --------------------------------------------------------------------------
// 4. progress — replace the whole export (only the two radius lines move)
// --------------------------------------------------------------------------

/**
 * A progress fill, deepened toward its own content pair just enough to clear
 * the 3:1 a bar owes the track it fills.
 *
 * Two strengths, each the gentlest that works — measured against the base-300
 * track in all five themes (#228):
 *
 * - the ACCENT at 90/10: raw `--color-primary` lands at 2.98:1 on `nord`, and
 *   nowhere else under 3. 90/10 lifts nord to 3.63 and leaves the rest at
 *   3.9+ (dark 4.36, light 5.02, sunset 6.31, dim 8.40). Deepening further is
 *   what fails: at 70/30 the dark theme drops to 2.83, because a mix toward
 *   `-content` darkens a fill that already sits on a dark track.
 * - `complete`'s SUCCESS at 70/30: raw success is the worst cell in the whole
 *   indicator matrix — 1.51:1 on nord, 2.44 light — a finished bar that reads
 *   as an empty one. Only 70/30 clears every theme (nord 3.05, dark 3.02,
 *   light 4.68, dim 5.08, sunset 5.96); 75/25 drops nord back to 2.71.
 */
const progressFill = (role: string, keep: number): string =>
    `color-mix(in oklab, var(--color-${role}) ${keep}%, var(--color-${role}-content))`;

export const progress: RecipeInput = {
    component: 'progress',
    tokens: {
        '--progress-accent': progressFill('primary', 90),
        '--progress-track-size': 'calc(var(--size-selector) * 2.5)',
    },
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
                height: 'var(--progress-track-size)',
                background: 'var(--color-base-300)',
                // daisy's `.progress` is a BOX, not a selector control — it
                // reads --radius-box. Reading --radius-selector only looked
                // right while that token was 3x too large.
                borderRadius: 'var(--radius-box)',
                overflow: 'hidden',
            },
        },
        range: {
            base: {
                height: '100%',
                background: 'var(--progress-accent)',
                borderRadius: 'var(--radius-box)',
                transition: 'width var(--duration-slow) var(--ease-standard)',
            },
            states: {
                // `complete` is a semantic state, not an accent: it stays
                // success regardless of the colour variant, on purpose.
                complete: { background: progressFill('success', 70) },
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
    variants: {
        // The same 90/10 deepening the default gets, so the un-attributed
        // render IS `color="primary"` and no role is left on the raw token.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--progress-accent': progressFill(c, 90),
        } } }])),
        size: {
            xs: { root: { base: { '--progress-track-size': 'var(--size-selector)' } } },
            sm: { root: { base: { '--progress-track-size': 'calc(var(--size-selector) * 1.5)' } } },
            md: { root: { base: { '--progress-track-size': 'calc(var(--size-selector) * 2.5)' } } },
            lg: { root: { base: { '--progress-track-size': 'calc(var(--size-selector) * 3.5)' } } },
            xl: { root: { base: { '--progress-track-size': 'calc(var(--size-selector) * 4.5)' } } },
        },
    },
    keyframes: {
        'zero-daisy-indeterminate': 'from { margin-left: -40%; } to { margin-left: 100%; }',
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
                // `invalid` is semantic: it stays error under every colour
                // variant, on purpose.
                invalid: { accentColor: 'var(--color-error)' },
            },
        },
        'value-text': {
            base: { fontSize: 'var(--text-xs)', opacity: '0.6' },
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
    // Accent as text/border ink only — daisy's highlighted item is a neutral
    // base-200 wash, so no `-on-accent` content colour is consumed here.
    tokens: { '--select-accent': 'var(--color-primary)' },
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
                open: { borderColor: 'var(--select-accent)' },
                closed: {},
                // `invalid` is semantic: it stays error under every colour
                // variant, on purpose.
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
                selected: { color: 'var(--select-accent)', fontWeight: 'var(--weight-bold)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        'item-indicator': {
            base: { fontSize: 'var(--text-xs)', color: 'var(--select-accent)' },
            states: { selected: {} },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--select-accent': `var(--color-${c})`,
        } } }])),
        // The trigger is a daisy btn, so it sizes the btn way: a fixed
        // height plus paddingInline, stepped on --size-field.
        size: {
            xs: { trigger: { base: { height: 'calc(var(--size-field) * 8)', paddingInline: 'calc(var(--size-field) * 2)', fontSize: 'var(--text-xs)' } } },
            sm: { trigger: { base: { height: 'calc(var(--size-field) * 10)', paddingInline: 'calc(var(--size-field) * 3)', fontSize: 'var(--text-sm)' } } },
            md: { trigger: { base: { height: 'calc(var(--size-field) * 12)', paddingInline: 'calc(var(--size-field) * 4)', fontSize: 'var(--text-sm)' } } },
            lg: { trigger: { base: { height: 'calc(var(--size-field) * 14)', paddingInline: 'calc(var(--size-field) * 5)', fontSize: 'var(--text-md)' } } },
            xl: { trigger: { base: { height: 'calc(var(--size-field) * 16)', paddingInline: 'calc(var(--size-field) * 6)', fontSize: 'var(--text-lg)' } } },
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
    tokens: {
        '--avatar-size': 'calc(var(--size-selector) * 10)',
        '--avatar-text': 'var(--text-sm)',
        '--avatar-ring': 'var(--color-primary)',
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
                background: 'var(--color-base-200)',
                // daisy's avatar ring, in role color.
                boxShadow: '0 0 0 2px var(--color-base-100), 0 0 0 4px var(--avatar-ring)',
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
                fontSize: 'var(--avatar-text)',
                fontWeight: 'var(--weight-semibold)',
                userSelect: 'none',
            },
            // `display` must not defeat the `hidden` zero sets once the image
            // has loaded.
            selectors: { '&:not([hidden])': { display: 'grid' } },
            states: { loading: {}, loaded: {}, error: {} },
        },
    },
    variants: {
        // daisy colours the RING, not the fallback — that is what its avatar
        // does, and the fallback stays neutral so initials read the same
        // whichever role is chosen.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--avatar-ring': `var(--color-${c})`,
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
    // Accent as text/border ink only — daisy's highlighted item is a neutral
    // base-200 wash, so no `-on-accent` content colour is consumed here.
    tokens: { '--combobox-accent': 'var(--color-primary)' },
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
                open: { borderColor: 'var(--combobox-accent)' },
                closed: {},
                // `invalid` is semantic: it stays error under every colour
                // variant, on purpose.
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
                selected: { color: 'var(--combobox-accent)' },
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
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--combobox-accent': `var(--color-${c})`,
        } } }])),
        // The input sizes on its own padding rather than a btn-style fixed
        // height: the resting field is content-sized, and `md` must restate
        // exactly those resting values so the union stays complete.
        size: {
            xs: { input: { base: { padding: 'var(--space-2xs) var(--space-md)', fontSize: 'var(--text-xs)' } } },
            sm: { input: { base: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-sm)' } } },
            md: { input: { base: { padding: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--text-sm)' } } },
            lg: { input: { base: { padding: 'var(--space-md) var(--space-xl)', fontSize: 'var(--text-md)' } } },
            xl: { input: { base: { padding: 'var(--space-lg) var(--space-2xl)', fontSize: 'var(--text-lg)' } } },
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
        // The group is a frame around its items, so the ramp lands on the
        // items and the frame follows their box.
        size: {
            xs: { item: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-sm)' } } },
            sm: { item: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-xs) var(--space-md)' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { item: { base: { fontSize: 'var(--text-md)', padding: 'var(--space-md) var(--space-xl)' } } },
            xl: { item: { base: { fontSize: 'var(--text-lg)', padding: 'var(--space-lg) var(--space-2xl)' } } },
        },
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
    tokens: { '--number-input-accent': 'var(--color-base-content)' },
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
                'focus-visible': { ...focusRing['focus-visible'], outline: '2px solid var(--number-input-accent)' },
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
    variants: {
        // The field's own ring carries the role — the chrome is neutral, so
        // the focus state is the only place a number input can show colour.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--number-input-accent': `var(--color-${c})`,
        } } }])),
        // The readout carries the ramp; the steppers follow it so the frame
        // stays proportional.
        size: {
            xs: { input: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-xs)' } } },
            sm: { input: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-xs) var(--space-sm)' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { input: { base: { fontSize: 'var(--text-md)', padding: 'var(--space-md) var(--space-lg)' } } },
            xl: { input: { base: { fontSize: 'var(--text-lg)', padding: 'var(--space-lg) var(--space-xl)' } } },
        },
    },
};

/**
 * daisy "rating" flavor: a row of orange filled symbols. The default content
 * is a text star, so `color` + `font-size` carry the whole visual — and, for a
 * HALF, a two-layer mask.
 *
 * RATING_HALF_SPLIT — why this is daisy's technique on a different anatomy.
 * daisy halves a rating by rendering TWO half-width inputs per symbol
 * (`.rating-half *` → `width: calc(var(--size) * .5)`) and masking each to one
 * side of the star: `.mask-half-1` is `mask-position: 0; mask-size: 200%`,
 * `.mask-half-2` is `mask-position: 100%`. Neither half of that is available
 * here. zero's anatomy gives ONE `item` span per symbol, carrying
 * `full|half|empty` itself, and that span paints CONTENT (the symbol slot,
 * defaulting to a text star) where daisy's paints a `mask-image` the design
 * system owns. So the split moves off two masked siblings and onto one masked
 * element: two mask layers, an opaque one sized to the filled fraction and a
 * 25%-alpha one under it, which reproduces daisy's "solid leading half,
 * ghosted trailing half" on whatever symbol the consumer renders. It is
 * `mask-size` that differs between the states, so the fill wipes rather than
 * switches. What is NOT reproduced is daisy's two-hue split (its ghost half is
 * base-content, ours is the fill at low alpha) — a second hue needs a second
 * paint layer, and the only way to get one out of a text node is
 * `background-clip: text`, which would make an SVG symbol slot invisible.
 *
 * The mask HALVES whatever the item paints, so it depends on the symbol being
 * full width in all three states. zero's default is: `★`/`★`/`☆`, because the
 * half-star codepoint U+2BEA is tofu in the system stacks and the runtime
 * therefore does not attempt a half of its own (#222).
 */
/**
 * How far each role's rating symbol is deepened toward its own content pair.
 *
 * daisy's raw roles are not safe on bare paper — `--color-warning` sits at
 * 1.62:1 on light base-100 — so the symbol is mixed toward the role's own
 * `-content`, which keeps the hue. 70/30 was measured across all five themes
 * (#226) at 3.34 light, 4.74 dark, 4.19 dim, 5.32 sunset — and **2.81 on
 * `nord`**, whose pale-yellow warning on a 95%-white base-100 was the one cell
 * under 3:1.
 *
 * That comment ended "the fill/ghost pair needs a per-role decision … which is
 * the indicator-contrast audit's job (#228)". This is that decision, and it is
 * per-role because moving the ratio for EVERYONE is what does not work: at
 * 60/40 nord's warning clears (3.70) but two more theme×role cells drop under
 * 3:1 (sunset's `secondary` and `accent`), because deepening toward `-content`
 * helps a light theme and hurts a dark one. Deepening only the role that needs
 * it fixes nord's warning — the DEFAULT symbol, the one the audit measures —
 * and moves nothing else: warning at 60/40 reads 4.40 light, 3.60 dark, 3.17
 * dim, 3.70 nord, 4.03 sunset.
 *
 * The nine remaining sub-3:1 theme×role cells are daisy's own accent-on-paper
 * numbers and stay that way — the indicator audit measures the DEFAULT variant
 * only (`variants` would explode the matrix into thousands of cells), so they
 * are recorded here rather than allowlisted there.
 */
const RATING_DEEPEN: Record<string, number> = { warning: 60 };

const ratingFill = (role: string): string =>
    `color-mix(in oklab, var(--color-${role}) ${RATING_DEEPEN[role] ?? 70}%, var(--color-${role}-content))`;

export const ratingGroup: RecipeInput = {
    component: 'rating-group',
    tokens: {
        '--rating-size': 'calc(var(--size-selector) * 6)',
        '--rating-fill': ratingFill('warning'),
    },
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
        control: {
            base: { display: 'inline-flex', gap: 'var(--space-2xs)' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                readonly: {},
                'focus-visible': {
                    outline: '2px solid var(--color-base-content)',
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
                /**
                 * The unfilled symbol, in daisy's own model — base-content at
                 * reduced strength, nothing else changing.
                 *
                 * daisy's fraction is 20%, which measures 1.44:1 (nord) to
                 * 1.88:1 (dark) against base-100: five stars whose count you
                 * cannot read. 60% is the same fraction daisy's `--input-color`
                 * was raised to in this package, for the same reason and to the
                 * same floor — 4.66 light, 6.23 dark, 3.85 dim, 3.49 nord,
                 * 3.88 sunset (#228).
                 */
                color: 'color-mix(in oklab, var(--color-base-content) 60%, transparent)',
                // The split that makes a half a half — see RATING_HALF_SPLIT.
                // Both stops are ALPHA channels, not palette colours: the top
                // layer is opaque over the filled fraction, the bottom one
                // ghosts whatever it does not cover.
                maskImage: 'linear-gradient(black 0 0), linear-gradient(rgb(0 0 0 / 0.25) 0 0)',
                maskRepeat: 'no-repeat',
                maskPosition: '0 0, 0 0',
                maskSize: '100% 100%, 100% 100%',
                transition: 'color var(--duration-fast) var(--ease-standard), '
                    + 'mask-size var(--duration-fast) var(--ease-standard), '
                    + 'transform var(--duration-fast) var(--ease-standard), '
                    + 'filter var(--duration-fast) var(--ease-standard)',
            },
            states: {
                full: { color: 'var(--rating-fill)' },
                // Only `mask-size` moves, so the fill WIPES across the symbol
                // rather than switching — and at rest the split is daisy's
                // hard 50%.
                half: { color: 'var(--rating-fill)', maskSize: '50% 100%, 100% 100%' },
                empty: {},
                // The hover-preview range: daisy scales and brightens the
                // symbols under the pointer.
                highlighted: { transform: 'scale(1.15)', filter: 'brightness(1.1)' },
                disabled: { cursor: 'not-allowed' },
                readonly: { cursor: 'default' },
                // The group ring lives on control; per-item focus still gets
                // a marker for the value-following tab stop.
                'focus-visible': {
                    outline: '2px solid var(--color-base-content)',
                    outlineOffset: '1px',
                    borderRadius: 'var(--radius-selector)',
                },
            },
            selectors: {
                // A half fills from the inline START, so the mask origin flips
                // with the writing mode — daisy flips `.mask-half-*` through
                // the same guard, and for the same reason.
                '&:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *)': { maskPosition: '100% 0, 0 0' },
            },
            at: {
                // The brightness lift stays — only the motion goes.
                'reduced-motion': {
                    base: { transition: 'none' },
                    states: { highlighted: { transform: 'none' } },
                },
            },
        },
    },
    variants: {
        // The same deepening the default gets, per role — see `RATING_DEEPEN`.
        // It does NOT clear 3:1 for every role in every theme (measured worst
        // cells: dim/`neutral` 1.58, sunset/`neutral` 1.82, dark/`error` 2.25,
        // light/`secondary` 2.45): those are daisy's own accent-on-paper
        // numbers, and only a per-role table could move them one at a time.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--rating-fill': ratingFill(c),
        } } }])),
        size: {
            xs: { root: { base: { '--rating-size': 'calc(var(--size-selector) * 4)' } } },
            sm: { root: { base: { '--rating-size': 'calc(var(--size-selector) * 5)' } } },
            // `md` is the un-attributed render — the defaults in `tokens:`
            // already ARE the middle step.
            md: {},
            lg: { root: { base: { '--rating-size': 'calc(var(--size-selector) * 7)' } } },
            xl: { root: { base: { '--rating-size': 'calc(var(--size-selector) * 8)' } } },
        },
    },
};

// daisy "menu" row, shared by the two clickable tree rows (item and
// branch-trigger) the way `btn` is shared across button-shaped parts.
const treeRow: NonNullable<PartStyles['base']> = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: 'var(--space-sm) var(--space-md)',
    fontSize: 'var(--tree-text)',
    fontWeight: 'var(--weight-medium)',
    borderRadius: 'var(--radius-field)',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background var(--duration-fast) var(--ease-standard), '
        + 'color var(--duration-fast) var(--ease-standard)',
};

const treeRowStates: NonNullable<PartStyles['states']> = {
    hover: { background: 'var(--color-base-200)' },
    // daisy menu's active row: role fill, its own -content ink. Both track
    // `color`, or a secondary row would keep primary's ink on a secondary fill.
    selected: { background: 'var(--tree-accent)', color: 'var(--tree-on-accent)' },
    disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
    // Rows sit flush inside the tree, so an offset ring would collide with
    // the neighbouring rows — inset it, as toggle-group does.
    'focus-visible': {
        outline: '2px solid var(--color-base-content)',
        outlineOffset: '-2px',
    },
};

const treeRowSelectors: NonNullable<PartStyles['selectors']> = {
    // Selection must outrank the hover wash — equal specificity
    // ([data-selected]:hover vs :hover:not([data-disabled])), later in
    // source, so selected wins.
    '&[data-selected]:hover': { background: 'var(--color-primary)' },
    // Pressed: the runtime's press feedback, not `:active` — see button.
    // Rows sink by tint (toggle-row idiom), not translate; excluded on
    // selected rows so base-300 never sits under -content ink.
    '&[data-pressed]:not([data-disabled]):not([data-selected])': {
        background: 'var(--color-base-300)',
    },
};

export const treeView: RecipeInput = {
    component: 'tree-view',
    tokens: {
        '--tree-accent': 'var(--color-primary)',
        '--tree-text': 'var(--text-sm)',
        '--tree-on-accent': 'var(--color-primary-content)',
    },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
        },
        tree: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
        },
        item: {
            base: treeRow,
            states: treeRowStates,
            selectors: treeRowSelectors,
        },
        // Structural wrapper — the row look lives on branch-trigger; the
        // wrapper only stacks trigger over content and stays invisible.
        branch: {
            base: { display: 'flex', flexDirection: 'column', outline: 'none' },
            states: { open: {}, closed: {}, selected: {}, disabled: {} },
        },
        'branch-trigger': {
            base: { ...treeRow, userSelect: 'none' },
            states: { ...treeRowStates, open: {}, closed: {} },
            selectors: treeRowSelectors,
        },
        'branch-indicator': {
            base: {
                display: 'inline-block',
                opacity: '0.6',
                transition: 'transform var(--duration-fast) var(--ease-standard)',
            },
            states: { open: { transform: 'rotate(90deg)' }, closed: {} },
            at: {
                'reduced-motion': { base: { transition: 'none' } },
            },
        },
        // Indentation comes from this inline padding — depth is the DOM
        // nesting, no per-level rules needed.
        'branch-content': {
            base: { display: 'flex', flexDirection: 'column', paddingInlineStart: 'var(--space-lg)' },
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
    tabs, collapsible, switchRecipe, dialog, popover, tooltip, menu,
    field, checkbox, radioGroup, progress, slider, accordion, select, button, avatar, toast, combobox,
    toggle, toggleGroup, numberInput, ratingGroup, treeView,
];
