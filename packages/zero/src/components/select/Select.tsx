/**
 * Select — a single-value listbox (WAI-ARIA select-only combobox pattern).
 *
 * ```tsx
 * <Select.Root model={fruit} placeholder="Pick a fruit…">
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
import { component, compound, defineInjectable, defineProvide, effect } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { createListController, type ListController, type ListItem } from '../../behaviors/list.js';
import { createTypeahead } from '../../behaviors/typeahead.js';
import { createAnchorPosition, type Placement, type PositionStrategy } from '../../behaviors/position.js';
import { useFieldContext } from '../../behaviors/field.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { dataAttr, stateAttr } from '../../contract/data-attrs.js';
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
} from '../../contract/props.js';
import { selectAnatomy } from './anatomy.js';

const SCOPE = selectAnatomy.scope;

interface SelectContext {
    state: ControllableState<string>;
    open: { value: boolean };
    highlighted: { value: string | null };
    list: ListController;
    ids: { trigger: string; popup: string };
    placeholder(): string | undefined;
    disabled(): boolean;
    invalid(): boolean;
    required(): boolean;
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
        ids: { trigger: 'zx-select-inert-trigger', popup: 'zx-select-inert-popup' },
        placeholder: () => undefined,
        disabled: () => false,
        invalid: () => false,
        required: () => false,
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
    & WithColor
    & WithSize
    & WithVariant
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

    const moveHighlight = (delta: 1 | -1 | 'first' | 'last') => {
        const items = list.enabledItems();
        if (items.length === 0) return;
        if (delta === 'first') { highlighted.value = items[0]!.value; return; }
        if (delta === 'last') { highlighted.value = items[items.length - 1]!.value; return; }
        const current = items.findIndex((i) => i.value === highlighted.value);
        const next = Math.min(items.length - 1, Math.max(0, current === -1 ? 0 : current + delta));
        highlighted.value = items[next]!.value;
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
        ids: { trigger: `${baseId}-trigger`, popup: `${baseId}-popup` },
        placeholder: () => props.placeholder,
        disabled: () => !!props.disabled || field.disabled(),
        invalid: () => !!props.invalid || field.invalid(),
        required: () => !!props.required || field.required(),
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
            if (key === 'ArrowDown') { e.preventDefault(); moveHighlight(1); return; }
            if (key === 'ArrowUp') { e.preventDefault(); moveHighlight(-1); return; }
            if (key === 'Home') { e.preventDefault(); moveHighlight('first'); return; }
            if (key === 'End') { e.preventDefault(); moveHighlight('last'); return; }
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
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

const SelectTrigger = component<SelectTriggerProps>(({ props, slots, signal }) => {
    const select = useSelectContext();
    let el: HTMLElement | null = null;
    const focus = signal({ visible: false });

    const bag = (): PartProps => ({
        id: select.ids.trigger,
        'data-scope': SCOPE,
        'data-part': 'trigger',
        'data-state': stateAttr(select.open.value, 'open', 'closed'),
        'data-disabled': dataAttr(select.disabled()),
        'data-invalid': dataAttr(select.invalid()),
        'data-placeholder': dataAttr(!select.state.value),
        'data-focus-visible': dataAttr(focus.visible),
        role: 'combobox',
        'aria-haspopup': 'listbox',
        'aria-expanded': select.open.value ? 'true' : 'false',
        'aria-controls': select.ids.popup,
        'aria-activedescendant': select.open.value && select.highlighted.value != null
            ? select.optionId(select.highlighted.value)
            : undefined,
        onClick: () => {
            if (!select.disabled()) select.open.value = !select.open.value;
        },
        onKeydown: (e: KeyboardEvent) => select.triggerKeydown(e),
        onFocus: () => { focus.visible = isFocusVisible(el); },
        onBlur: () => { focus.visible = false; },
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
            aria-labelledby={select.ids.trigger}
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

// The option's label text — child text minus decorative parts (the
// selected-indicator would otherwise leak into Value/typeahead).
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

const SelectItem = component<SelectItemProps>(({ props, slots, onUnmounted }) => {
    const select = useSelectContext();
    let el: HTMLElement | null = null;

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
