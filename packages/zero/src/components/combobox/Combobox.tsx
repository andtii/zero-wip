/**
 * Combobox — an editable text input over a filtered listbox (WAI-ARIA
 * editable combobox pattern).
 *
 * ```tsx
 * <Combobox.Root model={[state, 'fruit']} model:inputValue={[state, 'query']}>
 *     <Combobox.Control>
 *         <Combobox.Input placeholder="Search fruit…" />
 *         <Combobox.Trigger />
 *     </Combobox.Control>
 *     <Combobox.Popup>
 *         {fruits.filter((f) => f.includes(state.query)).map((f) => (
 *             <Combobox.Item value={f} key={f}>{f}</Combobox.Item>
 *         ))}
 *         {noMatches ? <Combobox.Empty>No fruit found</Combobox.Empty> : null}
 *     </Combobox.Popup>
 * </Combobox.Root>
 * ```
 *
 * THE NAMED-MODELS CONVENTION (first use — future multi-state components
 * follow it): every stateful component has exactly one unnamed `model`, its
 * essential value — what `hidden-input` posts. Every additional piece of
 * controllable state is a named model (`model:inputValue`, `model:open`),
 * wired through the same `createControllableState`, each keeping the
 * standard companions (`defaultInputValue` + `inputValueChange`).
 *
 * FILTERING IS THE CONSUMER'S: items are JSX children zero does not own.
 * Bind `model:inputValue` (or listen to `inputValueChange`), render the
 * items that match, and render `<Combobox.Empty>` yourself when nothing
 * does. Zero manages registration, highlight and selection — including
 * pruning the highlight when the highlighted item unmounts mid-typing, so
 * `aria-activedescendant` never dangles.
 *
 * Focus stays in the input; the highlighted option is conveyed via
 * `aria-activedescendant` + `data-highlighted`. ArrowDown/Up open and move,
 * Enter selects (fills the input with the item's text), Escape closes, Tab
 * closes without being swallowed, Home/End stay with the text caret (APG).
 * The popup is `popover="manual"` + the dismiss layer: native `auto` light
 * dismiss would close the list on a caret click in the input.
 */
import { component, compound, defineInjectable, defineProvide, effect, watch } from 'sigx';
import type { Define, Model } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { createListController, type ListController, type ListItem } from '../../behaviors/list.js';
import { createAnchorPosition, type Placement, type PositionStrategy } from '../../behaviors/position.js';
import { createDismissable } from '../../behaviors/dismiss.js';
import { useFieldContext } from '../../behaviors/field.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { createPressFeedback } from '../../behaviors/press.js';
import { dataAttr, stateAttr } from '../../contract/data-attrs.js';
import { renderAsChild } from '../../contract/as-child.js';
import { variantAttrs } from '../../contract/props.js';
import type {
    PartProps,
    WithAsChild,
    WithClass,
    WithDisabled,
    WithVariantAxes,
} from '../../contract/props.js';
import { comboboxAnatomy } from './anatomy.js';

const SCOPE = comboboxAnatomy.scope;

interface ComboboxContext {
    state: ControllableState<string>;
    inputValue: ControllableState<string>;
    open: { value: boolean };
    highlighted: { value: string | null };
    list: ListController;
    ids: { trigger: string; popup: string };
    placeholder(): string | undefined;
    disabled(): boolean;
    invalid(): boolean;
    required(): boolean;
    readonly(): boolean;
    name(): string | undefined;
    describedBy(): string | undefined;
    /** The input's rendered id — the field's control id when wrapped in a Field. */
    inputId(): string;
    inputFocusVisible: { value: boolean };
    selectValue(value: string): void;
    /** Clear the highlight when the highlighted item unmounts (filtering). */
    pruneHighlight(value: string): void;
    optionId(value: string): string;
    setControl(el: HTMLElement | null): void;
    setInput(el: HTMLElement | null): void;
    setTrigger(el: HTMLElement | null): void;
    setPopup(el: HTMLElement | null): void;
    focusInput(): void;
    inputKeydown(e: KeyboardEvent): void;
    onInput(value: string): void;
}

function makeInert(): ComboboxContext {
    let value = '';
    let input = '';
    return {
        state: {
            get value() { return value; },
            set value(v: string) { value = v; },
        },
        inputValue: {
            get value() { return input; },
            set value(v: string) { input = v; },
        },
        open: { value: false },
        highlighted: { value: null },
        list: createListController(),
        ids: { trigger: 'zx-combobox-inert-trigger', popup: 'zx-combobox-inert-popup' },
        placeholder: () => undefined,
        disabled: () => false,
        invalid: () => false,
        required: () => false,
        readonly: () => false,
        name: () => undefined,
        describedBy: () => undefined,
        inputId: () => 'zx-combobox-inert-input',
        inputFocusVisible: { value: false },
        selectValue: () => {},
        pruneHighlight: () => {},
        optionId: (v) => `zx-combobox-inert-option-${v}`,
        setControl: () => {},
        setInput: () => {},
        setTrigger: () => {},
        setPopup: () => {},
        focusInput: () => {},
        inputKeydown: () => {},
        onInput: () => {},
    };
}

export const useComboboxContext = defineInjectable<ComboboxContext>(() => makeInert());

// ── Root ──

export type ComboboxRootProps =
    & Define.Model<string>
    & Define.Prop<'defaultValue', string, false>
    & Define.Event<'valueChange', string>
    & Define.Model<'inputValue', string>
    & Define.Prop<'defaultInputValue', string, false>
    & Define.Event<'inputValueChange', string>
    & Define.Model<'open', boolean>
    & Define.Prop<'defaultOpen', boolean, false>
    & Define.Event<'openChange', boolean>
    & Define.Prop<'placeholder', string, false>
    & Define.Prop<'name', string, false>
    & Define.Prop<'required', boolean, false>
    & Define.Prop<'invalid', boolean, false>
    & Define.Prop<'readonly', boolean, false>
    & Define.Prop<'placement', Placement, false>
    & Define.Prop<'positionStrategy', PositionStrategy, false>
    & WithDisabled
    & WithVariantAxes<'combobox'>
    & WithClass
    & Define.Slot<'default'>;

const ComboboxRoot = component<ComboboxRootProps>(({ props, slots, emit, signal }) => {
    const state = createControllableState<string>(
        () => props.model,
        props.defaultValue ?? '',
        (v) => emit('valueChange', v),
    );
    const inputValue = createControllableState<string>(
        () => props.inputValue,
        props.defaultInputValue ?? '',
        (v) => emit('inputValueChange', v),
    );
    const openState = createControllableState<boolean>(
        // The named-model conditional type distributes `boolean` into
        // Model<true> | Model<false>; collapse it back.
        () => props.open as Model<boolean> | undefined,
        props.defaultOpen ?? false,
        (v) => emit('openChange', v),
    );
    const field = useFieldContext();
    const list = createListController();
    const baseId = createId('zx-combobox');
    const highlighted = signal({ value: null as string | null });
    const inputFocusVisible = signal({ value: false });
    let control: HTMLElement | null = null;
    let input: HTMLElement | null = null;
    let trigger: HTMLElement | null = null;
    let popup: HTMLElement | null = null;

    const setOpen = (v: boolean): void => {
        if (openState.value === v) return;
        openState.value = v;
        if (!v) highlighted.value = null;
    };

    const moveHighlight = (delta: 1 | -1 | 'first' | 'last'): void => {
        const items = list.enabledItems();
        if (items.length === 0) return;
        if (delta === 'first') { highlighted.value = items[0]!.value; return; }
        if (delta === 'last') { highlighted.value = items[items.length - 1]!.value; return; }
        const current = items.findIndex((i) => i.value === highlighted.value);
        const next = Math.min(items.length - 1, Math.max(0, current === -1 ? 0 : current + delta));
        highlighted.value = items[next]!.value;
    };

    const ctx: ComboboxContext = {
        state,
        inputValue,
        open: {
            get value() { return openState.value; },
            set value(v: boolean) { setOpen(v); },
        },
        highlighted,
        list,
        ids: { trigger: `${baseId}-trigger`, popup: `${baseId}-popup` },
        placeholder: () => props.placeholder,
        disabled: () => !!props.disabled || field.disabled(),
        invalid: () => !!props.invalid || field.invalid(),
        required: () => !!props.required || field.required(),
        readonly: () => !!props.readonly,
        name: () => props.name,
        describedBy: () => field.describedBy(),
        inputId: () => (field.inert ? `${baseId}-input` : field.ids.control),
        inputFocusVisible,
        selectValue(value) {
            state.value = value;
            inputValue.value = list.find(value)?.textValue() ?? value;
            setOpen(false);
        },
        pruneHighlight(value) {
            if (highlighted.value === value) highlighted.value = null;
        },
        optionId: (value) => `${baseId}-option-${value}`,
        setControl: (el) => { control = el; },
        setInput: (el) => { input = el; },
        setTrigger: (el) => { trigger = el; },
        setPopup: (el) => { popup = el; },
        focusInput: () => { input?.focus(); },
        inputKeydown(e) {
            if (ctx.disabled() || ctx.readonly()) return;
            const key = e.key;
            if (key === 'ArrowDown' || key === 'ArrowUp') {
                e.preventDefault();
                if (!openState.value) {
                    setOpen(true);
                    moveHighlight(key === 'ArrowDown' ? 'first' : 'last');
                    return;
                }
                moveHighlight(key === 'ArrowDown' ? 1 : -1);
                return;
            }
            if (key === 'Enter') {
                if (openState.value && highlighted.value != null) {
                    // Only swallow Enter while it means "pick the highlight" —
                    // otherwise the form submit proceeds.
                    e.preventDefault();
                    ctx.selectValue(highlighted.value);
                }
                return;
            }
            if (key === 'Escape') {
                if (openState.value) {
                    e.preventDefault();
                    setOpen(false);
                }
                return;
            }
            if (key === 'Tab') {
                setOpen(false);
                return;
            }
            // Home/End & the rest stay with the text caret (APG editable
            // combobox) — no typeahead: typing IS the filter.
        },
        onInput(value) {
            inputValue.value = value;
            if (!openState.value && !ctx.disabled() && !ctx.readonly()) setOpen(true);
        },
    };
    defineProvide(useComboboxContext, () => ctx);

    createAnchorPosition({
        getAnchor: () => control ?? input,
        getFloating: () => popup,
        isOpen: () => openState.value,
        placement: () => props.placement ?? 'bottom-start',
        offset: () => 4,
        strategy: props.positionStrategy,
    });

    // popover="manual" opts out of native light dismiss (a caret click in
    // the input must not close the list), so dismissal is the layer stack's:
    // outside-press only; Escape stays with inputKeydown, its one owner.
    createDismissable({
        getElement: () => popup,
        isOpen: () => openState.value,
        dismiss: () => setOpen(false),
        escape: false,
        getExtraTargets: () => [control, input, trigger],
    });

    // An external value write (form reset, server data) reflects into the
    // input text once the matching item is known.
    watch(
        () => state.value,
        (value, prev) => {
            if (value === prev) return;
            const text = value ? list.find(value)?.textValue() ?? value : '';
            if (inputValue.value !== text) inputValue.value = text;
        },
    );

    return () => (
        <div
            data-scope={SCOPE}
            data-part="root"
            data-disabled={dataAttr(ctx.disabled())}
            data-invalid={dataAttr(ctx.invalid())}
            data-required={dataAttr(ctx.required())}
            {...variantAttrs(props)}
            class={props.class}
        >
            {slots.default?.()}
            <input
                type="hidden"
                data-scope={SCOPE}
                data-part="hidden-input"
                name={props.name}
                value={state.value}
            />
        </div>
    );
}, { name: 'Combobox.Root' });

// ── Control ──

export type ComboboxControlProps = WithClass & Define.Slot<'default'>;

const ComboboxControl = component<ComboboxControlProps>(({ props, slots }) => {
    const combobox = useComboboxContext();
    return () => (
        <div
            data-scope={SCOPE}
            data-part="control"
            data-state={stateAttr(combobox.open.value, 'open', 'closed')}
            data-disabled={dataAttr(combobox.disabled())}
            data-invalid={dataAttr(combobox.invalid())}
            data-focus-visible={dataAttr(combobox.inputFocusVisible.value)}
            class={props.class}
            ref={(node: HTMLElement | null) => { combobox.setControl(node); }}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'Combobox.Control' });

// ── Input ──

export type ComboboxInputProps =
    & Define.Prop<'placeholder', string, false>
    & WithClass;

const ComboboxInput = component<ComboboxInputProps>(({ props }) => {
    const combobox = useComboboxContext();
    let el: HTMLElement | null = null;

    return () => (
        <input
            id={combobox.inputId()}
            type="text"
            data-scope={SCOPE}
            data-part="input"
            data-state={stateAttr(combobox.open.value, 'open', 'closed')}
            data-disabled={dataAttr(combobox.disabled())}
            data-invalid={dataAttr(combobox.invalid())}
            data-required={dataAttr(combobox.required())}
            data-readonly={dataAttr(combobox.readonly())}
            data-focus-visible={dataAttr(combobox.inputFocusVisible.value)}
            role="combobox"
            aria-expanded={combobox.open.value ? 'true' : 'false'}
            aria-controls={combobox.ids.popup}
            aria-autocomplete="list"
            aria-activedescendant={combobox.open.value && combobox.highlighted.value != null
                ? combobox.optionId(combobox.highlighted.value)
                : undefined}
            aria-invalid={combobox.invalid() ? 'true' : undefined}
            aria-describedby={combobox.describedBy()}
            placeholder={props.placeholder ?? combobox.placeholder()}
            value={combobox.inputValue.value}
            disabled={combobox.disabled()}
            readOnly={combobox.readonly()}
            required={combobox.required()}
            class={props.class}
            ref={(node: HTMLElement | null) => { el = node; combobox.setInput(node); }}
            onInput={(e: Event) => { combobox.onInput((e.target as HTMLInputElement).value); }}
            onKeydown={(e: KeyboardEvent) => { combobox.inputKeydown(e); }}
            onFocus={() => { combobox.inputFocusVisible.value = isFocusVisible(el); }}
            onBlur={() => { combobox.inputFocusVisible.value = false; }}
        />
    );
}, { name: 'Combobox.Input' });

// ── Trigger ──

export type ComboboxTriggerProps =
    /** Accessible name for the disclosure button (default "Show options"). */
    & Define.Prop<'label', string, false>
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

const ComboboxTrigger = component<ComboboxTriggerProps>(({ props, slots, signal }) => {
    const combobox = useComboboxContext();
    let el: HTMLElement | null = null;
    const focus = signal({ visible: false });
    const press = createPressFeedback({
        getElement: () => el,
        isDisabled: () => combobox.disabled(),
    });

    const bag = (): PartProps => ({
        id: combobox.ids.trigger,
        'data-scope': SCOPE,
        'data-part': 'trigger',
        'data-state': stateAttr(combobox.open.value, 'open', 'closed'),
        'data-disabled': dataAttr(combobox.disabled()),
        'data-focus-visible': dataAttr(focus.visible),
        // Focus lives in the input; the button is a pointer affordance.
        tabIndex: -1,
        'aria-label': props.label ?? 'Show options',
        'aria-expanded': combobox.open.value ? 'true' : 'false',
        'aria-controls': combobox.ids.popup,
        onClick: () => {
            if (combobox.disabled() || combobox.readonly()) return;
            combobox.open.value = !combobox.open.value;
            combobox.focusInput();
        },
        onKeydown: press.onKeydown,
        onKeyup: press.onKeyup,
        onFocus: () => { focus.visible = isFocusVisible(el); },
        onBlur: (e: FocusEvent) => {
            press.onBlur(e);
            focus.visible = false;
        },
        onPointerdown: press.onPointerdown,
        onPointerup: press.onPointerup,
        onPointercancel: press.onPointercancel,
        onPointerleave: press.onPointerleave,
        ref: (node: HTMLElement | null) => { el = node; combobox.setTrigger(node); },
    });

    return () => {
        const b = bag();
        if (props.asChild) return renderAsChild(slots.default, b);
        return (
            <button type="button" class={props.class} {...b} disabled={combobox.disabled()}>
                {slots.default?.(b) ?? '▾'}
            </button>
        );
    };
}, { name: 'Combobox.Trigger' });

// ── Popup ──

export type ComboboxPopupProps = WithClass & Define.Slot<'default'>;

const ComboboxPopup = component<ComboboxPopupProps>(({ props, slots, onMounted }) => {
    const combobox = useComboboxContext();
    let el: HTMLElement | null = null;

    onMounted(() => {
        effect(() => {
            const open = combobox.open.value;
            const node = el as (HTMLElement & { showPopover?(): void; hidePopover?(): void; matches(s: string): boolean }) | null;
            if (!node || typeof node.showPopover !== 'function') return;
            const showing = node.matches(':popover-open');
            if (open && !showing) node.showPopover();
            else if (!open && showing) node.hidePopover!();
        });
    });

    return () => (
        <div
            id={combobox.ids.popup}
            data-scope={SCOPE}
            data-part="popup"
            data-state={stateAttr(combobox.open.value, 'open', 'closed')}
            popover="manual"
            role="listbox"
            aria-labelledby={combobox.inputId()}
            class={props.class}
            ref={(node: HTMLElement | null) => { el = node; combobox.setPopup(node); }}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'Combobox.Popup' });

// ── Item ──

export type ComboboxItemProps =
    & Define.Prop<'value', string, true>
    & Define.Prop<'textValue', string, false>
    & WithDisabled
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

// The option's label text minus the decorative indicator.
function optionText(el: HTMLElement | null): string | undefined {
    if (!el) return undefined;
    let text = '';
    for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? '';
        else if (node instanceof HTMLElement && node.getAttribute('data-part') !== 'item-indicator') {
            text += node.textContent ?? '';
        }
    }
    const trimmed = text.trim();
    return trimmed === '' ? undefined : trimmed;
}

const ComboboxItem = component<ComboboxItemProps>(({ props, slots, onMounted, onUnmounted }) => {
    const combobox = useComboboxContext();
    let el: HTMLElement | null = null;
    // Pointer-only press: keyboard selection lives on the input
    // (aria-activedescendant — focus never reaches the option).
    const press = createPressFeedback({
        getElement: () => el,
        isDisabled: () => !!props.disabled,
    });

    const item: ListItem = {
        id: `option-${props.value}`,
        get value() { return props.value; },
        disabled: () => !!props.disabled,
        el: () => el,
        textValue: () => props.textValue ?? optionText(el) ?? props.value,
    };
    const unregister = combobox.list.register(item);
    onMounted(() => {
        // A value set before this item existed (defaultValue, async data)
        // could not reflect its label into the input. Deferred: a write
        // during the mount pass is invisible to the already-rendered input.
        queueMicrotask(() => {
            if (combobox.state.value !== props.value) return;
            const current = combobox.inputValue.value;
            // Never clobber a user-typed query — only fill emptiness or the
            // raw-value fallback.
            if (current === '' || current === props.value) {
                combobox.inputValue.value = item.textValue();
            }
        });
    });
    onUnmounted(() => {
        unregister();
        // Typing filters items away — a dangling highlight would keep
        // aria-activedescendant pointing at a removed id.
        combobox.pruneHighlight(props.value);
    });

    const isSelected = (): boolean => combobox.state.value === props.value;
    const isHighlighted = (): boolean => combobox.highlighted.value === props.value;

    const bag = (): PartProps => ({
        id: combobox.optionId(props.value),
        'data-scope': SCOPE,
        'data-part': 'item',
        'data-selected': dataAttr(isSelected()),
        'data-highlighted': dataAttr(isHighlighted()),
        'data-disabled': dataAttr(props.disabled),
        role: 'option',
        'aria-selected': isSelected() ? 'true' : 'false',
        'aria-disabled': props.disabled ? 'true' : undefined,
        onClick: () => {
            if (!props.disabled) {
                combobox.selectValue(props.value);
                combobox.focusInput();
            }
        },
        onPointerenter: () => {
            if (!props.disabled) combobox.highlighted.value = props.value;
        },
        onPointerdown: press.onPointerdown,
        onPointerup: press.onPointerup,
        onPointercancel: press.onPointercancel,
        onPointerleave: press.onPointerleave,
        ref: (node: HTMLElement | null) => { el = node; },
    });

    return () => {
        const b = bag();
        if (props.asChild) return renderAsChild(slots.default, b);
        return (
            <div class={props.class} {...b}>
                {slots.default?.(b)}
                {isSelected()
                    ? (
                        <span data-scope={SCOPE} data-part="item-indicator" data-selected="" aria-hidden="true">
                            ✓
                        </span>
                    )
                    : null}
            </div>
        );
    };
}, { name: 'Combobox.Item' });

// ── Empty ──

export type ComboboxEmptyProps = WithClass & Define.Slot<'default'>;

const ComboboxEmpty = component<ComboboxEmptyProps>(({ props, slots }) => {
    return () => (
        <div data-scope={SCOPE} data-part="empty" role="presentation" class={props.class}>
            {slots.default?.()}
        </div>
    );
}, { name: 'Combobox.Empty' });

export const Combobox = compound(ComboboxRoot, {
    Root: ComboboxRoot,
    Control: ComboboxControl,
    Input: ComboboxInput,
    Trigger: ComboboxTrigger,
    Popup: ComboboxPopup,
    Item: ComboboxItem,
    Empty: ComboboxEmpty,
});
