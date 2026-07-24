/**
 * Switch — an on/off toggle over a visually-hidden native checkbox with
 * `role="switch"`. The native input gives form participation, labeling and
 * platform keyboard behavior for free; the visible control/thumb are pure
 * styling surfaces.
 *
 * ```tsx
 * <Switch.Root model={enabled} color="primary">Notifications</Switch.Root>
 * ```
 */
import { component, compound } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState } from '../../behaviors/controllable.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { dataAttr, stateAttr } from '../../contract/data-attrs.js';
import { variantAttrs } from '../../contract/props.js';
import type { WithClass, WithColor, WithDisabled, WithSize, WithVariant } from '../../contract/props.js';
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
    & WithColor
    & WithSize
    & WithVariant
    & WithClass
    & Define.Slot<'default'>;

const SwitchRoot = component<SwitchRootProps>(({ props, slots, emit, signal }) => {
    const state = createControllableState<boolean>(
        () => props.model,
        props.defaultChecked ?? false,
        (v) => emit('checkedChange', v),
    );
    let inputEl: HTMLInputElement | null = null;
    const focus = signal({ visible: false });

    const checkedState = () => stateAttr(state.value, 'checked', 'unchecked');

    return () => (
        <label
            data-scope={SCOPE}
            data-part="root"
            data-state={checkedState()}
            data-disabled={dataAttr(props.disabled)}
            data-focus-visible={dataAttr(focus.visible)}
            data-invalid={dataAttr(props.invalid)}
            data-required={dataAttr(props.required)}
            {...variantAttrs(props)}
            class={props.class}
        >
            <input
                type="checkbox"
                role="switch"
                data-scope={SCOPE}
                data-part="hidden-input"
                style={HIDDEN_INPUT_STYLE}
                checked={state.value}
                disabled={props.disabled}
                required={props.required}
                name={props.name}
                value={props.value ?? 'on'}
                aria-invalid={props.invalid ? 'true' : undefined}
                ref={(node: HTMLInputElement | null) => { inputEl = node; }}
                onChange={(e: Event) => {
                    state.value = (e.target as HTMLInputElement).checked;
                }}
                onFocus={() => { focus.visible = isFocusVisible(inputEl); }}
                onBlur={() => { focus.visible = false; }}
            />
            <span
                data-scope={SCOPE}
                data-part="control"
                data-state={checkedState()}
                data-disabled={dataAttr(props.disabled)}
                data-focus-visible={dataAttr(focus.visible)}
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
                        data-disabled={dataAttr(props.disabled)}
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
