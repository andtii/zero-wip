import { describe, it, expect, vi } from 'vitest';
import {
    createAnchorPosition, createControllableState, createListController, createRovingKeydown,
    fixedPositionStrategy, pointAnchor,
} from '@sigx/zero';
import type { ListItem, PositionAnchor } from '@sigx/zero';
import { signal } from 'sigx';
import { createModel } from '@sigx/runtime-core';

describe('createControllableState', () => {
    it('uncontrolled: internal state + change callback', () => {
        const onChange = vi.fn();
        const state = createControllableState<string>(() => undefined, 'a', onChange);
        expect(state.value).toBe('a');
        state.value = 'b';
        expect(state.value).toBe('b');
        expect(onChange).toHaveBeenCalledWith('b');
    });

    it('same-value writes do not fire onChange', () => {
        const onChange = vi.fn();
        const state = createControllableState<string>(() => undefined, 'a', onChange);
        state.value = 'a';
        expect(onChange).not.toHaveBeenCalled();
    });

    it('controlled: the model is the source of truth', () => {
        const backing = signal({ open: false });
        const model = createModel<boolean>([backing, 'open'], (v) => { backing.open = v; });
        const onChange = vi.fn();
        const state = createControllableState<boolean>(() => model, false, onChange);

        state.value = true;
        expect(backing.open).toBe(true);
        expect(state.value).toBe(true);
        expect(onChange).toHaveBeenCalledWith(true);

        backing.open = false;
        expect(state.value).toBe(false);
    });
});

function fakeItem(value: string, disabled = false): ListItem & { focused: boolean } {
    const el = document.createElement('button');
    document.body.appendChild(el);
    const item = {
        id: value,
        value,
        disabled: () => disabled,
        el: () => el,
        textValue: () => value,
        focused: false,
    };
    el.focus = () => { item.focused = true; };
    return item;
}

describe('createListController', () => {
    it('registers, unregisters and filters disabled', () => {
        const list = createListController();
        const un = list.register(fakeItem('a'));
        list.register(fakeItem('b', true));
        list.register(fakeItem('c'));
        expect(list.items().map((i) => i.value)).toEqual(['a', 'b', 'c']);
        expect(list.enabledItems().map((i) => i.value)).toEqual(['a', 'c']);
        un();
        expect(list.items().map((i) => i.value)).toEqual(['b', 'c']);
    });
});

describe('createRovingKeydown', () => {
    function setup() {
        const list = createListController();
        const items = [fakeItem('a'), fakeItem('b', true), fakeItem('c')];
        for (const i of items) list.register(i);
        const moves: string[] = [];
        const keydown = createRovingKeydown({
            list,
            orientation: () => 'horizontal',
            onMove: (item) => moves.push(item.value),
        });
        return { items, moves, keydown };
    }

    const key = (k: string) => new KeyboardEvent('keydown', { key: k, cancelable: true });

    it('ArrowRight skips disabled items', () => {
        const { items, moves, keydown } = setup();
        keydown(key('ArrowRight'), 'a');
        expect(moves).toEqual(['c']);
        expect(items[2]!.focused).toBe(true);
    });

    it('wraps around by default', () => {
        const { moves, keydown } = setup();
        keydown(key('ArrowRight'), 'c');
        expect(moves).toEqual(['a']);
    });

    it('Home and End jump to edges', () => {
        const { moves, keydown } = setup();
        keydown(key('End'), 'a');
        keydown(key('Home'), 'c');
        expect(moves).toEqual(['c', 'a']);
    });

    it('vertical orientation ignores horizontal arrows', () => {
        const list = createListController();
        list.register(fakeItem('a'));
        list.register(fakeItem('b'));
        const moves: string[] = [];
        const keydown = createRovingKeydown({
            list,
            orientation: () => 'vertical',
            onMove: (i) => moves.push(i.value),
        });
        keydown(key('ArrowRight'), 'a');
        expect(moves).toEqual([]);
        keydown(key('ArrowDown'), 'a');
        expect(moves).toEqual(['b']);
    });
});

/** A floating element with a mocked layout size (happy-dom does no layout). */
function fakeFloating(width: number, height: number): HTMLElement {
    const el = document.createElement('div');
    Object.defineProperty(el, 'offsetWidth', { value: width });
    Object.defineProperty(el, 'offsetHeight', { value: height });
    document.body.appendChild(el);
    return el;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('pointAnchor', () => {
    it('reports a zero-size rect at the point', () => {
        const rect = pointAnchor(120, 45).getBoundingClientRect();
        expect(rect.left).toBe(120);
        expect(rect.top).toBe(45);
        expect(rect.width).toBe(0);
        expect(rect.height).toBe(0);
        expect(rect.right).toBe(120);
        expect(rect.bottom).toBe(45);
    });

    it('supports a square virtual size', () => {
        const rect = pointAnchor(10, 20, 4).getBoundingClientRect();
        expect(rect.width).toBe(4);
        expect(rect.right).toBe(14);
        expect(rect.bottom).toBe(24);
    });
});

describe('fixedPositionStrategy with a virtual anchor', () => {
    it('places bottom-start off the point', () => {
        const floating = fakeFloating(100, 40);
        const cleanup = fixedPositionStrategy.apply(pointAnchor(200, 100), floating, {
            placement: 'bottom-start', offset: 2, flip: true,
        });
        expect(floating.style.position).toBe('fixed');
        expect(floating.style.left).toBe('200px');
        expect(floating.style.top).toBe('102px');
        expect(floating.getAttribute('data-placement')).toBe('bottom-start');
        cleanup();
    });

    it('flips to the opposite side at the viewport edge', () => {
        const floating = fakeFloating(100, 40);
        const y = window.innerHeight - 10;
        const cleanup = fixedPositionStrategy.apply(pointAnchor(200, y), floating, {
            placement: 'bottom-start', offset: 2, flip: true,
        });
        expect(floating.getAttribute('data-placement')).toBe('top-start');
        expect(floating.style.top).toBe(`${y - 40 - 2}px`);
        cleanup();
    });
});

describe('createAnchorPosition handle', () => {
    it('update() repositions against a moved virtual anchor without a close/reopen', async () => {
        const state = signal({ open: false });
        let anchor: PositionAnchor = pointAnchor(50, 50);
        const floating = fakeFloating(100, 40);

        const handle = createAnchorPosition({
            getAnchor: () => anchor,
            getFloating: () => floating,
            isOpen: () => state.open,
            placement: () => 'bottom-start',
            offset: () => 2,
        });

        // No-op while closed.
        handle.update();
        expect(floating.style.top).toBe('');

        state.open = true;
        await tick();
        expect(floating.style.top).toBe('52px');
        expect(floating.style.left).toBe('50px');

        anchor = pointAnchor(300, 200);
        handle.update();
        expect(floating.style.top).toBe('202px');
        expect(floating.style.left).toBe('300px');

        state.open = false;
        await tick();
        // Closed again: the handle went inert.
        anchor = pointAnchor(400, 300);
        handle.update();
        expect(floating.style.left).toBe('300px');
    });
});
