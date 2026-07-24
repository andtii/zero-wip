import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { Tooltip, tooltipAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

describe('Tooltip', () => {
    let container: HTMLElement;
    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement('div');
        document.body.appendChild(container);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    function mount() {
        render(
            <Tooltip.Root openDelay={500}>
                <Tooltip.Trigger>Save</Tooltip.Trigger>
                <Tooltip.Popup>Save the document</Tooltip.Popup>
            </Tooltip.Root>,
            container,
        );
    }

    it('renders a valid anatomy with popover=manual and role=tooltip', () => {
        mount();
        expectAnatomy(container, tooltipAnatomy);
        const popup = container.querySelector<HTMLElement>('[data-part="popup"]')!;
        expect(popup.getAttribute('popover')).toBe('manual');
        expect(popup.getAttribute('role')).toBe('tooltip');
    });

    it('opens after the hover delay and closes on leave', () => {
        mount();
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.dispatchEvent(new Event('pointerenter'));
        expect(trigger.getAttribute('data-state')).toBe('closed');
        vi.advanceTimersByTime(500);
        expect(trigger.getAttribute('data-state')).toBe('open');
        expect(trigger.getAttribute('aria-describedby')).toBe(
            container.querySelector('[data-part="popup"]')!.id,
        );
        trigger.dispatchEvent(new Event('pointerleave'));
        expect(trigger.getAttribute('data-state')).toBe('closed');
        expect(trigger.getAttribute('aria-describedby')).toBeNull();
    });

    it('opens immediately on focus and dismisses on Escape without losing state', () => {
        mount();
        const trigger = container.querySelector<HTMLElement>('[data-part="trigger"]')!;
        trigger.dispatchEvent(new Event('focus'));
        expect(trigger.getAttribute('data-state')).toBe('open');
        trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
        expect(trigger.getAttribute('data-state')).toBe('closed');
    });
});
