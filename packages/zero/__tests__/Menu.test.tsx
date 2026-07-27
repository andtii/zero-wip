import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { Menu, menuAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

/** watch()-driven cascades settle a microtask after the write. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('Menu', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    function mount(onSelect: (v: string) => void = () => {}) {
        render(
            <Menu.Root onSelect={onSelect}>
                <Menu.Trigger>Actions</Menu.Trigger>
                <Menu.Popup>
                    <Menu.Group>
                        <Menu.GroupLabel>File</Menu.GroupLabel>
                        <Menu.Item value="rename">Rename</Menu.Item>
                        <Menu.Item value="duplicate">Duplicate</Menu.Item>
                    </Menu.Group>
                    <Menu.Separator />
                    <Menu.Item value="delete" disabled>Delete</Menu.Item>
                </Menu.Popup>
            </Menu.Root>,
            container,
        );
    }

    it('renders a valid anatomy with APG roles', () => {
        mount();
        expectAnatomy(container, menuAnatomy);
        expect(container.querySelector('[data-part="trigger"]')!.getAttribute('aria-haspopup')).toBe('menu');
        expect(container.querySelector('[data-part="popup"]')!.getAttribute('role')).toBe('menu');
        expect(container.querySelectorAll('[role="menuitem"]').length).toBe(3);
        expect(container.querySelector('[data-part="separator"]')!.getAttribute('role')).toBe('separator');
    });

    it('opens on click and on ArrowDown', () => {
        mount();
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.click();
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        trigger.click();
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('item click emits select and closes', () => {
        const onSelect = vi.fn();
        mount(onSelect);
        container.querySelector<HTMLElement>('[data-part="trigger"]')!.click();
        const items = container.querySelectorAll<HTMLElement>('[data-part="item"]');
        items[0]!.click();
        expect(onSelect).toHaveBeenCalledWith('rename');
        expect(container.querySelector('[data-part="trigger"]')!.getAttribute('aria-expanded')).toBe('false');
    });

    it('disabled items do not activate', () => {
        const onSelect = vi.fn();
        mount(onSelect);
        container.querySelector<HTMLElement>('[data-part="trigger"]')!.click();
        const items = container.querySelectorAll<HTMLElement>('[data-part="item"]');
        expect(items[2]!.getAttribute('data-disabled')).toBe('');
        items[2]!.click();
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('Enter activates the focused item', () => {
        const onSelect = vi.fn();
        mount(onSelect);
        container.querySelector<HTMLElement>('[data-part="trigger"]')!.click();
        const items = container.querySelectorAll<HTMLElement>('[data-part="item"]');
        items[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true }));
        expect(onSelect).toHaveBeenCalledWith('duplicate');
    });

    it('publishes press feedback on the trigger and on items', () => {
        mount();
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(true);
        trigger.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(false);

        trigger.click();
        const item = container.querySelectorAll<HTMLElement>('[data-part="item"]')[0]!;
        item.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(item.hasAttribute('data-pressed')).toBe(true);
        item.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        expect(item.hasAttribute('data-pressed')).toBe(false);
    });

    it('marks the item pressed on Enter even though activation closes the menu', () => {
        mount();
        container.querySelector<HTMLElement>('[data-part="trigger"]')!.click();
        const item = container.querySelectorAll<HTMLElement>('[data-part="item"]')[1]!;
        item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true }));
        // The same keydown activates and closes; the press flag must have
        // been set before that, and it is still on the captured element.
        expect(item.hasAttribute('data-pressed')).toBe(true);
        item.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
        expect(item.hasAttribute('data-pressed')).toBe(false);
    });

    it('publishes no press feedback on a disabled trigger or item', () => {
        mount();
        container.querySelector<HTMLElement>('[data-part="trigger"]')!.click();
        const disabledItem = container.querySelectorAll<HTMLElement>('[data-part="item"]')[2]!;
        disabledItem.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(disabledItem.hasAttribute('data-pressed')).toBe(false);

        const second = document.createElement('div');
        document.body.appendChild(second);
        render(
            <Menu.Root>
                <Menu.Trigger disabled>Actions</Menu.Trigger>
            </Menu.Root>,
            second,
        );
        const trigger = second.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(false);
    });
});

describe('Menu submenus', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    function mountSub(onSelect: (v: string) => void = () => {}, subDisabled = false) {
        render(
            <Menu.Root onSelect={onSelect}>
                <Menu.Trigger>Actions</Menu.Trigger>
                <Menu.Popup>
                    <Menu.Item value="rename">Rename</Menu.Item>
                    <Menu.Sub>
                        <Menu.SubTrigger value="share" disabled={subDisabled}>Share</Menu.SubTrigger>
                        <Menu.SubPopup>
                            <Menu.Item value="email">Email</Menu.Item>
                            <Menu.Item value="link">Copy link</Menu.Item>
                        </Menu.SubPopup>
                    </Menu.Sub>
                </Menu.Popup>
            </Menu.Root>,
            container,
        );
        return {
            rootTrigger: container.querySelector<HTMLElement>('[data-part="trigger"]')!,
            subTrigger: container.querySelector<HTMLElement>('[data-part="sub-trigger"]')!,
            subPopup: container.querySelector<HTMLElement>('[data-part="sub-popup"]')!,
        };
    }

    it('renders a valid anatomy with APG roles on the sub parts', () => {
        const { rootTrigger, subTrigger, subPopup } = mountSub();
        rootTrigger.click();
        expectAnatomy(container, menuAnatomy);
        expect(subTrigger.getAttribute('role')).toBe('menuitem');
        expect(subTrigger.getAttribute('aria-haspopup')).toBe('menu');
        expect(subTrigger.getAttribute('aria-expanded')).toBe('false');
        expect(subTrigger.getAttribute('aria-controls')).toBe(subPopup.id);
        expect(subTrigger.getAttribute('data-state')).toBe('closed');
        expect(subPopup.getAttribute('role')).toBe('menu');
        expect(subPopup.getAttribute('aria-labelledby')).toBe(subTrigger.id);
        expect(subPopup.getAttribute('data-state')).toBe('closed');
    });

    it('ArrowRight, Enter and Space open the submenu; click toggles', () => {
        const { rootTrigger, subTrigger, subPopup } = mountSub();
        rootTrigger.click();
        subTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true, bubbles: true }));
        expect(subTrigger.getAttribute('data-state')).toBe('open');
        expect(subTrigger.getAttribute('aria-expanded')).toBe('true');
        expect(subPopup.getAttribute('data-state')).toBe('open');
        subTrigger.click();
        expect(subTrigger.getAttribute('data-state')).toBe('closed');
        subTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true }));
        expect(subTrigger.getAttribute('data-state')).toBe('open');
    });

    it('ArrowLeft inside the submenu closes it and refocuses the sub-trigger', () => {
        const { rootTrigger, subTrigger, subPopup } = mountSub();
        rootTrigger.click();
        subTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true, bubbles: true }));
        const subItem = subPopup.querySelectorAll<HTMLElement>('[data-part="item"]')[0]!;
        subItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true, bubbles: true }));
        expect(subPopup.getAttribute('data-state')).toBe('closed');
        expect(document.activeElement).toBe(subTrigger);
    });

    it('selecting a sub item bubbles to the root and closes the chain', async () => {
        const onSelect = vi.fn();
        const { rootTrigger, subTrigger, subPopup } = mountSub(onSelect);
        rootTrigger.click();
        subTrigger.click();
        subPopup.querySelectorAll<HTMLElement>('[data-part="item"]')[0]!.click();
        expect(onSelect).toHaveBeenCalledWith('email');
        expect(rootTrigger.getAttribute('aria-expanded')).toBe('false');
        await tick();
        expect(subPopup.getAttribute('data-state')).toBe('closed');
    });

    it('the sub-trigger never emits select', () => {
        const onSelect = vi.fn();
        const { rootTrigger, subTrigger } = mountSub(onSelect);
        rootTrigger.click();
        subTrigger.click();
        subTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true }));
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('hover opens after openDelay without moving focus in, and closes after closeDelay', () => {
        vi.useFakeTimers();
        const { rootTrigger, subTrigger, subPopup } = mountSub();
        rootTrigger.click();
        subTrigger.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }));
        expect(subPopup.getAttribute('data-state')).toBe('closed');
        vi.advanceTimersByTime(120);
        expect(subPopup.getAttribute('data-state')).toBe('open');
        expect(document.activeElement).toBe(subTrigger);
        subTrigger.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }));
        vi.advanceTimersByTime(320);
        expect(subPopup.getAttribute('data-state')).toBe('closed');
    });

    it('entering the sub popup cancels the scheduled close', () => {
        vi.useFakeTimers();
        const { rootTrigger, subTrigger, subPopup } = mountSub();
        rootTrigger.click();
        subTrigger.dispatchEvent(new PointerEvent('pointerenter'));
        vi.advanceTimersByTime(120);
        subTrigger.dispatchEvent(new PointerEvent('pointerleave'));
        subPopup.dispatchEvent(new PointerEvent('pointerenter'));
        vi.advanceTimersByTime(1000);
        expect(subPopup.getAttribute('data-state')).toBe('open');
    });

    it('focus landing on another parent-level item closes the submenu', async () => {
        const { rootTrigger, subTrigger, subPopup } = mountSub();
        rootTrigger.click();
        subTrigger.click();
        expect(subPopup.getAttribute('data-state')).toBe('open');
        await tick();
        const parentItem = container.querySelectorAll<HTMLElement>('[data-part="item"]')[0]!;
        parentItem.focus();
        parentItem.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        await tick();
        expect(subPopup.getAttribute('data-state')).toBe('closed');
    });

    it('closing the root closes an open submenu with it', async () => {
        const { rootTrigger, subTrigger, subPopup } = mountSub();
        rootTrigger.click();
        subTrigger.click();
        expect(subPopup.getAttribute('data-state')).toBe('open');
        rootTrigger.click();
        await tick();
        expect(subPopup.getAttribute('data-state')).toBe('closed');
    });

    it('a disabled sub-trigger neither opens nor presses', () => {
        const { rootTrigger, subTrigger, subPopup } = mountSub(() => {}, true);
        rootTrigger.click();
        subTrigger.click();
        expect(subPopup.getAttribute('data-state')).toBe('closed');
        subTrigger.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(subTrigger.hasAttribute('data-pressed')).toBe(false);
    });

    it('nests two levels deep with isolated state', () => {
        render(
            <Menu.Root>
                <Menu.Trigger>Actions</Menu.Trigger>
                <Menu.Popup>
                    <Menu.Sub>
                        <Menu.SubTrigger value="share">Share</Menu.SubTrigger>
                        <Menu.SubPopup>
                            <Menu.Item value="email">Email</Menu.Item>
                            <Menu.Sub>
                                <Menu.SubTrigger value="social">Social</Menu.SubTrigger>
                                <Menu.SubPopup>
                                    <Menu.Item value="toot">Toot</Menu.Item>
                                </Menu.SubPopup>
                            </Menu.Sub>
                        </Menu.SubPopup>
                    </Menu.Sub>
                </Menu.Popup>
            </Menu.Root>,
            container,
        );
        container.querySelector<HTMLElement>('[data-part="trigger"]')!.click();
        const subTriggers = container.querySelectorAll<HTMLElement>('[data-part="sub-trigger"]');
        const subPopups = container.querySelectorAll<HTMLElement>('[data-part="sub-popup"]');
        subTriggers[0]!.click();
        expect(subPopups[0]!.getAttribute('data-state')).toBe('open');
        expect(subPopups[1]!.getAttribute('data-state')).toBe('closed');
        subTriggers[1]!.click();
        expect(subPopups[0]!.getAttribute('data-state')).toBe('open');
        expect(subPopups[1]!.getAttribute('data-state')).toBe('open');
        expectAnatomy(container, menuAnatomy);
    });

    function mountContext(extra: { disabled?: boolean } = {}) {
        render(
            <Menu.Root>
                <Menu.ContextTrigger disabled={extra.disabled}>
                    <span>Right-click zone</span>
                </Menu.ContextTrigger>
                <Menu.Popup>
                    <Menu.Item value="copy">Copy</Menu.Item>
                    <Menu.Item value="paste">Paste</Menu.Item>
                </Menu.Popup>
            </Menu.Root>,
            container,
        );
    }

    const contextmenuAt = (el: HTMLElement, x: number, y: number) => {
        const e = new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true, cancelable: true });
        el.dispatchEvent(e);
        return e;
    };

    it('context trigger: right-click opens at the pointer (a task later) and eats the native menu', async () => {
        mountContext();
        const surface = container.querySelector<HTMLElement>('[data-part="context-trigger"]')!;
        expect(surface.getAttribute('aria-haspopup')).toBe('menu');
        expect(surface.getAttribute('data-state')).toBe('closed');
        const e = contextmenuAt(surface, 120, 80);
        expect(e.defaultPrevented).toBe(true);
        // Deferred past the gesture: opening inside it would be racily
        // light-dismissed by the same gesture's pointerup.
        expect(surface.getAttribute('data-state')).toBe('closed');
        await tick();
        expect(surface.getAttribute('data-state')).toBe('open');
        expect(container.querySelector('[data-part="popup"]')!.getAttribute('data-state')).toBe('open');
    });

    it('context trigger: with the button still down, the open waits for the release', async () => {
        mountContext();
        const surface = container.querySelector<HTMLElement>('[data-part="context-trigger"]')!;
        const e = new MouseEvent('contextmenu', { clientX: 10, clientY: 10, buttons: 2, bubbles: true, cancelable: true });
        surface.dispatchEvent(e);
        await tick();
        // Still down — not yet open.
        expect(surface.getAttribute('data-state')).toBe('closed');
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        await tick();
        expect(surface.getAttribute('data-state')).toBe('open');
    });

    it('context trigger: a second right-click while open keeps it open (repositions in place)', async () => {
        mountContext();
        const surface = container.querySelector<HTMLElement>('[data-part="context-trigger"]')!;
        contextmenuAt(surface, 120, 80);
        await tick();
        contextmenuAt(surface, 300, 200);
        await tick();
        expect(surface.getAttribute('data-state')).toBe('open');
        expect(container.querySelector('[data-part="popup"]')!.getAttribute('data-state')).toBe('open');
    });

    it('context trigger: Shift+F10 opens anchored to the element', () => {
        mountContext();
        const surface = container.querySelector<HTMLElement>('[data-part="context-trigger"]')!;
        const e = new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true });
        surface.dispatchEvent(e);
        expect(e.defaultPrevented).toBe(true);
        expect(surface.getAttribute('data-state')).toBe('open');
    });

    it('context trigger: disabled ignores both paths', async () => {
        mountContext({ disabled: true });
        const surface = container.querySelector<HTMLElement>('[data-part="context-trigger"]')!;
        expect(surface.getAttribute('data-disabled')).toBe('');
        contextmenuAt(surface, 10, 10);
        surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true }));
        await tick();
        expect(surface.getAttribute('data-state')).toBe('closed');
    });

    it('context trigger renders a valid anatomy', async () => {
        mountContext();
        contextmenuAt(container.querySelector<HTMLElement>('[data-part="context-trigger"]')!, 50, 50);
        await tick();
        expectAnatomy(container, menuAnatomy);
    });
});
