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
                transition: motion('background, color'),
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

// ── Checkbox ──────────────────────────────────────────────────────────────
export const checkbox: RecipeInput = {
    component: 'checkbox',
    tokens: { '--checkbox-size': 'calc(var(--size-selector) * 5)' },
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
                transition: motion('background, border-color'),
            },
            states: {
                checked: { background: 'var(--hero-primary)', borderColor: 'var(--hero-primary)' },
                indeterminate: { background: 'var(--hero-primary)', borderColor: 'var(--hero-primary)' },
                unchecked: {},
                invalid: { borderColor: 'var(--hero-danger)' },
                disabled: {},
                ...focusRing,
            },
        },
        indicator: {
            base: { color: 'var(--hero-primary-ink)', lineHeight: 'var(--leading-none)' },
            states: { checked: {}, unchecked: {}, indeterminate: {} },
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
                transition: motion('border-color'),
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
                background: 'oklch(0% 0 0 / 0.45)',
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
        close: {
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--hero-muted)',
                borderRadius: 'var(--radius-selector)',
                padding: 'var(--space-2xs)',
                cursor: 'pointer',
            },
            states: {
                hover: { color: 'var(--color-base-content)', background: 'var(--color-base-200)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
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

// ── Toast ─────────────────────────────────────────────────────────────────
export const toast: RecipeInput = {
    component: 'toast',
    parts: {
        viewport: {
            base: {
                position: 'fixed',
                insetBlockEnd: 'var(--space-xl)',
                insetInlineEnd: 'var(--space-xl)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
                margin: '0',
                padding: '0',
                listStyle: 'none',
                zIndex: '9999',
            },
        },
        root: withPresence(popupPresence('translateX(8px)'), {
            base: {
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-md)',
                minWidth: '18rem',
                padding: 'var(--space-md) var(--space-lg)',
                border: 'var(--border) solid var(--hero-line)',
                borderRadius: 'var(--radius-box)',
                background: 'var(--color-base-100)',
                boxShadow: 'var(--shadow-lg)',
            },
        }),
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
            base: {
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--hero-muted)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-selector)',
                marginInlineStart: 'auto',
            },
            states: {
                hover: { color: 'var(--color-base-content)' },
                disabled: { opacity: 'var(--disabled-opacity)', cursor: 'not-allowed' },
                ...focusRing,
            },
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
    button, tabs, switchRecipe, checkbox, select, dialog, field, toast,
];
