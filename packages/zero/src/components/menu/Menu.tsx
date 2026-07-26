/**
 * Menu — a WAI-ARIA APG menu button on the `popover` attribute.
 *
 * ```tsx
 * <Menu.Root onSelect={(v) => act(v)}>
 *     <Menu.Trigger>Actions</Menu.Trigger>
 *     <Menu.Popup>
 *         <Menu.Item value="rename">Rename</Menu.Item>
 *         <Menu.Item value="duplicate">Duplicate</Menu.Item>
 *         <Menu.Separator />
 *         <Menu.Item value="delete">Delete…</Menu.Item>
 *     </Menu.Popup>
 * </Menu.Root>
 * ```
 *
 * Keyboard: ArrowDown/Up move focus through enabled items, Home/End jump,
 * typeahead matches item text, Enter/Space activate, Escape closes (native
 * popover) and focus returns to the trigger.
 */
import { component, compound, defineInjectable, defineProvide, effect } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { createListController, type ListItem } from '../../behaviors/list.js';
import { createRovingKeydown } from '../../behaviors/roving.js';
import { createTypeahead } from '../../behaviors/typeahead.js';
import { createAnchorPosition, type Placement, type PositionStrategy } from '../../behaviors/position.js';
import { createFocusRestore } from '../../behaviors/focus.js';
import { isFocusVisible } from '../../behaviors/focus-visible.js';
import { createPressFeedback } from '../../behaviors/press.js';
import { dataAttr, stateAttr } from '../../contract/data-attrs.js';
import { renderAsChild } from '../../contract/as-child.js';
import type { PartProps, WithAsChild, WithClass, WithDisabled } from '../../contract/props.js';
import { menuAnatomy } from './anatomy.js';

const SCOPE = menuAnatomy.scope;

interface MenuContext {
    state: ControllableState<boolean>;
    list: ReturnType<typeof createListController>;
    ids: { popup: string };
    keydown(e: KeyboardEvent, value: string): void;
    select(value: string): void;
    setAnchor(el: HTMLElement | null): void;
    setPopup(el: HTMLElement | null): void;
}

function makeInert(): MenuContext {
    let open = false;
    return {
        state: {
            get value() { return open; },
            set value(v: boolean) { open = v; },
        },
        list: createListController(),
        ids: { popup: 'zx-menu-inert' },
        keydown: () => {},
        select: () => {},
        setAnchor: () => {},
        setPopup: () => {},
    };
}

export const useMenuContext = defineInjectable<MenuContext>(() => makeInert());

// ── Root ──

export type MenuRootProps =
    & Define.Model<boolean>
    & Define.Event<'openChange', boolean>
    & Define.Event<'select', string>
    & Define.Prop<'closeOnSelect', boolean, false>
    & Define.Prop<'placement', Placement, false>
    & Define.Prop<'offset', number, false>
    & Define.Prop<'positionStrategy', PositionStrategy, false>
    & Define.Slot<'default'>;

const MenuRoot = component<MenuRootProps>(({ props, slots, emit }) => {
    const state = createControllableState<boolean>(
        () => props.model,
        false,
        (v) => emit('openChange', v),
    );
    const list = createListController();
    const baseId = createId('zx-menu');
    let anchor: HTMLElement | null = null;
    let popup: HTMLElement | null = null;

    const roving = createRovingKeydown({
        list,
        orientation: () => 'vertical',
        onMove: () => {},
    });
    const typeahead = createTypeahead({
        list,
        onMatch: (item: ListItem) => item.el()?.focus(),
    });

    const ctx: MenuContext = {
        state,
        list,
        ids: { popup: `${baseId}-popup` },
        keydown(e, value) {
            roving(e, value);
            if (!e.defaultPrevented) typeahead(e, value);
        },
        select(value) {
            emit('select', value);
            if (props.closeOnSelect ?? true) state.value = false;
        },
        setAnchor: (el) => { anchor = el; },
        setPopup: (el) => { popup = el; },
    };
    defineProvide(useMenuContext, () => ctx);

    createAnchorPosition({
        getAnchor: () => anchor,
        getFloating: () => popup,
        isOpen: () => state.value,
        placement: () => props.placement ?? 'bottom-start',
        offset: () => props.offset ?? 4,
        strategy: props.positionStrategy,
    });
    createFocusRestore(() => state.value);

    return () => <>{slots.default?.()}</>;
}, { name: 'Menu.Root' });

// ── Trigger ──

export type MenuTriggerProps =
    & WithDisabled
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

const MenuTrigger = component<MenuTriggerProps>(({ props, slots, signal }) => {
    const menu = useMenuContext();
    let el: HTMLElement | null = null;
    const focus = signal({ visible: false });
    const press = createPressFeedback({
        getElement: () => el,
        isDisabled: () => !!props.disabled,
    });

    const bag = (): PartProps => ({
        'data-scope': SCOPE,
        'data-part': 'trigger',
        'data-state': stateAttr(menu.state.value, 'open', 'closed'),
        'data-disabled': dataAttr(props.disabled),
        'data-focus-visible': dataAttr(focus.visible),
        'aria-haspopup': 'menu',
        'aria-expanded': menu.state.value ? 'true' : 'false',
        'aria-controls': menu.ids.popup,
        onClick: () => {
            if (!props.disabled) menu.state.value = !menu.state.value;
        },
        onKeydown: (e: KeyboardEvent) => {
            press.onKeydown(e);
            // ArrowDown on a closed trigger opens the menu (APG).
            if (e.key === 'ArrowDown' && !menu.state.value && !props.disabled) {
                e.preventDefault();
                menu.state.value = true;
            }
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
        ref: (node: HTMLElement | null) => { el = node; menu.setAnchor(node); },
    });

    return () => {
        const b = bag();
        if (props.asChild) return renderAsChild(slots.default, b);
        return (
            <button type="button" class={props.class} {...b} disabled={props.disabled}>
                {slots.default?.(b)}
            </button>
        );
    };
}, { name: 'Menu.Trigger' });

// ── Popup ──

export type MenuPopupProps = WithClass & Define.Slot<'default'>;

const MenuPopup = component<MenuPopupProps>(({ props, slots, onMounted }) => {
    const menu = useMenuContext();
    let el: HTMLElement | null = null;

    onMounted(() => {
        effect(() => {
            const open = menu.state.value;
            const node = el as (HTMLElement & { showPopover?(): void; hidePopover?(): void; matches(s: string): boolean }) | null;
            if (!node || typeof node.showPopover !== 'function') return;
            const showing = node.matches(':popover-open');
            if (open && !showing) {
                node.showPopover();
                // Focus lands on the first enabled item (APG menu button).
                menu.list.enabledItems()[0]?.el()?.focus();
            } else if (!open && showing) {
                node.hidePopover!();
            }
        });
    });

    return () => (
        <div
            id={menu.ids.popup}
            data-scope={SCOPE}
            data-part="popup"
            data-state={stateAttr(menu.state.value, 'open', 'closed')}
            popover="auto"
            role="menu"
            class={props.class}
            ref={(node: HTMLElement | null) => { el = node; menu.setPopup(node); }}
            onToggle={(e: Event) => {
                const open = (e as ToggleEvent).newState === 'open';
                if (menu.state.value !== open) menu.state.value = open;
            }}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'Menu.Popup' });

// ── Item ──

export type MenuItemProps =
    & Define.Prop<'value', string, true>
    & Define.Prop<'textValue', string, false>
    & WithDisabled
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

const MenuItem = component<MenuItemProps>(({ props, slots, signal, onUnmounted }) => {
    const menu = useMenuContext();
    let el: HTMLElement | null = null;
    const focus = signal({ highlighted: false });
    const press = createPressFeedback({
        getElement: () => el,
        isDisabled: () => !!props.disabled,
    });

    const item: ListItem = {
        id: `item-${props.value}`,
        get value() { return props.value; },
        disabled: () => !!props.disabled,
        el: () => el,
        textValue: () => props.textValue ?? el?.textContent?.trim() ?? props.value,
    };
    const unregister = menu.list.register(item);
    onUnmounted(() => unregister());

    const activate = () => {
        if (!props.disabled) menu.select(props.value);
    };

    const bag = (): PartProps => ({
        'data-scope': SCOPE,
        'data-part': 'item',
        'data-disabled': dataAttr(props.disabled),
        'data-highlighted': dataAttr(focus.highlighted),
        role: 'menuitem',
        tabIndex: -1,
        'aria-disabled': props.disabled ? 'true' : undefined,
        onClick: () => activate(),
        onKeydown: (e: KeyboardEvent) => {
            press.onKeydown(e);
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activate();
                return;
            }
            menu.keydown(e, props.value);
        },
        onKeyup: press.onKeyup,
        onPointerenter: () => { el?.focus(); },
        onPointerdown: press.onPointerdown,
        onPointerup: press.onPointerup,
        onPointercancel: press.onPointercancel,
        onPointerleave: press.onPointerleave,
        onFocus: () => { focus.highlighted = true; },
        onBlur: (e: FocusEvent) => {
            press.onBlur(e);
            focus.highlighted = false;
        },
        ref: (node: HTMLElement | null) => { el = node; },
    });

    return () => {
        const b = bag();
        if (props.asChild) return renderAsChild(slots.default, b);
        return (
            <div class={props.class} {...b}>
                {slots.default?.(b)}
            </div>
        );
    };
}, { name: 'Menu.Item' });

// ── Group / GroupLabel / Separator ──

export type MenuGroupProps = WithClass & Define.Slot<'default'>;

const MenuGroup = component<MenuGroupProps>(({ props, slots }) => {
    return () => (
        <div data-scope={SCOPE} data-part="group" role="group" class={props.class}>
            {slots.default?.()}
        </div>
    );
}, { name: 'Menu.Group' });

export type MenuGroupLabelProps = WithClass & Define.Slot<'default'>;

const MenuGroupLabel = component<MenuGroupLabelProps>(({ props, slots }) => {
    return () => (
        <div data-scope={SCOPE} data-part="group-label" role="presentation" class={props.class}>
            {slots.default?.()}
        </div>
    );
}, { name: 'Menu.GroupLabel' });

export type MenuSeparatorProps = WithClass;

const MenuSeparator = component<MenuSeparatorProps>(({ props }) => {
    return () => (
        <div data-scope={SCOPE} data-part="separator" role="separator" class={props.class} />
    );
}, { name: 'Menu.Separator' });

export const Menu = compound(MenuRoot, {
    Root: MenuRoot,
    Trigger: MenuTrigger,
    Popup: MenuPopup,
    Item: MenuItem,
    Group: MenuGroup,
    GroupLabel: MenuGroupLabel,
    Separator: MenuSeparator,
});
