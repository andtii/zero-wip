import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { signal } from 'sigx';
import { Popover, popoverAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

describe('Popover', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    function mount(state: { open: boolean }) {
        render(
            <Popover.Root model={[state, 'open']}>
                <Popover.Trigger>Filters</Popover.Trigger>
                <Popover.Popup>
                    <Popover.Title>Filters</Popover.Title>
                    <Popover.Close>Done</Popover.Close>
                </Popover.Popup>
            </Popover.Root>,
            container,
        );
    }

    it('renders a valid anatomy with the popover attribute', () => {
        mount(signal({ open: false }));
        expectAnatomy(container, popoverAnatomy);
        const popup = container.querySelector<HTMLElement>('[data-part="popup"]')!;
        expect(popup.getAttribute('popover')).toBe('auto');
        expect(popup.getAttribute('role')).toBe('dialog');
    });

    it('trigger toggles, close closes, aria wiring holds', () => {
        const state = signal({ open: false });
        mount(state);
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        const popup = container.querySelector<HTMLElement>('[data-part="popup"]')!;
        expect(trigger.getAttribute('aria-controls')).toBe(popup.id);
        expect(popup.getAttribute('aria-labelledby')).toBe(container.querySelector('[data-part="title"]')!.id);

        trigger.click();
        expect(state.open).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(popup.getAttribute('data-state')).toBe('open');

        trigger.click();
        expect(state.open).toBe(false);

        trigger.click();
        container.querySelector<HTMLElement>('[data-part="close"]')!.click();
        expect(state.open).toBe(false);
    });

    it('native toggle events (light dismiss) sync into the model', () => {
        const state = signal({ open: true });
        mount(state);
        const popup = container.querySelector<HTMLElement>('[data-part="popup"]')!;
        const e = new Event('toggle');
        (e as unknown as { newState: string }).newState = 'closed';
        popup.dispatchEvent(e);
        expect(state.open).toBe(false);
    });
});
