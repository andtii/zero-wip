import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { signal } from 'sigx';
import { Select, selectAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

describe('Select', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    function mount(state: { fruit: string }) {
        render(
            <Select.Root model={[state, 'fruit']} placeholder="Pick a fruit…" name="fruit">
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popup>
                    <Select.Item value="apple">Apple</Select.Item>
                    <Select.Item value="banana">Banana</Select.Item>
                    <Select.Item value="cherry" disabled>Cherry</Select.Item>
                </Select.Popup>
            </Select.Root>,
            container,
        );
    }

    it('renders anatomy with combobox/listbox semantics and a hidden form input', () => {
        mount(signal({ fruit: '' }));
        expectAnatomy(container, selectAnatomy);
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        expect(trigger.getAttribute('role')).toBe('combobox');
        expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
        expect(container.querySelector('[data-part="popup"]')!.getAttribute('role')).toBe('listbox');
        expect(container.querySelectorAll('[role="option"]').length).toBe(3);
        const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"]')!;
        expect(hidden.name).toBe('fruit');
        expect(trigger.getAttribute('data-placeholder')).toBe('');
        expect(container.querySelector('[data-part="value"]')!.textContent).toBe('Pick a fruit…');
    });

    it('opens, highlights, and selects by click', () => {
        const state = signal({ fruit: '' });
        mount(state);
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.click();
        expect(trigger.getAttribute('aria-expanded')).toBe('true');

        const items = container.querySelectorAll<HTMLElement>('[data-part="item"]');
        items[1]!.click();
        expect(state.fruit).toBe('banana');
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(container.querySelector('[data-part="value"]')!.textContent).toBe('Banana');
        expect(container.querySelector<HTMLInputElement>('input[type="hidden"]')!.value).toBe('banana');
    });

    it('full keyboard flow: open, arrow, select via activedescendant', () => {
        const state = signal({ fruit: '' });
        mount(state);
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        const key = (k: string) => trigger.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true, bubbles: true }));

        key('ArrowDown');                 // opens, highlights first enabled
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        const items = container.querySelectorAll<HTMLElement>('[data-part="item"]');
        expect(items[0]!.getAttribute('data-highlighted')).toBe('');
        expect(trigger.getAttribute('aria-activedescendant')).toBe(items[0]!.id);

        key('ArrowDown');                 // second item (cherry is disabled → not reachable further)
        expect(items[1]!.getAttribute('data-highlighted')).toBe('');

        key('Enter');
        expect(state.fruit).toBe('banana');
        expect(trigger.getAttribute('aria-expanded')).toBe('false');

        // aria-selected sticks on reopen
        key('ArrowDown');
        expect(items[1]!.getAttribute('aria-selected')).toBe('true');
        expect(items[1]!.getAttribute('data-selected')).toBe('');
    });

    it('typeahead while closed selects directly', () => {
        const state = signal({ fruit: '' });
        mount(state);
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', cancelable: true, bubbles: true }));
        expect(state.fruit).toBe('banana');
    });

    it('Escape closes without selecting', () => {
        const state = signal({ fruit: '' });
        mount(state);
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(state.fruit).toBe('');
    });
});
