/**
 * Textarea — a multi-line text field.
 *
 * ```tsx
 * <Textarea.Root model={() => state.bio} name="bio" rows={4}>
 *     <Textarea.Label>Bio</Textarea.Label>
 *     <Textarea.Textarea placeholder="Tell us about yourself" />
 * </Textarea.Root>
 * ```
 *
 * Input's shape minus the `control` box: there is no inside to a textarea for
 * anything to sit in, so the chrome draws on the element itself. Everything
 * else matches — a plain `string` model written through on every keystroke,
 * and the same Field adoption.
 *
 * Resize is left to the design system (`resize: vertical` is the usual
 * choice). Zero does not auto-size the box: growing it means measuring
 * scrollHeight against a collapsed height every keystroke, which is a layout
 * behavior, not an anatomy one.
 */
import { component, compound, defineInjectable, defineProvide } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { useFieldContext } from '../../behaviors/field.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { dataAttr } from '../../contract/data-attrs.js';
import { variantAttrs } from '../../contract/props.js';
import type { WithClass, WithDisabled, WithVariantAxes } from '../../contract/props.js';
import { textareaAnatomy } from './anatomy.js';

const SCOPE = textareaAnatomy.scope;

interface TextareaContext {
    state: ControllableState<string>;
    name(): string | undefined;
    autocomplete(): string | undefined;
    maxlength(): number | undefined;
    rows(): number | undefined;
    controlId(): string;
    labelId(): string | undefined;
    describedBy(): string | undefined;
    disabled(): boolean;
    invalid(): boolean;
    required(): boolean;
    readonly(): boolean;
    focusVisible: { value: boolean };
}

function makeInert(): TextareaContext {
    let value = '';
    return {
        state: {
            get value() { return value; },
            set value(v: string) { value = v; },
        },
        name: () => undefined,
        autocomplete: () => undefined,
        maxlength: () => undefined,
        rows: () => undefined,
        controlId: () => 'zx-textarea-inert',
        labelId: () => undefined,
        describedBy: () => undefined,
        disabled: () => false,
        invalid: () => false,
        required: () => false,
        readonly: () => false,
        focusVisible: { value: false },
    };
}

export const useTextareaContext = defineInjectable<TextareaContext>(() => makeInert());

// ── Root ──

export type TextareaRootProps =
    & Define.Model<string>
    & Define.Prop<'defaultValue', string, false>
    & Define.Event<'valueChange', string>
    & Define.Prop<'name', string, false>
    /** Native autofill hint — `street-address`, `off`, … */
    & Define.Prop<'autocomplete', string, false>
    & Define.Prop<'maxlength', number, false>
    & Define.Prop<'rows', number, false>
    & Define.Prop<'required', boolean, false>
    & Define.Prop<'invalid', boolean, false>
    & Define.Prop<'readonly', boolean, false>
    & WithDisabled
    & WithVariantAxes<'textarea'>
    & WithClass
    & Define.Slot<'default'>;

const TextareaRoot = component<TextareaRootProps>(({ props, slots, emit, signal }) => {
    const state = createControllableState<string>(
        () => props.model,
        props.defaultValue ?? '',
        (v) => emit('valueChange', v),
    );
    const field = useFieldContext();
    const baseId = createId('zx-textarea');
    const focusVisible = signal({ value: false });

    const disabled = (): boolean => !!props.disabled || field.disabled();
    const invalid = (): boolean => !!props.invalid || field.invalid();
    const required = (): boolean => !!props.required || field.required();
    const readonly = (): boolean => !!props.readonly;

    const ctx: TextareaContext = {
        state,
        name: () => props.name,
        autocomplete: () => props.autocomplete,
        maxlength: () => props.maxlength,
        rows: () => props.rows,
        controlId: () => (field.inert ? `${baseId}-control` : field.ids.control),
        labelId: () => (field.inert ? `${baseId}-label` : field.ids.label),
        describedBy: () => (field.inert ? undefined : field.describedBy()),
        disabled,
        invalid,
        required,
        readonly,
        focusVisible,
    };
    defineProvide(useTextareaContext, () => ctx);

    return () => (
        <div
            data-scope={SCOPE}
            data-part="root"
            data-disabled={dataAttr(disabled())}
            data-invalid={dataAttr(invalid())}
            data-required={dataAttr(required())}
            data-readonly={dataAttr(readonly())}
            {...variantAttrs(props)}
            class={props.class}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'Textarea.Root' });

// ── Label ──

export type TextareaLabelProps = WithClass & Define.Slot<'default'>;

const TextareaLabel = component<TextareaLabelProps>(({ props, slots }) => {
    const ctx = useTextareaContext();
    return () => (
        <label
            id={ctx.labelId()}
            for={ctx.controlId()}
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
}, { name: 'Textarea.Label' });

// ── Textarea ──

export type TextareaTextareaProps =
    & Define.Prop<'placeholder', string, false>
    & WithClass;

const TextareaTextarea = component<TextareaTextareaProps>(({ props }) => {
    const ctx = useTextareaContext();
    let el: HTMLTextAreaElement | null = null;

    return () => (
        <textarea
            id={ctx.controlId()}
            name={ctx.name()}
            autoComplete={ctx.autocomplete()}
            maxLength={ctx.maxlength()}
            rows={ctx.rows()}
            data-scope={SCOPE}
            data-part="textarea"
            data-disabled={dataAttr(ctx.disabled())}
            data-invalid={dataAttr(ctx.invalid())}
            data-required={dataAttr(ctx.required())}
            data-readonly={dataAttr(ctx.readonly())}
            data-focus-visible={dataAttr(ctx.focusVisible.value)}
            value={ctx.state.value}
            placeholder={props.placeholder}
            disabled={ctx.disabled()}
            readOnly={ctx.readonly()}
            required={ctx.required()}
            aria-invalid={ctx.invalid() ? 'true' : undefined}
            aria-describedby={ctx.describedBy()}
            class={props.class}
            ref={(node: HTMLTextAreaElement | null) => { el = node; }}
            onInput={(e: Event) => {
                ctx.state.value = (e.target as HTMLTextAreaElement).value;
            }}
            onFocus={() => { ctx.focusVisible.value = isFocusVisible(el); }}
            onBlur={() => { ctx.focusVisible.value = false; }}
        />
    );
}, { name: 'Textarea.Textarea' });

export const Textarea = compound(TextareaRoot, {
    Root: TextareaRoot,
    Label: TextareaLabel,
    Textarea: TextareaTextarea,
});
