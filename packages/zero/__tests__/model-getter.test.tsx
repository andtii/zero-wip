import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { signal } from 'sigx';
import { Input, Switch, Tabs } from '@sigx/zero';

describe('getter-form model binding', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('Switch: model={() => state.on} reads and writes back', () => {
        const state = signal({ on: false });
        render(<Switch.Root model={() => state.on}>Label</Switch.Root>, container);
        const input = container.querySelector<HTMLInputElement>('input')!;

        // write-back: DOM change updates the signal
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        expect(state.on).toBe(true);

        // read: signal change updates the DOM
        state.on = false;
        expect(container.querySelector('[data-part="root"]')!.getAttribute('data-state')).toBe('unchecked');
    });

    it('Tabs: model={() => state.tab} two-way', () => {
        const state = signal({ tab: 'a' });
        render(
            <Tabs.Root model={() => state.tab}>
                <Tabs.List>
                    <Tabs.Tab value="a">A</Tabs.Tab>
                    <Tabs.Tab value="b">B</Tabs.Tab>
                </Tabs.List>
            </Tabs.Root>,
            container,
        );
        const tabs = container.querySelectorAll<HTMLElement>('[data-part="tab"]');
        tabs[1]!.click();
        expect(state.tab).toBe('b');
        state.tab = 'a';
        expect(tabs[0]!.getAttribute('data-state')).toBe('active');
    });

    it('Input: model={() => state.email} two-way', () => {
        const state = signal({ email: '' });
        render(
            <Input.Root model={() => state.email}>
                <Input.Control><Input.Input /></Input.Control>
            </Input.Root>,
            container,
        );
        const input = container.querySelector<HTMLInputElement>('[data-part="input"]')!;

        input.value = 'a@b.c';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(state.email).toBe('a@b.c');

        // The read direction, which typing alone cannot prove: the field
        // follows the signal when something else writes it.
        state.email = 'x@y.z';
        expect(input.value).toBe('x@y.z');
    });
});
