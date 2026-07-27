import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { signal } from 'sigx';
import { Toggle, ToggleGroup, toggleAnatomy, toggleGroupAnatomy, type PartProps } from '@sigx/zero';
import { expectAnatomy } from './helpers';

function mountGroup(container: HTMLElement, extra: {
    defaultValue?: string[];
    multiple?: boolean;
    deselectable?: boolean;
} = {}) {
    render(
        <ToggleGroup.Root
            defaultValue={extra.defaultValue ?? []}
            multiple={extra.multiple}
            deselectable={extra.deselectable}
        >
            <ToggleGroup.Item value="left">Left</ToggleGroup.Item>
            <ToggleGroup.Item value="center">Center</ToggleGroup.Item>
            <ToggleGroup.Item value="right" disabled>Right</ToggleGroup.Item>
        </ToggleGroup.Root>,
        container,
    );
}

const items = (container: HTMLElement) =>
    container.querySelectorAll<HTMLElement>('[data-part="item"]');

describe('Toggle', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('renders a valid anatomy', () => {
        render(<Toggle.Root>B</Toggle.Root>, container);
        expectAnatomy(container, toggleAnatomy);
    });

    it('click flips state and aria-pressed', () => {
        render(<Toggle.Root>B</Toggle.Root>, container);
        const root = container.querySelector<HTMLElement>('[data-scope="toggle"]')!;
        expect(root.getAttribute('data-state')).toBe('off');
        expect(root.getAttribute('aria-pressed')).toBe('false');
        root.click();
        expect(root.getAttribute('data-state')).toBe('on');
        expect(root.getAttribute('aria-pressed')).toBe('true');
        root.click();
        expect(root.getAttribute('data-state')).toBe('off');
    });

    it('defaultPressed seeds the uncontrolled state', () => {
        render(<Toggle.Root defaultPressed>B</Toggle.Root>, container);
        const root = container.querySelector<HTMLElement>('[data-scope="toggle"]')!;
        expect(root.getAttribute('data-state')).toBe('on');
    });

    it('two-way model binding', () => {
        const state = signal({ bold: false });
        render(<Toggle.Root model={[state, 'bold']}>B</Toggle.Root>, container);
        const root = container.querySelector<HTMLElement>('[data-scope="toggle"]')!;
        root.click();
        expect(state.bold).toBe(true);
        state.bold = false;
        expect(root.getAttribute('data-state')).toBe('off');
    });

    it('disabled blocks toggling and carries the flag', () => {
        render(<Toggle.Root disabled>B</Toggle.Root>, container);
        const root = container.querySelector<HTMLElement>('[data-scope="toggle"]')!;
        expect(root.getAttribute('data-disabled')).toBe('');
        root.click();
        expect(root.getAttribute('data-state')).toBe('off');
    });

    it('asChild renders the caller element with the spread bag', () => {
        render(
            <Toggle.Root asChild>
                {(p: PartProps) => <span {...p}>B</span>}
            </Toggle.Root>,
            container,
        );
        const span = container.querySelector('span')!;
        expect(span.getAttribute('data-part')).toBe('root');
        expect(span.getAttribute('aria-pressed')).toBe('false');
    });

    it('label lands as aria-label for icon-only toggles', () => {
        render(<Toggle.Root label="Bold">B</Toggle.Root>, container);
        const root = container.querySelector<HTMLElement>('[data-scope="toggle"]')!;
        expect(root.getAttribute('aria-label')).toBe('Bold');
    });

    it('asChild on a non-button gets the button contract: role, tab stop, key activation', () => {
        render(
            <Toggle.Root asChild>
                {(p: PartProps) => <span {...p}>B</span>}
            </Toggle.Root>,
            container,
        );
        const span = container.querySelector<HTMLElement>('span')!;
        expect(span.getAttribute('role')).toBe('button');
        expect(span.tabIndex).toBe(0);
        span.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        expect(span.getAttribute('data-state')).toBe('on');
        span.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
        expect(span.getAttribute('data-state')).toBe('off');
    });

    it('asChild on a native button does not double-toggle from key activation', () => {
        render(
            <Toggle.Root asChild>
                {(p: PartProps) => <button type="button" {...p}>B</button>}
            </Toggle.Root>,
            container,
        );
        const btn = container.querySelector<HTMLElement>('button')!;
        // Keydown alone must not toggle — the platform's synthesized click
        // (dispatched here by hand) is the single activation path.
        btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        expect(btn.getAttribute('data-state')).toBe('off');
        btn.click();
        expect(btn.getAttribute('data-state')).toBe('on');
    });
});

describe('ToggleGroup', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('renders a valid anatomy', () => {
        mountGroup(container, { defaultValue: ['left'] });
        expectAnatomy(container, toggleGroupAnatomy);
    });

    it('label names the role=group container', () => {
        render(
            <ToggleGroup.Root label="Alignment">
                <ToggleGroup.Item value="a">A</ToggleGroup.Item>
            </ToggleGroup.Root>,
            container,
        );
        const root = container.querySelector<HTMLElement>('[data-part="root"]')!;
        expect(root.getAttribute('aria-label')).toBe('Alignment');
    });

    it('renders role=group with aria-pressed items', () => {
        mountGroup(container, { defaultValue: ['left'] });
        const root = container.querySelector<HTMLElement>('[data-part="root"]')!;
        expect(root.getAttribute('role')).toBe('group');
        const [left, center] = items(container);
        expect(left!.getAttribute('aria-pressed')).toBe('true');
        expect(left!.getAttribute('data-state')).toBe('on');
        expect(left!.getAttribute('data-selected')).toBe('');
        expect(center!.getAttribute('aria-pressed')).toBe('false');
        expect(center!.getAttribute('data-state')).toBe('off');
        expect(center!.hasAttribute('data-selected')).toBe(false);
    });

    it('single mode replaces the selection', () => {
        mountGroup(container, { defaultValue: ['left'] });
        const [left, center] = items(container);
        center!.click();
        expect(center!.getAttribute('data-state')).toBe('on');
        expect(left!.getAttribute('data-state')).toBe('off');
    });

    it('single mode deselects the on item by default', () => {
        mountGroup(container, { defaultValue: ['left'] });
        const [left] = items(container);
        left!.click();
        expect(left!.getAttribute('data-state')).toBe('off');
    });

    it('deselectable=false keeps the on item on', () => {
        mountGroup(container, { defaultValue: ['left'], deselectable: false });
        const [left] = items(container);
        left!.click();
        expect(left!.getAttribute('data-state')).toBe('on');
    });

    it('multiple mode accumulates and removes', () => {
        mountGroup(container, { multiple: true });
        const [left, center] = items(container);
        left!.click();
        center!.click();
        expect(left!.getAttribute('data-state')).toBe('on');
        expect(center!.getAttribute('data-state')).toBe('on');
        left!.click();
        expect(left!.getAttribute('data-state')).toBe('off');
        expect(center!.getAttribute('data-state')).toBe('on');
    });

    it('disabled items carry the flag and do not toggle', () => {
        mountGroup(container);
        const right = items(container)[2]!;
        expect(right.getAttribute('data-disabled')).toBe('');
        right.click();
        expect(right.getAttribute('data-state')).toBe('off');
    });

    it('keeps one tab stop: first selected, else first enabled', () => {
        mountGroup(container, { defaultValue: ['center'] });
        const [left, center] = items(container);
        expect(center!.tabIndex).toBe(0);
        expect(left!.tabIndex).toBe(-1);
    });

    it('falls back to the first enabled item when nothing is selected', () => {
        mountGroup(container);
        const [left, center] = items(container);
        expect(left!.tabIndex).toBe(0);
        expect(center!.tabIndex).toBe(-1);
    });

    it('arrow keys rove focus without changing the selection, skipping disabled', () => {
        mountGroup(container, { defaultValue: ['left'] });
        const all = items(container);
        all[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(all[1]);
        expect(all[0]!.getAttribute('data-state')).toBe('on');
        expect(all[1]!.getAttribute('data-state')).toBe('off');
        // From center, ArrowRight skips disabled right and wraps to left.
        all[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(all[0]);
    });

    it('Home and End jump to the edges of the enabled set', () => {
        mountGroup(container);
        const all = items(container);
        all[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
        // right is disabled — End lands on center.
        expect(document.activeElement).toBe(all[1]);
        all[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(all[0]);
    });

    it('two-way model binding with string[]', () => {
        const state = signal({ marks: [] as string[] });
        render(
            <ToggleGroup.Root multiple model={[state, 'marks']}>
                <ToggleGroup.Item value="bold">B</ToggleGroup.Item>
                <ToggleGroup.Item value="italic">I</ToggleGroup.Item>
            </ToggleGroup.Root>,
            container,
        );
        const all = items(container);
        all[0]!.click();
        all[1]!.click();
        expect([...state.marks]).toEqual(['bold', 'italic']);
        state.marks = ['italic'];
        expect(all[0]!.getAttribute('data-state')).toBe('off');
        expect(all[1]!.getAttribute('data-state')).toBe('on');
    });

    it('group disabled disables every item', () => {
        render(
            <ToggleGroup.Root disabled>
                <ToggleGroup.Item value="a">A</ToggleGroup.Item>
            </ToggleGroup.Root>,
            container,
        );
        const item = items(container)[0]!;
        expect(item.getAttribute('data-disabled')).toBe('');
        item.click();
        expect(item.getAttribute('data-state')).toBe('off');
    });

    it('publishes press feedback on an item press and release', () => {
        mountGroup(container);
        const left = items(container)[0]!;
        left.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        expect(left.hasAttribute('data-pressed')).toBe(true);
        left.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        expect(left.hasAttribute('data-pressed')).toBe(false);
    });

    it('asChild renders the caller element with the spread bag', () => {
        render(
            <ToggleGroup.Root defaultValue={['a']}>
                <ToggleGroup.Item value="a" asChild>
                    {(p: PartProps) => <span {...p}>A</span>}
                </ToggleGroup.Item>
            </ToggleGroup.Root>,
            container,
        );
        const span = container.querySelector('span')!;
        expect(span.getAttribute('data-part')).toBe('item');
        expect(span.getAttribute('data-state')).toBe('on');
        expect(span.getAttribute('aria-pressed')).toBe('true');
        // Non-button asChild items get the button contract supplied.
        expect(span.getAttribute('role')).toBe('button');
        span.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
        expect(span.getAttribute('data-state')).toBe('off');
    });
});
