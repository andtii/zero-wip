/**
 * NumberInput — WAI-ARIA spinbutton over a real text input.
 *
 * ```tsx
 * <NumberInput.Root model={() => state.qty} min={0} max={99}>
 *     <NumberInput.Label>Quantity</NumberInput.Label>
 *     <NumberInput.Control>
 *         <NumberInput.DecrementTrigger>−</NumberInput.DecrementTrigger>
 *         <NumberInput.Input />
 *         <NumberInput.IncrementTrigger>+</NumberInput.IncrementTrigger>
 *     </NumberInput.Control>
 * </NumberInput.Root>
 * ```
 *
 * The model is `number | null` (null = empty — an empty field is not 0).
 * Typing edits an UNCOMMITTED draft; the draft commits on blur and Enter
 * (parse → clamp → snap), so half-typed entries like `-` or `1e` never
 * reach the model and unparseable text reverts to the last committed value.
 * Stepping (arrows, PageUp/Down, Home/End, the spin triggers, opt-in wheel)
 * commits immediately.
 *
 * The visible input is `type="text" inputmode="decimal"` — `type="number"`
 * would fight the draft model with its own parsing, spinner chrome and
 * scroll-to-change. Form participation goes through `hidden-input`, which
 * posts the canonical `String(value)`; the visible input never carries
 * `name`, so a custom display `format` can't corrupt form data.
 */
import { component, compound, defineInjectable, defineProvide } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { useFieldContext } from '../../behaviors/field.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { createPressFeedback } from '../../behaviors/press.js';
import { createSpinPress } from '../../behaviors/spin.js';
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
    WithAxes,
} from '../../contract/props.js';
import { clamp, snapToStep } from './number.js';
import { numberInputAnatomy } from './anatomy.js';

const SCOPE = numberInputAnatomy.scope;

interface NumberInputContext {
    state: ControllableState<number | null>;
    /** Uncommitted text while typing; null = mirror the model. */
    draft: { current: string | null };
    inputId(): string;
    disabled(): boolean;
    invalid(): boolean;
    required(): boolean;
    readonly(): boolean;
    min(): number | undefined;
    max(): number | undefined;
    step(): number;
    allowWheel(): boolean;
    displayValue(): string;
    describedBy(): string | undefined;
    labelId(): string | undefined;
    focusVisible: { value: boolean };
    canStep(direction: 1 | -1): boolean;
    stepBy(multiplier: number): void;
    stepTo(edge: 'min' | 'max'): boolean;
    commit(): void;
    inputKeydown(e: KeyboardEvent): void;
    setInput(el: HTMLInputElement | null): void;
    focusInput(): void;
}

function makeInert(): NumberInputContext {
    let value: number | null = null;
    return {
        state: {
            get value() { return value; },
            set value(v: number | null) { value = v; },
        },
        draft: { current: null },
        inputId: () => 'zx-number-inert',
        disabled: () => false,
        invalid: () => false,
        required: () => false,
        readonly: () => false,
        min: () => undefined,
        max: () => undefined,
        step: () => 1,
        allowWheel: () => false,
        displayValue: () => '',
        describedBy: () => undefined,
        labelId: () => undefined,
        focusVisible: { value: false },
        canStep: () => false,
        stepBy: () => {},
        stepTo: () => false,
        commit: () => {},
        inputKeydown: () => {},
        setInput: () => {},
        focusInput: () => {},
    };
}

export const useNumberInputContext = defineInjectable<NumberInputContext>(() => makeInert());

// ── Root ──

export type NumberInputRootProps =
    & Define.Model<number | null>
    & Define.Prop<'defaultValue', number, false>
    & Define.Event<'valueChange', number | null>
    & Define.Prop<'min', number, false>
    & Define.Prop<'max', number, false>
    & Define.Prop<'step', number, false>
    /** Wheel over the FOCUSED input steps the value (default false). */
    & Define.Prop<'allowWheel', boolean, false>
    /** Clamp an out-of-range commit into [min, max] (default true). */
    & Define.Prop<'clampOnBlur', boolean, false>
    /** Display formatting for the committed value (default `String`). */
    & Define.Prop<'format', (value: number) => string, false>
    /** Parse typed text; return null for "not a number" (default lenient decimal). */
    & Define.Prop<'parse', (text: string) => number | null, false>
    & Define.Prop<'name', string, false>
    & Define.Prop<'required', boolean, false>
    & Define.Prop<'invalid', boolean, false>
    & Define.Prop<'readonly', boolean, false>
    & WithDisabled
    & WithColor
    & WithSize
    & WithVariant
    & WithAxes
    & WithClass
    & Define.Slot<'default'>;

// Decimal syntax only — bare Number() would also accept 0x10/0b10/0o10,
// which is not what "type a number" means in a form field.
const DECIMAL_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

const defaultParse = (text: string): number | null => {
    const t = text.trim();
    if (!DECIMAL_RE.test(t)) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
};

const NumberInputRoot = component<NumberInputRootProps>(({ props, slots, emit, signal }) => {
    const state = createControllableState<number | null>(
        () => props.model,
        props.defaultValue ?? null,
        (v) => emit('valueChange', v),
    );
    const field = useFieldContext();
    const baseId = createId('zx-number');
    const draft = signal({ current: null as string | null });
    const focusVisible = signal({ value: false });
    let inputEl: HTMLInputElement | null = null;

    const disabled = (): boolean => !!props.disabled || field.disabled();
    const readonly = (): boolean => !!props.readonly;
    // Coerced, not trusted: snapToStep divides by this, so step={0} (or a
    // non-finite value) would poison the model and ARIA with NaN/Infinity.
    const step = (): number => {
        const s = props.step;
        return typeof s === 'number' && Number.isFinite(s) && s > 0 ? s : 1;
    };
    const format = (v: number): string => (props.format ? props.format(v) : String(v));
    const parse = (t: string): number | null => (props.parse ? props.parse(t) : defaultParse(t));

    const outOfRange = (): boolean => {
        const v = state.value;
        if (v == null) return false;
        return (props.min !== undefined && v < props.min) || (props.max !== undefined && v > props.max);
    };
    const invalid = (): boolean => !!props.invalid || field.invalid() || outOfRange();

    const settle = (v: number): number => clamp(snapToStep(v, step(), props.min), props.min, props.max);

    const commit = (): void => {
        const text = draft.current;
        if (text === null) return;
        draft.current = null;
        const trimmed = text.trim();
        if (trimmed === '') {
            state.value = null;
            return;
        }
        const parsed = parse(trimmed);
        // Unparseable → revert to the last committed value (draft is gone,
        // the display falls back to the model). The finite check also guards
        // a custom `parse` leaking NaN/Infinity into the model and ARIA.
        if (parsed === null || !Number.isFinite(parsed)) return;
        state.value = (props.clampOnBlur ?? true) ? settle(parsed) : snapToStep(parsed, step(), props.min);
    };

    const canStep = (direction: 1 | -1): boolean => {
        if (disabled() || readonly()) return false;
        const v = state.value;
        if (v == null) return true;
        return direction > 0
            ? !(props.max !== undefined && v >= props.max)
            : !(props.min !== undefined && v <= props.min);
    };

    const stepBy = (multiplier: number): void => {
        if (disabled() || readonly()) return;
        commit();
        const current = state.value;
        // From empty, the first step lands on the floor of the range (or 0),
        // not one step past it — matching native spinbuttons.
        state.value = current == null ? settle(props.min ?? 0) : settle(current + step() * multiplier);
    };

    const stepTo = (edge: 'min' | 'max'): boolean => {
        const target = edge === 'min' ? props.min : props.max;
        if (target === undefined || disabled() || readonly()) return false;
        draft.current = null;
        state.value = settle(target);
        return true;
    };

    const ctx: NumberInputContext = {
        state,
        draft,
        inputId: () => (field.inert ? `${baseId}-input` : field.ids.control),
        disabled,
        invalid,
        required: () => !!props.required || field.required(),
        readonly,
        min: () => props.min,
        max: () => props.max,
        step,
        allowWheel: () => props.allowWheel ?? false,
        displayValue: () => {
            if (draft.current !== null) return draft.current;
            const v = state.value;
            return v == null ? '' : format(v);
        },
        describedBy: () => (field.inert ? undefined : field.describedBy()),
        labelId: () => (field.inert ? `${baseId}-label` : field.ids.label),
        focusVisible,
        canStep,
        stepBy,
        stepTo,
        commit,
        inputKeydown: (e: KeyboardEvent) => {
            if (disabled()) return;
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    stepBy(1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    stepBy(-1);
                    break;
                case 'PageUp':
                    e.preventDefault();
                    stepBy(10);
                    break;
                case 'PageDown':
                    e.preventDefault();
                    stepBy(-10);
                    break;
                case 'Home':
                    // Only intercept when there is an edge to jump to; a
                    // boundless spinbutton leaves Home/End to the text caret.
                    if (stepTo('min')) e.preventDefault();
                    break;
                case 'End':
                    if (stepTo('max')) e.preventDefault();
                    break;
                case 'Enter':
                    commit();
                    break;
            }
        },
        setInput: (el) => { inputEl = el; },
        focusInput: () => inputEl?.focus(),
    };
    defineProvide(useNumberInputContext, () => ctx);

    return () => (
        <div
            data-scope={SCOPE}
            data-part="root"
            data-disabled={dataAttr(disabled())}
            data-invalid={dataAttr(invalid())}
            data-required={dataAttr(ctx.required())}
            data-readonly={dataAttr(readonly())}
            {...variantAttrs(props)}
            class={props.class}
        >
            {slots.default?.()}
            {props.name !== undefined
                ? (
                    <input
                        type="hidden"
                        data-scope={SCOPE}
                        data-part="hidden-input"
                        name={props.name}
                        value={state.value == null ? '' : String(state.value)}
                        disabled={disabled()}
                    />
                )
                : null}
        </div>
    );
}, { name: 'NumberInput.Root' });

// ── Label ──

export type NumberInputLabelProps = WithClass & Define.Slot<'default'>;

const NumberInputLabel = component<NumberInputLabelProps>(({ props, slots }) => {
    const ctx = useNumberInputContext();
    return () => (
        <label
            id={ctx.labelId()}
            for={ctx.inputId()}
            data-scope={SCOPE}
            data-part="label"
            data-disabled={dataAttr(ctx.disabled())}
            data-invalid={dataAttr(ctx.invalid())}
            data-required={dataAttr(ctx.required())}
            class={props.class}
        >
            {slots.default?.()}
        </label>
    );
}, { name: 'NumberInput.Label' });

// ── Control ──

export type NumberInputControlProps = WithClass & Define.Slot<'default'>;

const NumberInputControl = component<NumberInputControlProps>(({ props, slots }) => {
    const ctx = useNumberInputContext();
    return () => (
        <div
            data-scope={SCOPE}
            data-part="control"
            data-disabled={dataAttr(ctx.disabled())}
            data-invalid={dataAttr(ctx.invalid())}
            data-readonly={dataAttr(ctx.readonly())}
            data-focus-visible={dataAttr(ctx.focusVisible.value)}
            class={props.class}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'NumberInput.Control' });

// ── Input ──

export type NumberInputInputProps =
    & Define.Prop<'placeholder', string, false>
    & WithClass;

const NumberInputInput = component<NumberInputInputProps>(({ props }) => {
    const ctx = useNumberInputContext();
    let el: HTMLInputElement | null = null;

    return () => (
        <input
            id={ctx.inputId()}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            role="spinbutton"
            data-scope={SCOPE}
            data-part="input"
            data-disabled={dataAttr(ctx.disabled())}
            data-invalid={dataAttr(ctx.invalid())}
            data-required={dataAttr(ctx.required())}
            data-readonly={dataAttr(ctx.readonly())}
            data-focus-visible={dataAttr(ctx.focusVisible.value)}
            value={ctx.displayValue()}
            placeholder={props.placeholder}
            disabled={ctx.disabled()}
            readOnly={ctx.readonly()}
            required={ctx.required()}
            aria-valuemin={ctx.min()}
            aria-valuemax={ctx.max()}
            /* While a draft is being typed the committed value is stale —
               announcing it against the visible draft text would read as two
               different numbers. The draft rides valuetext alone until commit. */
            aria-valuenow={ctx.draft.current === null ? ctx.state.value ?? undefined : undefined}
            aria-valuetext={ctx.draft.current !== null
                ? (ctx.draft.current || undefined)
                : (ctx.state.value != null ? ctx.displayValue() : undefined)}
            aria-invalid={ctx.invalid() ? 'true' : undefined}
            aria-describedby={ctx.describedBy()}
            class={props.class}
            ref={(node: HTMLInputElement | null) => {
                el = node;
                ctx.setInput(node);
            }}
            onInput={(e: Event) => {
                ctx.draft.current = (e.target as HTMLInputElement).value;
            }}
            onKeydown={(e: KeyboardEvent) => ctx.inputKeydown(e)}
            onWheel={(e: WheelEvent) => {
                // Focus-gated: a wheel over an unfocused input keeps
                // scrolling the page.
                if (!ctx.allowWheel() || document.activeElement !== el) return;
                e.preventDefault();
                ctx.stepBy(e.deltaY < 0 ? 1 : -1);
            }}
            onFocus={() => { ctx.focusVisible.value = isFocusVisible(el); }}
            onBlur={() => {
                ctx.focusVisible.value = false;
                ctx.commit();
            }}
        />
    );
}, { name: 'NumberInput.Input' });

// ── Triggers ──

export type NumberInputTriggerProps =
    & Define.Prop<'label', string, false>
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

function makeTrigger(direction: 1 | -1, part: 'increment-trigger' | 'decrement-trigger', name: string) {
    return component<NumberInputTriggerProps>(({ props, slots, onUnmounted }) => {
        const ctx = useNumberInputContext();
        let el: HTMLElement | null = null;

        const triggerDisabled = (): boolean => ctx.disabled() || ctx.readonly() || !ctx.canStep(direction);
        const press = createPressFeedback({
            getElement: () => el,
            isDisabled: () => triggerDisabled(),
        });
        const spin = createSpinPress({
            onSpin: () => ctx.stepBy(direction),
            isDisabled: () => triggerDisabled(),
        });
        onUnmounted(() => spin.stop());

        const bag = (): PartProps => ({
            'data-scope': SCOPE,
            'data-part': part,
            'data-disabled': dataAttr(triggerDisabled()),
            // Satellites of the input, not tab stops of their own (APG):
            // keyboard stepping lives on the spinbutton itself.
            tabIndex: -1,
            'aria-label': props.label ?? (direction > 0 ? 'Increment' : 'Decrement'),
            'aria-controls': ctx.inputId(),
            'aria-disabled': props.asChild && triggerDisabled() ? 'true' : undefined,
            ref: (node: HTMLElement | null) => { el = node; },
            onPointerdown: (e: PointerEvent) => {
                press.onPointerdown(e);
                spin.onPointerdown(e);
                // The spin's preventDefault keeps native focus from moving —
                // hand it to the spinbutton instead (Combobox.Trigger's
                // satellite semantics), so keyboard stepping continues where
                // the pointer left off.
                if (!triggerDisabled()) ctx.focusInput();
            },
            onPointerup: (e: PointerEvent) => {
                press.onPointerup(e);
                spin.onPointerup(e);
            },
            onPointercancel: (e: PointerEvent) => {
                press.onPointercancel(e);
                spin.onPointercancel(e);
            },
            onPointerleave: (e: PointerEvent) => {
                press.onPointerleave(e);
                spin.onPointerleave(e);
            },
            // No onClick stepping: the spin press already stepped on
            // pointerdown; a click handler would double-step every tap.
        });

        return () => {
            const b = bag();
            if (props.asChild) return renderAsChild(slots.default, b);
            return (
                <button type="button" class={props.class} disabled={triggerDisabled()} {...b}>
                    {slots.default?.(b)}
                </button>
            );
        };
    }, { name });
}

const NumberInputIncrementTrigger = makeTrigger(1, 'increment-trigger', 'NumberInput.IncrementTrigger');
const NumberInputDecrementTrigger = makeTrigger(-1, 'decrement-trigger', 'NumberInput.DecrementTrigger');

export const NumberInput = compound(NumberInputRoot, {
    Root: NumberInputRoot,
    Label: NumberInputLabel,
    Control: NumberInputControl,
    Input: NumberInputInput,
    IncrementTrigger: NumberInputIncrementTrigger,
    DecrementTrigger: NumberInputDecrementTrigger,
});
