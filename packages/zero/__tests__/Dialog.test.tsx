import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { signal } from 'sigx';
import { Dialog, dialogAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

function mount(container: HTMLElement, state: { open: boolean }) {
    render(
        <Dialog.Root model={[state, 'open']}>
            <Dialog.Trigger>Open</Dialog.Trigger>
            <Dialog.Popup>
                <Dialog.Title>Title</Dialog.Title>
                <Dialog.Description>Description</Dialog.Description>
                <Dialog.Close>Close</Dialog.Close>
            </Dialog.Popup>
        </Dialog.Root>,
        container,
    );
}

describe('Dialog', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('renders a valid anatomy on a native dialog element', () => {
        mount(container, signal({ open: false }));
        expectAnatomy(container, dialogAnatomy);
        expect(container.querySelector('dialog[data-part="popup"]')).not.toBeNull();
    });

    it('labels the popup from rendered title and description', () => {
        mount(container, signal({ open: false }));
        const popup = container.querySelector<HTMLElement>('[data-part="popup"]')!;
        const title = container.querySelector<HTMLElement>('[data-part="title"]')!;
        const description = container.querySelector<HTMLElement>('[data-part="description"]')!;
        expect(popup.getAttribute('aria-labelledby')).toBe(title.id);
        expect(popup.getAttribute('aria-describedby')).toBe(description.id);
    });

    it('trigger opens, close closes, state stays in the model', () => {
        const state = signal({ open: false });
        mount(container, state);
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
        expect(trigger.getAttribute('aria-expanded')).toBe('false');

        trigger.click();
        expect(state.open).toBe(true);
        expect(trigger.getAttribute('data-state')).toBe('open');
        expect(container.querySelector('[data-part="popup"]')!.getAttribute('data-state')).toBe('open');

        container.querySelector<HTMLElement>('[data-part="close"]')!.click();
        expect(state.open).toBe(false);
        expect(trigger.getAttribute('data-state')).toBe('closed');
    });

    it('native close events sync back into the model', () => {
        const state = signal({ open: true });
        mount(container, state);
        const popup = container.querySelector<HTMLDialogElement>('dialog')!;
        popup.dispatchEvent(new Event('close'));
        expect(state.open).toBe(false);
    });
});
