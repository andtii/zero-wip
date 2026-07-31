/**
 * Switch — an on/off toggle over a visually-hidden native checkbox with
 * `role="switch"`. The native input gives form participation, labeling and
 * platform keyboard behavior for free; the visible control/thumb are pure
 * styling surfaces.
 *
 * ```tsx
 * <Switch.Root model={() => state.enabled} color="primary">Notifications</Switch.Root>
 * ```
 */
import { component, compound } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState } from '../../behaviors/controllable.js';
import { useFieldContext } from '../../behaviors/field.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { createPressFeedback } from '../../behaviors/press.js';
import { dataAttr, stateAttr } from '../../contract/data-attrs.js';
import { variantAttrs } from '../../contract/props.js';
import type { WithClass, WithDisabled, WithVariantAxes } from '../../contract/props.js';
import { switchAnatomy } from './anatomy.js';

const SCOPE = switchAnatomy.scope;

// Functional necessity, not styling: the input must stay interactive and
// focusable while being invisible (same technique as Zag/Base UI).
const HIDDEN_INPUT_STYLE = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    border: '0',
    clip: 'rect(0 0 0 0)',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
} as const;

export type SwitchRootProps =
    & Define.Model<boolean>
    & Define.Prop<'defaultChecked', boolean, false>
    & Define.Event<'checkedChange', boolean>
    & Define.Prop<'name', string, false>
    & Define.Prop<'value', string, false>
    & Define.Prop<'required', boolean, false>
    & Define.Prop<'invalid', boolean, false>
    & WithDisabled
    & WithVariantAxes<'switch'>
    & WithClass
    & Define.Slot<'default'>;

const SwitchRoot = component<SwitchRootProps>(({ props, slots, emit, signal }) => {
    const state = createControllableState<boolean>(
        () => props.model,
        props.defaultChecked ?? false,
        (v) => emit('checkedChange', v),
    );
    const field = useFieldContext();
    let inputEl: HTMLInputElement | null = null;
    let controlEl: HTMLElement | null = null;
    const focus = signal({ visible: false });

    // A Switch inside a Field answers to it, exactly as Checkbox does — the
    // prop wins when set, the Field supplies the rest. Switch was the one
    // selection control that read none of them (#269).
    const disabled = (): boolean => !!props.disabled || field.disabled();
    const invalid = (): boolean => !!props.invalid || field.invalid();
    const required = (): boolean => !!props.required || field.required();
    // Cross-element press: the row (label) is the pointer target and the
    // hidden input is the keyboard target, but the feedback lands on the
    // visible control — coordinates are computed against getElement's rect.
    const press = createPressFeedback({
        getElement: () => controlEl,
        isDisabled: () => disabled(),
    });

    const checkedState = () => stateAttr(state.value, 'checked', 'unchecked');

    return () => (
        <label
            data-scope={SCOPE}
            data-part="root"
            data-state={checkedState()}
            data-disabled={dataAttr(disabled())}
            data-focus-visible={dataAttr(focus.visible)}
            data-invalid={dataAttr(invalid())}
            data-required={dataAttr(required())}
            {...variantAttrs(props)}
            class={props.class}
            onPointerdown={press.onPointerdown}
            onPointerup={press.onPointerup}
            onPointercancel={press.onPointercancel}
            onPointerleave={press.onPointerleave}
        >
            <input
                type="checkbox"
                role="switch"
                data-scope={SCOPE}
                data-part="hidden-input"
                style={HIDDEN_INPUT_STYLE}
                checked={state.value}
                disabled={disabled()}
                required={required()}
                name={props.name}
                value={props.value ?? 'on'}
                aria-invalid={invalid() ? 'true' : undefined}
                ref={(node: HTMLInputElement | null) => { inputEl = node; }}
                onChange={(e: Event) => {
                    state.value = (e.target as HTMLInputElement).checked;
                }}
                onFocus={() => { focus.visible = isFocusVisible(inputEl); }}
                onBlur={(e: FocusEvent) => {
                    press.onBlur(e);
                    focus.visible = false;
                }}
                onKeydown={press.onKeydown}
                onKeyup={press.onKeyup}
            />
            <span
                data-scope={SCOPE}
                data-part="control"
                data-state={checkedState()}
                data-disabled={dataAttr(disabled())}
                data-focus-visible={dataAttr(focus.visible)}
                data-invalid={dataAttr(invalid())}
                ref={(node: HTMLElement | null) => { controlEl = node; }}
            >
                <span
                    data-scope={SCOPE}
                    data-part="thumb"
                    data-state={checkedState()}
                />
            </span>
            {slots.default
                ? (
                    <span
                        data-scope={SCOPE}
                        data-part="label"
                        data-state={checkedState()}
                        data-disabled={dataAttr(disabled())}
                    >
                        {slots.default()}
                    </span>
                )
                : null}
        </label>
    );
}, { name: 'Switch.Root' });

export const Switch = compound(SwitchRoot, {
    Root: SwitchRoot,
});
