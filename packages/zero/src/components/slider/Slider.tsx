/**
 * Slider — a native `<input type="range">` under a number model.
 *
 * ```tsx
 * <Slider.Root model={() => state.volume} min={0} max={100}>
 *     <Slider.Label>Volume</Slider.Label>
 *     <Slider.Input />
 *     <Slider.ValueText />
 * </Slider.Root>
 * ```
 *
 * The platform supplies keyboard behavior, form participation and a11y;
 * design systems style the input's track/thumb pseudo-elements against
 * `[data-scope="slider"][data-part="input"]`. The current fraction is
 * exposed as `--slider-percent` for track-fill styling.
 */
import { component, compound, defineInjectable, defineProvide } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { useFieldContext } from '../../behaviors/field.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { createPressFeedback } from '../../behaviors/press.js';
import { dataAttr } from '../../contract/data-attrs.js';
import { variantAttrs } from '../../contract/props.js';
import type { WithClass, WithColor, WithDisabled, WithSize, WithVariant, WithAxes } from '../../contract/props.js';
import { sliderAnatomy } from './anatomy.js';

const SCOPE = sliderAnatomy.scope;

interface SliderContext {
    state: ControllableState<number>;
    min(): number;
    max(): number;
    step(): number;
    disabled(): boolean;
    invalid(): boolean;
    name(): string | undefined;
    percent(): number;
    ids: { input: string; label: string };
    focusVisible: { visible: boolean };
}

function makeInert(): SliderContext {
    let value = 0;
    return {
        state: {
            get value() { return value; },
            set value(v: number) { value = v; },
        },
        min: () => 0,
        max: () => 100,
        step: () => 1,
        disabled: () => false,
        invalid: () => false,
        name: () => undefined,
        percent: () => 0,
        ids: { input: 'zx-slider-inert-input', label: 'zx-slider-inert-label' },
        focusVisible: { visible: false },
    };
}

export const useSliderContext = defineInjectable<SliderContext>(() => makeInert());

export type SliderRootProps =
    & Define.Model<number>
    & Define.Prop<'defaultValue', number, false>
    & Define.Event<'valueChange', number>
    & Define.Prop<'min', number, false>
    & Define.Prop<'max', number, false>
    & Define.Prop<'step', number, false>
    & Define.Prop<'name', string, false>
    & Define.Prop<'invalid', boolean, false>
    & WithDisabled
    & WithColor
    & WithSize
    & WithVariant
    & WithAxes
    & WithClass
    & Define.Slot<'default'>;

const SliderRoot = component<SliderRootProps>(({ props, slots, emit, signal }) => {
    const min = () => props.min ?? 0;
    const max = () => props.max ?? 100;
    const state = createControllableState<number>(
        () => props.model,
        props.defaultValue ?? min(),
        (v) => emit('valueChange', v),
    );
    const field = useFieldContext();
    const baseId = createId('zx-slider');
    const focusVisible = signal({ visible: false });

    const ctx: SliderContext = {
        state,
        min,
        max,
        step: () => props.step ?? 1,
        disabled: () => !!props.disabled || field.disabled(),
        invalid: () => !!props.invalid || field.invalid(),
        name: () => props.name,
        percent: () => Math.min(100, Math.max(0, ((state.value - min()) / (max() - min())) * 100)),
        ids: {
            input: field.inert ? `${baseId}-input` : field.ids.control,
            label: field.inert ? `${baseId}-label` : field.ids.label,
        },
        focusVisible,
    };
    defineProvide(useSliderContext, () => ctx);

    return () => (
        <div
            data-scope={SCOPE}
            data-part="root"
            data-disabled={dataAttr(ctx.disabled())}
            data-invalid={dataAttr(ctx.invalid())}
            data-focus-visible={dataAttr(focusVisible.visible)}
            style={{ '--slider-percent': `${ctx.percent()}%` }}
            {...variantAttrs(props)}
            class={props.class}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'Slider.Root' });

export type SliderLabelProps = WithClass & Define.Slot<'default'>;

const SliderLabel = component<SliderLabelProps>(({ props, slots }) => {
    const slider = useSliderContext();
    return () => (
        <label
            id={slider.ids.label}
            for={slider.ids.input}
            data-scope={SCOPE}
            data-part="label"
            data-disabled={dataAttr(slider.disabled())}
            class={props.class}
        >
            {slots.default?.()}
        </label>
    );
}, { name: 'Slider.Label' });

export type SliderInputProps = WithClass;

const SliderInput = component<SliderInputProps>(({ props }) => {
    const slider = useSliderContext();
    let el: HTMLInputElement | null = null;
    // A drag is a long press, so the press must survive leaving the box:
    // no pointerleave handler is spread below, and the behavior's window
    // release listener ends the press wherever the pointer lets go. No key
    // handlers either — arrow keys are value changes, not presses — and no
    // one-shot: a drag has no ripple.
    const press = createPressFeedback({
        getElement: () => el,
        isDisabled: () => slider.disabled(),
        oneShot: false,
    });

    return () => (
        <input
            type="range"
            id={slider.ids.input}
            data-scope={SCOPE}
            data-part="input"
            data-disabled={dataAttr(slider.disabled())}
            data-invalid={dataAttr(slider.invalid())}
            data-focus-visible={dataAttr(slider.focusVisible.visible)}
            min={slider.min()}
            max={slider.max()}
            step={slider.step()}
            value={slider.state.value}
            disabled={slider.disabled()}
            name={slider.name()}
            aria-invalid={slider.invalid() ? 'true' : undefined}
            class={props.class}
            ref={(node: HTMLInputElement | null) => { el = node; }}
            onInput={(e: Event) => {
                slider.state.value = (e.target as HTMLInputElement).valueAsNumber;
            }}
            onPointerdown={press.onPointerdown}
            onPointerup={press.onPointerup}
            onPointercancel={press.onPointercancel}
            onFocus={() => { slider.focusVisible.visible = isFocusVisible(el); }}
            onBlur={(e: FocusEvent) => {
                press.onBlur(e);
                slider.focusVisible.visible = false;
            }}
        />
    );
}, { name: 'Slider.Input' });

export type SliderValueTextProps = WithClass & Define.Slot<'default', { value: number }>;

const SliderValueText = component<SliderValueTextProps>(({ props, slots }) => {
    const slider = useSliderContext();
    return () => (
        <output data-scope={SCOPE} data-part="value-text" for={slider.ids.input} class={props.class}>
            {slots.default?.({ value: slider.state.value }) ?? String(slider.state.value)}
        </output>
    );
}, { name: 'Slider.ValueText' });

export const Slider = compound(SliderRoot, {
    Root: SliderRoot,
    Label: SliderLabel,
    Input: SliderInput,
    ValueText: SliderValueText,
});
