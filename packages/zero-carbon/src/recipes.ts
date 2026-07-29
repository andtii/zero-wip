/**
 * zero-carbon recipes — Carbon's Button over zero's anatomy (issue #183).
 *
 * Deliberately partial: this package exercises the api surface (the fused
 * `kind` axis, the values remap, the renamed boolean modifiers), not a
 * product. Button is the component that motivated the whole vendor-named-API
 * design, so Button is what ships.
 *
 * No `variants.color` anywhere — there are no roles to key it on, the same
 * shape `zero-heroui` proved. Colour reaches the CSS through declared custom
 * tokens; the seven `kind` members each rebind the fill/ink/line channel.
 */
import type { CssProps, RecipeInput } from '@sigx/zero-kit';

const motion = (props: string): string =>
    props.split(', ').map((p) => `${p} var(--duration-normal) var(--ease-standard)`).join(', ');

/** Carbon's focus treatment: a 2px outline hugging the edge, inset. */
const focusRing: Record<string, CssProps> = {
    'focus-visible': {
        outline: '2px solid var(--carbon-focus)',
        outlineOffset: '-2px',
    },
};

// ── Button ────────────────────────────────────────────────────────────────
export const button: RecipeInput = {
    /**
     * The un-attributed render IS `kind="primary"` at `size="lg"` (Carbon's
     * 48px default) — the defaults live in the base, so variants only rebind.
     */
    tokens: {
        '--btn-fill': 'var(--carbon-interactive)',
        '--btn-ink': 'var(--carbon-interactive-ink)',
        '--btn-line': 'transparent',
    },
    component: 'button',
    parts: {
        root: {
            base: {
                appearance: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                // Carbon's signature: label leads, trailing space follows —
                // buttons are left-aligned boxes, not centered pills.
                justifyContent: 'flex-start',
                width: 'fit-content',
                padding: '0 calc(var(--space-2xl) + var(--space-lg)) 0 var(--space-md)',
                minHeight: '3rem',
                border: 'var(--border) solid var(--btn-line)',
                borderRadius: 'var(--radius-field)',
                background: 'var(--btn-fill)',
                color: 'var(--btn-ink)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-normal)',
                letterSpacing: 'var(--tracking-wide)',
                lineHeight: 'var(--leading-tight)',
                cursor: 'pointer',
                transition: motion('background, border-color, color'),
            },
            states: {
                hover: { filter: 'brightness(0.9)' },
                disabled: {
                    opacity: 'var(--disabled-opacity)',
                    cursor: 'not-allowed',
                    filter: 'none',
                },
                ...focusRing,
            },
            selectors: {
                '&[data-pressed]:not([data-disabled])': { filter: 'brightness(0.8)' },
            },
        },
    },
    variants: {
        variant: {
            primary: {},
            secondary: { root: { base: { '--btn-fill': 'var(--carbon-secondary)', '--btn-ink': 'var(--carbon-secondary-ink)' } } },
            tertiary: {
                root: {
                    base: {
                        '--btn-fill': 'transparent',
                        '--btn-ink': 'var(--carbon-interactive)',
                        '--btn-line': 'var(--carbon-interactive)',
                    },
                },
            },
            ghost: { root: { base: { '--btn-fill': 'transparent', '--btn-ink': 'var(--carbon-interactive)' } } },
            danger: { root: { base: { '--btn-fill': 'var(--carbon-danger)', '--btn-ink': 'var(--carbon-danger-ink)' } } },
            // Carbon's `danger--tertiary` / `danger--ghost`, in the attribute
            // grammar's spelling — the api's values remap owns the vendor one.
            'danger-tertiary': {
                root: {
                    base: {
                        '--btn-fill': 'transparent',
                        '--btn-ink': 'var(--carbon-danger)',
                        '--btn-line': 'var(--carbon-danger)',
                    },
                },
            },
            'danger-ghost': { root: { base: { '--btn-fill': 'transparent', '--btn-ink': 'var(--carbon-danger)' } } },
        },
        /** Carbon's five field heights: 32 / 40 / 48 / 64 / 80. */
        size: {
            sm: { root: { base: { minHeight: '2rem' } } },
            md: { root: { base: { minHeight: '2.5rem' } } },
            lg: {},
            xl: { root: { base: { minHeight: '4rem', alignItems: 'flex-start', paddingTop: 'var(--space-md)' } } },
            '2xl': { root: { base: { minHeight: '5rem', alignItems: 'flex-start', paddingTop: 'var(--space-md)' } } },
        },
    },
    /** Carbon's `hasIconOnly` / `isExpressive` — presence-only, no value. */
    modifiers: {
        'icon-only': {
            root: {
                base: {
                    justifyContent: 'center',
                    padding: '0',
                    aspectRatio: '1',
                },
            },
        },
        expressive: {
            root: { base: { fontSize: 'var(--text-md)', letterSpacing: 'var(--tracking-normal)' } },
        },
    },
};

export const recipes: RecipeInput[] = [button];
