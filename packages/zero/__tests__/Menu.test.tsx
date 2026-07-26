import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { Menu, menuAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

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
