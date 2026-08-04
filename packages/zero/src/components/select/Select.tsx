/**
 * Select — a single-value listbox (WAI-ARIA select-only combobox pattern).
 *
 * ```tsx
 * <Select.Root model={() => state.fruit} placeholder="Pick a fruit…">
 *     <Select.Trigger>
 *         <Select.Value />
 *         <Select.Indicator>▾</Select.Indicator>
 *     </Select.Trigger>
 *     <Select.Popup>
 *         <Select.Item value="apple">Apple</Select.Item>
 *         <Select.Item value="banana">Banana</Select.Item>
 *     </Select.Popup>
 * </Select.Root>
 * ```
 *
 * Focus stays on the trigger; the highlighted option is conveyed via
 * `aria-activedescendant` and `data-highlighted`. Keyboard: ArrowDown/Up
 * open and move the highlight, Home/End jump, typeahead works closed
 * (selects directly) and open (moves the highlight), Enter/Space select,
 * Escape closes. A hidden input carries the value for form posts.
 */
import { component, compound, defineInjectable, defineProvide, effect, watch } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { createListController, moveHighlight, optionText, type ListController, type ListItem } from '../../behaviors/list.js';
import { createTypeahead } from '../../behaviors/typeahead.js';
import { createAnchorPosition, type Placement, type PositionStrategy } from '../../behaviors/position.js';
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
import { selectAnatomy } from './anatomy.js';

const SCOPE = selectAnatomy.scope;

interface SelectContext {
    state: ControllableState<string>;
    open: { value: boolean };
    highlighted: { value: string | null };
    list: ListController;
    ids: { popup: string };
    /** The trigger's rendered id — the field's control id when wrapped in a Field. */
    triggerId(): string;
    placeholder(): string | undefined;
    disabled(): boolean;
    invalid(): boolean;
    required(): boolean;
    describedBy(): string | undefined;
    selectValue(value: string): void;
    optionId(value: string): string;
    setTrigger(el: HTMLElement | null): void;
    setPopup(el: HTMLElement | null): void;
    triggerKeydown(e: KeyboardEvent): void;
}

function makeInert(): SelectContext {
    let value = '';
    return {
        state: {
            get value() { return value; },
            set value(v: string) { value = v; },
        },
        open: { value: false },
        highlighted: { value: null },
        list: createListController(),
        ids: { popup: 'zx-select-inert-popup' },
        triggerId: () => 'zx-select-inert-trigger',
        placeholder: () => undefined,
        disabled: () => false,
        invalid: () => false,
        required: () => false,
        describedBy: () => undefined,
        selectValue: () => {},
        optionId: (v) => `zx-select-inert-option-${v}`,
        setTrigger: () => {},
        setPopup: () => {},
        triggerKeydown: () => {},
    };
}

export const useSelectContext = defineInjectable<SelectContext>(() => makeInert());

// ── Root ──

export type SelectRootProps =
    & Define.Model<string>
    & Define.Prop<'defaultValue', string, false>
    & Define.Event<'valueChange', string>
    & Define.Event<'openChange', boolean>
    & Define.Prop<'placeholder', string, false>
    & Define.Prop<'name', string, false>
    & Define.Prop<'required', boolean, false>
    & Define.Prop<'invalid', boolean, false>
    & Define.Prop<'placement', Placement, false>
    & Define.Prop<'positionStrategy', PositionStrategy, false>
    & WithDisabled
    & WithVariantAxes<'select'>
    & WithClass
    & Define.Slot<'default'>;

const SelectRoot = component<SelectRootProps>(({ props, slots, emit, signal }) => {
    const state = createControllableState<string>(
        () => props.model,
        props.defaultValue ?? '',
        (v) => emit('valueChange', v),
    );
    const field = useFieldContext();
    const list = createListController();
    const baseId = createId('zx-select');
    const open = signal({ value: false });
    const highlighted = signal({ value: null as string | null });
    let trigger: HTMLElement | null = null;
    let popup: HTMLElement | null = null;

    const setOpen = (v: boolean) => {
        if (open.value === v) return;
        open.value = v;
        emit('openChange', v);
        if (v) {
            highlighted.value = state.value || list.enabledItems()[0]?.value || null;
        } else {
            highlighted.value = null;
        }
    };

    const typeahead = createTypeahead({
        list,
        onMatch(item: ListItem) {
            if (open.value) highlighted.value = item.value;
            else ctx.selectValue(item.value);
        },
    });

    const ctx: SelectContext = {
        state,
        open: {
            get value() { return open.value; },
            set value(v: boolean) { setOpen(v); },
        },
        highlighted,
        list,
        ids: { popup: `${baseId}-popup` },
        // Adopting the field's control id is what lets Field.Label name the
        // trigger through `for` — a button is a labelable element.
        triggerId: () => (field.inert ? `${baseId}-trigger` : field.ids.control),
        placeholder: () => props.placeholder,
        disabled: () => !!props.disabled || field.disabled(),
        invalid: () => !!props.invalid || field.invalid(),
        required: () => !!props.required || field.required(),
        describedBy: () => field.describedBy(),
        selectValue(value) {
            state.value = value;
            setOpen(false);
        },
        optionId: (value) => `${baseId}-option-${value}`,
        setTrigger: (el) => { trigger = el; },
        setPopup: (el) => { popup = el; },
        triggerKeydown(e) {
            if (ctx.disabled()) return;
            const key = e.key;
            if (!open.value) {
                if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
                    e.preventDefault();
                    setOpen(true);
                    return;
                }
                typeahead(e, state.value || null);
                return;
            }
            if (key === 'ArrowDown') { e.preventDefault(); moveHighlight(list, highlighted, 1); return; }
            if (key === 'ArrowUp') { e.preventDefault(); moveHighlight(list, highlighted, -1); return; }
            if (key === 'Home') { e.preventDefault(); moveHighlight(list, highlighted, 'first'); return; }
            if (key === 'End') { e.preventDefault(); moveHighlight(list, highlighted, 'last'); return; }
            if (key === 'Enter' || key === ' ') {
                e.preventDefault();
                if (highlighted.value != null) ctx.selectValue(highlighted.value);
                return;
            }
            if (key === 'Escape') { e.preventDefault(); setOpen(false); return; }
            if (key === 'Tab') { setOpen(false); return; }
            typeahead(e, highlighted.value);
        },
    };
    defineProvide(useSelectContext, () => ctx);

    createAnchorPosition({
        getAnchor: () => trigger,
        getFloating: () => popup,
        isOpen: () => open.value,
        placement: () => props.placement ?? 'bottom-start',
        offset: () => 4,
        strategy: props.positionStrategy,
    });

    // Keyboard highlight can walk below a scrolled listbox's fold —
    // aria-activedescendant moves no real focus, so nothing scrolls natively.
    watch(
        () => highlighted.value,
        (value) => {
            if (value == null) return;
            list.find(value)?.el()?.scrollIntoView?.({ block: 'nearest' });
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
}, { name: 'Select.Root' });

// ── Trigger ──

export type SelectTriggerProps =
    /**
     * Accessible name for a Select outside a Field. `role="combobox"`
     * prohibits name-from-content, so the value/placeholder text inside the
     * trigger can never name it — without a `Field.Label` (which names the
     * trigger through the field's control id) a bare Select is a nameless
     * button to AT (#326). Omit inside a Field: `aria-label` would override
     * the field's visible label.
     */
    & Define.Prop<'label', string, false>
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

const SelectTrigger = component<SelectTriggerProps>(({ props, slots, signal }) => {
    const select = useSelectContext();
    let el: HTMLElement | null = null;
    const focus = signal({ visible: false });
    // Disabled lives in the root's context, not on this part's props.
    const press = createPressFeedback({
        getElement: () => el,
        isDisabled: () => select.disabled(),
    });

    const bag = (): PartProps => ({
        id: select.triggerId(),
        'data-scope': SCOPE,
        'data-part': 'trigger',
        'data-state': stateAttr(select.open.value, 'open', 'closed'),
        'data-disabled': dataAttr(select.disabled()),
        'data-invalid': dataAttr(select.invalid()),
        'data-placeholder': dataAttr(!select.state.value),
        'data-focus-visible': dataAttr(focus.visible),
        role: 'combobox',
        'aria-label': props.label,
        'aria-haspopup': 'listbox',
        'aria-expanded': select.open.value ? 'true' : 'false',
        'aria-controls': select.ids.popup,
        'aria-invalid': select.invalid() ? 'true' : undefined,
        'aria-required': select.required() ? 'true' : undefined,
        'aria-describedby': select.describedBy(),
        'aria-activedescendant': select.open.value && select.highlighted.value != null
            ? select.optionId(select.highlighted.value)
            : undefined,
        onClick: () => {
            if (!select.disabled()) select.open.value = !select.open.value;
        },
        onKeydown: (e: KeyboardEvent) => {
            press.onKeydown(e);
            select.triggerKeydown(e);
        },
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
        ref: (node: HTMLElement | null) => { el = node; select.setTrigger(node); },
    });

    return () => {
        const b = bag();
        if (props.asChild) return renderAsChild(slots.default, b);
        return (
            <button type="button" class={props.class} {...b} disabled={select.disabled()}>
                {slots.default?.(b)}
            </button>
        );
    };
}, { name: 'Select.Trigger' });

// ── Value ──

export type SelectValueProps = WithClass & Define.Slot<'default', { value: string }>;

const SelectValue = component<SelectValueProps>(({ props, slots }) => {
    const select = useSelectContext();
    return () => {
        const value = select.state.value;
        const selected = value ? select.list.find(value) : undefined;
        const isPlaceholder = !value;
        return (
            <span
                data-scope={SCOPE}
                data-part="value"
                data-placeholder={dataAttr(isPlaceholder)}
                class={props.class}
            >
                {slots.default?.({ value })
                    ?? (isPlaceholder ? select.placeholder() ?? '' : selected?.textValue() ?? value)}
            </span>
        );
    };
}, { name: 'Select.Value' });

// ── Indicator ──

export type SelectIndicatorProps = WithClass & Define.Slot<'default'>;

const SelectIndicator = component<SelectIndicatorProps>(({ props, slots }) => {
    const select = useSelectContext();
    return () => (
        <span
            data-scope={SCOPE}
            data-part="indicator"
            data-state={stateAttr(select.open.value, 'open', 'closed')}
            aria-hidden="true"
            class={props.class}
        >
            {slots.default?.() ?? '▾'}
        </span>
    );
}, { name: 'Select.Indicator' });

// ── Popup ──

export type SelectPopupProps = WithClass & Define.Slot<'default'>;

const SelectPopup = component<SelectPopupProps>(({ props, slots, onMounted }) => {
    const select = useSelectContext();
    let el: HTMLElement | null = null;

    onMounted(() => {
        effect(() => {
            const open = select.open.value;
            const node = el as (HTMLElement & { showPopover?(): void; hidePopover?(): void; matches(s: string): boolean }) | null;
            if (!node || typeof node.showPopover !== 'function') return;
            const showing = node.matches(':popover-open');
            if (open && !showing) node.showPopover();
            else if (!open && showing) node.hidePopover!();
        });
    });

    return () => (
        <div
            id={select.ids.popup}
            data-scope={SCOPE}
            data-part="popup"
            data-state={stateAttr(select.open.value, 'open', 'closed')}
            popover="auto"
            role="listbox"
            aria-labelledby={select.triggerId()}
            class={props.class}
            ref={(node: HTMLElement | null) => { el = node; select.setPopup(node); }}
            onToggle={(e: Event) => {
                const open = (e as ToggleEvent).newState === 'open';
                if (select.open.value !== open) select.open.value = open;
            }}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'Select.Popup' });

// ── Item ──

export type SelectItemProps =
    & Define.Prop<'value', string, true>
    & Define.Prop<'textValue', string, false>
    & WithDisabled
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

const SelectItem = component<SelectItemProps>(({ props, slots, onUnmounted }) => {
    const select = useSelectContext();
    let el: HTMLElement | null = null;
    // Pointer-only: keyboard selection happens on the trigger
    // (aria-activedescendant — focus never reaches the option), so keyboard
    // press feedback deliberately lives on the trigger instead.
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
    const unregister = select.list.register(item);
    onUnmounted(() => unregister());

    const isSelected = (): boolean => select.state.value === props.value;
    const isHighlighted = (): boolean => select.highlighted.value === props.value;

    const bag = (): PartProps => ({
        id: select.optionId(props.value),
        'data-scope': SCOPE,
        'data-part': 'item',
        'data-selected': dataAttr(isSelected()),
        'data-highlighted': dataAttr(isHighlighted()),
        'data-disabled': dataAttr(props.disabled),
        role: 'option',
        'aria-selected': isSelected() ? 'true' : 'false',
        'aria-disabled': props.disabled ? 'true' : undefined,
        onClick: () => {
            if (!props.disabled) select.selectValue(props.value);
        },
        onPointerenter: () => {
            if (!props.disabled) select.highlighted.value = props.value;
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
}, { name: 'Select.Item' });

export const Select = compound(SelectRoot, {
    Root: SelectRoot,
    Trigger: SelectTrigger,
    Value: SelectValue,
    Indicator: SelectIndicator,
    Popup: SelectPopup,
    Item: SelectItem,
});
