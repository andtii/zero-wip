/**
 * Button — the variant-carrying primitive.
 *
 * ```tsx
 * <Button.Root color="primary" variant="outline" size="lg">Save</Button.Root>
 * <Button.Root asChild><a href="/docs">Docs</a></Button.Root>
 * ```
 *
 * There is no behavior to speak of here, and that is the point: a native
 * `<button>` already handles keyboard activation, form submission and the
 * disabled semantics. What zero adds is the anatomy — one stable selector
 * carrying `data-color` / `data-size` / `data-variant`, so a design system
 * has somewhere to put the fill styles the contract has always advertised.
 */
import { component, compound } from 'sigx';
import type { Define } from 'sigx';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { dataAttr } from '../../contract/data-attrs.js';
import { renderAsChild } from '../../contract/as-child.js';
import { variantAttrs } from '../../contract/props.js';
import type {
    PartProps,
    WithAsChild,
    WithClass,
    WithColor,
    WithDisabled,
    WithSize,
    WithVariant,
} from '../../contract/props.js';
import { buttonAnatomy } from './anatomy.js';

const SCOPE = buttonAnatomy.scope;

export type ButtonRootProps =
    & WithColor
    & WithSize
    & WithVariant
    & WithDisabled
    & WithClass
    & WithAsChild
    /**
     * Defaults to `button`. The native default is `submit`, which silently
     * posts the enclosing form — a footgun for a component people reach for
     * to mean "a thing you click".
     */
    & Define.Prop<'type', 'button' | 'submit' | 'reset', false>
    & Define.Slot<'default', PartProps>;

const ButtonRoot = component<ButtonRootProps>(({ props, slots, signal }) => {
    let el: HTMLElement | null = null;
    const focus = signal({ visible: false });

    const bag = (): PartProps => ({
        'data-scope': SCOPE,
        'data-part': 'root',
        'data-disabled': dataAttr(props.disabled),
        'data-focus-visible': dataAttr(focus.visible),
        ...variantAttrs(props),
        ref: (node: HTMLElement | null) => { el = node; },
        onFocus: () => { focus.visible = isFocusVisible(el); },
        onBlur: () => { focus.visible = false; },
    });

    return () => {
        const b = bag();
        if (props.asChild) return renderAsChild(slots.default, b);
        return (
            <button
                type={props.type ?? 'button'}
                class={props.class}
                disabled={props.disabled}
                {...b}
            >
                {slots.default?.(b)}
            </button>
        );
    };
}, { name: 'Button.Root' });

export const Button = compound(ButtonRoot, { Root: ButtonRoot });
