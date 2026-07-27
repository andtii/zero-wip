/**
 * RatingGroup — radio semantics over a row of symbols (stars, hearts, …),
 * with hover preview and optional half values.
 *
 * ```tsx
 * <RatingGroup.Root model={() => state.stars} allowHalf>
 *     <RatingGroup.Label>Rating</RatingGroup.Label>
 *     <RatingGroup.Control>
 *         {[1, 2, 3, 4, 5].map((i) => <RatingGroup.Item index={i} key={i} />)}
 *     </RatingGroup.Control>
 * </RatingGroup.Root>
 * ```
 *
 * The model is a plain number (0 = no rating). Items are explicit children
 * (zero owns no iteration — the Combobox philosophy); each renders
 * `data-state="full|half|empty"` from the DISPLAYED value — the hover
 * preview while the pointer is over the control, the committed value
 * otherwise — so recipes style fills without distinguishing preview from
 * commit. Symbols are the consumer's: the default slot receives
 * `{ state, highlighted }` for SVG swapping.
 *
 * Keyboard moves the VALUE, not focus-among-elements — with `allowHalf`
 * two values share one element, so element roving cannot express the step.
 * One tab stop (the item for ceil(value), or item 1); arrows step by 0.5
 * or 1, Home is the smallest non-zero value, End is `count` (APG rating).
 */
import { component, compound, defineInjectable, defineProvide } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { useFieldContext } from '../../behaviors/field.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { dataAttr } from '../../contract/data-attrs.js';
import { variantAttrs } from '../../contract/props.js';
import type {
    WithClass,
    WithColor,
    WithDisabled,
    WithSize,
    WithVariant,
    WithAxes,
} from '../../contract/props.js';
import { ratingGroupAnatomy } from './anatomy.js';

const SCOPE = ratingGroupAnatomy.scope;

export interface RatingItemSlotProps {
    state: 'full' | 'half' | 'empty';
    highlighted: boolean;
}

interface RatingGroupContext {
    state: ControllableState<number>;
    hover: { current: number | null };
    focus: { visible: boolean };
    count(): number;
    step(): number;
    displayed(): number;
    disabled(): boolean;
    invalid(): boolean;
    required(): boolean;
    readonly(): boolean;
    labelId(): string | undefined;
    controlId(): string;
    describedBy(): string | undefined;
    isRtl(): boolean;
    setControl(el: HTMLElement | null): void;
    registerItem(index: number, el: HTMLElement | null): void;
    commit(value: number): void;
    keydown(e: KeyboardEvent): void;
}

function makeInert(): RatingGroupContext {
    let value = 0;
    return {
        state: {
            get value() { return value; },
            set value(v: number) { value = v; },
        },
        hover: { current: null },
        focus: { visible: false },
        count: () => 5,
        step: () => 1,
        displayed: () => 0,
        disabled: () => false,
        invalid: () => false,
        required: () => false,
        readonly: () => false,
        labelId: () => undefined,
        controlId: () => 'zx-rating-inert',
        describedBy: () => undefined,
        isRtl: () => false,
        setControl: () => {},
        registerItem: () => {},
        commit: () => {},
        keydown: () => {},
    };
}

export const useRatingGroupContext = defineInjectable<RatingGroupContext>(() => makeInert());

// ── Root ──

export type RatingGroupRootProps =
    & Define.Model<number>
    & Define.Prop<'defaultValue', number, false>
    & Define.Event<'valueChange', number>
    /** How many items the consumer renders (default 5) — End jumps here. */
    & Define.Prop<'count', number, false>
    /** Half-value granularity: pointer halves and 0.5 keyboard steps. */
    & Define.Prop<'allowHalf', boolean, false>
    /** Clicking the current value clears to 0 (default false). */
    & Define.Prop<'deselectable', boolean, false>
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

const RatingGroupRoot = component<RatingGroupRootProps>(({ props, slots, emit, signal }) => {
    const state = createControllableState<number>(
        () => props.model,
        props.defaultValue ?? 0,
        (v) => emit('valueChange', v),
    );
    const field = useFieldContext();
    const baseId = createId('zx-rating');
    const hover = signal({ current: null as number | null });
    const focus = signal({ visible: false });
    let controlEl: HTMLElement | null = null;
    const items = new Map<number, HTMLElement>();

    const disabled = (): boolean => !!props.disabled || field.disabled();
    const readonly = (): boolean => !!props.readonly;
    const count = (): number => props.count ?? 5;
    const step = (): number => (props.allowHalf ? 0.5 : 1);

    const isRtl = (): boolean => {
        const el = controlEl;
        if (!el) return false;
        try {
            if (el.matches(':dir(rtl)')) return true;
        } catch {
            // :dir() unsupported — fall through to computed style.
        }
        return typeof getComputedStyle === 'function' && getComputedStyle(el).direction === 'rtl';
    };

    const clampValue = (v: number): number => Math.min(Math.max(v, 0), count());

    const focusTabbable = (): void => {
        const index = Math.max(1, Math.ceil(state.value));
        items.get(index)?.focus();
    };

    const commit = (value: number): void => {
        if (disabled() || readonly()) return;
        const next = clampValue(value);
        state.value = props.deselectable && next === state.value ? 0 : next;
        // The tab stop follows the value; a click may have focused an item
        // that just went tabIndex=-1 (deselect clears to item 1) — park
        // focus on the stop so Tab order stays coherent.
        focusTabbable();
    };

    const ctx: RatingGroupContext = {
        state,
        hover,
        focus,
        count,
        step,
        displayed: () => hover.current ?? state.value,
        disabled,
        invalid: () => !!props.invalid || field.invalid(),
        required: () => !!props.required || field.required(),
        readonly,
        labelId: () => (field.inert ? `${baseId}-label` : field.ids.label),
        controlId: () => (field.inert ? `${baseId}-control` : field.ids.control),
        describedBy: () => (field.inert ? undefined : field.describedBy()),
        isRtl,
        setControl: (el) => { controlEl = el; },
        registerItem: (index, el) => {
            if (el) items.set(index, el);
            else items.delete(index);
        },
        commit,
        keydown(e) {
            if (disabled() || readonly()) return;
            // A lingering hover preview would mask the keyboard commit —
            // displayed() prefers the preview.
            hover.current = null;
            const rtl = isRtl();
            let next: number | null = null;
            switch (e.key) {
                case 'ArrowRight':
                    next = state.value + (rtl ? -step() : step());
                    break;
                case 'ArrowLeft':
                    next = state.value + (rtl ? step() : -step());
                    break;
                case 'ArrowUp':
                    next = state.value + step();
                    break;
                case 'ArrowDown':
                    next = state.value - step();
                    break;
                case 'Home':
                    next = step();
                    break;
                case 'End':
                    next = count();
                    break;
                default:
                    return;
            }
            e.preventDefault();
            state.value = clampValue(next);
            // The tab stop follows the value; keep focus on it.
            focusTabbable();
        },
    };
    defineProvide(useRatingGroupContext, () => ctx);

    return () => (
        <div
            data-scope={SCOPE}
            data-part="root"
            data-disabled={dataAttr(disabled())}
            data-invalid={dataAttr(ctx.invalid())}
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
                        value={state.value === 0 ? '' : String(state.value)}
                        disabled={disabled()}
                    />
                )
                : null}
        </div>
    );
}, { name: 'RatingGroup.Root' });

// ── Label ──

export type RatingGroupLabelProps = WithClass & Define.Slot<'default'>;

const RatingGroupLabel = component<RatingGroupLabelProps>(({ props, slots }) => {
    const ctx = useRatingGroupContext();
    return () => (
        <div
            id={ctx.labelId()}
            data-scope={SCOPE}
            data-part="label"
            data-disabled={dataAttr(ctx.disabled())}
            data-invalid={dataAttr(ctx.invalid())}
            data-required={dataAttr(ctx.required())}
            class={props.class}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'RatingGroup.Label' });

// ── Control ──

export type RatingGroupControlProps = WithClass & Define.Slot<'default'>;

const RatingGroupControl = component<RatingGroupControlProps>(({ props, slots }) => {
    const ctx = useRatingGroupContext();
    return () => (
        <div
            id={ctx.controlId()}
            role="radiogroup"
            data-scope={SCOPE}
            data-part="control"
            data-disabled={dataAttr(ctx.disabled())}
            data-readonly={dataAttr(ctx.readonly())}
            data-focus-visible={dataAttr(ctx.focus.visible)}
            aria-labelledby={ctx.labelId()}
            aria-describedby={ctx.describedBy()}
            class={props.class}
            ref={(node: HTMLElement | null) => ctx.setControl(node)}
            onPointerleave={() => { ctx.hover.current = null; }}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'RatingGroup.Control' });

// ── Item ──

export type RatingGroupItemProps =
    & Define.Prop<'index', number, true>
    & WithClass
    & Define.Slot<'default', RatingItemSlotProps>;

const RatingGroupItem = component<RatingGroupItemProps>(({ props, slots, onUnmounted, signal }) => {
    const ctx = useRatingGroupContext();
    let el: HTMLElement | null = null;
    const focus = signal({ visible: false });
    onUnmounted(() => ctx.registerItem(props.index, null));

    const itemState = (): 'full' | 'half' | 'empty' => {
        const displayed = ctx.displayed();
        if (displayed >= props.index) return 'full';
        if (displayed >= props.index - 0.5) return 'half';
        return 'empty';
    };

    const isHighlighted = (): boolean =>
        ctx.hover.current !== null && props.index <= Math.ceil(ctx.hover.current);

    const isTabbable = (): boolean => {
        if (ctx.disabled()) return false;
        return props.index === Math.max(1, Math.ceil(ctx.state.value));
    };

    /** index or index − 0.5 from the pointer x, RTL-flipped. */
    const valueAt = (e: PointerEvent | MouseEvent): number => {
        if (!ctx.step() || ctx.step() === 1 || !el) return props.index;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return props.index;
        const inStart = (e.clientX - rect.left) / rect.width < 0.5;
        const startIsLow = !ctx.isRtl();
        return (inStart === startIsLow) ? props.index - 0.5 : props.index;
    };

    return () => {
        const state = itemState();
        const slotProps: RatingItemSlotProps = { state, highlighted: isHighlighted() };
        return (
            <span
                role="radio"
                data-scope={SCOPE}
                data-part="item"
                data-state={state}
                data-highlighted={dataAttr(isHighlighted())}
                data-disabled={dataAttr(ctx.disabled())}
                data-readonly={dataAttr(ctx.readonly())}
                data-focus-visible={dataAttr(focus.visible)}
                tabIndex={isTabbable() ? 0 : -1}
                aria-checked={ctx.state.value > 0 && Math.ceil(ctx.state.value) === props.index ? 'true' : 'false'}
                aria-label={`${props.index} of ${ctx.count()}`}
                aria-disabled={ctx.disabled() ? 'true' : undefined}
                class={props.class}
                ref={(node: HTMLElement | null) => {
                    el = node;
                    ctx.registerItem(props.index, node);
                }}
                onPointermove={(e: PointerEvent) => {
                    if (ctx.disabled() || ctx.readonly()) return;
                    ctx.hover.current = valueAt(e);
                }}
                onClick={(e: MouseEvent) => {
                    if (ctx.disabled() || ctx.readonly()) return;
                    // Touch has no hover: the tap's own x decides the half.
                    ctx.commit(valueAt(e));
                    ctx.hover.current = null;
                }}
                onKeydown={(e: KeyboardEvent) => ctx.keydown(e)}
                onFocus={() => { focus.visible = isFocusVisible(el); ctx.focus.visible = focus.visible; }}
                onBlur={() => { focus.visible = false; ctx.focus.visible = false; }}
            >
                {slots.default
                    ? slots.default(slotProps)
                    : (state === 'full' ? '★' : state === 'half' ? '⯪' : '☆')}
            </span>
        );
    };
}, { name: 'RatingGroup.Item' });

export const RatingGroup = compound(RatingGroupRoot, {
    Root: RatingGroupRoot,
    Label: RatingGroupLabel,
    Control: RatingGroupControl,
    Item: RatingGroupItem,
});
