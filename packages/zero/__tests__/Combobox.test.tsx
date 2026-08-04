import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { component, signal } from 'sigx';
import { Combobox, Field, comboboxAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

/** watch()-driven syncs settle a tick after the write. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const FRUIT = ['Apple', 'Banana', 'Cherry'];

describe('Combobox', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    function harness(opts: { disabledBanana?: boolean } = {}) {
        const state = signal({ value: '', query: '', open: false });
        const List = component(() => {
            return () => {
                const matches = FRUIT.filter((f) => f.toLowerCase().includes(state.query.toLowerCase()));
                return (
                    <>
                        {matches.map((f) => (
                            <Combobox.Item value={f.toLowerCase()} disabled={opts.disabledBanana && f === 'Banana'} key={f}>
                                {f}
                            </Combobox.Item>
                        ))}
                        {matches.length === 0 ? <Combobox.Empty>No fruit found</Combobox.Empty> : null}
                    </>
                );
            };
        }, { name: 'List' });

        render(
            <Combobox.Root
                model={[state, 'value']}
                model:inputValue={[state, 'query']}
                model:open={[state, 'open']}
                name="fruit"
                placeholder="Search fruit…"
            >
                <Combobox.Control>
                    <Combobox.Input />
                    <Combobox.Trigger />
                </Combobox.Control>
                <Combobox.Popup>
                    <List />
                </Combobox.Popup>
            </Combobox.Root>,
            container,
        );

        return {
            state,
            input: container.querySelector<HTMLInputElement>('[data-part="input"]')!,
            trigger: container.querySelector<HTMLElement>('[data-part="trigger"]')!,
            popup: container.querySelector<HTMLElement>('[data-part="popup"]')!,
            items: () => [...container.querySelectorAll<HTMLElement>('[data-part="item"]')],
        };
    }

    function type(input: HTMLInputElement, text: string) {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function key(el: HTMLElement, k: string) {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true, bubbles: true }));
    }

    it('renders a valid anatomy with the editable-combobox ARIA', () => {
        const { input, popup, trigger } = harness();
        trigger.click();
        expectAnatomy(container, comboboxAnatomy);
        expect(input.getAttribute('role')).toBe('combobox');
        expect(input.getAttribute('aria-autocomplete')).toBe('list');
        expect(input.getAttribute('aria-controls')).toBe(popup.id);
        expect(popup.getAttribute('role')).toBe('listbox');
        expect(popup.getAttribute('aria-labelledby')).toBe(input.id);
        expect(popup.getAttribute('popover')).toBe('manual');
        const hidden = container.querySelector<HTMLInputElement>('[data-part="hidden-input"]')!;
        expect(hidden.getAttribute('name')).toBe('fruit');
    });

    it('named models bind end-to-end: value, inputValue and open', async () => {
        const { state, input, trigger, items } = harness();
        // open flows out…
        trigger.click();
        expect(state.open).toBe(true);
        // …and in.
        state.open = false;
        expect(container.querySelector('[data-part="popup"]')!.getAttribute('data-state')).toBe('closed');
        // typing writes the inputValue model,
        type(input, 'ba');
        expect(state.query).toBe('ba');
        expect(state.open).toBe(true); // typing reopens
        // selection writes the value model and syncs the text.
        items().find((i) => i.textContent!.includes('Banana'))!.click();
        expect(state.value).toBe('banana');
        expect(state.query).toBe('Banana');
        expect(state.open).toBe(false);
        // An external value write reflects into the input text — via the
        // item's label when it is mounted, the raw value otherwise (the
        // consumer owns filtering, so an unmounted item's label is unknown).
        type(input, ''); // clear the filter: all items mounted again
        state.value = 'cherry';
        await tick();
        expect(state.query).toBe('Cherry');
        expect(input.value).toBe('Cherry');
    });

    it('ArrowDown opens and highlights first; arrows move; Enter selects, closes and fills', () => {
        const { state, input, items } = harness();
        key(input, 'ArrowDown');
        expect(state.open).toBe(true);
        expect(items()[0]!.hasAttribute('data-highlighted')).toBe(true);
        expect(input.getAttribute('aria-activedescendant')).toBe(items()[0]!.id);
        key(input, 'ArrowDown');
        expect(items()[1]!.hasAttribute('data-highlighted')).toBe(true);
        key(input, 'Enter');
        expect(state.value).toBe('banana');
        expect(state.open).toBe(false);
        expect(input.value).toBe('Banana');
    });

    it('arrow movement skips disabled items', () => {
        const { input, items } = harness({ disabledBanana: true });
        key(input, 'ArrowDown');
        key(input, 'ArrowDown');
        expect(items()[1]!.hasAttribute('data-highlighted')).toBe(false);
        expect(items()[2]!.hasAttribute('data-highlighted')).toBe(true);
    });

    it('Escape closes; Tab closes without being swallowed; Home stays with the caret', () => {
        const { state, input } = harness();
        key(input, 'ArrowDown');
        expect(state.open).toBe(true);
        key(input, 'Escape');
        expect(state.open).toBe(false);
        key(input, 'ArrowDown');
        const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
        input.dispatchEvent(tab);
        expect(state.open).toBe(false);
        expect(tab.defaultPrevented).toBe(false);
        key(input, 'ArrowDown');
        const home = new KeyboardEvent('keydown', { key: 'Home', cancelable: true, bubbles: true });
        input.dispatchEvent(home);
        expect(home.defaultPrevented).toBe(false);
    });

    it('consumer filtering unmounts items and prunes a dangling highlight', () => {
        const { state, input, items } = harness();
        key(input, 'ArrowDown');
        key(input, 'ArrowDown'); // highlight Banana
        expect(input.getAttribute('aria-activedescendant')).toBe(items()[1]!.id);
        type(input, 'ap'); // Banana unmounts
        expect(items().map((i) => i.textContent!.trim())).toEqual(['Apple']);
        expect(state.open).toBe(true);
        // No stale reference to the removed option.
        expect(input.hasAttribute('aria-activedescendant')).toBe(false);
        type(input, 'zzz');
        expect(items()).toHaveLength(0);
        expect(container.querySelector('[data-part="empty"]')!.textContent).toBe('No fruit found');
    });

    it('publishes press feedback on the trigger and pointer-only on items', () => {
        const { trigger, items } = harness();
        trigger.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(true);
        trigger.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(false);
        trigger.click();
        const item = items()[0]!;
        item.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(item.hasAttribute('data-pressed')).toBe(true);
        item.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        expect(item.hasAttribute('data-pressed')).toBe(false);
    });

    it('scrolls the highlighted option into view as the highlight moves', async () => {
        const h = harness();
        h.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }));
        await tick();
        const items = container.querySelectorAll<HTMLElement>('[data-part="item"]');
        const scrolled = vi.fn();
        items[1]!.scrollIntoView = scrolled;
        h.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }));
        await tick();
        // block:'nearest' — never yank the page, just keep the option visible.
        expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' });
    });

    it('adopts field wiring: label for, describedby, invalid', () => {
        render(
            <Field.Root invalid>
                <Field.Label>Fruit</Field.Label>
                <Combobox.Root>
                    <Combobox.Control>
                        <Combobox.Input />
                        <Combobox.Trigger />
                    </Combobox.Control>
                    <Combobox.Popup>
                        <Combobox.Item value="apple">Apple</Combobox.Item>
                    </Combobox.Popup>
                </Combobox.Root>
                <Field.Error>Required</Field.Error>
            </Field.Root>,
            container,
        );
        const input = container.querySelector<HTMLInputElement>('[data-part="input"]')!;
        const label = container.querySelector<HTMLElement>('[data-scope="field"][data-part="label"]')!;
        expect(label.getAttribute('for')).toBe(input.id);
        expect(input.getAttribute('aria-describedby')).toBeTruthy();
        expect(input.getAttribute('data-invalid')).toBe('');
        expect(container.querySelector('[data-scope="combobox"][data-part="control"]')!.getAttribute('data-invalid')).toBe('');
    });

    it('a defaultValue reflects its item label into the input on mount', async () => {
        render(
            <Combobox.Root defaultValue="banana">
                <Combobox.Control>
                    <Combobox.Input />
                    <Combobox.Trigger label="Open the list" />
                </Combobox.Control>
                <Combobox.Popup>
                    <Combobox.Item value="banana">Banana</Combobox.Item>
                </Combobox.Popup>
            </Combobox.Root>,
            container,
        );
        await tick();
        expect(container.querySelector<HTMLInputElement>('[data-part="input"]')!.value).toBe('Banana');
        expect(container.querySelector('[data-part="trigger"]')!.getAttribute('aria-label')).toBe('Open the list');
    });

    it('the mount sync never clobbers a live query', async () => {
        render(
            <Combobox.Root defaultValue="banana" defaultInputValue="ban">
                <Combobox.Control>
                    <Combobox.Input />
                    <Combobox.Trigger />
                </Combobox.Control>
                <Combobox.Popup>
                    <Combobox.Item value="banana">Banana</Combobox.Item>
                </Combobox.Popup>
            </Combobox.Root>,
            container,
        );
        await tick();
        // The item mounted with the value already selected, but the text is
        // a real query ('ban' ≠ '' and ≠ the raw value) — hands off.
        expect(container.querySelector<HTMLInputElement>('[data-part="input"]')!.value).toBe('ban');
    });

    it('the selected item shows its indicator', () => {
        const { input, items, trigger } = harness();
        key(input, 'ArrowDown');
        key(input, 'Enter'); // select Apple
        trigger.click(); // reopen
        const apple = items()[0]!;
        expect(apple.getAttribute('data-selected')).toBe('');
        expect(apple.querySelector('[data-part="item-indicator"]')).not.toBeNull();
    });
});
