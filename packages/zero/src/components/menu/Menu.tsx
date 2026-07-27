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
 *
 * Submenus nest the same parts:
 * ```tsx
 * <Menu.Sub>
 *     <Menu.SubTrigger>Share</Menu.SubTrigger>
 *     <Menu.SubPopup>
 *         <Menu.Item value="email">Email</Menu.Item>
 *     </Menu.SubPopup>
 * </Menu.Sub>
 * ```
 * `Menu.Sub` shadows the menu context for its subtree, so Item/Group/
 * Separator work unchanged at any depth and `select` bubbles to the root.
 * The nested `popover="auto"` is a DOM descendant of the parent popup, so
 * the platform provides the stacking model: opening a child keeps ancestors
 * open, Escape closes only the innermost, light dismiss closes the chain,
 * and opening a sibling submenu closes the other. Keyboard: ArrowRight (LTR)
 * / Enter / Space open and focus the first item, ArrowLeft closes back to
 * the sub-trigger. Hover opens/closes with intent delays and never moves
 * focus into the submenu.
 */
import { component, compound, defineInjectable, defineProvide, effect, watch } from 'sigx';
import type { Define } from 'sigx';
import { createControllableState, type ControllableState } from '../../behaviors/controllable.js';
import { createId } from '../../behaviors/create-id.js';
import { createListController, type ListItem } from '../../behaviors/list.js';
import { createRovingKeydown } from '../../behaviors/roving.js';
import { createTypeahead } from '../../behaviors/typeahead.js';
import { createAnchorPosition, pointAnchor, type Placement, type PositionAnchor, type PositionStrategy } from '../../behaviors/position.js';
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
    setAnchor(anchor: PositionAnchor | null): void;
    /**
     * Open anchored at client coordinates (a context menu). While already
     * open, repositions in place — a second right-click must not flicker
     * through close/reopen.
     */
    openAt(x: number, y: number): void;
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
        openAt: () => {},
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
    let anchor: PositionAnchor | null = null;
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

    const pos = createAnchorPosition({
        getAnchor: () => anchor,
        getFloating: () => popup,
        isOpen: () => state.value,
        placement: () => props.placement ?? 'bottom-start',
        offset: () => props.offset ?? 4,
        strategy: props.positionStrategy,
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
        setAnchor: (a) => { anchor = a; },
        openAt(x, y) {
            anchor = pointAnchor(x, y);
            if (state.value) pos.update();
            else state.value = true;
        },
        setPopup: (el) => { popup = el; },
    };
    defineProvide(useMenuContext, () => ctx);

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
            if (props.disabled) return;
            // Re-claim the anchor on every open: a context-trigger open may
            // have moved it to a point — last opener wins.
            menu.setAnchor(el);
            menu.state.value = !menu.state.value;
        },
        onKeydown: (e: KeyboardEvent) => {
            press.onKeydown(e);
            // ArrowDown on a closed trigger opens the menu (APG).
            if (e.key === 'ArrowDown' && !menu.state.value && !props.disabled) {
                e.preventDefault();
                menu.setAnchor(el);
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

// ── ContextTrigger ──

export type MenuContextTriggerProps =
    & WithDisabled
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

/**
 * The right-click surface. Wrap any content: `contextmenu` (right-click,
 * long-press on Android) opens the menu at the pointer, Shift+F10 / the
 * ContextMenu key open it anchored to the surface's rect (APG — the
 * keyboard has no pointer position). iOS has no native `contextmenu`
 * event; pair with `-webkit-touch-callout: none` and a long-press
 * recognizer of your own until zero grows one.
 */
const MenuContextTrigger = component<MenuContextTriggerProps>(({ props, slots }) => {
    const menu = useMenuContext();
    let el: HTMLElement | null = null;

    const bag = (): PartProps => ({
        'data-scope': SCOPE,
        'data-part': 'context-trigger',
        'data-state': stateAttr(menu.state.value, 'open', 'closed'),
        'data-disabled': dataAttr(props.disabled),
        'aria-haspopup': 'menu',
        'aria-expanded': menu.state.value ? 'true' : 'false',
        'aria-controls': menu.ids.popup,
        ref: (node: HTMLElement | null) => { el = node; },
        onContextmenu: (e: MouseEvent) => {
            if (props.disabled) return;
            e.preventDefault();
            const { clientX, clientY } = e;
            // Never open inside the right-click gesture: the popup is an
            // auto popover, and the gesture's own pointerup light-dismisses
            // a popover it didn't press inside — racily, at millisecond
            // granularity. When contextmenu fires with the button still
            // down (macOS convention), wait for the release; either way,
            // open a task later so the gesture's input processing is fully
            // done before showPopover().
            const openDeferred = (): void => {
                setTimeout(() => menu.openAt(clientX, clientY), 0);
            };
            if (e.buttons !== 0) {
                window.addEventListener('pointerup', openDeferred, { once: true, capture: true });
            } else {
                openDeferred();
            }
        },
        onKeydown: (e: KeyboardEvent) => {
            if (props.disabled) return;
            // Bubbles from any focused descendant — the surface itself needs
            // no tab stop of its own.
            if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') {
                e.preventDefault();
                if (!el) return;
                menu.setAnchor(el);
                menu.state.value = true;
            }
        },
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
}, { name: 'Menu.ContextTrigger' });

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

// ── Sub ──

interface MenuSubContext {
    parent: MenuContext;
    state: ControllableState<boolean>;
    ids: { trigger: string; popup: string };
    /** Open; when `focusFirst`, focus moves to the first enabled sub item once the popover shows. */
    open(focusFirst: boolean): void;
    /** Close; when `refocusTrigger`, focus returns to the sub-trigger (keyboard paths). */
    close(refocusTrigger: boolean): void;
    scheduleOpen(): void;
    scheduleClose(): void;
    cancelTimers(): void;
    consumePendingFocus(): boolean;
    isRtl(): boolean;
    setSubTrigger(el: HTMLElement | null): void;
    subTrigger(): HTMLElement | null;
    setSubPopup(el: HTMLElement | null): void;
}

function makeInertSub(): MenuSubContext {
    let open = false;
    return {
        parent: makeInert(),
        state: {
            get value() { return open; },
            set value(v: boolean) { open = v; },
        },
        ids: { trigger: 'zx-menu-sub-inert-trigger', popup: 'zx-menu-sub-inert-popup' },
        open: () => {},
        close: () => {},
        scheduleOpen: () => {},
        scheduleClose: () => {},
        cancelTimers: () => {},
        consumePendingFocus: () => false,
        isRtl: () => false,
        setSubTrigger: () => {},
        subTrigger: () => null,
        setSubPopup: () => {},
    };
}

export const useMenuSubContext = defineInjectable<MenuSubContext>(() => makeInertSub());

export type MenuSubProps =
    & Define.Model<boolean>
    & Define.Event<'openChange', boolean>
    & Define.Prop<'placement', Placement, false>
    & Define.Prop<'offset', number, false>
    & Define.Prop<'positionStrategy', PositionStrategy, false>
    /** Hover-intent delays in ms; openDelay 100, closeDelay 300. */
    & Define.Prop<'openDelay', number, false>
    & Define.Prop<'closeDelay', number, false>
    & Define.Slot<'default'>;

const MenuSub = component<MenuSubProps>(({ props, slots, emit, onUnmounted }) => {
    // Captured BEFORE shadowing: the enclosing level, whatever its depth.
    const parent = useMenuContext();
    const state = createControllableState<boolean>(
        () => props.model,
        false,
        (v) => emit('openChange', v),
    );
    const list = createListController();
    const baseId = createId('zx-menu-sub');
    let subTrigger: HTMLElement | null = null;
    let subPopup: HTMLElement | null = null;
    let pendingFocus = false;
    let openHandle: ReturnType<typeof setTimeout> | null = null;
    let closeHandle: ReturnType<typeof setTimeout> | null = null;

    const isRtl = (): boolean => {
        const el = subTrigger;
        if (!el) return false;
        try {
            if (el.matches(':dir(rtl)')) return true;
        } catch {
            // :dir() unsupported — fall through to computed style.
        }
        return typeof getComputedStyle === 'function' && getComputedStyle(el).direction === 'rtl';
    };

    const cancelTimers = (): void => {
        if (openHandle != null) clearTimeout(openHandle);
        if (closeHandle != null) clearTimeout(closeHandle);
        openHandle = closeHandle = null;
    };

    const open = (focusFirst: boolean): void => {
        cancelTimers();
        pendingFocus = focusFirst;
        state.value = true;
    };

    const close = (refocusTrigger: boolean): void => {
        cancelTimers();
        pendingFocus = false;
        state.value = false;
        if (refocusTrigger) subTrigger?.focus();
    };

    const roving = createRovingKeydown({
        list,
        orientation: () => 'vertical',
        onMove: () => {},
    });
    const typeahead = createTypeahead({
        list,
        onMatch: (item: ListItem) => item.el()?.focus(),
    });

    // The subtree context: Item/Group/Separator inside the SubPopup use it
    // unchanged. Selection bubbles to the root; ArrowLeft steps back out.
    const subCtx: MenuContext = {
        state,
        list,
        ids: { popup: `${baseId}-popup` },
        keydown(e, value) {
            const closeKey = isRtl() ? 'ArrowRight' : 'ArrowLeft';
            if (e.key === closeKey) {
                e.preventDefault();
                close(true);
                return;
            }
            roving(e, value);
            if (!e.defaultPrevented) typeahead(e, value);
        },
        select(value) {
            parent.select(value);
        },
        setAnchor: () => {},
        // A context trigger inside a submenu would re-anchor the WRONG
        // popup; submenus anchor to their sub-trigger, so this is inert.
        openAt: () => {},
        setPopup: (el) => { subPopup = el; },
    };
    defineProvide(useMenuContext, () => subCtx);

    const ctx: MenuSubContext = {
        parent,
        state,
        ids: { trigger: `${baseId}-trigger`, popup: `${baseId}-popup` },
        open,
        close,
        scheduleOpen: () => {
            cancelTimers();
            openHandle = setTimeout(() => open(false), props.openDelay ?? 100);
        },
        scheduleClose: () => {
            cancelTimers();
            closeHandle = setTimeout(() => close(false), props.closeDelay ?? 300);
        },
        cancelTimers,
        consumePendingFocus: () => {
            const wanted = pendingFocus;
            pendingFocus = false;
            return wanted;
        },
        isRtl,
        setSubTrigger: (el) => { subTrigger = el; },
        subTrigger: () => subTrigger,
        setSubPopup: (el) => { subPopup = el; },
    };
    defineProvide(useMenuSubContext, () => ctx);

    createAnchorPosition({
        getAnchor: () => subTrigger,
        getFloating: () => subPopup,
        isOpen: () => state.value,
        placement: () => props.placement ?? (isRtl() ? 'left-start' : 'right-start'),
        offset: () => props.offset ?? 4,
        strategy: props.positionStrategy,
    });

    // The native popover cascade closes descendants with their ancestors —
    // this mirrors it in state land for controlled parents and non-popover
    // environments.
    watch(
        () => parent.state.value,
        (parentOpen) => {
            if (!parentOpen) close(false);
        },
    );

    // Roving/hover moving to a DIFFERENT parent-level item closes this sub.
    watch(
        () => state.value,
        (openNow, _prev, onCleanup) => {
            if (!openNow || typeof document === 'undefined') return;
            const onFocusin = (e: FocusEvent): void => {
                const target = e.target as Node | null;
                if (!target) return;
                if (subTrigger?.contains(target) || subPopup?.contains(target)) return;
                close(false);
            };
            document.addEventListener('focusin', onFocusin);
            onCleanup(() => document.removeEventListener('focusin', onFocusin));
        },
    );

    onUnmounted(() => cancelTimers());

    return () => <>{slots.default?.()}</>;
}, { name: 'Menu.Sub' });

// ── SubTrigger ──

export type MenuSubTriggerProps =
    /** Identity in the PARENT list (roving/typeahead); defaults to the sub id. */
    & Define.Prop<'value', string, false>
    & Define.Prop<'textValue', string, false>
    & WithDisabled
    & WithClass
    & WithAsChild
    & Define.Slot<'default', PartProps>;

const MenuSubTrigger = component<MenuSubTriggerProps>(({ props, slots, signal, onUnmounted }) => {
    const sub = useMenuSubContext();
    let el: HTMLElement | null = null;
    const focus = signal({ highlighted: false });
    const press = createPressFeedback({
        getElement: () => el,
        isDisabled: () => !!props.disabled,
    });

    const value = (): string => props.value ?? sub.ids.trigger;

    // A parent-level item: arrows and typeahead at the parent level rove
    // through it like any other item. It never emits `select`.
    const item: ListItem = {
        id: `sub-trigger-${sub.ids.trigger}`,
        get value() { return value(); },
        disabled: () => !!props.disabled,
        el: () => el,
        textValue: () => props.textValue ?? el?.textContent?.trim() ?? value(),
    };
    const unregister = sub.parent.list.register(item);
    onUnmounted(() => unregister());

    const bag = (): PartProps => ({
        id: sub.ids.trigger,
        'data-scope': SCOPE,
        'data-part': 'sub-trigger',
        'data-state': stateAttr(sub.state.value, 'open', 'closed'),
        'data-disabled': dataAttr(props.disabled),
        'data-highlighted': dataAttr(focus.highlighted),
        role: 'menuitem',
        tabIndex: -1,
        'aria-haspopup': 'menu',
        'aria-expanded': sub.state.value ? 'true' : 'false',
        'aria-controls': sub.ids.popup,
        'aria-disabled': props.disabled ? 'true' : undefined,
        onClick: () => {
            if (props.disabled) return;
            if (sub.state.value) sub.close(false);
            else sub.open(false);
        },
        onKeydown: (e: KeyboardEvent) => {
            press.onKeydown(e);
            if (props.disabled) return;
            const openKey = e.key === 'Enter' || e.key === ' '
                || e.key === (sub.isRtl() ? 'ArrowLeft' : 'ArrowRight');
            if (openKey) {
                e.preventDefault();
                sub.open(true);
                return;
            }
            sub.parent.keydown(e, value());
        },
        onKeyup: press.onKeyup,
        onPointerenter: () => {
            el?.focus();
            if (!props.disabled) sub.scheduleOpen();
        },
        onPointerdown: press.onPointerdown,
        onPointerup: press.onPointerup,
        onPointercancel: press.onPointercancel,
        onPointerleave: (e: PointerEvent) => {
            press.onPointerleave(e);
            sub.scheduleClose();
        },
        onFocus: () => { focus.highlighted = true; },
        onBlur: (e: FocusEvent) => {
            press.onBlur(e);
            focus.highlighted = false;
        },
        ref: (node: HTMLElement | null) => { el = node; sub.setSubTrigger(node); },
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
}, { name: 'Menu.SubTrigger' });

// ── SubPopup ──

export type MenuSubPopupProps = WithClass & Define.Slot<'default'>;

const MenuSubPopup = component<MenuSubPopupProps>(({ props, slots, onMounted }) => {
    const sub = useMenuSubContext();
    // The shadowed context — this IS the sub's own list/state.
    const menu = useMenuContext();
    let el: HTMLElement | null = null;

    onMounted(() => {
        effect(() => {
            const open = sub.state.value;
            const node = el as (HTMLElement & { showPopover?(): void; hidePopover?(): void; matches(s: string): boolean }) | null;
            if (!node || typeof node.showPopover !== 'function') return;
            const showing = node.matches(':popover-open');
            if (open && !showing) {
                node.showPopover();
                // Unlike the root popup, focus only moves in when the open
                // was a keyboard gesture — hover leaves it on the trigger.
                if (sub.consumePendingFocus()) menu.list.enabledItems()[0]?.el()?.focus();
            } else if (!open && showing) {
                node.hidePopover!();
            }
        });
    });

    return () => (
        <div
            id={sub.ids.popup}
            data-scope={SCOPE}
            data-part="sub-popup"
            data-state={stateAttr(sub.state.value, 'open', 'closed')}
            popover="auto"
            role="menu"
            aria-labelledby={sub.ids.trigger}
            class={props.class}
            ref={(node: HTMLElement | null) => { el = node; sub.setSubPopup(node); }}
            onToggle={(e: Event) => {
                const open = (e as ToggleEvent).newState === 'open';
                if (sub.state.value === open) return;
                // A native close (Escape) with focus still inside would
                // strand it on a hidden element; hand it back to the
                // sub-trigger. A light-dismiss click has already moved focus
                // to the clicked target, so `contains` is false and nothing
                // is stolen.
                if (!open && el?.contains(document.activeElement)) sub.subTrigger()?.focus();
                sub.state.value = open;
            }}
            onPointerenter={() => sub.cancelTimers()}
            onPointerleave={() => sub.scheduleClose()}
        >
            {slots.default?.()}
        </div>
    );
}, { name: 'Menu.SubPopup' });

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
    ContextTrigger: MenuContextTrigger,
    Popup: MenuPopup,
    Item: MenuItem,
    Sub: MenuSub,
    SubTrigger: MenuSubTrigger,
    SubPopup: MenuSubPopup,
    Group: MenuGroup,
    GroupLabel: MenuGroupLabel,
    Separator: MenuSeparator,
});
