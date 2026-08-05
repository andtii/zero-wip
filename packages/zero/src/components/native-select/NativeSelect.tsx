/**
 * NativeSelect — a real `<select>` wrapped in zero anatomy.
 *
 * ```tsx
 * <Field.Root>
 *     <Field.Label>Pet</Field.Label>
 *     <NativeSelect model={() => state.pet} placeholder="Pick a pet…"
 *         options={[{ value: 'cat', label: 'Cat' }, { value: 'dog', label: 'Dog' }]} />
 * </Field.Root>
 * ```
 *
 * The custom `Select` owns its listbox to style the options; on a form-heavy
 * page that weight buys little, and the platform's picker (mobile wheels,
 * OS-native popup, form restoration) is strictly better. This is that
 * trade-off as a component: the platform owns the popup and the keyboard,
 * zero owns the wrapper — `root` (span, the axis carrier the chevron
 * overlays), `control` (the `<select>` itself, `appearance: none` in
 * recipes) and `indicator` (the replacement chevron).
 *
 * `options` renders real `<option>` elements, `group` a real `<optgroup>`
 * per distinct value in first-appearance order, label defaulting to value —
 * the same array shape and grouping walk as Select's and Combobox's sugar.
 * Slot children (hand-written `<option>`s) win entirely when both are given.
 * A `placeholder` renders as the conventional disabled empty option and
 * drives the `data-placeholder` flag while the value is empty. Without one,
 * "nothing chosen" is not representable — a `<select>` with no empty option
 * always has a value (the platform rests on, and posts, the first option) —
 * so an empty model is coerced to the control's actual value on mount: the
 * model and the posted value are one truth.
 *
 * Inside a `Field.Root` the control adopts the field's id, flags and
 * `aria-describedby`, exactly like Input — a `<select>` is labelable, so
 * `Field.Label` names it through `for`. No hidden input: the visible element
 * IS the form control and carries `name`.
 */
import { component, compound, effect } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { useFieldContext } from '../../behaviors/field.js';
import { segmentOptions, type OptionInput } from '../../behaviors/options.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { dataAttr } from '../../contract/data-attrs.js';
import { variantAttrs } from '../../contract/props.js';
import type { WithClass, WithDisabled, WithVariantAxes } from '../../contract/props.js';
import { nativeSelectAnatomy } from './anatomy.js';

const SCOPE = nativeSelectAnatomy.scope;

export type NativeSelectRootProps =
    & Define.Model<string>
    & Define.Prop<'defaultValue', string, false>
    & Define.Event<'valueChange', string>
    /**
     * The options array (`label` defaults to `value`; `group` renders a real
     * `<optgroup>`). Hand-written `<option>` slot children win entirely when
     * both are given — never merged.
     */
    & Define.Prop<'options', ReadonlyArray<OptionInput>, false>
    /** Rendered as the conventional disabled empty first option. */
    & Define.Prop<'placeholder', string, false>
    & Define.Prop<'name', string, false>
    & Define.Prop<'required', boolean, false>
    & Define.Prop<'invalid', boolean, false>
    & WithDisabled
    & WithVariantAxes<'native-select'>
    & WithClass
    & Define.Slot<'default'>;

const NativeSelectRoot = component<NativeSelectRootProps>(({ props, slots, emit, signal, onMounted }) => {
    const state = createControllableState<string>(
        () => props.model,
        props.defaultValue ?? '',
        (v) => emit('valueChange', v),
    );
    const field = useFieldContext();
    const baseId = createId('zx-native-select');
    const focus = signal({ visible: false });
    let el: HTMLSelectElement | null = null;

    const controlId = (): string => (field.inert ? `${baseId}-control` : field.ids.control);
    const disabled = (): boolean => !!props.disabled || field.disabled();
    const invalid = (): boolean => !!props.invalid || field.invalid();
    const required = (): boolean => !!props.required || field.required();
    // A fact about the RESTING DISPLAY, not the value alone: without a
    // placeholder option an empty model shows the first real option, and
    // graying that would gray a legitimate choice.
    const placeholderShown = (): boolean => props.placeholder !== undefined && !state.value;

    onMounted(() => {
        // `value` cannot be a render-time attribute on a <select> — it only
        // means something once the options exist below it. The generated
        // options carry `selected` for SSR; this effect keeps the live
        // element in sync with model writes (and covers slot-children mode,
        // where zero renders no `selected` at all).
        effect(() => {
            const value = state.value;
            if (!el || el.value === value) return;
            // An empty model with no placeholder option cannot be written:
            // no option has value "", so the write would blank the control —
            // and a <select> without an empty option ALWAYS has a value (the
            // platform rests on the first option and would POST it). Writing
            // nothing instead would leave the model claiming '' while the
            // form submits 'first-option', so the model is coerced to the
            // control's actual value: the model and the posted value stay
            // one truth. Represent "nothing chosen yet" with `placeholder`.
            if (value === '' && props.placeholder === undefined) {
                if (el.value !== '') state.value = el.value;
                return;
            }
            el.value = value;
        });
    });

    const flags = () => ({
        'data-disabled': dataAttr(disabled()),
        'data-invalid': dataAttr(invalid()),
        'data-required': dataAttr(required()),
        'data-placeholder': dataAttr(placeholderShown()),
        'data-focus-visible': dataAttr(focus.visible),
    });

    const optionsContent = () =>
        segmentOptions(props.options ?? []).map((segment) => segment.group === undefined
            ? segment.options.map((o) => (
                <option
                    value={o.value}
                    disabled={o.disabled}
                    selected={o.value === state.value}
                    key={o.value}
                >
                    {o.label ?? o.value}
                </option>
            ))
            : (
                <optgroup label={segment.group} key={`group:${segment.group}`}>
                    {segment.options.map((o) => (
                        <option
                            value={o.value}
                            disabled={o.disabled}
                            selected={o.value === state.value}
                            key={o.value}
                        >
                            {o.label ?? o.value}
                        </option>
                    ))}
                </optgroup>
            ));

    return () => (
        <span
            data-scope={SCOPE}
            data-part="root"
            {...flags()}
            {...variantAttrs(props)}
            class={props.class}
        >
            <select
                id={controlId()}
                data-scope={SCOPE}
                data-part="control"
                {...flags()}
                name={props.name}
                disabled={disabled()}
                required={required()}
                aria-invalid={invalid() ? 'true' : undefined}
                aria-describedby={field.describedBy()}
                ref={(node: HTMLSelectElement | null) => { el = node; }}
                onChange={(e: Event) => {
                    state.value = (e.target as HTMLSelectElement).value;
                }}
                onFocus={() => { focus.visible = isFocusVisible(el); }}
                onBlur={() => { focus.visible = false; }}
            >
                {props.placeholder !== undefined
                    ? (
                        <option value="" disabled selected={!state.value}>
                            {props.placeholder}
                        </option>
                    )
                    : null}
                {/* Slot children win ENTIRELY over `options` — no merging. */}
                {slots.default ? slots.default() : optionsContent()}
            </select>
            {/* Pure paint: the platform arrow is gone under appearance:none,
                so the recipe draws this one. Hidden from AT — the select
                itself announces as a popup button. */}
            <span data-scope={SCOPE} data-part="indicator" aria-hidden="true">
                ▾
            </span>
        </span>
    );
}, { name: 'NativeSelect.Root' });

// One logical element, but still a compound: every scope exports
// `<Pascal>.Root` (the kit's `./components` emitter relies on it — Badge and
// Toggle are the same shape). `<NativeSelect>` stays callable directly.
export const NativeSelect = compound(NativeSelectRoot, { Root: NativeSelectRoot });
