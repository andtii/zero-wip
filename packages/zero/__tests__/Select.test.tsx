import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { signal } from 'sigx';
import { Field, Select, selectAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

/** watch()-driven syncs settle a microtask after the write. */
const tick = () => new Promise((r) => setTimeout(r, 0));

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

    it('publishes press feedback on the trigger, by pointer and by Enter', () => {
        mount(signal({ fruit: '' }));
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(true);
        trigger.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(false);

        // triggerKeydown preventDefaults Enter; press composes ahead of it,
        // so the feedback fires regardless.
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(true);
        trigger.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(false);
    });

    it('publishes press feedback on items by pointer, skipping disabled ones', () => {
        mount(signal({ fruit: '' }));
        container.querySelector<HTMLElement>('[data-part="trigger"]')!.click();
        const items = container.querySelectorAll<HTMLElement>('[data-part="item"]');
        items[0]!.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(items[0]!.hasAttribute('data-pressed')).toBe(true);
        items[0]!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        expect(items[0]!.hasAttribute('data-pressed')).toBe(false);

        items[2]!.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(items[2]!.hasAttribute('data-pressed')).toBe(false);
    });

    it('publishes no press feedback while the root is disabled', () => {
        render(
            <Select.Root disabled placeholder="Pick a fruit…">
                <Select.Trigger>
                    <Select.Value />
                </Select.Trigger>
            </Select.Root>,
            container,
        );
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(false);
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

    it('option groups: role=group named by its label, items keep working, and a valid anatomy', async () => {
        const state = signal({ fruit: '' });
        render(
            <Select.Root model={[state, 'fruit']}>
                <Select.Trigger>
                    <Select.Value />
                </Select.Trigger>
                <Select.Popup>
                    <Select.Group>
                        <Select.GroupLabel>Citrus</Select.GroupLabel>
                        <Select.Item value="lemon">Lemon</Select.Item>
                        <Select.Item value="lime">Lime</Select.Item>
                    </Select.Group>
                    <Select.Group>
                        <Select.GroupLabel>Stone</Select.GroupLabel>
                        <Select.Item value="peach">Peach</Select.Item>
                    </Select.Group>
                </Select.Popup>
            </Select.Root>,
            container,
        );
        await tick();
        expectAnatomy(container, selectAnatomy);
        const groups = container.querySelectorAll<HTMLElement>('[data-part="group"]');
        const labels = container.querySelectorAll<HTMLElement>('[data-part="group-label"]');
        expect(groups.length).toBe(2);
        expect(groups[0]!.getAttribute('role')).toBe('group');
        expect(labels[0]!.id).not.toBe('');
        expect(groups[0]!.getAttribute('aria-labelledby')).toBe(labels[0]!.id);
        expect(groups[1]!.getAttribute('aria-labelledby')).toBe(labels[1]!.id);
        // The label is NOT an option: never highlighted, never selectable —
        // only items register, so the keyboard walks straight through groups.
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }));
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }));
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }));
        const items = container.querySelectorAll<HTMLElement>('[data-part="item"]');
        expect(items[2]!.hasAttribute('data-highlighted')).toBe(true);
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true }));
        expect(state.fruit).toBe('peach');
    });

    it('a group without a label stays anonymous rather than dangling', async () => {
        render(
            <Select.Root>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Popup>
                    <Select.Group>
                        <Select.Item value="lemon">Lemon</Select.Item>
                    </Select.Group>
                </Select.Popup>
            </Select.Root>,
            container,
        );
        await tick();
        expect(container.querySelector<HTMLElement>('[data-part="group"]')!.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('adopts field wiring: label for, describedby, invalid, required', () => {
        render(
            <Field.Root invalid required>
                <Field.Label>Fruit</Field.Label>
                <Select.Root placeholder="Pick a fruit…">
                    <Select.Trigger>
                        <Select.Value />
                    </Select.Trigger>
                    <Select.Popup>
                        <Select.Item value="apple">Apple</Select.Item>
                    </Select.Popup>
                </Select.Root>
                <Field.Error>Required</Field.Error>
            </Field.Root>,
            container,
        );
        const trigger = container.querySelector<HTMLElement>('[data-scope="select"][data-part="trigger"]')!;
        const label = container.querySelector<HTMLElement>('[data-scope="field"][data-part="label"]')!;
        // The trigger IS the field's control: a button is labelable, so
        // Field.Label names it through `for` exactly like an input.
        expect(label.getAttribute('for')).toBe(trigger.id);
        expect(trigger.getAttribute('aria-invalid')).toBe('true');
        expect(trigger.getAttribute('aria-required')).toBe('true');
        expect(trigger.getAttribute('aria-describedby')).toBeTruthy();
        // The listbox keeps pointing at the trigger under the adopted id.
        expect(container.querySelector('[data-scope="select"][data-part="popup"]')!.getAttribute('aria-labelledby')).toBe(trigger.id);
    });

    it('the trigger label prop names a bare select; without it there is no aria-label', () => {
        // role="combobox" prohibits name-from-content: the value/placeholder
        // text inside the trigger can never name it, so a Select outside a
        // Field needs `label` or it is a nameless button to AT (#326).
        render(
            <Select.Root placeholder="Pick a fruit…">
                <Select.Trigger label="Fruit">
                    <Select.Value />
                </Select.Trigger>
            </Select.Root>,
            container,
        );
        expect(container.querySelector('[data-part="trigger"]')!.getAttribute('aria-label')).toBe('Fruit');

        const c2 = document.createElement('div');
        document.body.appendChild(c2);
        // No label prop: no aria-label — inside a Field it would OVERRIDE
        // the field's visible label, so absence must stay absence.
        render(
            <Select.Root placeholder="Pick a fruit…">
                <Select.Trigger>
                    <Select.Value />
                </Select.Trigger>
            </Select.Root>,
            c2,
        );
        expect(c2.querySelector('[data-part="trigger"]')!.hasAttribute('aria-label')).toBe(false);
    });

    it('a bare select outside a field announces its own invalid/required props', () => {
        render(
            <Select.Root invalid required placeholder="Pick a fruit…">
                <Select.Trigger>
                    <Select.Value />
                </Select.Trigger>
            </Select.Root>,
            container,
        );
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        expect(trigger.getAttribute('aria-invalid')).toBe('true');
        expect(trigger.getAttribute('aria-required')).toBe('true');
    });

    it('scrolls the highlighted option into view as the highlight moves', async () => {
        const state = signal({ fruit: '' });
        mount(state);
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.click();
        const items = container.querySelectorAll<HTMLElement>('[data-part="item"]');
        const scrolled = vi.fn();
        items[1]!.scrollIntoView = scrolled;
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }));
        await tick();
        // block:'nearest' — never yank the page, just keep the option visible.
        expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' });
    });
});
