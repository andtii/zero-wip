/**
 * Checkbox — tri-state over a visually-hidden native checkbox.
 *
 * ```tsx
 * <Checkbox.Root model={() => state.agreed} color="primary">Accept the terms</Checkbox.Root>
 * ```
 *
 * Inside a `Field.Root`, the input adopts the field's control id and
 * disabled/invalid/required flags automatically.
 */
import { component, compound, effect } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState } from '../../behaviors/controllable.js';
import { useFieldContext } from '../../behaviors/field.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { createPressFeedback } from '../../behaviors/press.js';
import { dataAttr } from '../../contract/data-attrs.js';
import { variantAttrs } from '../../contract/props.js';
import type { WithClass, WithDisabled, WithVariantAxes } from '../../contract/props.js';
import { checkboxAnatomy } from './anatomy.js';

const SCOPE = checkboxAnatomy.scope;

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

export type CheckboxRootProps =
    & Define.Model<boolean>
    & Define.Prop<'defaultChecked', boolean, false>
    & Define.Event<'checkedChange', boolean>
    & Define.Prop<'indeterminate', boolean, false>
    & Define.Prop<'name', string, false>
    & Define.Prop<'value', string, false>
    & Define.Prop<'required', boolean, false>
    & Define.Prop<'invalid', boolean, false>
    & WithDisabled
    & WithVariantAxes<'checkbox'>
    & WithClass
    & Define.Slot<'default'>;

const CheckboxRoot = component<CheckboxRootProps>(({ props, slots, emit, signal, onMounted }) => {
    const state = createControllableState<boolean>(
        () => props.model,
        props.defaultChecked ?? false,
        (v) => emit('checkedChange', v),
    );
    const field = useFieldContext();
    let inputEl: HTMLInputElement | null = null;
    const focus = signal({ visible: false });

    onMounted(() => {
        effect(() => {
            const indeterminate = !!props.indeterminate;
            if (inputEl) inputEl.indeterminate = indeterminate;
        });
    });

    const disabled = (): boolean => !!props.disabled || field.disabled();
    const invalid = (): boolean => !!props.invalid || field.invalid();
    const required = (): boolean => !!props.required || field.required();
    const checkedState = (): string =>
        props.indeterminate ? 'indeterminate' : state.value ? 'checked' : 'unchecked';

    let controlEl: HTMLElement | null = null;
    // Cross-element press: pointer on the row, keyboard on the hidden input,
    // feedback on the visible control.
    const press = createPressFeedback({
        getElement: () => controlEl,
        isDisabled: () => disabled(),
    });

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
                id={field.inert ? undefined : field.ids.control}
                data-scope={SCOPE}
                data-part="hidden-input"
                style={HIDDEN_INPUT_STYLE}
                checked={state.value}
                disabled={disabled()}
                required={required()}
                name={props.name}
                value={props.value ?? 'on'}
                aria-invalid={invalid() ? 'true' : undefined}
                aria-describedby={field.inert ? undefined : field.describedBy()}
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
                    data-part="indicator"
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
}, { name: 'Checkbox.Root' });

export const Checkbox = compound(CheckboxRoot, {
    Root: CheckboxRoot,
});
