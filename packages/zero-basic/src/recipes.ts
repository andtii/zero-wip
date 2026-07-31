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
 * The ink a role writes with on its own soft tint and on bare paper —
 * outline/soft/ghost button text, the on-state of toggles. Six of eight raw
 * roles compute ≥5.53:1 on the tint in both themes; two are codified
 * exceptions rather than hoped about:
 * - `neutral` is a fill, not an ink — near-invisible on its own dark-theme
 *   tint (1.45:1). Base-content is the correct ink in both themes.
 * - `warning` is a light ink in the light theme (2.84:1 on its tint).
 *   A recipe cannot scope a rule to one theme, so the fix must be symmetric:
 *   deepening toward base-content keeps the warm hue and lands on the
 *   readable side in BOTH schemes, because base-content flips with them.
 *   Measured (oklch→sRGB→WCAG, against the shipped token values): the 45/55
 *   mix computes 6.67:1 on the light warning tint and 7.36:1 on light paper;
 *   9.90:1 and 12.35:1 in dark — every surface ≥6.3:1, ≥2.1× the audit's
 *   3:1 hard floor.
 */
const softInk = (role: string): string =>
    role === 'neutral' ? 'var(--color-base-content)'
        : role === 'warning' ? 'color-mix(in oklch, var(--color-warning) 45%, var(--color-base-content))'
            : `var(--color-${role})`;

/**
 * The structural line Monograph draws everything with — regions, popups,
 * separators, indent guides. Depth is hairlines, not shadows.
 */
const hairline = 'var(--border) solid var(--color-base-300)';

/**
 * Hover and pressed feedback as a translucent film of ink rather than a jump
 * to a fixed base step: overlay panels sit on `base-200` in dark (see
 * `overlaySurface`), where a `base-200` wash would vanish. Mixing
 * `base-content` at 6%/12% reads as one/two steps of ink density on any
 * surface, in both schemes.
 *
 * THE RULE: every piece of furniture — tabs, toggles, triggers, steppers,
 * rows — hovers with `inkWash` and presses with `inkWashDeep`, one dialect
 * everywhere. Opaque `base-200`/`base-300` fills are reserved for exactly one
 * idiom, the button's ghost variant, whose wash-then-ink grammar is its own
 * signature (see the `ghost` fill in `button`).
 */
const inkWash = 'color-mix(in oklch, var(--color-base-content) 6%, transparent)';
const inkWashDeep = 'color-mix(in oklch, var(--color-base-content) 12%, transparent)';

/**
 * Pressed is instantaneous ink density — the runtime's press feedback
 * (`data-pressed`), not `:active`: same sink, with keyboard parity and
 * drag-off semantics the pseudo-class can't guarantee. Suppressing the colour
 * transition makes the sink land the frame the pointer does; nothing in
 * Monograph moves under the pointer, so there is no transform. The `:not`
 * covers a press that goes disabled mid-gesture, and the flag's extra
 * attribute outranks the state rules, so pressed wins over any hover or
 * highlighted wash it lands on.
 */
const pressedInk: Record<string, CssProps> = {
    '&[data-pressed]:not([data-disabled])': { background: inkWashDeep, transition: 'none' },
};

/**
 * Every transient surface wears the same costume: a `base-300` hairline plus
 * the single honest `lg` shadow — die-cut paper in light. In dark, depth
 * shifts to surface steps, so the panel rises to `base-200` (`light-dark()`
 * resolves against each theme's declared `color-scheme`) and the `lg`
 * shadow's inset top highlight from `systemDark` makes it read lit-from-above
 * rather than merely outlined. The uniformity is the brand.
 */
const overlaySurface = 'light-dark(var(--color-base-100), var(--color-base-200))';
const overlayPanel: NonNullable<PartStyles['base']> = {
    background: overlaySurface,
    color: 'var(--color-base-content)',
    border: hairline,
    borderRadius: 'var(--radius-box)',
    boxShadow: 'var(--shadow-lg)',
};

/**
 * The quiet trigger an overlay opens from: transparent over the page inside a
 * hairline frame — furniture until touched. Hover is one film of ink, `open`
 * holds it while the surface is up, pressed (via `pressedInk`) is two.
 */
const quietTrigger: NonNullable<PartStyles['base']> = {
    appearance: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5em',
    padding: 'var(--space-md) var(--space-xl)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 'var(--leading-none)',
    color: 'var(--color-base-content)',
    background: 'transparent',
    border: hairline,
    borderRadius: 'var(--radius-field)',
    cursor: 'pointer',
    transition: 'background var(--duration-fast) var(--ease-standard), '
        + 'border-color var(--duration-fast) var(--ease-standard), '
        + 'color var(--duration-fast) var(--ease-standard)',
};

/**
 * The icon-only dismiss glyph: a toast's ✕, and nothing else.
 *
 * NAMED for the one job it does, because the old name (`ghostButton`) is what
 * made this a bug — it read as "the borderless button", so dialog's and
 * popover's closes reached for it too and rendered a caption where a control
 * belonged (#245). The anatomy is what separates the two: **toast declares an
 * `action` part**, so its close is a glyph by construction; dialog and popover
 * declare none at all, so their close IS the surface's action and gets
 * `dismissAction` below.
 */
const iconClose: NonNullable<PartStyles['base']> = {
    appearance: 'none',
    padding: 'var(--space-xs) var(--space-md)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-medium)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 'var(--leading-none)',
    color: 'var(--color-base-content)',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-field)',
    cursor: 'pointer',
    transition: 'background var(--duration-fast) var(--ease-standard)',
};

/**
 * `Dialog.Close` and `Popover.Close` — the surface's own action, so it gets a
 * control's box rather than the ✕'s caption shape.
 *
 * It is `quietTrigger`'s box on purpose: the thing that opened the surface and
 * the thing that dismisses it then read as the same kind of control, one
 * hairline frame apart from the page. Neutral rather than accented, because a
 * recipe cannot know whether the label says "Got it" or "Cancel" — an app that
 * wants to say more wraps the part in a Button.
 */
const dismissAction: PartStyles = {
    base: quietTrigger,
    states: {
        hover: { background: inkWash },
        disabled: { opacity: 'var(--disabled-opacity)' },
        ...focusRing,
    },
    selectors: { ...pressedInk },
};

/**
 * Enter/exit presence for a top-layer popup — dialog, popover, menu, select,
 * tooltip. The rise: entry is opacity plus a 4px translate toward final
 * position at `normal`/`standard` (no scale, ever); exit fades at
 * `fast`/`exit` with no travel — the base state carries no transform, so a
 * closing panel never moves. Each direction rides the transition declared at
 * its destination, which is how one element gets two tempos.
 *
 * Zero never unmounts a popup; it toggles `data-state` and calls the native
 * `showPopover()` / `showModal()`. That is all the platform needs: transition
 * `display` and `overlay` with `allow-discrete` and the browser keeps the
 * element in the top layer for the duration of the exit fade, while
 * `@starting-style` supplies the state the entry animates FROM — without it
 * the element simply appears at its open value.
 *
 * `overlay` is Chromium-only as of writing; elsewhere the entry still animates
 * and the exit is instant.
 */
const popupPresence = (from: string): PartStyles => ({
    base: {
        opacity: '0',
        transition: 'opacity var(--duration-fast) var(--ease-exit), '
            + 'display var(--duration-fast) allow-discrete, '
            + 'overlay var(--duration-fast) allow-discrete',
    },
    states: {
        open: {
            opacity: '1',
            transform: 'none',
            transition: 'opacity var(--duration-normal) var(--ease-standard), '
                + 'transform var(--duration-normal) var(--ease-standard), '
                + 'display var(--duration-normal) allow-discrete, '
                + 'overlay var(--duration-normal) allow-discrete',
        },
    },
    at: {
        'starting-style': { states: { open: { opacity: '0', transform: from } } },
        // A looping animation would be sped up by the collapsed durations, but
        // a one-shot transition just becomes instant — which is what reduced
        // motion asks for. Stating it anyway keeps the intent explicit and
        // covers the discrete properties, which have no duration to collapse.
        'reduced-motion': {
            base: { transition: 'none' },
            states: { open: { transition: 'none', transform: 'none' } },
        },
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
        // The margin-marker grammar, run along the active edge: the tab bar is
        // a hairline rule and the current tab carries a 2px accent bar over
        // it — the "current page" marker of a docs sidebar, rotated. No pill,
        // no radius: shape never signals hierarchy here, the line does.
        tab: {
            base: {
                appearance: 'none',
                background: 'none',
                border: 'none',
                borderBottom: '2px solid transparent',
                marginBottom: 'calc(-1 * var(--border))',
                padding: '0.5rem 0.875rem',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                fontVariantNumeric: 'tabular-nums',
                color: 'color-mix(in oklab, var(--color-base-content) 70%, transparent)',
                cursor: 'pointer',
                transition: 'color var(--duration-fast) var(--ease-standard), '
                    + 'background var(--duration-fast) var(--ease-standard), '
                    + 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { color: 'var(--color-base-content)', background: inkWash },
                // Selection stays weight 500 — the accent ink and the 2px bar
                // do the work, so the label never reflows on activation.
                active: { color: 'var(--tabs-accent)', borderBottomColor: 'var(--tabs-accent)' },
                inactive: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
            selectors: { ...pressedInk },
        },
        panel: {
            base: { fontSize: 'var(--text-md)', fontVariantNumeric: 'tabular-nums' },
            states: { active: {}, inactive: {} },
        },
    },
    variants: {
        size: {
            xs: { tab: { base: { fontSize: 'var(--text-xs)', padding: '0.25rem 0.5rem' } } },
            sm: { tab: { base: { fontSize: 'var(--text-xs)', padding: '0.375rem 0.75rem' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { tab: { base: { fontSize: 'var(--text-md)', padding: '0.625rem 1.125rem' } } },
            xl: { tab: { base: { fontSize: 'var(--text-lg)', padding: '0.75rem 1.375rem' } } },
        },
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--tabs-accent': `var(--color-${c})`,
        } } }])),
    },
};

export const collapsible: RecipeInput = {
    component: 'collapsible',
    parts: {
        // A bordered region, not a floating card: the hairline is the depth.
        root: withPresence(disclosurePresence, {
            base: {
                border: hairline,
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
                fontVariantNumeric: 'tabular-nums',
                borderRadius: 'var(--radius-box)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), '
                    + 'color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: inkWash },
                // Open is the reading position: the heading takes the
                // protagonist ink and the weight holds 500 — colour does the
                // work, nothing gets heavier.
                open: {
                    color: 'var(--color-primary)',
                    borderRadius: 'var(--radius-box) var(--radius-box) 0 0',
                },
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)' },
                // Inset ring: the trigger spans the bordered region edge to
                // edge, so an offset ring would ride on top of the hairline
                // frame. Still the one petrol ink.
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '-2px' },
            },
            selectors: { ...pressedInk },
        },
        panel: {
            base: {
                padding: 'var(--space-lg) var(--space-xl)',
                borderTop: hairline,
                fontSize: 'var(--text-md)',
                lineHeight: 'var(--leading-normal)',
                fontVariantNumeric: 'tabular-nums',
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
        /**
         * The off-thumb's edge — the same 55% ink this design system's
         * placeholders are drawn in, not `--color-base-300`.
         *
         * `base-300` was the hairline tone here, and against the `base-200`
         * track it has to separate from it measures 1.15:1: a rule nobody can
         * see, around a paper disc that is itself 1.07:1 on that track. The
         * edge IS the mark, so it is held to the mark's floor — 3.48:1 light,
         * 4.80:1 dark (#228).
         */
        '--switch-thumb-edge': 'color-mix(in oklch, var(--color-base-content) 55%, transparent)',
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
        // The track is a drawn surface, not a gray slab: base-200 with an
        // inset hairline (a box-shadow rather than a border, so the declared
        // geometry the thumb math relies on never shifts). The pill silhouette
        // is the component's own; the radius token governs corners, not this.
        control: {
            base: {
                display: 'inline-block',
                position: 'relative',
                width: 'var(--switch-width)',
                height: 'var(--switch-height)',
                borderRadius: '9999px',
                background: 'var(--color-base-200)',
                boxShadow: 'inset 0 0 0 var(--border) var(--color-base-300)',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                checked: { background: 'var(--color-primary)', boxShadow: 'none' },
                unchecked: {},
                'focus-visible': {
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: '2px',
                },
                disabled: {},
            },
        },
        /**
         * Paper thumb with its own hairline; nothing at rest casts a shadow.
         * On the filled track the line drops — a die-cut disc needs no rule.
         *
         * The hairline is a BORDER now, not the inset `box-shadow` it used to
         * be. The shadow was chosen so the declared geometry could not shift;
         * `border-box` keeps that promise, and buys the one thing a shadow
         * cannot give: `forced-colors: active` strips shadows, and the edge is
         * the only thing separating paper from a `base-200` track.
         */
        thumb: {
            base: {
                position: 'absolute',
                top: 'var(--switch-pad)',
                left: 'var(--switch-pad)',
                boxSizing: 'border-box',
                width: 'calc(var(--switch-height) - var(--switch-pad) * 2)',
                height: 'calc(var(--switch-height) - var(--switch-pad) * 2)',
                borderRadius: '9999px',
                border: 'var(--border) solid var(--switch-thumb-edge)',
                background: 'var(--color-base-100)',
                transition: 'transform var(--duration-fast) var(--ease-standard)',
            },
            states: {
                checked: {
                    transform: 'translateX(calc(var(--switch-width) - var(--switch-height)))',
                    background: 'var(--color-primary-content)',
                    borderColor: 'transparent',
                },
                unchecked: {},
            },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums' },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    variants: {
        size: {
            xs: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 8)', '--switch-height': 'calc(var(--size-selector) * 4.5)' } } },
            sm: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 9.5)', '--switch-height': 'calc(var(--size-selector) * 5.25)' } } },
            // `md` is the un-attributed render — the defaults in `tokens:`
            // already ARE the middle step.
            md: {},
            lg: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 13)', '--switch-height': 'calc(var(--size-selector) * 7)' } } },
            xl: { root: { base: { '--switch-width': 'calc(var(--size-selector) * 15)', '--switch-height': 'calc(var(--size-selector) * 8)' } } },
        },
        // Colour rebinds the checked fill only — the focus ring stays petrol
        // for every role (one-ink focus: "you are here" is always the same
        // ink, so keyboard position reads at a page glance).
        color: Object.fromEntries(
            ROLES.map((c) => [
                c,
                {
                    control: {
                        states: {
                            checked: { background: `var(--color-${c})` },
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
            base: quietTrigger,
            states: {
                hover: { background: inkWash },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: { background: inkWash },
                closed: {},
                ...focusRing,
            },
            selectors: { ...pressedInk },
        },
        // Dialogs settle — the same rise grammar as every surface, travelling
        // 4px down into place. Mobile-first: a full-bleed sheet on small
        // viewports, the hairline card from `sm` up. Below `sm` a 32rem card
        // with a 1rem gutter is most of the screen anyway, minus the
        // reachability.
        popup: withPresence(popupPresence('translateY(-4px)'), {
            base: {
                padding: 'var(--space-2xl)',
                width: '100%',
                maxWidth: 'none',
                height: '100dvh',
                maxHeight: 'none',
                margin: '0',
                background: overlaySurface,
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
                        border: hairline,
                        borderRadius: 'var(--radius-box)',
                        boxShadow: 'var(--shadow-lg)',
                    },
                },
            },
        }),
        backdrop: {
            // A wash of the slate ink, not smoke — the page dims like paper
            // under tracing stock.
            base: { background: 'color-mix(in oklch, var(--color-neutral) 40%, transparent)' },
            states: { open: {}, closed: {} },
        },
        title: {
            base: {
                margin: '0 0 var(--space-md)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-semibold)',
                lineHeight: 'var(--leading-tight)',
                fontVariantNumeric: 'tabular-nums',
            },
        },
        description: {
            base: {
                margin: '0 0 var(--space-xl)',
                fontSize: 'var(--text-sm)',
                lineHeight: 'var(--leading-normal)',
                fontVariantNumeric: 'tabular-nums',
                color: 'color-mix(in oklch, var(--color-base-content) 70%, transparent)',
            },
        },
        footer: {
            base: {
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--space-sm)',
                marginTop: 'var(--space-xl)',
            },
        },
        close: dismissAction,
    },
};

export const popover: RecipeInput = {
    component: 'popover',
    parts: {
        trigger: {
            base: quietTrigger,
            states: {
                hover: { background: inkWash },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: { background: inkWash },
                closed: {},
                ...focusRing,
            },
            selectors: { ...pressedInk },
        },
        popup: withPresence(popupPresence('translateY(4px)'), {
            base: {
                ...overlayPanel,
                padding: 'var(--space-xl)',
                minWidth: '14rem',
            },
            states: { open: {}, closed: {} },
        }),
        title: {
            base: {
                margin: '0 0 var(--space-md)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--weight-semibold)',
                lineHeight: 'var(--leading-tight)',
                fontVariantNumeric: 'tabular-nums',
            },
        },
        close: dismissAction,
    },
};

export const tooltip: RecipeInput = {
    component: 'tooltip',
    parts: {
        // The same quiet trigger dialog, popover and menu open from — a tooltip
        // is one more overlay and its trigger is one more control, so it reads
        // as one. `cursor: help` is the single deliberate deviation: nothing is
        // going to open, so the pointer says "explain" rather than "act".
        // No `pressedInk` either — tooltip's anatomy declares no `pressed`
        // flag and the runtime never publishes one, so a pressed rule here
        // could only ever be dead CSS.
        trigger: {
            base: { ...quietTrigger, cursor: 'help' },
            states: {
                hover: { background: inkWash },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: { background: inkWash },
                closed: {},
                ...focusRing,
            },
        },
        // Not an inverted bubble: a tooltip here is a printed footnote — the
        // same paper panel as every other transient surface, scaled down to a
        // field-radius strip of meta-text.
        popup: withPresence(popupPresence('translateY(4px)'), {
            base: {
                ...overlayPanel,
                borderRadius: 'var(--radius-field)',
                padding: 'var(--space-sm) var(--space-lg)',
                maxWidth: '18rem',
                fontSize: 'var(--text-xs)',
                lineHeight: 'var(--leading-tight)',
                fontVariantNumeric: 'tabular-nums',
            },
            states: { open: {}, closed: {} },
        }),
    },
};

export const menu: RecipeInput = {
    component: 'menu',
    parts: {
        trigger: {
            base: quietTrigger,
            states: {
                hover: { background: inkWash },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: { background: inkWash },
                closed: {},
                ...focusRing,
            },
            selectors: { ...pressedInk },
        },
        popup: withPresence(popupPresence('translateY(4px)'), {
            base: {
                ...overlayPanel,
                padding: 'var(--space-sm)',
                minWidth: '12rem',
            },
            states: { open: {}, closed: {} },
        }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-sm) var(--space-lg)',
                // The marker rail: a transparent 2px border-inline-start with
                // the padding pulled back by the same 2px, so inking the
                // marker never reflows the row — and, being logical, the bar
                // sits on the reading-start edge under RTL too (an inset
                // box-shadow would stay physically left).
                borderInlineStart: '2px solid transparent',
                paddingInlineStart: 'calc(var(--space-lg) - 2px)',
                fontSize: 'var(--text-sm)',
                fontVariantNumeric: 'tabular-nums',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
                outline: 'none',
            },
            states: {
                // The margin marker: the roving position gets a 2px bar of
                // primary over the soft wash — one line per row, never a
                // filled block, and dense lists stay readable. The text keeps
                // the page ink; the marker does the signalling.
                highlighted: {
                    background: 'var(--color-primary-soft)',
                    borderInlineStartColor: 'var(--color-primary)',
                },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: { ...pressedInk },
        },
        // The item look, plus a chevron and an `open` state that keeps it
        // visually active after focus moves into the submenu.
        'sub-trigger': {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-sm) var(--space-lg)',
                // The marker rail — see `item`.
                borderInlineStart: '2px solid transparent',
                paddingInlineStart: 'calc(var(--space-lg) - 2px)',
                fontSize: 'var(--text-sm)',
                fontVariantNumeric: 'tabular-nums',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
                outline: 'none',
            },
            states: {
                // `open` before `highlighted`: when both apply (pointer on the
                // trigger while its submenu is open) the later-emitted
                // `highlighted` must win the background — declared the other
                // way round, the held ink film would flatten the soft wash
                // and swallow the marker (the #116 lesson).
                open: { background: inkWash },
                closed: {},
                highlighted: {
                    background: 'var(--color-primary-soft)',
                    borderInlineStartColor: 'var(--color-primary)',
                },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&::after': { content: '"\\203A"', marginLeft: 'auto', opacity: '0.55' },
                ...pressedInk,
            },
        },
        // The popup surface, entering from the side it attaches on — the same
        // 4px rise, rotated to the attach axis.
        'sub-popup': withPresence(popupPresence('translateX(-4px)'), {
            base: {
                ...overlayPanel,
                padding: 'var(--space-sm)',
                minWidth: '12rem',
            },
            states: { open: {}, closed: {} },
        }),
        group: { base: {} },
        // The overline: mono meta-text, the engineered tell.
        'group-label': {
            base: {
                padding: 'var(--space-sm) var(--space-lg)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                color: 'color-mix(in oklch, var(--color-base-content) 60%, transparent)',
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
        // Weight 500, not 600 — semibold is for headings and table headers
        // only; a form label is chrome.
        label: {
            base: {
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                fontVariantNumeric: 'tabular-nums',
            },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
            selectors: {
                '&[data-required]::after': { content: '" *"', color: 'var(--color-error)' },
            },
        },
        description: {
            base: {
                margin: '0',
                fontSize: 'var(--text-xs)',
                fontVariantNumeric: 'tabular-nums',
                color: 'color-mix(in oklch, var(--color-base-content) 70%, transparent)',
            },
        },
        error: {
            base: {
                margin: '0',
                fontSize: 'var(--text-xs)',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--color-error)',
            },
        },
    },
    skipStates: { label: ['invalid', 'required'], error: ['invalid'] },
};

/**
 * The checkbox mark, drawn rather than typeset.
 *
 * A glyph is at the mercy of the reader's font: `✓` is a different weight in
 * every family, and a half-star codepoint (`⯪`, U+2BEA) is missing from most of
 * them outright — which is why zero's own default half is a full `★` and this
 * file's rating group draws its halves instead of typesetting them. Monograph's
 * marks are geometry — one six-point polygon per state, painted with the
 * on-accent ink.
 *
 * THE TECHNIQUE (daisyUI's, generalised): all three polygons carry the SAME
 * point count and the same topology — left cap, elbow-outer, right cap,
 * elbow-inner — so `clip-path` interpolates between any two of them, and the
 * mark animates without a transform. `HOME` is the degenerate form: every
 * point collapsed onto the elbow's cross-section, which is zero-LENGTH but
 * full-WEIGHT. So the stroke EXTENDS out of the corner at its final thickness
 * instead of scaling up from a dot — the one growth Monograph's no-scale rule
 * still allows, and the one that reads as a pen stroke.
 *
 * Coordinates are percentages of the indicator box, computed from a polyline
 * (6,50) → (37,82) → (95,13) stroked at 19.7% with mitred joins, then fitted
 * to 1–99%. `DASH` shares the topology so indeterminate ↔ checked morphs too.
 */
const CHECK_MARK = 'polygon(15.1% 41.3%, 1% 55%, 37.6% 92.8%, 99% 19.8%, 83.9% 7.2%, 36.6% 63.5%)';
const CHECK_MARK_HOME = 'polygon(36.6% 63.5%, 37.6% 92.8%, 37.6% 92.8%, 37.6% 92.8%, 36.6% 63.5%, 36.6% 63.5%)';
const DASH_MARK = 'polygon(8% 40.1%, 8% 59.9%, 37.6% 59.9%, 92% 59.9%, 92% 40.1%, 37.6% 40.1%)';

/**
 * Where a background-painted mark stops being visible, and what stands in.
 *
 * Forced colours rewrites `background-color` to the user's palette, so a
 * clip-pathed fill becomes Canvas-on-Canvas — invisible. Printing drops
 * backgrounds entirely by default (`print-color-adjust: economy`), which takes
 * both the accent fill and the on-accent mark with it. Both fallbacks are the
 * same one: drop the geometry, set a glyph on `::after` in the system ink.
 * `clip-path: none` matters as much as the glyph — a clip on the element clips
 * its pseudo-element too.
 *
 * One object under both named conditions rather than one fused prelude: the
 * declarations are identical, and `forced-colors` and `print` are both built-in
 * condition names, so nothing here has to reach for a raw `@` string. Sharing
 * is only legitimate because the ink is already a SYSTEM colour — right in both
 * media, and predictable in forced colours, where an author colour would be
 * only as good as the UA's revaluation of it. heroui, material and carbon build
 * one object per medium precisely because their inks differ.
 */
const MARK_FALLBACK: PartStyles = {
    base: {
        clipPath: 'none',
        background: 'transparent',
        display: 'grid',
        placeItems: 'center',
        // The system ink, not the on-accent ink: forced colours rewrites the
        // well's fill to Canvas, and print drops it.
        color: 'CanvasText',
        fontSize: 'calc(var(--checkbox-size) * 0.72)',
        lineHeight: 'var(--leading-none)',
    },
    // Heavy check (U+2714) and minus sign (U+2212) — the heavy form because it
    // has to survive being the whole mark. `opacity` still comes from the state
    // rules, so the empty well stays empty.
    selectors: {
        '&[data-state="checked"]::after': { content: '"\\2714"' },
        '&[data-state="indeterminate"]::after': { content: '"\\2212"' },
    },
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
        // The resting geometry — the collapsed stroke the mark grows out of.
        // Declared here so it is a real token the indicator can reference and
        // each state can rebind, rather than an undeclared var.
        '--checkbox-mark': CHECK_MARK_HOME,
    },
    parts: {
        root: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                checked: {}, unchecked: {}, indeterminate: {},
            },
        },
        // A well cut into the page: paper fill, full-perimeter 1px hairline —
        // the box is drawn, never floated. Hover darkens the line toward
        // secondary, the same move fields make.
        control: {
            base: {
                // The mark is positioned against this box rather than centred
                // as flow content, so the well needs `position` and no longer
                // needs to centre anything. `flex-shrink: 0` is load-bearing:
                // the mark's geometry is a percentage of the well, so a well
                // squeezed by a long label would render a skewed tick.
                display: 'inline-block',
                position: 'relative',
                flexShrink: '0',
                width: 'var(--checkbox-size)',
                height: 'var(--checkbox-size)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: 'var(--radius-selector)',
                background: 'var(--color-base-100)',
                transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                checked: { background: 'var(--checkbox-accent)', borderColor: 'var(--checkbox-accent)' },
                indeterminate: { background: 'var(--checkbox-accent)', borderColor: 'var(--checkbox-accent)' },
                unchecked: {},
                // One-ink focus: the ring is petrol for every role. Only the
                // fill carries the accent.
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '2px' },
                invalid: { borderColor: 'var(--color-error)' },
                disabled: {},
            },
            selectors: {
                // Scoped to the empty, valid well — a bare `hover` outranks
                // both the checked fill and the invalid border and would
                // repaint them secondary.
                '&[data-state="unchecked"]:hover:not([data-disabled], [data-invalid])': {
                    borderColor: 'var(--color-secondary)',
                },
            },
        },
        // The drawn mark. `inset` in percent rather than a padded flow box:
        // it makes the mark's frame a fixed fraction of the well at every step
        // of the size ramp, and it is indifferent to `box-sizing` — the
        // containing block is the well's padding box either way.
        //
        // `unchecked` is deliberately empty: the base rule IS the empty well —
        // the collapsed stroke at zero opacity, which is also the state both
        // marks animate out of.
        indicator: {
            base: {
                position: 'absolute',
                inset: '17%',
                background: 'var(--checkbox-on-accent)',
                clipPath: 'var(--checkbox-mark)',
                opacity: '0',
                // Leaving rides the base transition, arriving rides the
                // state's own — the two-tempo idiom `popupPresence` uses. The
                // mark retracts at `fast`/`exit` with no delay: unchecking is
                // not an event to dwell on.
                transition: 'clip-path var(--duration-fast) var(--ease-exit), '
                    + 'opacity var(--duration-fast) var(--ease-exit)',
            },
            states: {
                // Arriving: the well inks over at `fast` (the control's own
                // transition), and only then does the pen touch down — hence
                // the `fast` delay in both slots. `standard` is the firm
                // decelerate, so the stroke shoots out of the elbow and
                // settles rather than easing in politely.
                checked: {
                    '--checkbox-mark': CHECK_MARK,
                    opacity: '1',
                    transition: 'clip-path var(--duration-normal) var(--ease-standard) var(--duration-fast), '
                        + 'opacity var(--duration-fast) var(--ease-standard) var(--duration-fast)',
                },
                unchecked: {},
                indeterminate: {
                    '--checkbox-mark': DASH_MARK,
                    opacity: '1',
                    transition: 'clip-path var(--duration-normal) var(--ease-standard) var(--duration-fast), '
                        + 'opacity var(--duration-fast) var(--ease-standard) var(--duration-fast)',
                },
            },
            at: { 'forced-colors': MARK_FALLBACK, print: MARK_FALLBACK },
        },
        label: {
            base: { fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums' },
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
    // The dot is the ONLY thing that separates checked from unchecked here, and
    // unlike the checkbox's mark it does not sit on an accent fill — it sits on
    // the well's paper, so it needs the same deepening the rating's ink needs
    // (see `ratingGroup`). Measured on the raw role it replaces: `neutral` was
    // 1.51:1 on dark paper — a checked radio with no visible dot, which is
    // issue #211's defect in this design system. The 70/30 mix clears 3:1 for
    // every role in both themes (worst 3.42:1 light, 3.17:1 dark).
    tokens: {
        '--radio-size': 'calc(var(--size-selector) * 5)',
        '--radio-accent': 'color-mix(in oklab, var(--color-primary) 70%, var(--color-primary-content))',
    },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
        },
        // Weight 500, not 600 — semibold is for headings and table headers
        // only; a form label is chrome.
        label: {
            base: {
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                fontVariantNumeric: 'tabular-nums',
            },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        item: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                checked: {}, unchecked: {},
            },
        },
        // The same well grammar as checkbox: paper fill, 1px hairline ring.
        // Checked inks the ring and drops the dot in — a technical-drawing
        // mark, not a filled pill.
        'item-control': {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'var(--radio-size)',
                height: 'var(--radio-size)',
                border: 'var(--border) solid var(--color-base-300)',
                borderRadius: '9999px',
                background: 'var(--color-base-100)',
                transition: 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                checked: { borderColor: 'var(--radio-accent)' },
                unchecked: {},
                // One-ink focus — petrol for every role.
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '2px' },
                disabled: {},
            },
            selectors: {
                // Scoped to the empty well, like checkbox: a bare hover would
                // outrank the checked ring.
                '&[data-state="unchecked"]:hover:not([data-disabled])': {
                    borderColor: 'var(--color-secondary)',
                },
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
            base: { fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums' },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    variants: {
        // Same deepening as the default above, per role — the dot is ink on
        // paper for every one of them.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--radio-accent': `color-mix(in oklab, var(--color-${c}) 70%, var(--color-${c}-content))`,
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
            base: {
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                fontVariantNumeric: 'tabular-nums',
            },
        },
        // A drawn channel, not a gray slab: base-200 with an inset hairline
        // (a box-shadow rather than a border, so the track's declared height
        // is exactly the range's).
        track: {
            base: {
                width: '100%',
                height: 'var(--progress-track-size)',
                background: 'var(--color-base-200)',
                boxShadow: 'inset 0 0 0 var(--border) var(--color-base-300)',
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
                fontVariantNumeric: 'tabular-nums',
                color: 'color-mix(in oklch, var(--color-base-content) 70%, transparent)',
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
    // Track and thumb metrics ride the ramp: the channel matches progress's
    // sizes step for step, the disc matches checkbox's.
    tokens: {
        '--slider-accent': 'var(--color-primary)',
        '--slider-track-size': 'calc(var(--size-selector) * 2)',
        '--slider-thumb-size': 'calc(var(--size-selector) * 5)',
    },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', width: '100%' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        // Weight 500, not 600 — semibold is for headings and table headers
        // only; a form label is chrome.
        label: {
            base: {
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                fontVariantNumeric: 'tabular-nums',
            },
            states: { disabled: {} },
        },
        // A custom skin (`appearance: none`), drawn with Monograph's own
        // instruments: the track is the same channel progress draws —
        // `base-200` under an inset hairline, 9999px — with the filled span
        // reading the runtime-published `--slider-percent` as a gradient
        // stop, and the thumb is the switch's paper disc — `base-100` inside
        // its own hairline, no shadow (nothing at rest casts one).
        //
        // The rebuild is also the correctness move (see the kit skill): Blink
        // ignores thumb-pseudo styling on a native range, and treats range
        // inputs as ALWAYS `:focus-visible` — even on mouse focus — so a
        // pseudo-class ring would read as a stuck rectangle after every
        // pointer drag. The kit compiles this part's `focus-visible` state to
        // the runtime's `[data-focus-visible]` flag (keyboard semantics), so
        // the base kills the native outline and the state draws the one
        // petrol ring only when it means it.
        control: {
            base: {
                appearance: 'none',
                width: '100%',
                height: 'var(--slider-thumb-size)',
                margin: '0',
                background: 'transparent',
                cursor: 'pointer',
                outline: 'none',
                // Kept for the forced-colors fallback below, where native
                // rendering takes over and still honours the accent.
                accentColor: 'var(--slider-accent)',
                '--slider-thumb-ink': 'var(--color-base-100)',
                '--slider-track':
                    'linear-gradient(to right, var(--slider-accent) var(--slider-percent, 50%), var(--color-base-200) 0)',
            },
            states: {
                disabled: { cursor: 'not-allowed' },
                // One-ink focus — petrol for every role; the accent shows in
                // the track, not the ring.
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '2px' },
                // `invalid` is semantic: the accent indirection swaps the
                // fill (and the forced-colors fallback) to error under every
                // colour variant, on purpose.
                invalid: { '--slider-accent': 'var(--color-error)' },
                // Pressed is instantaneous ink on the paper disc — one film
                // of `base-content`, the same 6% step everything else sinks
                // by. A drag has no one-shot, so nothing animates.
                pressed: { '--slider-thumb-ink': 'color-mix(in oklch, var(--color-base-content) 6%, var(--color-base-100))' },
            },
            selectors: {
                // Vendor pseudos cannot share a selector list — one unknown
                // selector invalidates the whole rule — so each engine gets
                // its own copy reading the shared custom properties.
                '&::-webkit-slider-runnable-track': {
                    height: 'var(--slider-track-size)',
                    borderRadius: '9999px',
                    background: 'var(--slider-track)',
                    boxShadow: 'inset 0 0 0 var(--border) var(--color-base-300)',
                },
                '&::-webkit-slider-thumb': {
                    appearance: 'none',
                    width: 'var(--slider-thumb-size)',
                    height: 'var(--slider-thumb-size)',
                    marginTop: 'calc((var(--slider-track-size) - var(--slider-thumb-size)) / 2)',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'var(--slider-thumb-ink)',
                    boxShadow: 'inset 0 0 0 var(--border) var(--color-base-300)',
                },
                '&::-moz-range-track': {
                    height: 'var(--slider-track-size)',
                    borderRadius: '9999px',
                    background: 'var(--slider-track)',
                    boxShadow: 'inset 0 0 0 var(--border) var(--color-base-300)',
                },
                '&::-moz-range-thumb': {
                    width: 'var(--slider-thumb-size)',
                    height: 'var(--slider-thumb-size)',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'var(--slider-thumb-ink)',
                    boxShadow: 'inset 0 0 0 var(--border) var(--color-base-300)',
                },
            },
            at: {
                // Native rendering knows forced colors better than a custom
                // skin; the retained accentColor keeps the fallback branded.
                'forced-colors': { base: { appearance: 'auto' } },
            },
        },
        'value-text': {
            base: {
                fontSize: 'var(--text-xs)',
                fontVariantNumeric: 'tabular-nums',
                color: 'color-mix(in oklch, var(--color-base-content) 70%, transparent)',
            },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--slider-accent': `var(--color-${c})`,
        } } }])),
        size: {
            xs: { root: { base: { '--slider-track-size': 'var(--size-selector)', '--slider-thumb-size': 'calc(var(--size-selector) * 4)' } }, label: { base: { fontSize: 'var(--text-xs)' } } },
            sm: { root: { base: { '--slider-track-size': 'calc(var(--size-selector) * 1.5)', '--slider-thumb-size': 'calc(var(--size-selector) * 4.5)' } }, label: { base: { fontSize: 'var(--text-sm)' } } },
            // `md` is the un-attributed render — the defaults in `tokens:`
            // already ARE the middle step.
            md: {},
            lg: { root: { base: { '--slider-track-size': 'calc(var(--size-selector) * 3)', '--slider-thumb-size': 'calc(var(--size-selector) * 6)' } }, label: { base: { fontSize: 'var(--text-md)' } } },
            xl: { root: { base: { '--slider-track-size': 'calc(var(--size-selector) * 4)', '--slider-thumb-size': 'calc(var(--size-selector) * 7)' } }, label: { base: { fontSize: 'var(--text-lg)' } } },
        },
    },
    skipStates: { root: ['invalid', 'focus-visible'] },
};

export const accordion: RecipeInput = {
    component: 'accordion',
    parts: {
        // One bordered region ruled into rows by hairlines — a table of
        // contents, not a stack of cards.
        root: {
            base: {
                display: 'flex',
                flexDirection: 'column',
                border: hairline,
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                overflow: 'hidden',
            },
        },
        item: withPresence(disclosurePresence, {
            base: { borderBottom: hairline },
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
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer',
                listStyle: 'none',
                transition: 'background var(--duration-fast) var(--ease-standard), '
                    + 'color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: inkWash },
                // The open heading takes the protagonist ink at the same 500
                // weight — colour does the work, rows never reflow.
                open: { color: 'var(--color-primary)' },
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                // Inset ring: the row runs edge to edge under the root's
                // clipped corners, so an offset ring would be swallowed.
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '-2px' },
            },
            selectors: { ...pressedInk },
        },
        panel: {
            base: {
                padding: '0 var(--space-xl) var(--space-lg)',
                fontSize: 'var(--text-md)',
                lineHeight: 'var(--leading-normal)',
                fontVariantNumeric: 'tabular-nums',
            },
            states: { open: {}, closed: {} },
        },
    },
};

export const select: RecipeInput = {
    component: 'select',
    // The accent pair: the marker ink and its soft wash — no solid selected
    // fill remains, so no `-on-accent` is needed.
    tokens: {
        '--select-accent': 'var(--color-primary)',
        '--select-soft': 'var(--color-primary-soft)',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column' },
        },
        // Wells are paper: base-100 fill with the full-perimeter hairline,
        // even on a tinted panel. Hover darkens the line toward secondary
        // (the same move every field makes); open inks it with the accent.
        trigger: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-lg)',
                minWidth: '12rem',
                padding: 'var(--space-md) var(--space-xl)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 'var(--leading-none)',
                color: 'var(--color-base-content)',
                background: 'var(--color-base-100)',
                border: hairline,
                borderRadius: 'var(--radius-field)',
                cursor: 'pointer',
                transition: 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { borderColor: 'var(--color-secondary)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                open: { borderColor: 'var(--select-accent)' },
                closed: {},
                invalid: { borderColor: 'var(--color-error)' },
                placeholder: {},
                // One-ink focus: the border swaps to primary under the offset
                // petrol ring — every field makes the same move; the role
                // accent surfaces on `open`, not here.
                'focus-visible': {
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: '2px',
                    borderColor: 'var(--color-primary)',
                },
            },
            selectors: {
                // The one focus exception: an invalid field rings in error —
                // the established error-signal convention outranks one-ink.
                '&[data-invalid][data-focus-visible]': {
                    outline: '2px solid var(--color-error)',
                    borderColor: 'var(--color-error)',
                },
                ...pressedInk,
            },
        },
        value: {
            base: {},
            states: {
                placeholder: { color: 'color-mix(in oklch, var(--color-base-content) 55%, transparent)' },
            },
        },
        indicator: {
            base: { opacity: '0.55', transition: 'transform var(--duration-fast) var(--ease-standard)' },
            states: { open: { transform: 'rotate(180deg)' }, closed: {} },
        },
        popup: withPresence(popupPresence('translateY(4px)'), {
            base: {
                ...overlayPanel,
                padding: 'var(--space-sm)',
                minWidth: '12rem',
            },
            states: { open: {}, closed: {} },
        }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
                padding: 'var(--space-sm) var(--space-lg)',
                // The marker rail — see menu's `item`: logical, so the bar
                // flips with the reading direction, padded back so the marker
                // never reflows the row.
                borderInlineStart: '2px solid transparent',
                paddingInlineStart: 'calc(var(--space-lg) - 2px)',
                fontSize: 'var(--text-sm)',
                fontVariantNumeric: 'tabular-nums',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
            },
            states: {
                // `highlighted` before `selected`: the roving position is one
                // film of ink — plain hover grammar — and when it lands on
                // the chosen row the later-emitted `selected` wash must win
                // (the #116 lesson, and tree-view's exact ordering).
                highlighted: { background: inkWash },
                // The margin marker (density rule) belongs to SELECTION, as
                // in tree-view: soft wash plus the 2px inset-start accent bar
                // — one line per chosen row, never a filled block. Weight
                // stays 500 throughout, so labels never reflow; the indicator
                // glyph and the marker carry the state.
                selected: {
                    background: 'var(--select-soft)',
                    borderInlineStartColor: 'var(--select-accent)',
                },
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
            '--select-soft': `var(--color-${c}-soft)`,
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
    // than 8 × 4. Two inks ride along: `--btn-ink` is the role's readable
    // on-tint ink (see `softInk`), `--btn-ghost-ink` is what a resting ghost
    // writes with — base-content, except for the destructive role.
    tokens: {
        '--btn-accent': 'var(--color-primary)',
        '--btn-on-accent': 'var(--color-primary-content)',
        '--btn-soft': 'var(--color-primary-soft)',
        '--btn-ink': softInk('primary'),
        '--btn-ghost-ink': 'var(--color-base-content)',
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
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), '
                    + 'border-color var(--duration-fast) var(--ease-standard), '
                    + 'color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                // One-ink focus: 2px petrol at 2px offset for every role and
                // every fill. Outline is not in the transition list, so the
                // ring lands instantly.
                'focus-visible': {
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: '2px',
                },
            },
            selectors: {
                // Press is instantaneous ink, never a transform: the landing
                // is centralised here (the release still eases back at `fast`)
                // while each fill variant below supplies its own pressed ink.
                // Outranks hover by an attribute; the :not covers a press that
                // goes disabled mid-gesture.
                '&[data-pressed]:not([data-disabled])': { transition: 'none' },
            },
        },
    },
    variants: {
        // One rule per role rather than per role × fill: the fill
        // variants below read these tokens, so adding a colour
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
                            '--btn-ink': softInk(c),
                            // Destructive must telegraph before interaction —
                            // the one ghost that is never furniture.
                            ...(c === 'error' ? { '--btn-ghost-ink': 'var(--color-error)' } : {}),
                        },
                    },
                },
            ]),
        ),
        // Pressed feedback throughout is the runtime's `data-pressed` (same
        // sink as `:active`, with keyboard parity and drag-off semantics),
        // and it is pure ink density — nothing translates or scales, and
        // `transition: none` makes the press land instantly while the
        // release still eases back at `fast`. The `[data-pressed]` selector
        // outranks the hover state by one attribute, and the :not covers a
        // press that goes disabled mid-gesture.
        variant: {
            // Flat role fill. No border, no shadow, no gradient — hover and
            // press deepen the ink and nothing else moves.
            solid: {
                root: {
                    base: { background: 'var(--btn-accent)', color: 'var(--btn-on-accent)' },
                    states: { hover: { background: 'color-mix(in oklch, var(--btn-accent) 92%, black)' } },
                    selectors: {
                        '&[data-pressed]:not([data-disabled])': {
                            background: 'color-mix(in oklch, var(--btn-accent) 86%, black)',
                            transition: 'none',
                        },
                    },
                },
            },
            // A labeled rule in the margin: 1px border in the role itself,
            // role ink. Hover fills with the soft tint — the line never
            // thickens — and press deepens the tint.
            outline: {
                root: {
                    base: {
                        background: 'transparent',
                        color: 'var(--btn-ink)',
                        borderColor: 'var(--btn-accent)',
                    },
                    states: { hover: { background: 'var(--btn-soft)' } },
                    selectors: {
                        '&[data-pressed]:not([data-disabled])': {
                            background: 'color-mix(in oklch, var(--btn-accent) 6%, var(--btn-soft))',
                            transition: 'none',
                        },
                    },
                },
            },
            // A printed 10% screen, drawn: soft tint plus a quiet hairline of
            // the role at 20%. Hover raises the tint one step, press two.
            soft: {
                root: {
                    base: {
                        background: 'var(--btn-soft)',
                        color: 'var(--btn-ink)',
                        borderColor: 'color-mix(in oklch, var(--btn-accent) 20%, transparent)',
                    },
                    states: { hover: { background: 'color-mix(in oklch, var(--btn-accent) 6%, var(--btn-soft))' } },
                    selectors: {
                        '&[data-pressed]:not([data-disabled])': {
                            background: 'color-mix(in oklch, var(--btn-accent) 12%, var(--btn-soft))',
                            transition: 'none',
                        },
                    },
                },
            },
            // Furniture until touched: base-content at rest (error excepted,
            // via `--btn-ghost-ink`), then the hover wash brings the role ink
            // up and press deepens the wash a step.
            ghost: {
                root: {
                    base: { background: 'transparent', color: 'var(--btn-ghost-ink)' },
                    states: {
                        hover: { background: 'var(--color-base-200)', color: 'var(--btn-ink)' },
                    },
                    selectors: {
                        '&[data-pressed]:not([data-disabled])': {
                            background: 'var(--color-base-300)',
                            transition: 'none',
                        },
                    },
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
    // Defaults live here rather than in `defaultVariants` — the toast shape:
    // the un-attributed render IS the default, so `variants` only rebind and
    // no `:not([data-color])` duplicate is emitted.
    tokens: {
        '--avatar-size': 'calc(var(--size-selector) * 10)',
        '--avatar-text': 'var(--text-sm)',
        '--avatar-accent': 'var(--color-primary-soft)',
        '--avatar-on-accent': 'var(--color-primary)',
    },
    parts: {
        root: {
            base: {
                position: 'relative',
                display: 'inline-grid',
                width: 'var(--avatar-size)',
                height: 'var(--avatar-size)',
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
                background: 'var(--avatar-accent)',
                color: 'var(--avatar-on-accent)',
                // Initials as mono meta-text: an annotation on the soft tint,
                // not a candy monogram.
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--avatar-text)',
                fontWeight: 'var(--weight-medium)',
                letterSpacing: 'var(--tracking-wide)',
                fontVariantNumeric: 'tabular-nums',
                userSelect: 'none',
            },
            // `display` must not defeat the `hidden` zero sets once the image
            // has loaded.
            selectors: { '&:not([hidden])': { display: 'grid' } },
            states: { loading: {}, loaded: {}, error: {} },
        },
    },
    variants: {
        // Colour lands on the initials fallback, the only part an avatar
        // colours — the image, when it loads, covers everything else.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--avatar-accent': `var(--color-${c}-soft)`,
            '--avatar-on-accent': `var(--color-${c})`,
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
 * Toast presence is runtime-managed — the one popup-shaped component where
 * `@starting-style`/`allow-discrete` must NOT be used: zero mounts the root
 * `closed`, flips it `open` a frame later, and keeps it mounted after
 * dismissal until the longest transition here finishes. Both directions are
 * the ordinary two-state transition, at Monograph's two tempos: entry slides
 * at `slow`/`standard`, exit fades at `fast`/`exit` with no travel — the
 * transform rides the same clock on a `step-end` curve, holding its open
 * position for the whole fade and snapping back only once it has finished,
 * so dismissal never visibly moves.
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
                background: overlaySurface,
                color: 'var(--color-base-content)',
                border: hairline,
                // The margin marker carries the role: the inline-start
                // hairline thickens to a 2px accent bar — logical, so it
                // flips with the reading direction. The single honest `lg`
                // shadow rides alone (in dark it brings the moonlit top edge).
                borderInlineStart: '2px solid var(--toast-accent)',
                borderRadius: 'var(--radius-box)',
                boxShadow: 'var(--shadow-lg)',
                fontSize: 'var(--text-sm)',
                fontVariantNumeric: 'tabular-nums',
                opacity: '0',
                transform: 'translateY(var(--toast-from))',
                // The exit half: fade at `fast`/`exit`; the transform rides
                // the same `var(--duration-fast)` clock on a `step-end` curve
                // — held at the open position for the whole fade, snapping
                // back only at the end — so a dismissed toast never travels.
                transition: 'opacity var(--duration-fast) var(--ease-exit), '
                    + 'transform var(--duration-fast) step-end',
            },
            selectors: {
                '&[data-placement^="top"]': { '--toast-from': '-8px' },
            },
            states: {
                // The entry half rides the open declaration: the slide, at
                // `slow`/`standard` — arrive and settle.
                open: {
                    opacity: '1',
                    transform: 'none',
                    transition: 'opacity var(--duration-slow) var(--ease-standard), '
                        + 'transform var(--duration-slow) var(--ease-standard)',
                },
                closed: {},
            },
            at: {
                'reduced-motion': {
                    base: { transition: 'none' },
                    states: { open: { transition: 'none', transform: 'none' } },
                },
            },
        },
        title: {
            base: { gridColumn: '1', fontWeight: 'var(--weight-medium)' },
        },
        description: {
            base: {
                gridColumn: '1',
                fontSize: 'var(--text-xs)',
                color: 'color-mix(in oklch, var(--color-base-content) 70%, transparent)',
            },
        },
        action: {
            base: {
                ...quietTrigger,
                gridColumn: '2',
                gridRow: '1',
                padding: 'var(--space-2xs) var(--space-sm)',
                fontSize: 'var(--text-xs)',
                color: 'var(--toast-accent)',
            },
            states: {
                hover: { background: inkWash },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
            selectors: { ...pressedInk },
        },
        close: {
            base: {
                ...iconClose,
                gridColumn: '3',
                gridRow: '1',
                padding: 'var(--space-2xs) var(--space-xs)',
            },
            states: {
                hover: { background: inkWash },
                disabled: { opacity: 'var(--disabled-opacity)' },
                ...focusRing,
            },
            selectors: { ...pressedInk },
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
    // The accent pair mirrors select: marker ink plus soft wash — no solid
    // highlighted fill remains, so no `-on-accent` is needed.
    tokens: {
        '--combobox-accent': 'var(--color-primary)',
        '--combobox-soft': 'var(--color-primary-soft)',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column' },
        },
        // The field chrome lives on the box wrapping input + trigger — a well
        // of paper with the full-perimeter hairline. Hover darkens the line
        // toward secondary; open inks it with the accent; the focus ring
        // draws here from the input's forwarded focus-visible.
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                minWidth: '12rem',
                background: 'var(--color-base-100)',
                border: hairline,
                borderRadius: 'var(--radius-field)',
                transition: 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { borderColor: 'var(--color-secondary)' },
                open: { borderColor: 'var(--combobox-accent)' },
                closed: {},
                invalid: { borderColor: 'var(--color-error)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                // One-ink focus: the border swaps to primary under the offset
                // petrol ring — every field makes the same move; the role
                // accent surfaces on `open`, not here.
                'focus-visible': {
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: '2px',
                    borderColor: 'var(--color-primary)',
                },
            },
            selectors: {
                // The one focus exception: an invalid field rings in error —
                // the established error-signal convention outranks one-ink.
                '&[data-invalid][data-focus-visible]': {
                    outline: '2px solid var(--color-error)',
                    borderColor: 'var(--color-error)',
                },
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
                fontVariantNumeric: 'tabular-nums',
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
                '&::placeholder': { color: 'color-mix(in oklch, var(--color-base-content) 55%, transparent)' },
            },
        },
        trigger: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                opacity: '0.55',
                padding: '0 0.625rem',
                cursor: 'pointer',
                transition: 'transform var(--duration-fast) var(--ease-standard)',
            },
            states: {
                open: { transform: 'rotate(180deg)' },
                closed: {},
                disabled: { cursor: 'not-allowed' },
            },
            // The chevron is furniture inside the well, so it presses like
            // furniture: two films of ink, landing instantly.
            selectors: { ...pressedInk },
        },
        popup: withPresence(popupPresence('translateY(4px)'), {
            base: {
                ...overlayPanel,
                padding: 'var(--space-sm)',
                minWidth: '12rem',
            },
            states: { open: {}, closed: {} },
        }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
                padding: 'var(--space-sm) var(--space-lg)',
                // The marker rail — see menu's `item`: logical, so the bar
                // flips with the reading direction, padded back so the marker
                // never reflows the row.
                borderInlineStart: '2px solid transparent',
                paddingInlineStart: 'calc(var(--space-lg) - 2px)',
                fontSize: 'var(--text-sm)',
                fontVariantNumeric: 'tabular-nums',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
            },
            states: {
                // `highlighted` before `selected`: the roving position is one
                // film of ink — plain hover grammar — and when it lands on
                // the chosen row the later-emitted `selected` wash must win
                // (the #116 lesson, and tree-view's exact ordering).
                highlighted: { background: inkWash },
                // The margin marker (density rule) belongs to SELECTION, as
                // in tree-view: soft wash plus the 2px inset-start accent bar
                // — one line per chosen row, never a filled block. Weight
                // stays 500 throughout, so labels never reflow; the indicator
                // glyph and the marker carry the state.
                selected: {
                    background: 'var(--combobox-soft)',
                    borderInlineStartColor: 'var(--combobox-accent)',
                },
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
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'center',
                color: 'color-mix(in oklch, var(--color-base-content) 60%, transparent)',
            },
        },
    },
    variants: {
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--combobox-accent': `var(--color-${c})`,
            '--combobox-soft': `var(--color-${c}-soft)`,
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

export const toggle: RecipeInput = {
    component: 'toggle',
    // Same accent machinery as button: `color` sets the trio once, the on
    // state consumes it — a role costs one rule, not one per state.
    tokens: {
        '--toggle-accent': 'var(--color-primary)',
        '--toggle-soft': 'var(--color-primary-soft)',
        '--toggle-ink': softInk('primary'),
    },
    parts: {
        // Furniture until pressed on: hairline box, base-content label. The
        // on state is the soft-chip grammar — softMix wash, role ink, the
        // hairline re-inked at 20% role — a printed screen, not a solid slab.
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
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), '
                    + 'color var(--duration-fast) var(--ease-standard), '
                    + 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: inkWash },
                on: {
                    background: 'var(--toggle-soft)',
                    color: 'var(--toggle-ink)',
                    borderColor: 'color-mix(in oklch, var(--toggle-accent) 20%, transparent)',
                },
                off: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                // One-ink focus — petrol for every role.
                'focus-visible': {
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: '2px',
                },
            },
            selectors: {
                // Hover on an on toggle raises the tint one step rather than
                // fading toward the furniture wash.
                '&[data-state="on"]:hover': {
                    background: 'color-mix(in oklch, var(--toggle-accent) 6%, var(--toggle-soft))',
                },
                ...pressedInk,
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
                            '--toggle-soft': `var(--color-${c}-soft)`,
                            '--toggle-ink': softInk(c),
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
        '--toggle-group-soft': 'var(--color-primary-soft)',
        '--toggle-group-ink': softInk('primary'),
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
        // A dense repeating context, so selection follows the density rule:
        // soft wash plus the 2px inset-start margin marker — one line per on
        // segment, no per-item hairline (the items are joined anyway).
        item: {
            base: {
                appearance: 'none',
                position: 'relative',
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
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard), '
                    + 'color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: inkWash },
                on: {
                    background: 'var(--toggle-group-soft)',
                    color: 'var(--toggle-group-ink)',
                },
                off: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                'focus-visible': {
                    // The group clips its children (joined corners), so an
                    // offset ring would be swallowed — inset it instead. Still
                    // the one petrol ink, every role.
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: '-2px',
                },
            },
            selectors: {
                // The margin marker, as an overlay: the inline-start edge
                // doubles as the joined-segment separator, so the bar is a
                // positioned pseudo rather than a border — logical
                // `inset-inline-start`, so it flips with the reading
                // direction (and squares exactly: joined items carry no
                // radius of their own).
                '&[data-state="on"]::before': {
                    content: '""',
                    position: 'absolute',
                    insetBlock: '0',
                    insetInlineStart: '0',
                    width: '2px',
                    background: 'var(--toggle-group-accent)',
                    pointerEvents: 'none',
                },
                // Hover on an on segment raises the tint one step; the marker
                // rides along.
                '&[data-state="on"]:hover': {
                    background: 'color-mix(in oklch, var(--toggle-group-accent) 6%, var(--toggle-group-soft))',
                },
                '&[data-orientation="horizontal"] + &': {
                    borderInlineStart: 'var(--border) solid var(--color-base-300)',
                },
                '&[data-orientation="vertical"] + &': {
                    borderBlockStart: 'var(--border) solid var(--color-base-300)',
                },
                ...pressedInk,
            },
        },
    },
    variants: {
        // The group is a frame around its items, so the ramp lands on the
        // items and the frame follows their box.
        size: {
            xs: { item: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-xs)' } } },
            sm: { item: { base: { fontSize: 'var(--text-xs)', padding: 'var(--space-2xs) var(--space-sm)' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { item: { base: { fontSize: 'var(--text-md)', padding: 'var(--space-sm) var(--space-lg)' } } },
            xl: { item: { base: { fontSize: 'var(--text-lg)', padding: 'var(--space-md) var(--space-xl)' } } },
        },
        color: Object.fromEntries(
            ROLES.map((c) => [
                c,
                {
                    item: {
                        base: {
                            '--toggle-group-accent': `var(--color-${c})`,
                            '--toggle-group-soft': `var(--color-${c}-soft)`,
                            '--toggle-group-ink': softInk(c),
                        },
                    },
                },
            ]),
        ),
    },
    defaultVariants: { color: 'primary' },
};

export const numberInput: RecipeInput = {
    component: 'number-input',
    tokens: { '--number-input-accent': 'var(--color-primary)' },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
            states: { disabled: {}, invalid: {}, required: {}, readonly: {} },
        },
        // Weight 500, not 600 — semibold is for headings and table headers
        // only; a form label is chrome.
        label: {
            base: {
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                fontVariantNumeric: 'tabular-nums',
            },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                invalid: { color: 'var(--color-error)' },
                required: {},
            },
        },
        // The field chrome (combobox split): a well of paper with the
        // full-perimeter hairline; the ring and the invalid tint draw on the
        // box, input and steppers sit inside it. Focus swaps the border to
        // primary under the petrol ring — the same one-ink move select and
        // combobox make.
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'stretch',
                background: 'var(--color-base-100)',
                border: hairline,
                borderRadius: 'var(--radius-field)',
                overflow: 'hidden',
                transition: 'border-color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { borderColor: 'var(--color-secondary)' },
                invalid: { borderColor: 'var(--color-error)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                readonly: {},
                'focus-visible': {
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: '2px',
                    borderColor: 'var(--color-primary)',
                },
            },
            selectors: {
                // The one focus exception: an invalid field rings in error —
                // the established error-signal convention outranks one-ink.
                '&[data-invalid][data-focus-visible]': {
                    outline: '2px solid var(--color-error)',
                    borderColor: 'var(--color-error)',
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
                // Where the role accent surfaces: the caret writes in the
                // role's ink (a number input has no `open` state to carry
                // it, and the focus border is one-ink primary like every
                // other field).
                caretColor: 'var(--number-input-accent)',
                font: 'inherit',
                fontSize: 'var(--text-sm)',
                fontVariantNumeric: 'tabular-nums',
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
                '&::placeholder': { color: 'color-mix(in oklch, var(--color-base-content) 55%, transparent)' },
            },
        },
        // Steppers are furniture inside the well: transparent over the paper
        // behind their hairline separators; hover is one film of ink, press
        // is two and lands instantly.
        'increment-trigger': {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                padding: '0 0.75rem',
                cursor: 'pointer',
                userSelect: 'none',
                borderInlineStart: hairline,
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: inkWash },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: { ...pressedInk },
        },
        'decrement-trigger': {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                padding: '0 0.75rem',
                cursor: 'pointer',
                userSelect: 'none',
                borderInlineEnd: hairline,
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: inkWash },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: { ...pressedInk },
        },
    },
    // The visible ring lives on `control`; the input delegates.
    skipStates: { input: ['focus-visible'] },
    variants: {
        // The caret carries the role — the chrome is neutral, the ring is
        // always petrol, and the focus border is one-ink primary, so the
        // accent surfaces only where the value is written.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--number-input-accent': `var(--color-${c})`,
        } } }])),
        // The readout carries the ramp; the steppers follow it so the frame
        // stays proportional.
        size: {
            xs: { input: { base: { fontSize: 'var(--text-xs)', padding: '0.25rem 0.375rem' } } },
            sm: { input: { base: { fontSize: 'var(--text-xs)', padding: '0.375rem 0.4375rem' } } },
            // `md` is the un-attributed render: the base already IS the
            // middle step, so restating it here would be a second copy free
            // to drift. An empty entry emits no rule and keeps the base.
            md: {},
            lg: { input: { base: { fontSize: 'var(--text-md)', padding: '0.625rem 0.625rem' } } },
            xl: { input: { base: { fontSize: 'var(--text-lg)', padding: '0.75rem 0.75rem' } } },
        },
    },
};

/**
 * The rating symbol, drawn rather than typeset — and the reason the checkbox's
 * mark is geometry too.
 *
 * The runtime's default symbol cannot say `half` at all: `⯪` (U+2BEA) is absent
 * from the system UI font on every platform we target — it rendered as a tofu
 * box — so zero settled on a full `★` for both `half` and `full` and left the
 * distinction to the design system (#222). Typeset, the state is real and the
 * paint is not.
 *
 * So the symbol is a ten-point polygon painted twice — ghost underneath, ink on
 * top — and each layer is clipped to the fraction the state names, the way
 * daisyUI's rating splits a half across `mask-half-1` / `mask-half-2`. Same
 * degenerate-polygon technique as the checkbox mark (see `CHECK_MARK`): one
 * point count throughout, so `clip-path` interpolates and a rating FILLS —
 * the ink wipes in from the left edge while the ghost retreats to the right.
 *
 * The two layers are COMPLEMENTARY rather than stacked, and they stop 4% short
 * of each other, so the two halves of a half-symbol are parted by a hairline of
 * paper instead of meeting edge to edge. That is what makes the split legible:
 * measured, ink-on-ghost is 2.47–4.70:1 across the roles — below the 3:1 floor
 * for more than half of them — while ink-on-paper is 3.17:1 at worst. Neither
 * colour needs changing; the boundary just has to be drawn against the page.
 *
 * `LEFT`/`RIGHT` clamp every point past the parting to it, which encloses
 * exactly one side (the zero-area spike along the clamp line paints nothing).
 * `NONE`/`SPENT` collapse onto the left/right extreme — the resting states the
 * wipe runs between. Radii 50%/21% about the centre, fitted to 2–98%.
 */
const STAR = 'polygon(50% 4.3%, 62.5% 37.7%, 98% 39.2%, 70.2% 61.4%, 79.7% 95.7%, 50% 76%, 20.3% 95.7%, 29.8% 61.4%, 2% 39.2%, 37.5% 37.7%)';
const STAR_LEFT = 'polygon(48% 4.3%, 48% 37.7%, 48% 39.2%, 48% 61.4%, 48% 95.7%, 48% 76%, 20.3% 95.7%, 29.8% 61.4%, 2% 39.2%, 37.5% 37.7%)';
const STAR_RIGHT = 'polygon(52% 4.3%, 62.5% 37.7%, 98% 39.2%, 70.2% 61.4%, 79.7% 95.7%, 52% 76%, 52% 95.7%, 52% 61.4%, 52% 39.2%, 52% 37.7%)';
const STAR_NONE = 'polygon(2% 4.3%, 2% 37.7%, 2% 39.2%, 2% 61.4%, 2% 95.7%, 2% 76%, 2% 95.7%, 2% 61.4%, 2% 39.2%, 2% 37.7%)';
const STAR_SPENT = 'polygon(98% 4.3%, 98% 37.7%, 98% 39.2%, 98% 61.4%, 98% 95.7%, 98% 76%, 98% 95.7%, 98% 61.4%, 98% 39.2%, 98% 37.7%)';

/**
 * The geometry replaces the runtime's default glyph, so it must NOT replace a
 * symbol the consumer supplied — `RatingGroup.Item`'s slot receives
 * `{ state, highlighted }` precisely so an app can render its own SVG. The
 * default glyph is a TEXT node and a custom symbol is an ELEMENT, which is a
 * difference CSS can see: everything geometric here hangs off
 * `:not(:has(> *))`. A consumer's own symbol keeps the plain `color` treatment
 * the `states` below still carry.
 */
const DEFAULT_SYMBOL = '&:not(:has(> *))';

export const ratingGroup: RecipeInput = {
    component: 'rating-group',
    // The default fill is the same deepened mix the colour variants use —
    // a rating symbol is ink on bare paper, and the raw role is not always
    // safe there (see the variants note).
    tokens: {
        '--rating-size': 'var(--text-xl)',
        '--rating-fill': 'color-mix(in oklab, var(--color-warning) 70%, var(--color-warning-content))',
        /**
         * The unfilled remainder's ink — the same 55% mix the placeholders use.
         *
         * It was `--color-base-300`, the hairline grey, which measures 1.23:1
         * on light paper and 1.28:1 on dark: a five-star scale whose scale you
         * cannot see. The ghost is a TRACK and should read as one, so it is
         * held to the 3:1 a non-text mark owes — 3.55:1 light, 4.96:1 dark
         * (#228). Still clearly subordinate to the fill, which is 5.5:1.
         */
        '--rating-track': 'color-mix(in oklch, var(--color-base-content) 55%, transparent)',
        // How much of the symbol each layer covers. Rebound per state, so the
        // three states differ in paint and not merely in `data-state`.
        '--rating-mark': STAR_NONE,
        '--rating-ghost': STAR,
    },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
            states: { disabled: {}, invalid: {}, required: {}, readonly: {} },
        },
        // Weight 500, not 600 — semibold is for headings and table headers
        // only; a form label is chrome.
        label: {
            base: {
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                fontVariantNumeric: 'tabular-nums',
            },
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
        // Nothing moves on hover — the preview is pure ink: the symbol fills
        // instead of growing. What animates is the ink's EXTENT, a wipe from
        // the left edge, which is the same gesture a filling rating makes.
        //
        // The box is squared off `--rating-size` rather than left to the
        // glyph's own metrics, because the geometry is a percentage of it and
        // the size ramp has to keep driving it.
        item: {
            base: {
                position: 'relative',
                display: 'inline-block',
                width: 'var(--rating-size)',
                height: 'var(--rating-size)',
                fontSize: 'var(--rating-size)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                userSelect: 'none',
                color: 'var(--rating-track)',
                transition: 'color var(--duration-fast) var(--ease-standard)',
            },
            states: {
                // The two marks drive the drawn symbol; `color` is what a
                // consumer's own `currentColor` SVG rides on. Both, so neither
                // rendering has a state that paints like its neighbour.
                full: { color: 'var(--rating-fill)', '--rating-mark': STAR, '--rating-ghost': STAR_SPENT },
                half: { color: 'var(--rating-fill)', '--rating-mark': STAR_LEFT, '--rating-ghost': STAR_RIGHT },
                empty: { '--rating-mark': STAR_NONE, '--rating-ghost': STAR },
                highlighted: { color: 'var(--rating-fill)' },
                disabled: { cursor: 'not-allowed' },
                readonly: { cursor: 'default' },
                // The group ring lives on control; per-item focus still gets
                // a subtle marker for the value-following tab stop.
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '1px', borderRadius: 'var(--radius-selector)' },
            },
            selectors: {
                // Retire the runtime's text glyph — `font-size: 0` rather than
                // a transparent colour, because the `states` above legitimately
                // set `color` and would win it back.
                [DEFAULT_SYMBOL]: { fontSize: '0' },
                // The ghost — the unfilled remainder. It is the track, not the
                // mark: it reads against the page, and never against the ink,
                // because the two never touch.
                [`${DEFAULT_SYMBOL}::before`]: {
                    content: '""',
                    position: 'absolute',
                    inset: '0',
                    background: 'var(--rating-track)',
                    clipPath: 'var(--rating-ghost)',
                    printColorAdjust: 'exact',
                    transition: 'clip-path var(--duration-fast) var(--ease-standard)',
                },
                // The ink.
                [`${DEFAULT_SYMBOL}::after`]: {
                    content: '""',
                    position: 'absolute',
                    inset: '0',
                    background: 'var(--rating-fill)',
                    clipPath: 'var(--rating-mark)',
                    printColorAdjust: 'exact',
                    transition: 'clip-path var(--duration-fast) var(--ease-standard)',
                },
            },
            at: {
                // Forced colours rewrites `background-color`, which would paint
                // ghost and ink alike and lose the distinction the geometry
                // exists to make. The system palette keeps it: page ink for the
                // filled fraction, the greyed ink for the empty one. Restoring
                // the glyph the way `checkbox` does is not an option here — the
                // glyph is exactly what cannot render a half.
                'forced-colors': {
                    selectors: {
                        [`${DEFAULT_SYMBOL}::before`]: { background: 'GrayText', forcedColorAdjust: 'none' },
                        [`${DEFAULT_SYMBOL}::after`]: { background: 'CanvasText', forcedColorAdjust: 'none' },
                    },
                },
            },
        },
    },
    variants: {
        // A rating symbol sits on the page background, so the raw role is
        // not always safe: daisy measured `--color-warning` at 1.62:1 on light
        // base-100. Deepening every role toward its own content pair keeps the
        // hue and clears 3:1 in both schemes — the same 70/30 mix daisy's
        // default already uses. Measured on the drawn symbol: 3.42:1 at worst
        // in light (accent), 3.17:1 in dark (neutral).
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

export const treeView: RecipeInput = {
    component: 'tree-view',
    // A tree IS the docs sidebar the margin marker was designed for, so the
    // accent pair is the marker plus its soft wash — no solid selected fill,
    // which also keeps the row's text in page ink on every role/theme.
    tokens: {
        '--tree-accent': 'var(--color-primary)',
        '--tree-text': 'var(--text-sm)',
        '--tree-soft': 'var(--color-primary-soft)',
    },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        // The overline above the tree: mono meta-text, the engineered tell.
        label: {
            base: {
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                color: 'color-mix(in oklch, var(--color-base-content) 60%, transparent)',
            },
        },
        tree: {
            base: { display: 'flex', flexDirection: 'column', fontSize: 'var(--tree-text)' },
        },
        // Indentation comes from branch-content's inline padding — depth is
        // the DOM nesting, no per-level rules needed.
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                padding: '0.25rem 0.5rem',
                // The marker rail — see menu's `item`: logical, so the bar
                // flips with the reading direction, padded back so the marker
                // never reflows the row.
                borderInlineStart: '2px solid transparent',
                paddingInlineStart: 'calc(0.5rem - 2px)',
                fontVariantNumeric: 'tabular-nums',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                // `hover` before `selected`: when both apply the later-emitted
                // wash must win, so a selected row never fades back to the
                // hover film under the pointer (the #116 lesson).
                hover: { background: inkWash },
                // The margin marker: the current row gets a 2px bar of the
                // accent over the soft wash — one line per selection, never a
                // filled block, and the text keeps the page ink.
                selected: {
                    background: 'var(--tree-soft)',
                    borderInlineStartColor: 'var(--tree-accent)',
                },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                // Inset ring: rows sit flush against their siblings, so an
                // offset ring would collide with the next row. Still the one
                // petrol ink.
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '-2px' },
            },
            selectors: { ...pressedInk },
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
                // The marker rail — see `item`.
                borderInlineStart: '2px solid transparent',
                paddingInlineStart: 'calc(0.5rem - 2px)',
                fontVariantNumeric: 'tabular-nums',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background var(--duration-fast) var(--ease-standard)',
            },
            states: {
                hover: { background: inkWash },
                open: {},
                closed: {},
                // The same marker as `item` — a selected branch heading is a
                // current position, not a different species of selection.
                selected: {
                    background: 'var(--tree-soft)',
                    borderInlineStartColor: 'var(--tree-accent)',
                },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                'focus-visible': { outline: '2px solid var(--color-primary)', outlineOffset: '-2px' },
            },
            selectors: { ...pressedInk },
        },
        'branch-indicator': {
            base: {
                display: 'inline-block',
                opacity: '0.55',
                transition: 'transform var(--duration-fast) var(--ease-standard)',
            },
            states: { open: { transform: 'rotate(90deg)' }, closed: {} },
            at: {
                'reduced-motion': { base: { transition: 'none' } },
            },
        },
        // Each level hangs off a hairline indent guide — the tree draws its
        // structure the way the rest of Monograph does, with a rule.
        'branch-content': {
            base: {
                display: 'flex',
                flexDirection: 'column',
                marginInlineStart: '0.5rem',
                paddingInlineStart: '0.5rem',
                borderInlineStart: hairline,
            },
            states: { open: {}, closed: {} },
        },
    },
    variants: {
        // A tree colours one thing: the selection marker. Everything else is
        // structure, and tinting it would fight the content.
        color: Object.fromEntries(ROLES.map((c) => [c, { root: { base: {
            '--tree-accent': `var(--color-${c})`,
            '--tree-soft': `var(--color-${c}-soft)`,
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
