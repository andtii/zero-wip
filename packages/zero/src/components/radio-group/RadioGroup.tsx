/**
 * RadioGroup — native radios (shared generated `name`) under a value model.
 *
 * ```tsx
 * <RadioGroup.Root model={() => state.plan}>
 *     <RadioGroup.Item value="free">Free</RadioGroup.Item>
 *     <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
 * </RadioGroup.Root>
 * ```
 *
 * Arrow-key roving comes from the platform (same-name radios); the group id
 * comes from `createId`, never a module counter.
 */
import { component, compound, defineInjectable, defineProvide } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { useFieldContext } from '../../behaviors/field.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { createPressFeedback } from '../../behaviors/press.js';
import { dataAttr, stateAttr, type Orientation } from '../../contract/data-attrs.js';
import { variantAttrs } from '../../contract/props.js';
import type { WithClass, WithDisabled, WithOrientation, WithVariantAxes } from '../../contract/props.js';
import { radioGroupAnatomy } from './anatomy.js';

const SCOPE = radioGroupAnatomy.scope;

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

interface RadioGroupContext {
    state: ControllableState<string>;
    name: string;
    disabled(): boolean;
    invalid(): boolean;
    required(): boolean;
}

function makeInert(): RadioGroupContext {
    let value = '';
    return {
        state: {
            get value() { return value; },
            set value(v: string) { value = v; },
        },
        name: 'zx-radio-inert',
        disabled: () => false,
        invalid: () => false,
        required: () => false,
    };
}

export const useRadioGroupContext = defineInjectable<RadioGroupContext>(() => makeInert());

// ── Root ──

export type RadioGroupRootProps =
    & Define.Model<string>
    & Define.Prop<'defaultValue', string, false>
    & Define.Event<'valueChange', string>
    & Define.Prop<'name', string, false>
    & Define.Prop<'required', boolean, false>
    & Define.Prop<'invalid', boolean, false>
    & WithDisabled
    & WithOrientation
    & WithVariantAxes<'radio-group'>
    & WithClass
    & Define.Slot<'default'>;

const RadioGroupRoot = component<RadioGroupRootProps>(({ props, slots, emit }) => {
    const state = createControllableState<string>(
        () => props.model,
        props.defaultValue ?? '',
        (v) => emit('valueChange', v),
    );
    const field = useFieldContext();
    const generatedName = createId('zx-radio');

    const ctx: RadioGroupContext = {
        state,
        get name() { return props.name ?? generatedName; },
        disabled: () => !!props.disabled || field.disabled(),
        invalid: () => !!props.invalid || field.invalid(),
        required: () => !!props.required || field.required(),
    };
    defineProvide(useRadioGroupContext, () => ctx);

    const orientation = (): Orientation => props.orientation ?? 'vertical';

    return () => (
        <div
            role="radiogroup"
            data-scope={SCOPE}
            data-part="root"
            data-orientation={orientation()}
            data-disabled={dataAttr(ctx.disabled())}
            data-invalid={dataAttr(ctx.invalid())}
            data-required={dataAttr(ctx.required())}
            aria-labelledby={field.inert ? undefined : field.ids.label}
            aria-describedby={field.inert ? undefined : field.describedBy()}
            {...variantAttrs(props)}
            class={props.class}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'RadioGroup.Root' });

// ── Item ──

export type RadioGroupItemProps =
    & Define.Prop<'value', string, true>
    & WithDisabled
    & WithClass
    & Define.Slot<'default'>;

const RadioGroupItem = component<RadioGroupItemProps>(({ props, slots, signal }) => {
    const group = useRadioGroupContext();
    let inputEl: HTMLInputElement | null = null;
    const focus = signal({ visible: false });

    const disabled = (): boolean => !!props.disabled || group.disabled();
    const isChecked = (): boolean => group.state.value === props.value;
    const checkedState = () => stateAttr(isChecked(), 'checked', 'unchecked');

    let controlEl: HTMLElement | null = null;
    // Cross-element press: pointer on the row, keyboard on the hidden input,
    // feedback on the visible item-control.
    const press = createPressFeedback({
        getElement: () => controlEl,
        isDisabled: () => disabled(),
    });

    return () => (
        <label
            data-scope={SCOPE}
            data-part="item"
            data-state={checkedState()}
            data-disabled={dataAttr(disabled())}
            data-focus-visible={dataAttr(focus.visible)}
            class={props.class}
            onPointerdown={press.onPointerdown}
            onPointerup={press.onPointerup}
            onPointercancel={press.onPointercancel}
            onPointerleave={press.onPointerleave}
        >
            <input
                type="radio"
                data-scope={SCOPE}
                data-part="hidden-input"
                style={HIDDEN_INPUT_STYLE}
                name={group.name}
                value={props.value}
                checked={isChecked()}
                disabled={disabled()}
                required={group.required()}
                aria-invalid={group.invalid() ? 'true' : undefined}
                ref={(node: HTMLInputElement | null) => { inputEl = node; }}
                onChange={(e: Event) => {
                    if ((e.target as HTMLInputElement).checked) group.state.value = props.value;
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
                data-part="item-control"
                data-state={checkedState()}
                data-disabled={dataAttr(disabled())}
                data-focus-visible={dataAttr(focus.visible)}
                ref={(node: HTMLElement | null) => { controlEl = node; }}
            >
                <span
                    data-scope={SCOPE}
                    data-part="item-indicator"
                    data-state={checkedState()}
                />
            </span>
            {slots.default
                ? (
                    <span
                        data-scope={SCOPE}
                        data-part="item-label"
                        data-state={checkedState()}
                        data-disabled={dataAttr(disabled())}
                    >
                        {slots.default()}
                    </span>
                )
                : null}
        </label>
    );
}, { name: 'RadioGroup.Item' });

// ── Label ──

export type RadioGroupLabelProps = WithClass & Define.Slot<'default'>;

const RadioGroupLabel = component<RadioGroupLabelProps>(({ props, slots }) => {
    const group = useRadioGroupContext();
    return () => (
        <div
            data-scope={SCOPE}
            data-part="label"
            data-disabled={dataAttr(group.disabled())}
            data-invalid={dataAttr(group.invalid())}
            data-required={dataAttr(group.required())}
            class={props.class}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'RadioGroup.Label' });

export const RadioGroup = compound(RadioGroupRoot, {
    Root: RadioGroupRoot,
    Item: RadioGroupItem,
    Label: RadioGroupLabel,
});
