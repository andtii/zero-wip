/**
 * Common prop fragments — component props intersect these instead of
 * redeclaring the conventions, so the vocabulary can't drift.
 */
import type { Define } from 'sigx';
import type { ColorValue, SizeScale } from './tokens.js';
import { TOKEN_KEY_PATTERN as AXIS_NAME_PATTERN } from './tokens.js';
import type { AxesFor, ColorValueFor, SizeScaleFor, VariantValueFor } from './vocabulary.js';
import type { Orientation } from './data-attrs.js';
import { FLAG_VOCABULARY } from './data-attrs.js';

/** Arbitrary extra classes appended to the part's root element. */
export type WithClass = Define.Prop<'class', string, false>;

/** Disabled: non-interactive + `data-disabled` on every part. */
export type WithDisabled = Define.Prop<'disabled', boolean, false>;

/**
 * Semantic color of the component — passes through as `data-color`.
 * Recommended roles autocomplete; any DS-declared role name is valid. Generic
 * on the component scope: with a `/register` module imported, `S` narrows to
 * exactly what that design system wires for the component; the `string`
 * default keeps the open union everywhere else.
 */
export type WithColor<S extends string = string> = Define.Prop<'color', ColorValueFor<S>, false>;

/** Component size on the shared scale — passes through as `data-size`. */
export type WithSize<S extends string = string> = Define.Prop<'size', SizeScaleFor<S>, false>;

/**
 * Design-system fill/chrome variant — passes through as `data-variant`.
 * Values are DS-defined (outline, soft, ghost, …); zero does not interpret
 * them.
 */
export type WithVariant<S extends string = string> = Define.Prop<'variant', VariantValueFor<S>, false>;

/**
 * Additional design-system variant axes, passed through as `data-<axis>`.
 *
 * `color` / `size` / `variant` are the axes almost every design system has, so
 * they keep named props with autocomplete. They are not the only axes a design
 * language can have: Material specifies density, others emphasis or tone. The
 * kit compiles `[data-density="compact"]` selectors happily, and before this
 * prop nothing could ever set that attribute — the rules were dead on arrival,
 * which the validator had to warn about.
 *
 * ```tsx
 * <Button.Root color="primary" axes={{ density: 'compact' }}>Save</Button.Root>
 * ```
 *
 * An axis may not shadow the anatomy contract (`scope`, `part`, `state`,
 * `orientation`, or any flag). Those attributes already carry meaning that
 * zero sets and every design system selects on.
 */
export type WithAxes<S extends string = string> = Define.Prop<'axes', AxesFor<S>, false>;

/**
 * All four variant axes for one component scope — the usual composition, and
 * it cannot mix scopes by accident.
 */
export type WithVariantAxes<S extends string> =
    WithColor<S> & WithSize<S> & WithVariant<S> & WithAxes<S>;

/** Layout direction — rendered as `data-orientation`. */
export type WithOrientation = Define.Prop<'orientation', Orientation, false>;

/**
 * Render the part through the default slot instead of the built-in element
 * (`asChild`). The slot receives a spreadable `PartProps` bag; the caller
 * owns the element and MUST spread the bag for accessibility to work:
 *
 * ```tsx
 * <Tabs.Tab value="a" asChild>
 *     {(p) => <MyFancyButton {...p}>First</MyFancyButton>}
 * </Tabs.Tab>
 * ```
 */
export type WithAsChild = Define.Prop<'asChild', boolean, false>;

/**
 * The spreadable bag an `asChild` slot receives — everything the built-in
 * element would have carried. Explicit spreading over cloning magic: it is
 * SSR-trivial and visible in user code.
 */
export interface PartProps {
    id?: string;
    'data-scope': string;
    'data-part': string;
    'data-state'?: string;
    'data-disabled'?: '';
    'data-selected'?: '';
    'data-highlighted'?: '';
    'data-orientation'?: Orientation;
    'data-color'?: string;
    'data-size'?: string;
    'data-variant'?: string;
    role?: string;
    tabIndex?: number;
    'aria-selected'?: boolean | 'true' | 'false';
    'aria-controls'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-expanded'?: boolean | 'true' | 'false';
    'aria-disabled'?: boolean | 'true' | 'false';
    'aria-checked'?: boolean | 'true' | 'false';
    'aria-haspopup'?: string;
    onClick?: (e: MouseEvent) => void;
    onKeydown?: (e: KeyboardEvent) => void;
    onKeyup?: (e: KeyboardEvent) => void;
    onFocus?: (e: FocusEvent) => void;
    onBlur?: (e: FocusEvent) => void;
    onPointerdown?: (e: PointerEvent) => void;
    onPointerup?: (e: PointerEvent) => void;
    onPointercancel?: (e: PointerEvent) => void;
    onPointerleave?: (e: PointerEvent) => void;
    ref?: (el: HTMLElement | null) => void;
    [key: string]: unknown;
}

/**
 * Axis names `axes` may not use, because the anatomy contract already gives
 * these attributes a meaning that design systems select on. Shadowing
 * `data-state` from userland would be a genuinely nasty failure: every
 * `[data-state="open"]` rule in the design system would start matching the
 * wrong thing, with no error anywhere.
 */
export const RESERVED_AXES: ReadonlySet<string> = new Set([
    'scope', 'part', 'state', 'orientation', ...FLAG_VOCABULARY,
]);

/**
 * The axes with named props, mapped to the attributes they render.
 * Deliberately NOT in `RESERVED_AXES`: a recipe keying `variants.color` is
 * the ordinary case and the validator must keep allowing it. These are only
 * reserved on the runtime `axes` bag, where they would be a second way to
 * write one attribute. The kit keeps an identical copy (it is a pure Node
 * tool with no runtime dependency on zero); `contract-parity.test.ts` holds
 * the two honest.
 */
export const VARIANT_AXES: Record<string, string> = {
    color: 'data-color',
    size: 'data-size',
    variant: 'data-variant',
};

/**
 * Build the shared variant pass-through attributes from contract props.
 * Returns only the attributes whose props are set.
 *
 * Extra `axes` become `data-<axis>` alongside the three named ones. An axis
 * name is rejected outright rather than dropped: a silently missing attribute
 * is exactly the failure this whole mechanism exists to remove, and the value
 * comes from application code, not from user input. An `undefined` VALUE is
 * skipped before the guards run — a narrowed `AxesFor<S>` bag has optional
 * members, and an unset one must neither throw nor emit `data-<axis>`.
 */
export function variantAttrs(props: {
    color?: ColorValue;
    size?: SizeScale;
    variant?: string;
    axes?: Record<string, string | undefined>;
}): Record<string, string | undefined> {
    const attrs: Record<string, string | undefined> = {
        'data-color': props.color,
        'data-size': props.size,
        'data-variant': props.variant,
    };
    for (const [axis, value] of Object.entries(props.axes ?? {})) {
        if (value === undefined) continue;
        // hasOwnProperty.call, not `in` or an index read: a plain object says
        // yes to `'toString' in …`, and this package targets ES2020, which
        // predates Object.hasOwn.
        if (Object.prototype.hasOwnProperty.call(VARIANT_AXES, axis)) {
            // Otherwise this loop, running after the named props are applied,
            // silently wins: `color="primary" axes={{ color: 'x' }}` rendered
            // `data-color="x"`. Two ways to write one attribute, with
            // precedence nobody would guess and none of the autocomplete the
            // named prop exists to give.
            throw new Error(
                `[zero] axes: "${axis}" has a prop of its own — use ${axis}="…" rather than axes`,
            );
        }
        if (RESERVED_AXES.has(axis)) {
            throw new Error(
                `[zero] axes: "${axis}" is part of the anatomy contract — data-${axis} already means something and cannot be overwritten`,
            );
        }
        if (!AXIS_NAME_PATTERN.test(axis)) {
            throw new Error(
                `[zero] axes: "${axis}" is not a kebab-case identifier — it becomes the attribute name data-${axis}`,
            );
        }
        attrs[`data-${axis}`] = value;
    }
    return attrs;
}
