/**
 * The augmentation seam — how a compiled design system types the app.
 *
 * `ZeroVocabulary` is empty here, so zero itself stays design-system-neutral.
 * A design system's GENERATED `/register` module (emitted by `zero-kit build`,
 * never authored) augments it with the vocabulary its compiled CSS actually
 * answers to; one `import '@sigx/<ds>/register'` at the app's entry narrows
 * every scoped prop. No augmentation means no change for anyone: every
 * resolver falls back to the open union it replaced.
 */
import type { ColorValue, SizeScale } from './tokens.js';

/**
 * Extension point: a design system's generated `/register` module augments
 * this. Empty here — see the module doc above.
 */
export interface ZeroVocabulary {}

type Scoped<S extends string> =
    ZeroVocabulary extends { components: infer C } ? (S extends keyof C ? C[S] : never) : never;

/**
 * Three cases, and they must stay distinguishable:
 *   - no augmentation, or a component this design system never styled → Fallback
 *   - the axis is declared                                            → its literal union
 *   - the axis is declared EMPTY (nothing wired)                      → never, so any value errors
 *
 * The `[Scoped<S>] extends [never]` guard MUST come first. Testing the axis
 * result against `never` cannot separate case 1 from case 3 — both produce
 * `never` — so a guard-last formulation silently hands the open fallback to
 * exactly the components whose unwired axes should error (RFC 0002 §3).
 */
type AxisOf<S extends string, A extends string, Fallback> =
    [Scoped<S>] extends [never]
        ? Fallback
        : [A] extends [keyof Scoped<S>] ? Extract<Scoped<S>[A], string> : Fallback;

/** `color` for one component scope — today's open `ColorValue` until a register module narrows it. */
export type ColorValueFor<S extends string = string> = AxisOf<S, 'color', ColorValue>;

/** `size` for one component scope — today's open `SizeScale` until a register module narrows it. */
export type SizeScaleFor<S extends string = string> = AxisOf<S, 'size', SizeScale>;

/** `variant` for one component scope — open `string` until a register module narrows it. */
export type VariantValueFor<S extends string = string> = AxisOf<S, 'variant', string>;

/**
 * The `axes` bag for one component scope. Narrowed per axis once augmented;
 * an empty declared `axes` is `Record<string, never>` in the generated file,
 * so any entry errors rather than silently minting an attribute.
 */
export type AxesFor<S extends string = string> =
    [Scoped<S>] extends [never]
        ? Record<string, string>
        : Scoped<S> extends { axes: infer A }
            ? { [K in keyof A]?: Extract<A[K], string> }
            : Record<string, string>;
