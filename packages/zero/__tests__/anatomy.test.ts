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

    describe('pseudo parts', () => {
        const withPseudo = defineAnatomy('demo', {
            popup: { element: 'dialog', states: ['open', 'closed'] },
            backdrop: {
                element: 'dialog',
                states: ['open', 'closed'],
                pseudo: { of: 'popup', selector: '::backdrop' },
            },
        });

        it('projects onto the host with the pseudo-element last', () => {
            expect(withPseudo.selector('backdrop'))
                .toBe('[data-scope="demo"][data-part="popup"]::backdrop');
            // States narrow the HOST — an attribute can't narrow a
            // pseudo-element, so the suffix always comes after.
            expect(withPseudo.selector('backdrop', { state: 'open' }))
                .toBe('[data-scope="demo"][data-part="popup"][data-state="open"]::backdrop');
        });

        it('flows through toJSON for the recipe compiler', () => {
            const part = withPseudo.toJSON().parts.find((p) => p.name === 'backdrop')!;
            expect(part.pseudo).toEqual({ of: 'popup', selector: '::backdrop' });
        });

    });
});

describe('anatomy registry', () => {
    it('contains every component', () => {
        expect(Object.keys(anatomies).sort()).toEqual([
            'accordion', 'avatar', 'button', 'checkbox', 'collapsible', 'combobox', 'dialog', 'field', 'menu',
            'number-input', 'popover',
            'progress', 'radio-group', 'rating-group', 'select', 'slider', 'switch', 'tabs', 'toast', 'toggle', 'toggle-group', 'tooltip',
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

    it('every pseudo part projects onto a real part', () => {
        // defineAnatomy carries no runtime guard for this (it is on every
        // component's size budget), so the registry is checked here instead.
        for (const anatomy of Object.values(anatomies)) {
            for (const [name, part] of Object.entries(anatomy.parts)) {
                if (part.pseudo) {
                    expect(anatomy.parts[part.pseudo.of], `${anatomy.scope}.${name} → ${part.pseudo.of}`).toBeDefined();
                    expect(part.pseudo.selector).toMatch(/^::/);
                }
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
