import { describe, it, expect } from 'vitest';
import { anatomies, defineAnatomy } from '@sigx/zero/anatomy';
import { FLAG_VOCABULARY } from '@sigx/zero';

describe('defineAnatomy', () => {
    const a = defineAnatomy('demo', {
        root: { element: 'div', states: ['open', 'closed'], flags: ['disabled'] },
        item: { element: 'button' },
    });

    it('builds selectors', () => {
        expect(a.selector('root')).toBe('[data-scope="demo"][data-part="root"]');
        expect(a.selector('root', { state: 'open' })).toBe('[data-scope="demo"][data-part="root"][data-state="open"]');
        expect(a.selector('item', { flags: ['disabled'] })).toBe('[data-scope="demo"][data-part="item"][data-disabled]');
    });

    it('emits JSON with per-state selectors', () => {
        const json = a.toJSON();
        expect(json.scope).toBe('demo');
        const root = json.parts.find((p) => p.name === 'root')!;
        expect(root.selectors.open).toBe('[data-state="open"]');
        expect(root.selectors.disabled).toBe('[data-disabled]');
        // JSON-safe
        expect(() => JSON.stringify(json)).not.toThrow();
    });
});

describe('anatomy registry', () => {
    it('contains every component', () => {
        expect(Object.keys(anatomies).sort()).toEqual([
            'accordion', 'button', 'checkbox', 'collapsible', 'dialog', 'field', 'menu',
            'popover',
            'progress', 'radio-group', 'select', 'slider', 'switch', 'tabs', 'tooltip',
        ]);
    });

    it('all part names and scopes are kebab-case', () => {
        for (const anatomy of Object.values(anatomies)) {
            expect(anatomy.scope).toMatch(/^[a-z][a-z0-9-]*$/);
            for (const part of anatomy.partNames()) {
                expect(part).toMatch(/^[a-z][a-z0-9-]*$/);
            }
        }
    });

    it('all flags come from the shared vocabulary', () => {
        const vocabulary = new Set<string>(FLAG_VOCABULARY);
        for (const anatomy of Object.values(anatomies)) {
            for (const part of Object.values(anatomy.parts)) {
                for (const flag of part.flags ?? []) {
                    expect(vocabulary.has(flag), `${anatomy.scope}: flag "${flag}"`).toBe(true);
                }
            }
        }
    });
});
