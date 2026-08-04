/**
 * Common prop fragments — component props intersect these instead of
 * redeclaring the conventions, so the vocabulary can't drift.
 */
import type { Define } from 'sigx';
import type { ColorValue, SizeScale } from './tokens.js';
import { TOKEN_KEY_PATTERN as AXIS_NAME_PATTERN } from './tokens.js';
import type { AxesFor, ColorValueFor, ModsFor, SizeScaleFor, VariantValueFor } from './vocabulary.js';
// Type-only, and acyclic: the anatomy registry imports per-component
// anatomy.ts data modules, none of which reach back into contract/props.
import type { ZeroScope } from '../anatomy.js';
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
 * Presence-only design-system modifiers, rendered as `data-mod-<name>`.
 *
 * An axis answers "which one" and always carries a value; a modifier answers
 * "is it on" and carries none — daisyUI's `btn-block`, Radix's `highContrast`,
 * HeroUI's `isIconOnly`. Encoding those as one-member axes
 * (`axes={{ block: 'block' }}`) works but restates the name as its own value.
 *
 * ```tsx
 * <Button.Root color="primary" mods={{ block: true }}>Save</Button.Root>
 * ```
 *
 * The `mod-` prefix is not decoration. Zero's own flag vocabulary
 * (`data-disabled`, `data-pressed`, …) is presence-only too and it is
 * VERSIONED: an unprefixed design-system modifier named `busy` would start
 * matching a `data-busy` flag zero adds later, silently and with exactly the
 * right shape. Valued axes cannot fail that way — a collision there simply
 * never matches, and `variantAttrs` throws. Different hazard, different
 * treatment: prefix modifiers, don't prefix axes.
 */
export type WithMods<S extends string = string> = Define.Prop<'mods', ModsFor<S>, false>;

/**
 * Every variant surface for one component scope — the usual composition, and
 * it cannot mix scopes by accident.
 *
 * `S` is constrained to zero's own anatomy registry: a typo'd scope literal
 * (`WithVariantAxes<'buton'>`) is not a smaller type, it is a *different*
 * type — `AxisOf` hands an unknown scope the open fallback, silently
 * un-narrowing exactly the component the literal meant to narrow. Ecosystem
 * components, whose scopes are not in the registry by definition, use
 * {@link WithVariantAxesOpen}.
 */
export type WithVariantAxes<S extends ZeroScope> =
    WithColor<S> & WithSize<S> & WithVariant<S> & WithAxes<S> & WithMods<S>;

/**
 * {@link WithVariantAxes} for ecosystem component scopes, which zero's
 * anatomy registry cannot know. The open constraint is the deliberate
 * cost of an out-of-tree scope: nothing type-checks the literal, so a
 * register module built for the design system is what closes the loop.
 */
export type WithVariantAxesOpen<S extends string> =
    WithColor<S> & WithSize<S> & WithVariant<S> & WithAxes<S> & WithMods<S>;

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
 * The namespace design-system modifiers render into. Prefixed so it can never
 * collide with `FLAG_VOCABULARY`, which zero owns and extends between versions
 * — see `WithMods`. The kit keeps an identical copy; `contract-parity.test.ts`
 * holds the two honest.
 */
export const MOD_ATTR_PREFIX = 'data-mod-';

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
    mods?: Record<string, boolean | undefined>;
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
    // Presence-only: `false` and `undefined` both mean "absent", and the
    // attribute carries the empty string when on — the same shape the anatomy
    // contract's own flags use (`data-disabled=""`, never `="false"`).
    //
    // No reserved-name guard is needed here, unlike `axes`: the `data-mod-`
    // prefix puts every modifier outside the contract's namespace by
    // construction, so there is nothing to shadow.
    for (const [name, on] of Object.entries(props.mods ?? {})) {
        if (!on) continue;
        if (!AXIS_NAME_PATTERN.test(name)) {
            throw new Error(
                `[zero] mods: "${name}" is not a kebab-case identifier — it becomes the attribute name ${MOD_ATTR_PREFIX}${name}`,
            );
        }
        attrs[`${MOD_ATTR_PREFIX}${name}`] = '';
    }
    return attrs;
}
