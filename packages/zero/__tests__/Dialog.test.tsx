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
                <Dialog.Footer>
                    <Dialog.Close>Close</Dialog.Close>
                </Dialog.Footer>
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
        expect(container.querySelector('footer[data-part="footer"]')).not.toBeNull();
        // The backdrop part renders no element — it projects onto the native
        // ::backdrop; only recipes ever address it.
        expect(container.querySelector('[data-part="backdrop"]')).toBeNull();
    });

    it('passes the variant axes through on the trigger (the carrier part)', () => {
        render(
            <Dialog.Root>
                <Dialog.Trigger color="primary" size="sm">Open</Dialog.Trigger>
            </Dialog.Root>,
            container,
        );
        const trigger = container.querySelector<HTMLElement>('[data-scope="dialog"][data-part="trigger"]')!;
        expect(trigger.getAttribute('data-color')).toBe('primary');
        expect(trigger.getAttribute('data-size')).toBe('sm');
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

    it('publishes press feedback on the trigger and the close button', () => {
        mount(container, signal({ open: true }));
        for (const part of ['trigger', 'close'] as const) {
            const el = container.querySelector<HTMLElement>(`[data-part="${part}"]`)!;
            el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
            expect(el.hasAttribute('data-pressed')).toBe(true);
            el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
            expect(el.hasAttribute('data-pressed')).toBe(false);
        }
    });

    it('publishes no press feedback on a disabled trigger', () => {
        render(
            <Dialog.Root model={[signal({ open: false }), 'open']}>
                <Dialog.Trigger disabled>Open</Dialog.Trigger>
            </Dialog.Root>,
            container,
        );
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(trigger.hasAttribute('data-pressed')).toBe(false);
    });

    it('native close events sync back into the model', () => {
        const state = signal({ open: true });
        mount(container, state);
        const popup = container.querySelector<HTMLDialogElement>('dialog')!;
        popup.dispatchEvent(new Event('close'));
        expect(state.open).toBe(false);
    });
});
