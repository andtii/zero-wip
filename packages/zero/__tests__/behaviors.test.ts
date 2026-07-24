import { describe, it, expect, vi } from 'vitest';
import { createControllableState, createListController, createRovingKeydown } from '@sigx/zero';
import type { ListItem } from '@sigx/zero';
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
