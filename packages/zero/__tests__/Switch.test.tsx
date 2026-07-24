import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { signal } from 'sigx';
import { Switch, switchAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

describe('Switch', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('renders a valid anatomy over a native checkbox with role=switch', () => {
        render(<Switch.Root defaultChecked>Label</Switch.Root>, container);
        expectAnatomy(container, switchAnatomy);
        const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
        expect(input.getAttribute('role')).toBe('switch');
        expect(input.checked).toBe(true);
        expect(container.querySelector('[data-part="root"]')!.getAttribute('data-state')).toBe('checked');
    });

    it('native change syncs the model both ways', () => {
        const state = signal({ on: false });
        render(<Switch.Root model={[state, 'on']}>Label</Switch.Root>, container);
        const input = container.querySelector<HTMLInputElement>('input')!;

        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        expect(state.on).toBe(true);
        expect(container.querySelector('[data-part="thumb"]')!.getAttribute('data-state')).toBe('checked');

        state.on = false;
        expect(input.checked).toBe(false);
        expect(container.querySelector('[data-part="control"]')!.getAttribute('data-state')).toBe('unchecked');
    });

    it('passes contract variant axes through as data attributes', () => {
        render(<Switch.Root color="success" size="lg" variant="soft" />, container);
        const root = container.querySelector('[data-part="root"]')!;
        expect(root.getAttribute('data-color')).toBe('success');
        expect(root.getAttribute('data-size')).toBe('lg');
        expect(root.getAttribute('data-variant')).toBe('soft');
    });

    it('disabled and form wiring', () => {
        render(<Switch.Root disabled name="notify" value="yes" />, container);
        const input = container.querySelector<HTMLInputElement>('input')!;
        expect(input.disabled).toBe(true);
        expect(input.name).toBe('notify');
        expect(input.value).toBe('yes');
        expect(container.querySelector('[data-part="root"]')!.getAttribute('data-disabled')).toBe('');
    });
});
