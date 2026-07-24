/**
 * Common prop fragments — component props intersect these instead of
 * redeclaring the conventions, so the vocabulary can't drift.
 */
import type { Define } from 'sigx';
import type { ColorValue, SizeScale } from './tokens.js';
import type { Orientation } from './data-attrs.js';

/** Arbitrary extra classes appended to the part's root element. */
export type WithClass = Define.Prop<'class', string, false>;

/** Disabled: non-interactive + `data-disabled` on every part. */
export type WithDisabled = Define.Prop<'disabled', boolean, false>;

/**
 * Semantic color of the component — passes through as `data-color`.
 * Recommended roles autocomplete; any DS-declared role name is valid.
 */
export type WithColor = Define.Prop<'color', ColorValue, false>;

/** Component size on the shared scale — passes through as `data-size`. */
export type WithSize = Define.Prop<'size', SizeScale, false>;

/**
 * Design-system fill/chrome variant — passes through as `data-variant`.
 * Values are DS-defined (outline, soft, ghost, …); zero does not interpret
 * them.
 */
export type WithVariant = Define.Prop<'variant', string, false>;

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
    onFocus?: (e: FocusEvent) => void;
    onBlur?: (e: FocusEvent) => void;
    ref?: (el: HTMLElement | null) => void;
    [key: string]: unknown;
}

/**
 * Build the shared variant pass-through attributes from contract props.
 * Returns only the attributes whose props are set.
 */
export function variantAttrs(props: {
    color?: ColorValue;
    size?: SizeScale;
    variant?: string;
}): { 'data-color'?: string; 'data-size'?: string; 'data-variant'?: string } {
    return {
        'data-color': props.color,
        'data-size': props.size,
        'data-variant': props.variant,
    };
}
