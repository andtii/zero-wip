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
 * comes from `createId`, never a module counter. Each radio binds the group's
 * model with `model=` — sigx's radio processor checks the one whose `value`
 * matches and writes that value back, exactly as it would for a raw radio.
 */
import { component, compound, defineInjectable, defineProvide } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, createInertState, type ControllableState } from '../../behaviors/controllable.js';
import { createFormControl } from '../../behaviors/form-control.js';
import { onFormReset } from '../../behaviors/form-reset.js';
import { VISUALLY_HIDDEN_STYLE } from '../../behaviors/visually-hidden.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { createPressFeedback } from '../../behaviors/press.js';
import { dataAttr, stateAttr, type Orientation } from '../../contract/data-attrs.js';
import { variantAttrs } from '../../contract/props.js';
import type { WithClass, WithDisabled, WithFormControl, WithOrientation, WithVariantAxes } from '../../contract/props.js';
import { radioGroupAnatomy } from './anatomy.js';

const SCOPE = radioGroupAnatomy.scope;

interface RadioGroupContext {
    state: ControllableState<string>;
    name: string;
    form(): string | undefined;
    defaultValue(): string;
    disabled(): boolean;
    invalid(): boolean;
    required(): boolean;
}

function makeInert(): RadioGroupContext {
    return {
        state: createInertState<string>(''),
        name: 'zx-radio-inert',
        form: () => undefined,
        defaultValue: () => '',
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
    & WithFormControl
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
    const fc = createFormControl({ props: () => props, idBase: 'zx-radio' });

    const ctx: RadioGroupContext = {
        state,
        // The generated name is the platform's own roving: same-name radios.
        get name() { return props.name ?? fc.baseId; },
        // An UNNAMED group must not post under that generated name: an empty
        // `form` attribute matches no id, which leaves the radios owned by no
        // form (the platform's own rule) while the grouping name stays.
        form: () => (props.name === undefined ? '' : fc.form()),
        defaultValue: () => props.defaultValue ?? '',
        disabled: fc.disabled,
        invalid: fc.invalid,
        required: fc.required,
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
            aria-labelledby={fc.field.inert ? undefined : fc.labelId()}
            aria-describedby={fc.describedBy()}
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

const RadioGroupItem = component<RadioGroupItemProps>(({ props, slots, signal, onMounted, onUnmounted }) => {
    const group = useRadioGroupContext();
    let inputEl: HTMLInputElement | null = null;
    const focus = signal({ visible: false });

    // Every item restores the same group default — the same-value guard
    // makes the N writes one — and re-syncs its own radio.
    let detachReset = (): void => {};
    onMounted(() => {
        detachReset = onFormReset(() => inputEl, () => {
            group.state.value = group.defaultValue();
            if (inputEl) inputEl.checked = group.state.value === props.value;
        });
    });
    onUnmounted(() => detachReset());

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
                style={VISUALLY_HIDDEN_STYLE}
                name={group.name}
                form={group.form()}
                value={props.value}
                model={group.state}
                disabled={disabled()}
                required={group.required()}
                aria-invalid={group.invalid() ? 'true' : undefined}
                ref={(node: HTMLInputElement | null) => { inputEl = node; }}
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
