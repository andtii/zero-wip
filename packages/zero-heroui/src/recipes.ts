/**
 * zero-heroui recipes — HeroUI v3's look over zero's anatomy.
 *
 * Two things here exist nowhere else in the repo, and are the reason the
 * package exists (RFC 0003 §8):
 *
 *  1. **No `variants.color` anywhere.** There are no roles to key it on, so
 *     every component types `color: never`. Colour reaches the CSS through
 *     declared custom tokens instead, because in HeroUI v3 colour is not an
 *     axis a consumer can pass.
 *  2. **A fused `variant`.** `primary`/`secondary`/`tertiary` are a semantic
 *     hierarchy and `danger`/`danger-soft` fold colour and treatment into one
 *     member — a vocabulary that cannot be expressed as colour × fill.
 *
 * Plus the first design-system use of `modifiers` (HeroUI's `isIconOnly` /
 * `isPending`) and of a `compoundVariants` entry that matches one.
 */
import type { CssProps, PartStyles, RecipeInput } from '@sigx/zero-kit';

const motion = (props: string): string =>
    props.split(', ').map((p) => `${p} var(--duration-fast) var(--ease-standard)`).join(', ');

/** v3's ring: the focus colour, offset, never an outline on the fill itself. */
const focusRing: Record<string, CssProps> = {
    'focus-visible': {
        outline: '2px solid var(--hero-focus)',
        outlineOffset: '2px',
    },
};

const label: CssProps = {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--color-base-content)',
};

/** The ghost dismiss button dialog, popover and toast share — one behaviour. */
const ghostClose: PartStyles = {
    base: {
        appearance: 'none',
        border: 'none',
        background: 'transparent',
        color: 'var(--hero-muted)',
        borderRadius: 'var(--radius-selector)',
        padding: 'var(--space-2xs)',
        cursor: 'pointer',
        transition: motion('background, color'),
    },
    states: {
        hover: { color: 'var(--color-base-content)', background: 'var(--color-base-200)' },
        disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
        ...focusRing,
    },
};

/**
 * Enter/exit for a top-layer popup — the same platform mechanism every design
 * system in this repo uses: transition `display`/`overlay` with
 * `allow-discrete` so the browser keeps the element around for the exit, and
 * `@starting-style` supplies the state the entry animates from.
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
    states: { open: { opacity: '1', transform: 'none' }, closed: {} },
    at: {
        'starting-style': { states: { open: { opacity: '0', transform: from } } },
        'reduced-motion': { base: { transition: 'none' }, states: { open: { transform: 'none' } } },
    },
});

/**
 * Enter/exit for a disclosure panel, which is not in the top layer.
 *
 * Collapsible and Accordion are native `<details>`, so the height animation
 * lives on the browser's own `::details-content` wrapper —
 * `interpolate-size: allow-keywords` (set on the element, not globally) makes
 * `auto` a legal endpoint.
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
 * The shared disclosure row — collapsible IS the accordion language minus the
 * dividers, so both take this trigger and panel verbatim. The chevron is
 * drawn (two borders, rotated) rather than glyphed so it can turn about its
 * own center, and a row presses with a deeper tint — a scale would visibly
 * shear something full-width.
 */
const disclosureTrigger: PartStyles = {
    base: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
        padding: 'var(--space-md) var(--space-xs)',
        borderRadius: 'var(--radius-field)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-md)',
        fontWeight: 'var(--weight-medium)',
        color: 'var(--color-base-content)',
        cursor: 'pointer',
        listStyle: 'none',
        transition: motion('background'),
    },
    states: {
        hover: { background: 'var(--color-base-200)' },
        open: {},
        closed: {},
        // The dim lives on the owning part (root / item); the row only re-cursors.
        disabled: { cursor: 'not-allowed' },
        ...focusRing,
    },
    selectors: {
        '&::after': {
            content: '""',
            flex: 'none',
            width: '0.4em',
            height: '0.4em',
            border: 'solid var(--hero-muted)',
            borderWidth: '0 2px 2px 0',
            marginInlineEnd: 'var(--space-2xs)',
            transform: 'rotate(45deg)',
            transition: motion('transform'),
        },
        '&[data-state="open"]::after': { transform: 'rotate(225deg)' },
        '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-300)' },
    },
};

const disclosurePanel: PartStyles = {
    base: {
        padding: '0 var(--space-xs) var(--space-md)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        color: 'var(--hero-muted)',
    },
    states: { open: {}, closed: {} },
};

// ── Tabs ──────────────────────────────────────────────────────────────────
export const tabs: RecipeInput = {
    component: 'tabs',
    tokens: { '--tabs-text': 'var(--text-sm)' },
    parts: {
        root: { base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' } },
        list: {
            base: {
                display: 'inline-flex',
                gap: 'var(--space-2xs)',
                padding: 'var(--space-2xs)',
                background: 'var(--color-base-200)',
                borderRadius: 'var(--radius-box)',
                width: 'fit-content',
            },
        },
        tab: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                padding: 'var(--space-xs) var(--space-md)',
                borderRadius: 'var(--radius-field)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--tabs-text)',
                fontWeight: 'var(--weight-medium)',
                color: 'var(--hero-muted)',
                cursor: 'pointer',
                transition: motion('background, color, transform'),
            },
            states: {
                // v3's segmented look: the active tab is a raised pill.
                active: {
                    background: 'var(--color-base-100)',
                    color: 'var(--color-base-content)',
                    boxShadow: 'var(--shadow-sm)',
                },
                inactive: {},
                hover: { color: 'var(--color-base-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
            // v3 presses inward rather than darkening further.
            selectors: {
                '&[data-pressed]:not([data-disabled])': { transform: 'scale(0.97)' },
            },
        },
        panel: {
            base: { fontFamily: 'var(--font-sans)', fontSize: 'var(--text-md)', color: 'var(--color-base-content)' },
            states: { active: {}, inactive: {} },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--tabs-text': 'var(--text-xs)' } } },
            md: {},
            lg: { root: { base: { '--tabs-text': 'var(--text-md)' } } },
        },
    },
};

// ── Collapsible ───────────────────────────────────────────────────────────
export const collapsible: RecipeInput = {
    component: 'collapsible',
    parts: {
        root: withPresence(disclosurePresence, {
            base: { color: 'var(--color-base-content)' },
            states: {
                open: {},
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)' },
            },
        }),
        trigger: disclosureTrigger,
        panel: disclosurePanel,
    },
};

// ── Switch ────────────────────────────────────────────────────────────────
export const switchRecipe: RecipeInput = {
    component: 'switch',
    tokens: {
        '--switch-width': 'calc(var(--size-selector) * 11)',
        '--switch-height': 'calc(var(--size-selector) * 6)',
        '--switch-pad': 'calc(var(--size-selector) * 0.5)',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' },
            states: {
                checked: {}, unchecked: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                invalid: {}, required: {},
            },
        },
        control: {
            base: {
                position: 'relative',
                flex: 'none',
                width: 'var(--switch-width)',
                height: 'var(--switch-height)',
                borderRadius: '9999px',
                background: 'var(--color-base-300)',
                transition: motion('background'),
            },
            states: {
                checked: { background: 'var(--hero-primary)' },
                unchecked: {},
                disabled: {},
                ...focusRing,
            },
        },
        thumb: {
            base: {
                position: 'absolute',
                top: 'var(--switch-pad)',
                insetInlineStart: 'var(--switch-pad)',
                width: 'calc(var(--switch-height) - var(--switch-pad) * 2)',
                height: 'calc(var(--switch-height) - var(--switch-pad) * 2)',
                borderRadius: '9999px',
                background: 'var(--color-base-100)',
                boxShadow: 'var(--shadow-sm)',
                transition: motion('translate'),
            },
            states: {
                checked: { translate: 'calc(var(--switch-width) - var(--switch-height)) 0' },
                unchecked: {},
            },
        },
        label: {
            base: { ...label },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    variants: {
        size: {
            sm: {
                root: {
                    base: {
                        '--switch-width': 'calc(var(--size-selector) * 9)',
                        '--switch-height': 'calc(var(--size-selector) * 5)',
                    },
                },
            },
            md: {},
            lg: {
                root: {
                    base: {
                        '--switch-width': 'calc(var(--size-selector) * 13)',
                        '--switch-height': 'calc(var(--size-selector) * 7)',
                    },
                },
            },
        },
    },
    // The ring draws on `control`; the root only groups it with its text.
    skipStates: { root: ['focus-visible'] },
};

// ── Dialog ────────────────────────────────────────────────────────────────
export const dialog: RecipeInput = {
    component: 'dialog',
    parts: {
        trigger: {
            base: { cursor: 'pointer' },
            states: { open: {}, closed: {}, disabled: { cursor: 'not-allowed' }, ...focusRing },
        },
        popup: withPresence(popupPresence('translateY(8px) scale(0.98)'), {
            base: {
                border: 'none',
                borderRadius: 'var(--radius-box)',
                padding: 'var(--space-xl)',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                boxShadow: 'var(--shadow-xl)',
                maxWidth: 'min(32rem, calc(100vw - var(--space-2xl)))',
            },
        }),
        backdrop: {
            base: {
                background: 'var(--hero-scrim)',
                backdropFilter: 'blur(2px)',
                transition: 'opacity var(--duration-fast) var(--ease-standard), '
                    + 'display var(--duration-fast) allow-discrete, '
                    + 'overlay var(--duration-fast) allow-discrete',
                opacity: '0',
            },
            states: { open: { opacity: '1' }, closed: {} },
            at: {
                'starting-style': { states: { open: { opacity: '0' } } },
                'reduced-motion': { base: { transition: 'none' } },
            },
        },
        title: {
            base: {
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--color-base-content)',
            },
        },
        description: {
            base: {
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                color: 'var(--hero-muted)',
                marginBlockStart: 'var(--space-xs)',
            },
        },
        footer: {
            base: { display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginBlockStart: 'var(--space-xl)' },
        },
        close: ghostClose,
    },
};

// ── Popover ───────────────────────────────────────────────────────────────
export const popover: RecipeInput = {
    component: 'popover',
    parts: {
        trigger: {
            base: { cursor: 'pointer' },
            states: { open: {}, closed: {}, disabled: { cursor: 'not-allowed' }, ...focusRing },
        },
        // Dialog's surface, one step lighter: hairline instead of borderless,
        // `lg` shadow instead of `xl`, and it rises into place from below.
        popup: withPresence(popupPresence('translateY(4px)'), {
            base: {
                margin: '0',
                padding: 'var(--space-lg)',
                minWidth: '14rem',
                maxWidth: 'min(20rem, calc(100vw - var(--space-2xl)))',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                boxShadow: 'var(--shadow-lg)',
            },
        }),
        title: {
            base: {
                margin: '0 0 var(--space-xs)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-md)',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--color-base-content)',
            },
        },
        close: ghostClose,
    },
};

// ── Tooltip ───────────────────────────────────────────────────────────────
export const tooltip: RecipeInput = {
    component: 'tooltip',
    parts: {
        trigger: {
            base: {},
            states: { open: {}, closed: {}, disabled: {} },
        },
        // The one inverted surface in the system: content ink as the fill.
        popup: withPresence(popupPresence('translateY(2px)'), {
            base: {
                margin: '0',
                padding: 'var(--space-xs) var(--space-sm)',
                maxWidth: '18rem',
                border: 'none',
                borderRadius: 'var(--radius-selector)',
                background: 'var(--color-base-content)',
                color: 'var(--color-base-100)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                lineHeight: 'var(--leading-tight)',
                boxShadow: 'var(--shadow-sm)',
            },
        }),
    },
};

// ── Menu ──────────────────────────────────────────────────────────────────
export const menu: RecipeInput = {
    component: 'menu',
    parts: {
        trigger: {
            base: { cursor: 'pointer' },
            states: { open: {}, closed: {}, disabled: { cursor: 'not-allowed' }, ...focusRing },
        },
        // The select popup's surface, verbatim — one floating-list look.
        popup: withPresence(popupPresence('translateY(-4px)'), {
            base: {
                margin: '0',
                padding: 'var(--space-2xs)',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: '12rem',
            },
        }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-selector)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-base-content)',
                cursor: 'pointer',
                outline: 'none',
            },
            states: {
                highlighted: { background: 'var(--color-base-200)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-300)' },
            },
        },
        // The item look, plus an `open` state that keeps it lit after focus
        // moves into the submenu. `open` before `highlighted`, so the pointer
        // hover wins both properties when the two apply at once (#116).
        'sub-trigger': {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-selector)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-base-content)',
                cursor: 'pointer',
                outline: 'none',
            },
            states: {
                open: { background: 'var(--color-base-200)' },
                closed: {},
                highlighted: { background: 'var(--color-base-200)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&::after': { content: '"\\203A"', marginInlineStart: 'auto', color: 'var(--hero-muted)' },
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-300)' },
            },
        },
        // The popup surface again, entering from the side it attaches on.
        'sub-popup': withPresence(popupPresence('translateX(-4px)'), {
            base: {
                margin: '0',
                padding: 'var(--space-2xs)',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: '12rem',
            },
        }),
        'context-trigger': {
            base: {},
            states: { open: {}, closed: {}, disabled: {} },
        },
        group: { base: {} },
        'group-label': {
            base: {
                padding: 'var(--space-xs) var(--space-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--hero-muted)',
            },
        },
        separator: {
            base: {
                height: 'var(--border)',
                margin: 'var(--space-2xs) 0',
                background: 'var(--hero-line)',
            },
        },
    },
};

// ── Field ─────────────────────────────────────────────────────────────────
export const field: RecipeInput = {
    component: 'field',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' }, invalid: {}, required: {} },
        },
        label: {
            base: { ...label },
            states: {
                disabled: {},
                invalid: { color: 'var(--hero-danger)' },
                // v3 marks required with the label's own weight, not an asterisk.
                required: { fontWeight: 'var(--weight-semibold)' },
            },
        },
        description: {
            base: { fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--hero-muted)' },
        },
        error: {
            base: { fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--hero-danger)' },
            states: { invalid: {} },
        },
    },
};

/**
 * Forced colors and print both erase painted geometry — the forced palette
 * revalues every colour the marks are drawn in, and a print engine drops
 * background paint by default — so both swap the drawn tick for text, the way
 * daisyUI's checkbox does. Zero renders no glyph of its own inside the
 * indicator, so here the mark IS the content.
 *
 * Both are named conditions (#226 added `print` beside `forced-colors`), so
 * both resolve at the preference tier — after the flat state rules they
 * replace.
 */
const drawnMarkFallback: PartStyles = {
    // Near-white ink is right on the primary fill and wrong on paper, where
    // the fill does not print. Forced colours override this again to
    // CanvasText, which is what that mode wants.
    base: { color: 'var(--color-base-content)' },
    selectors: {
        '&::before': { display: 'none' },
        // Not a pair of arms any more: a centred glyph, so the lengths, the
        // borders and the elbow rotation all have to go with them.
        '&::after': {
            width: 'auto',
            height: 'auto',
            border: 'none',
            borderRadius: '0',
            opacity: '1',
            left: '50%',
            top: '50%',
            transformOrigin: '50% 50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'calc(var(--checkbox-size) * 0.78)',
            lineHeight: 'var(--leading-none)',
        },
        '&[data-state="checked"]::after': { content: '"\\2713"' },
        '&[data-state="indeterminate"]::after': { content: '"\\2013"' },
    },
};

// ── Checkbox ──────────────────────────────────────────────────────────────
/**
 * The tick and the indeterminate bar are DRAWN, not glyphed: two borders of a
 * box rotated 45° about the elbow they share, and a pill-capped bar. Geometry
 * is what lets them scale with `--checkbox-size` and animate — a font glyph
 * can only fade, and half the fonts in the wild have no half-decent check in
 * them anyway.
 *
 * The three states set two 0|1 drivers instead of styling the marks
 * themselves. That keeps the geometry in one place and makes each state a
 * LENGTH: `--checkbox-tick: 1` grows both arms out of an elbow that is pinned
 * (`transform-origin` sits on the corner both borders meet at, so the
 * rotation never moves while the arms grow), which is a tick drawing itself
 * rather than one fading in. Two durations, one start: the short arm lands
 * first and the long one keeps going, which is the stroke order a hand uses.
 */
export const checkbox: RecipeInput = {
    component: 'checkbox',
    tokens: {
        '--checkbox-size': 'calc(var(--size-selector) * 5)',
        // ~2.4px at md, and never hairline-thin at sm.
        '--checkbox-stroke': 'max(1.5px, calc(var(--checkbox-size) * 0.12))',
        '--checkbox-tick': '0',
        '--checkbox-dash': '0',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' },
            states: {
                checked: {}, unchecked: {}, indeterminate: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                invalid: {}, required: {},
            },
        },
        control: {
            base: {
                display: 'inline-grid',
                placeItems: 'center',
                flex: 'none',
                width: 'var(--checkbox-size)',
                height: 'var(--checkbox-size)',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-selector)',
                background: 'var(--color-base-100)',
                transition: motion('background, border-color, transform'),
            },
            states: {
                checked: { background: 'var(--hero-primary)', borderColor: 'var(--hero-primary)' },
                indeterminate: { background: 'var(--hero-primary)', borderColor: 'var(--hero-primary)' },
                unchecked: {},
                invalid: { borderColor: 'var(--hero-danger)' },
                disabled: {},
                ...focusRing,
            },
            // v3 presses inward — the radio item-control's language.
            selectors: {
                '&[data-pressed]:not([data-disabled])': { transform: 'scale(0.97)' },
            },
        },
        indicator: {
            base: {
                position: 'relative',
                display: 'block',
                width: '100%',
                height: '100%',
                color: 'var(--hero-primary-ink)',
                lineHeight: 'var(--leading-none)',
            },
            // Each state is the pair of arm/bar lengths, so the marks
            // interpolate between states instead of swapping.
            states: {
                checked: { '--checkbox-tick': '1', '--checkbox-dash': '0' },
                indeterminate: { '--checkbox-tick': '0', '--checkbox-dash': '1' },
                unchecked: { '--checkbox-tick': '0', '--checkbox-dash': '0' },
            },
            selectors: {
                // The tick. `left`/`top` are physical on purpose — a check is
                // not mirrored in RTL, only laid out on the other side.
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: '38%',
                    top: '72%',
                    width: 'calc(30% * var(--checkbox-tick))',
                    height: 'calc(58% * var(--checkbox-tick))',
                    borderRight: 'var(--checkbox-stroke) solid currentColor',
                    borderBottom: 'var(--checkbox-stroke) solid currentColor',
                    // v3's softness, at the one corner a checkmark has.
                    borderBottomRightRadius: 'calc(var(--checkbox-stroke) * 0.75)',
                    opacity: 'var(--checkbox-tick)',
                    transformOrigin: '100% 100%',
                    transform: 'translate(-100%, -100%) rotate(45deg)',
                    transition: 'width var(--duration-fast) var(--ease-decelerate), '
                        + 'height var(--duration-normal) var(--ease-decelerate), '
                        + 'opacity var(--duration-fast) var(--ease-standard)',
                },
                // The indeterminate bar — pill-capped, grown from its middle.
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    insetInline: '24%',
                    top: '50%',
                    height: 'var(--checkbox-stroke)',
                    borderRadius: '9999px',
                    background: 'currentColor',
                    opacity: 'var(--checkbox-dash)',
                    transform: 'translateY(-50%) scaleX(var(--checkbox-dash))',
                    transition: 'transform var(--duration-normal) var(--ease-decelerate), '
                        + 'opacity var(--duration-fast) var(--ease-standard)',
                },
            },
            at: { 'forced-colors': drawnMarkFallback, print: drawnMarkFallback },
        },
        label: {
            base: { ...label },
            states: { checked: {}, unchecked: {}, indeterminate: {}, disabled: {} },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 4)' } } },
            md: {},
            lg: { root: { base: { '--checkbox-size': 'calc(var(--size-selector) * 6)' } } },
        },
    },
    skipStates: { root: ['focus-visible'] },
};

// ── Radio group ───────────────────────────────────────────────────────────
export const radioGroup: RecipeInput = {
    component: 'radio-group',
    tokens: { '--radio-size': 'calc(var(--size-selector) * 5)' },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                invalid: {}, required: {},
            },
            selectors: {
                '&[data-orientation="horizontal"]': { flexDirection: 'row' },
                // `invalid` lands on the root; the border that shows it lives
                // on each control.
                '&[data-invalid] [data-part="item-control"]': { borderColor: 'var(--hero-danger)' },
            },
        },
        label: {
            base: { ...label },
            states: {
                disabled: {},
                invalid: { color: 'var(--hero-danger)' },
                // v3 marks required with the label's own weight, not an asterisk.
                required: { fontWeight: 'var(--weight-semibold)' },
            },
        },
        item: {
            base: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' },
            states: {
                checked: {}, unchecked: {},
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
        },
        'item-control': {
            base: {
                display: 'inline-grid',
                placeItems: 'center',
                flex: 'none',
                width: 'var(--radio-size)',
                height: 'var(--radio-size)',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: '9999px',
                background: 'var(--color-base-100)',
                transition: motion('border-color, transform'),
            },
            states: {
                checked: { borderColor: 'var(--hero-primary)' },
                unchecked: {},
                disabled: {},
                ...focusRing,
            },
            // v3 presses inward rather than darkening further.
            selectors: {
                '&[data-pressed]:not([data-disabled])': { transform: 'scale(0.97)' },
            },
        },
        'item-indicator': {
            base: {
                width: 'calc(var(--radio-size) / 2)',
                height: 'calc(var(--radio-size) / 2)',
                borderRadius: '9999px',
                background: 'transparent',
                transition: motion('background'),
            },
            states: {
                checked: { background: 'var(--hero-primary)' },
                unchecked: {},
            },
        },
        'item-label': {
            base: { ...label },
            states: { checked: {}, unchecked: {}, disabled: {} },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 4)' } } },
            md: {},
            lg: { root: { base: { '--radio-size': 'calc(var(--size-selector) * 6)' } } },
        },
    },
    // The ring draws on `item-control`; `item` is the <label> row around it.
    skipStates: { item: ['focus-visible'] },
};

// ── Progress ──────────────────────────────────────────────────────────────
export const progress: RecipeInput = {
    component: 'progress',
    tokens: {
        '--progress-height': 'calc(var(--size-selector) * 2)',
        /** The value readout's ink — the one thing `complete` recolours. */
        '--progress-ink': 'var(--hero-muted)',
    },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', width: '100%' },
            states: {
                loading: {},
                // A finished bar is a full bar, so `complete` cannot be the
                // fill's own colour without giving v3 a second accent. It is
                // the READOUT that settles onto the accent instead, and the
                // fill picks up the hairline below.
                complete: { '--progress-ink': 'var(--hero-primary)' },
                indeterminate: {},
            },
        },
        label: {
            base: { ...label },
        },
        track: {
            base: {
                width: '100%',
                height: 'var(--progress-height)',
                background: 'var(--color-base-300)',
                borderRadius: '9999px',
                overflow: 'hidden',
            },
        },
        range: {
            base: {
                height: '100%',
                background: 'var(--hero-primary)',
                borderRadius: '9999px',
                transition: motion('width, box-shadow'),
            },
            states: {
                loading: {},
                // v3 keeps its one accent, so completion is depth rather than
                // hue: the inset hairline that every other v3 fill carries
                // when it is done being provisional. The track is fully
                // covered at 100%, which is why the cue lives here.
                complete: {
                    boxShadow: 'inset 0 0 0 var(--border) '
                        + 'color-mix(in oklab, var(--hero-primary-ink) 70%, transparent)',
                },
                indeterminate: { width: '40%', animation: 'hero-indeterminate 1.2s ease-in-out infinite' },
            },
            // A looping animation must STOP under reduced motion, not speed
            // up — which is why its duration is a literal rather than a
            // `var(--duration-*)` that would collapse to 0.
            at: {
                'reduced-motion': {
                    states: { indeterminate: { animation: 'none', width: '100%' } },
                },
            },
        },
        'value-text': {
            base: {
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                color: 'var(--progress-ink)',
                transition: motion('color'),
            },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--progress-height': 'calc(var(--size-selector) * 1.5)' } } },
            md: {},
            lg: { root: { base: { '--progress-height': 'calc(var(--size-selector) * 3)' } } },
        },
    },
    keyframes: {
        'hero-indeterminate': 'from { margin-left: -40%; } to { margin-left: 100%; }',
    },
};

// ── Slider ────────────────────────────────────────────────────────────────
export const slider: RecipeInput = {
    component: 'slider',
    tokens: {
        '--slider-accent': 'var(--hero-primary)',
        '--slider-track-size': 'calc(var(--size-selector) * 2)',
        '--slider-thumb-size': 'calc(var(--size-selector) * 5)',
    },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', width: '100%' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        label: {
            base: { ...label },
            states: { disabled: {} },
        },
        // A custom skin (`appearance: none`): Blink ignores thumb-pseudo
        // styling on a native slider, and Chrome treats range inputs as
        // always `:focus-visible` — so the offset ring would read as stuck.
        // Each state sets ONE custom property the vendor thumb pseudos read
        // (they cannot share a selector list), and the filled track reads the
        // runtime-published `--slider-percent` as a gradient stop.
        control: {
            base: {
                appearance: 'none',
                width: '100%',
                height: 'calc(var(--slider-thumb-size) + var(--size-selector) * 2)',
                margin: '0',
                background: 'transparent',
                cursor: 'pointer',
                outline: 'none',
                accentColor: 'var(--slider-accent)',
                '--slider-ring': 'transparent',
                '--slider-thumb-scale': '1',
                '--slider-track': 'linear-gradient(to right, '
                    + 'var(--slider-accent) var(--slider-percent, 50%), var(--color-base-300) 0)',
            },
            states: {
                // The ring IS the focus indicator here — see the skin comment.
                'focus-visible': { '--slider-ring': 'var(--hero-focus)' },
                pressed: { '--slider-thumb-scale': '0.94' },
                // `invalid` is semantic: the whole fill turns danger.
                invalid: { '--slider-accent': 'var(--hero-danger)' },
                disabled: { cursor: 'not-allowed' },
            },
            selectors: {
                '&::-webkit-slider-runnable-track': {
                    height: 'var(--slider-track-size)',
                    borderRadius: '9999px',
                    background: 'var(--slider-track)',
                },
                '&::-webkit-slider-thumb': {
                    appearance: 'none',
                    width: 'var(--slider-thumb-size)',
                    height: 'var(--slider-thumb-size)',
                    marginTop: 'calc((var(--slider-track-size) - var(--slider-thumb-size)) / 2)',
                    borderRadius: '9999px',
                    border: 'var(--border) solid var(--hero-line)',
                    background: 'var(--color-base-100)',
                    boxShadow: '0 0 0 2px var(--slider-ring), var(--shadow-sm)',
                    transform: 'scale(var(--slider-thumb-scale))',
                    transition: motion('box-shadow, transform'),
                },
                '&::-moz-range-track': {
                    height: 'var(--slider-track-size)',
                    borderRadius: '9999px',
                    background: 'var(--slider-track)',
                },
                '&::-moz-range-thumb': {
                    width: 'var(--slider-thumb-size)',
                    height: 'var(--slider-thumb-size)',
                    borderRadius: '9999px',
                    border: 'var(--border) solid var(--hero-line)',
                    background: 'var(--color-base-100)',
                    boxShadow: '0 0 0 2px var(--slider-ring), var(--shadow-sm)',
                    transform: 'scale(var(--slider-thumb-scale))',
                    transition: motion('box-shadow, transform'),
                },
            },
            at: {
                // Native rendering knows forced colors better than a custom
                // skin; the retained accentColor keeps the fallback branded.
                'forced-colors': {
                    base: { appearance: 'auto', '--slider-ring': 'transparent' },
                },
            },
        },
        'value-text': {
            base: { fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--hero-muted)' },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--slider-thumb-size': 'calc(var(--size-selector) * 4)' } } },
            md: {},
            lg: {
                root: {
                    base: {
                        '--slider-thumb-size': 'calc(var(--size-selector) * 6)',
                        '--slider-track-size': 'calc(var(--size-selector) * 2.5)',
                    },
                },
            },
        },
    },
    // The focus indicator lives on the control's thumb; `invalid` recolours
    // the fill there too.
    skipStates: { root: ['invalid', 'focus-visible'] },
};

// ── Accordion ─────────────────────────────────────────────────────────────
export const accordion: RecipeInput = {
    component: 'accordion',
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', color: 'var(--color-base-content)' },
        },
        // Hairline-divided rows, no outer box — v3 keeps the frame this light.
        item: withPresence(disclosurePresence, {
            base: { borderBlockEnd: 'var(--border) solid var(--hero-line)' },
            states: {
                open: {},
                closed: {},
                disabled: { opacity: 'var(--disabled-opacity)' },
            },
            selectors: {
                '&:last-child': { borderBlockEnd: 'none' },
            },
        }),
        trigger: disclosureTrigger,
        panel: disclosurePanel,
    },
};

// ── Select ────────────────────────────────────────────────────────────────
export const select: RecipeInput = {
    component: 'select',
    tokens: { '--select-text': 'var(--text-sm)' },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column' },
            states: { disabled: {}, invalid: {}, required: {} },
        },
        trigger: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
                minWidth: '12rem',
                padding: 'var(--space-sm) var(--space-md)',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-field)',
                background: 'var(--color-base-100)',
                color: 'var(--color-base-content)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--select-text)',
                cursor: 'pointer',
                transition: motion('border-color, background'),
            },
            states: {
                open: { borderColor: 'var(--hero-primary)' },
                closed: {},
                hover: { borderColor: 'var(--color-base-content)' },
                invalid: { borderColor: 'var(--hero-danger)' },
                placeholder: { color: 'var(--hero-muted)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
            // A tint, not a scale — a full-width field would visibly shear.
            selectors: {
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-200)' },
            },
        },
        value: {
            base: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            states: { placeholder: { color: 'var(--hero-muted)' } },
        },
        indicator: {
            base: { flex: 'none', color: 'var(--hero-muted)', transition: motion('rotate') },
            states: { open: { rotate: '180deg' }, closed: {} },
        },
        popup: withPresence(popupPresence('translateY(-4px)'), {
            base: {
                margin: '0',
                padding: 'var(--space-2xs)',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: '12rem',
            },
        }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-sm)',
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-selector)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--select-text)',
                color: 'var(--color-base-content)',
                cursor: 'pointer',
            },
            states: {
                highlighted: { background: 'var(--color-base-200)' },
                selected: { color: 'var(--hero-primary)', fontWeight: 'var(--weight-medium)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            // The menu-item press — the same row language, one popup over.
            selectors: {
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-300)' },
            },
        },
        'item-indicator': {
            base: { flex: 'none', color: 'var(--hero-primary)' },
            states: { selected: {} },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--select-text': 'var(--text-xs)' } } },
            md: {},
            lg: { root: { base: { '--select-text': 'var(--text-md)' } } },
        },
    },
};

// ── Button ────────────────────────────────────────────────────────────────
export const button: RecipeInput = {
    component: 'button',
    /**
     * The un-attributed render IS `variant="primary"` at `size="md"`, so the
     * defaults live here rather than in `defaultVariants` — no `:not([…])`
     * mirror is emitted and the variants only rebind (the "toast shape").
     */
    tokens: {
        '--btn-fill': 'var(--hero-primary)',
        '--btn-ink': 'var(--hero-primary-ink)',
        '--btn-line': 'transparent',
    },
    parts: {
        root: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-sm)',
                // v3 sizes to its content — v2's min-widths are gone.
                width: 'fit-content',
                padding: 'var(--space-sm) var(--space-lg)',
                border: 'var(--border) solid var(--btn-line)',
                borderRadius: 'var(--radius-field)',
                background: 'var(--btn-fill)',
                color: 'var(--btn-ink)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: motion('background, border-color, opacity, transform'),
            },
            states: {
                hover: { filter: 'brightness(0.95)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed', filter: 'none' },
                ...focusRing,
            },
            // v3 presses inward rather than darkening further.
            selectors: {
                '&[data-pressed]:not([data-disabled])': { transform: 'scale(0.97)' },
            },
        },
    },
    variants: {
        /**
         * The fused axis. Note what is NOT here: any notion of colour a
         * consumer could pass separately. `danger` is a variant.
         */
        variant: {
            primary: { root: { base: { '--btn-fill': 'var(--hero-primary)', '--btn-ink': 'var(--hero-primary-ink)', '--btn-line': 'transparent' } } },
            secondary: {
                root: {
                    base: {
                        '--btn-fill': 'var(--color-base-100)',
                        '--btn-ink': 'var(--color-base-content)',
                        '--btn-line': 'var(--hero-line)',
                    },
                },
            },
            tertiary: { root: { base: { '--btn-fill': 'transparent', '--btn-ink': 'var(--hero-muted)', '--btn-line': 'transparent' } } },
            outline: { root: { base: { '--btn-fill': 'transparent', '--btn-ink': 'var(--hero-primary)', '--btn-line': 'var(--hero-primary)' } } },
            ghost: { root: { base: { '--btn-fill': 'transparent', '--btn-ink': 'var(--color-base-content)', '--btn-line': 'transparent' } } },
            danger: { root: { base: { '--btn-fill': 'var(--hero-danger)', '--btn-ink': 'var(--hero-danger-ink)', '--btn-line': 'transparent' } } },
            'danger-soft': { root: { base: { '--btn-fill': 'var(--hero-danger-soft)', '--btn-ink': 'var(--hero-danger)', '--btn-line': 'transparent' } } },
        },
        size: {
            sm: { root: { base: { padding: 'var(--space-xs) var(--space-md)', fontSize: 'var(--text-xs)' } } },
            // `md` is the un-attributed render — the base already IS it.
            md: {},
            lg: { root: { base: { padding: 'var(--space-md) var(--space-xl)', fontSize: 'var(--text-md)' } } },
        },
    },
    /** HeroUI's `isIconOnly` / `isPending` — presence-only, no value. */
    modifiers: {
        'icon-only': {
            root: { base: { padding: 'var(--space-sm)', aspectRatio: '1', gap: '0' } },
        },
        pending: {
            root: { base: { cursor: 'progress', opacity: '0.7' } },
        },
    },
    compoundVariants: [
        {
            // A destructive icon button reads as a target, not a label — the
            // first `compoundVariants` entry in the repo that matches a
            // presence-only modifier rather than only axis values.
            match: { variant: 'danger', 'icon-only': true },
            parts: { root: { base: { borderRadius: '9999px' } } },
        },
    ],
};

// ── Avatar ────────────────────────────────────────────────────────────────
export const avatar: RecipeInput = {
    component: 'avatar',
    tokens: {
        '--avatar-size': 'calc(var(--size-selector) * 10)',
        '--avatar-text': 'var(--text-sm)',
    },
    parts: {
        root: {
            base: {
                position: 'relative',
                display: 'inline-grid',
                width: 'var(--avatar-size)',
                height: 'var(--avatar-size)',
                // v3 avatars are circles, not rounded squares.
                borderRadius: '9999px',
                overflow: 'hidden',
                verticalAlign: 'middle',
                background: 'var(--color-base-200)',
            },
            states: { loading: {}, loaded: {}, error: {} },
        },
        image: {
            base: { gridArea: '1 / 1', width: '100%', height: '100%', objectFit: 'cover' },
            states: { loading: {}, loaded: {}, error: {} },
        },
        fallback: {
            base: {
                gridArea: '1 / 1',
                placeItems: 'center',
                width: '100%',
                height: '100%',
                color: 'var(--color-base-content)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--avatar-text)',
                fontWeight: 'var(--weight-medium)',
                userSelect: 'none',
            },
            // `display` must not defeat the `hidden` zero sets once the image
            // has loaded.
            selectors: { '&:not([hidden])': { display: 'grid' } },
            states: { loading: {}, loaded: {}, error: {} },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--avatar-size': 'calc(var(--size-selector) * 8)', '--avatar-text': 'var(--text-xs)' } } },
            md: {},
            lg: { root: { base: { '--avatar-size': 'calc(var(--size-selector) * 12)', '--avatar-text': 'var(--text-md)' } } },
        },
    },
};

// ── Toast ─────────────────────────────────────────────────────────────────
/**
 * Toast presence is runtime-managed — the one popup-shaped component where
 * `@starting-style`/`allow-discrete` must NOT be used: zero mounts the root
 * `closed`, flips it `open` a frame later, and keeps it mounted after
 * dismissal until the longest transition here finishes. Both directions are
 * the ordinary two-state transition. The viewport IS the top-layer popover
 * (`popover="manual"`), so its recipe neutralizes the UA popover box —
 * `inset`, border, Canvas fill — and lets `data-placement` position it.
 */
export const toast: RecipeInput = {
    component: 'toast',
    parts: {
        viewport: {
            base: {
                position: 'fixed',
                inset: 'auto',
                margin: '0',
                padding: 'var(--space-xl)',
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
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-md)',
                minWidth: '18rem',
                padding: 'var(--space-md) var(--space-lg)',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                boxShadow: 'var(--shadow-lg)',
                opacity: '0',
                transform: 'translateX(8px)',
                transition: motion('opacity, transform'),
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
            base: {
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
                color: 'var(--color-base-content)',
            },
        },
        description: {
            base: { fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--hero-muted)' },
        },
        action: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--hero-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-selector)',
            },
            states: {
                hover: { textDecoration: 'underline' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
        },
        close: {
            ...ghostClose,
            base: { ...ghostClose.base, marginInlineStart: 'auto' },
        },
    },
};

// ── Combobox ──────────────────────────────────────────────────────────────
export const combobox: RecipeInput = {
    component: 'combobox',
    tokens: { '--combobox-text': 'var(--text-sm)' },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column' },
            states: { disabled: {}, invalid: {}, required: {} },
        },
        // The field chrome — the select trigger's language, split so the
        // input and the disclosure button sit joined inside one border.
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'center',
                minWidth: '12rem',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-field)',
                background: 'var(--color-base-100)',
                transition: motion('border-color'),
            },
            states: {
                open: { borderColor: 'var(--hero-primary)' },
                closed: {},
                hover: { borderColor: 'var(--color-base-content)' },
                invalid: { borderColor: 'var(--hero-danger)' },
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
                padding: 'var(--space-sm) var(--space-md)',
                color: 'var(--color-base-content)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--combobox-text)',
            },
            states: {
                open: {}, closed: {},
                disabled: { cursor: 'not-allowed' },
                invalid: {}, required: {}, readonly: {},
            },
            selectors: {
                '&::placeholder': { color: 'var(--hero-muted)' },
            },
        },
        trigger: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--hero-muted)',
                padding: '0 var(--space-md)',
                cursor: 'pointer',
                transition: motion('rotate, transform'),
            },
            states: {
                open: { rotate: '180deg' },
                closed: {},
                disabled: { cursor: 'not-allowed' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { transform: 'scale(0.97)' },
            },
        },
        popup: withPresence(popupPresence('translateY(-4px)'), {
            base: {
                margin: '0',
                padding: 'var(--space-2xs)',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: '12rem',
            },
        }),
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-sm)',
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-selector)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--combobox-text)',
                color: 'var(--color-base-content)',
                cursor: 'pointer',
            },
            states: {
                highlighted: { background: 'var(--color-base-200)' },
                selected: { color: 'var(--hero-primary)', fontWeight: 'var(--weight-medium)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            // The menu-item press — the same row language, one popup over.
            selectors: {
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-300)' },
            },
        },
        'item-indicator': {
            base: { flex: 'none', color: 'var(--hero-primary)' },
            states: { selected: {} },
        },
        empty: {
            base: {
                padding: 'var(--space-md)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--combobox-text)',
                color: 'var(--hero-muted)',
                textAlign: 'center',
            },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--combobox-text': 'var(--text-xs)' } } },
            md: {},
            lg: { root: { base: { '--combobox-text': 'var(--text-md)' } } },
        },
    },
    // The ring draws on `control`; the input and the trigger sit inside it.
    skipStates: { input: ['focus-visible'], trigger: ['focus-visible'] },
};

// ── Number input ──────────────────────────────────────────────────────────
export const numberInput: RecipeInput = {
    component: 'number-input',
    tokens: { '--number-input-text': 'var(--text-sm)' },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
            states: { disabled: {}, invalid: {}, required: {}, readonly: {} },
        },
        label: {
            base: { ...label },
            states: {
                disabled: {},
                invalid: { color: 'var(--hero-danger)' },
                // v3 marks required with the label's own weight, not an asterisk.
                required: { fontWeight: 'var(--weight-semibold)' },
            },
        },
        // The field chrome (the combobox split): the ring and the invalid
        // border draw on the box; input and steppers sit joined inside it.
        control: {
            base: {
                display: 'inline-flex',
                alignItems: 'stretch',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-field)',
                background: 'var(--color-base-100)',
                transition: motion('border-color'),
            },
            states: {
                hover: { borderColor: 'var(--color-base-content)' },
                invalid: { borderColor: 'var(--hero-danger)' },
                disabled: { opacity: 'var(--disabled-opacity)' },
                readonly: {},
                ...focusRing,
            },
        },
        input: {
            base: {
                width: '4.5rem',
                minWidth: '0',
                appearance: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: 'var(--space-sm) var(--space-md)',
                color: 'var(--color-base-content)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--number-input-text)',
                textAlign: 'center',
            },
            states: {
                disabled: { cursor: 'not-allowed' },
                invalid: {}, required: {}, readonly: {},
            },
            selectors: {
                '&::placeholder': { color: 'var(--hero-muted)' },
            },
        },
        // Steppers as ghost squares flanking the readout — muted until
        // hovered, no seams; the shared border already frames them.
        'increment-trigger': {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: 'var(--hero-muted)',
                borderRadius: 'var(--radius-selector)',
                padding: '0 var(--space-md)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--number-input-text)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                userSelect: 'none',
                transition: motion('background, color, transform'),
            },
            states: {
                hover: { background: 'var(--color-base-200)', color: 'var(--color-base-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { transform: 'scale(0.97)' },
            },
        },
        'decrement-trigger': {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: 'var(--hero-muted)',
                borderRadius: 'var(--radius-selector)',
                padding: '0 var(--space-md)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--number-input-text)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                userSelect: 'none',
                transition: motion('background, color, transform'),
            },
            states: {
                hover: { background: 'var(--color-base-200)', color: 'var(--color-base-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { transform: 'scale(0.97)' },
            },
        },
    },
    variants: {
        size: {
            sm: {
                root: { base: { '--number-input-text': 'var(--text-xs)' } },
                input: { base: { padding: 'var(--space-xs) var(--space-sm)' } },
            },
            md: {},
            lg: {
                root: { base: { '--number-input-text': 'var(--text-md)' } },
                input: { base: { padding: 'var(--space-md) var(--space-lg)' } },
            },
        },
    },
    // The ring draws on `control`; the input delegates.
    skipStates: { input: ['focus-visible'] },
};

// ── Rating group ──────────────────────────────────────────────────────────
/**
 * One clipped paint layer of the star: `track` is what shows where the fill
 * has not reached, and the fill itself is a flat image layer whose
 * `background-size` the states drive. Used twice — the silhouette, and the
 * hollow inside it.
 */
const ratingLayer = (track: string): CssProps => ({
    content: '""',
    position: 'absolute',
    clipPath: 'var(--rating-star)',
    backgroundColor: track,
    backgroundImage: 'linear-gradient(to right, var(--hero-primary) 0 100%)',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'var(--rating-fill-stop) 100%',
    transition: motion('background-size'),
});

/**
 * What the fill layer becomes under forced colours: the mode revalues author
 * paint, so the layer names a SYSTEM colour instead — the only way a painted
 * fill still adapts to the user's palette rather than vanishing into it. The
 * opt-out that makes it stick is on the item (see the `forced-colors` block).
 */
const ratingSystemFill: CssProps = {
    backgroundImage: 'linear-gradient(to right, Highlight 0 100%)',
};

/**
 * The star is DRAWN — a clip-path polygon over a two-layer paint — and the
 * item's own symbol is hidden behind it. Two reasons, both load-bearing:
 *
 *  - `full` and `half` used to be the same colour, so a half star was a full
 *    star. Here the fill is one flat layer whose `background-size` is
 *    0% / 50% / 100%, so `half` is a real geometric half of the same shape,
 *    and it INTERPOLATES: the fill wipes across the symbol as the hover
 *    preview moves over the row.
 *  - zero's `half` fallback symbol is U+2BEA, which almost no system font
 *    ships — it renders as a tofu box on macOS today. Drawing the star means
 *    the three states never depend on a font at all.
 *
 * A consumer symbol (the default slot exists for SVGs) opts out through
 * `:has(*)` and takes plain per-state ink instead; it gets `state` in the slot
 * and can draw its own half.
 */
export const ratingGroup: RecipeInput = {
    component: 'rating-group',
    tokens: {
        '--rating-size': 'calc(var(--size-selector) * 6)',
        /** How much of the star the fill covers — the whole state axis. */
        '--rating-fill-stop': '0%',
        /** Ink for a symbol we don't draw — a consumer's own SVG or glyph. */
        '--rating-symbol': 'var(--hero-muted)',
        /** A five-pointed star, as one clip. */
        '--rating-star': 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, '
            + '50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    },
    parts: {
        root: {
            base: { display: 'inline-flex', flexDirection: 'column', gap: 'var(--space-2xs)' },
            states: { disabled: {}, invalid: {}, required: {}, readonly: {} },
        },
        label: {
            base: { ...label },
            states: {
                disabled: {},
                invalid: { color: 'var(--hero-danger)' },
                // v3 marks required with the label's own weight, not an asterisk.
                required: { fontWeight: 'var(--weight-semibold)' },
            },
        },
        control: {
            base: { display: 'inline-flex', gap: 'var(--space-2xs)', borderRadius: 'var(--radius-selector)' },
            states: {
                disabled: { opacity: 'var(--disabled-opacity)' },
                readonly: {},
                ...focusRing,
            },
        },
        item: {
            base: {
                position: 'relative',
                display: 'inline-block',
                width: 'var(--rating-size)',
                height: 'var(--rating-size)',
                fontSize: 'var(--rating-size)',
                lineHeight: 'var(--leading-none)',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
                userSelect: 'none',
                // The symbol still sizes and reads (it is the accessible
                // content); the drawn star is what paints.
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
                transition: motion('transform'),
            },
            states: {
                full: { '--rating-fill-stop': '100%', '--rating-symbol': 'var(--hero-primary)' },
                half: { '--rating-fill-stop': '50%', '--rating-symbol': 'var(--hero-primary)' },
                empty: { '--rating-fill-stop': '0%', '--rating-symbol': 'var(--hero-muted)' },
                // The hover-preview range lifts gently — v3 never jumps.
                highlighted: { transform: 'scale(1.1)' },
                disabled: { cursor: 'not-allowed' },
                readonly: { cursor: 'default' },
                // The group ring lives on control and the focused item flags
                // simultaneously — an inward ring keeps the pair from reading
                // as two identical concentric rings.
                'focus-visible': { outline: '2px solid var(--hero-focus)', outlineOffset: '-2px' },
            },
            selectors: {
                // The silhouette, and the star inset inside it. Both take the
                // same fill layer, so the fill's edge cuts through outline and
                // interior together: filled side solid, unfilled side hollow.
                '&::before': { ...ratingLayer('var(--hero-muted)'), inset: '0' },
                '&::after': { ...ratingLayer('var(--color-base-100)'), inset: '12%' },
                // The fill grows from the leading edge, and its layer is one
                // flat colour — so direction is a background-position, not a
                // gradient angle.
                '&:dir(rtl)::before, &:dir(rtl)::after': { backgroundPositionX: 'right' },
                // A consumer symbol draws itself: hand it back the box, the
                // ink and the paint.
                '&:has(*)': {
                    width: 'auto',
                    height: 'auto',
                    color: 'var(--rating-symbol)',
                    WebkitTextFillColor: 'currentcolor',
                },
                '&:has(*)::before, &:has(*)::after': { display: 'none' },
            },
            at: {
                'reduced-motion': {
                    base: { transition: 'none' },
                    states: { highlighted: { transform: 'none' } },
                    selectors: { '&::before, &::after': { transition: 'none' } },
                },
                // Both fallbacks keep the GEOMETRY and re-source its paint,
                // rather than swapping in a glyph that cannot say "half":
                // zero's fallback half symbol is U+2BEA, which most system
                // fonts do not ship — it prints as a tofu box, and a tofu box
                // in the middle of a star row misstates the value. (Verified:
                // it renders as a striped box in headless chromium.)
                //
                // The forced palette revalues an author's colour but honours a
                // SYSTEM one, so the item opts out of the revaluation and the
                // layers name system colours by hand. The opt-out is also what
                // keeps `color: transparent` honoured — a forced CanvasText
                // would paint that tofu box straight over the drawn star.
                'forced-colors': {
                    base: { forcedColorAdjust: 'none' },
                    // The one thing the opt-out costs: an author-coloured ring
                    // is exactly what this mode exists to replace, so hand the
                    // ring back to the system palette explicitly.
                    states: { 'focus-visible': { outline: '2px solid Highlight' } },
                    selectors: {
                        '&::before': { ...ratingLayer('CanvasText'), ...ratingSystemFill },
                        '&::after': { ...ratingLayer('Canvas'), ...ratingSystemFill },
                    },
                },
                // Paper drops background paint under `print-color-adjust:
                // economy`, and the fill IS the value here — so ask for it.
                // A reader who turns background graphics off can still refuse:
                // the row then prints blank rather than lying about the value.
                // Glyph ink would survive that — #230.
                print: {
                    selectors: {
                        '&::before': { printColorAdjust: 'exact' },
                        '&::after': { printColorAdjust: 'exact' },
                    },
                },
            },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--rating-size': 'calc(var(--size-selector) * 5)' } } },
            md: {},
            lg: { root: { base: { '--rating-size': 'calc(var(--size-selector) * 7)' } } },
        },
    },
};

// ── Tree view ─────────────────────────────────────────────────────────────
export const treeView: RecipeInput = {
    component: 'tree-view',
    tokens: { '--tree-text': 'var(--text-sm)' },
    parts: {
        root: {
            base: { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
        },
        label: {
            base: { ...label, fontWeight: 'var(--weight-semibold)' },
        },
        tree: {
            base: {
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2xs)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--tree-text)',
                color: 'var(--color-base-content)',
            },
        },
        // Rows speak the menu-item language: quiet until highlighted, and a
        // selected row keeps its ink rather than taking a fill.
        item: {
            base: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
                transition: motion('background, color'),
            },
            states: {
                hover: { background: 'var(--color-base-200)' },
                selected: { color: 'var(--hero-primary)', fontWeight: 'var(--weight-medium)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                // Rows sit flush — an offset ring would collide with the
                // neighbours, so it draws inward.
                'focus-visible': { outline: '2px solid var(--hero-focus)', outlineOffset: '-2px' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-300)' },
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
                gap: 'var(--space-sm)',
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-selector)',
                cursor: 'pointer',
                userSelect: 'none',
                transition: motion('background, color'),
            },
            states: {
                open: {}, closed: {},
                hover: { background: 'var(--color-base-200)' },
                selected: { color: 'var(--hero-primary)', fontWeight: 'var(--weight-medium)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                'focus-visible': { outline: '2px solid var(--hero-focus)', outlineOffset: '-2px' },
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { background: 'var(--color-base-300)' },
            },
        },
        'branch-indicator': {
            base: { display: 'inline-block', flex: 'none', color: 'var(--hero-muted)', transition: motion('rotate') },
            states: { open: { rotate: '90deg' }, closed: {} },
        },
        // Depth is the DOM nesting; a hairline guide traces each level.
        'branch-content': {
            base: {
                display: 'flex',
                flexDirection: 'column',
                marginInlineStart: 'var(--space-md)',
                paddingInlineStart: 'var(--space-sm)',
                borderInlineStart: 'var(--border) solid var(--hero-line)',
            },
            states: { open: {}, closed: {} },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--tree-text': 'var(--text-xs)' } } },
            md: {},
            lg: { root: { base: { '--tree-text': 'var(--text-md)' } } },
        },
    },
};

// ── Toggle ────────────────────────────────────────────────────────────────
export const toggle: RecipeInput = {
    component: 'toggle',
    parts: {
        root: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-sm)',
                width: 'fit-content',
                padding: 'var(--space-sm) var(--space-md)',
                border: 'none',
                borderRadius: 'var(--radius-field)',
                background: 'transparent',
                color: 'var(--hero-muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-medium)',
                lineHeight: 'var(--leading-none)',
                cursor: 'pointer',
                transition: motion('background, color, transform'),
            },
            states: {
                // v3's toggle reads as a ghost button until it holds.
                on: { background: 'var(--color-base-200)', color: 'var(--color-base-content)' },
                off: {},
                hover: { color: 'var(--color-base-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { transform: 'scale(0.97)' },
            },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--text-xs)' } } },
            md: {},
            lg: { root: { base: { padding: 'var(--space-md) var(--space-lg)', fontSize: 'var(--text-md)' } } },
        },
    },
};

// ── Toggle group ──────────────────────────────────────────────────────────
export const toggleGroup: RecipeInput = {
    component: 'toggle-group',
    tokens: { '--toggle-group-text': 'var(--text-sm)' },
    parts: {
        root: {
            base: {
                display: 'inline-flex',
                gap: 'var(--space-2xs)',
                padding: 'var(--space-2xs)',
                background: 'var(--color-base-200)',
                borderRadius: 'var(--radius-box)',
                width: 'fit-content',
            },
            states: { disabled: { opacity: 'var(--disabled-opacity)' } },
            selectors: {
                '&[data-orientation="vertical"]': { flexDirection: 'column' },
            },
        },
        item: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                padding: 'var(--space-xs) var(--space-md)',
                borderRadius: 'var(--radius-field)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--toggle-group-text)',
                fontWeight: 'var(--weight-medium)',
                color: 'var(--hero-muted)',
                cursor: 'pointer',
                transition: motion('background, color, transform'),
            },
            states: {
                // The tabs-list look: a held item is a raised pill.
                on: {
                    background: 'var(--color-base-100)',
                    color: 'var(--color-base-content)',
                    boxShadow: 'var(--shadow-sm)',
                },
                off: {},
                // `data-selected` mirrors `on` in a group — the raised pill
                // above already says it.
                selected: {},
                hover: { color: 'var(--color-base-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { transform: 'scale(0.97)' },
            },
        },
    },
    variants: {
        size: {
            sm: { root: { base: { '--toggle-group-text': 'var(--text-xs)' } } },
            md: {},
            lg: { root: { base: { '--toggle-group-text': 'var(--text-md)' } } },
        },
    },
};

/**
 * Merge presence into a part's own styles per KEY, so a recipe that already
 * writes `states: { open: {} }` does not replace the open state presence needs.
 */
function withPresence(presence: PartStyles, styles: PartStyles): PartStyles {
    const merge = (a: Record<string, CssProps> | undefined, b: Record<string, CssProps> | undefined) =>
        Object.fromEntries(
            [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])]
                .map((key) => [key, { ...a?.[key], ...b?.[key] }]),
        );
    return {
        base: { ...presence.base, ...styles.base },
        states: merge(presence.states, styles.states),
        selectors: merge(presence.selectors, styles.selectors),
        at: Object.fromEntries(
            [...new Set([...Object.keys(presence.at ?? {}), ...Object.keys(styles.at ?? {})])]
                .map((key) => [key, withPresence(presence.at?.[key] ?? {}, styles.at?.[key] ?? {})]),
        ),
    };
}

export const recipes: RecipeInput[] = [
    tabs, collapsible, switchRecipe, dialog, popover, tooltip, menu,
    field, checkbox, radioGroup, progress, slider, accordion, select, button, avatar, toast, combobox,
    toggle, toggleGroup, numberInput, ratingGroup, treeView,
];
