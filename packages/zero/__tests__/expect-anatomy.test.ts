import { describe, expect, it } from 'vitest';
// Consumer-shaped on purpose: an ecosystem component package imports the
// conformance helper from the published subpath, and builds its anatomy from
// the same public surface — this test is the contract for that flow.
import { expectAnatomy } from '@sigx/zero/testing';
import { defineAnatomy } from '@sigx/zero/anatomy';
import { synthesizesClickFrom } from '@sigx/zero';

const demoAnatomy = defineAnatomy('demo-stepper', {
    'root': { element: 'div', states: ['idle', 'stepping'] },
    'step': { element: 'button', states: ['active', 'inactive'], flags: ['disabled'] },
    'hint': { element: 'span', states: ['idle', 'stepping'], hiddenIn: ['idle'] },
});

function part(name: string, attrs: Record<string, string> = {}): HTMLElement {
    const el = document.createElement('div');
    el.setAttribute('data-scope', 'demo-stepper');
    el.setAttribute('data-part', name);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
}

function mount(...els: HTMLElement[]): HTMLElement {
    const container = document.createElement('div');
    for (const el of els) container.append(el);
    return container;
}

describe('expectAnatomy (public conformance helper)', () => {
    it('passes a conforming render', () => {
        const hidden = part('hint', { 'data-state': 'idle' });
        hidden.setAttribute('hidden', '');
        const container = mount(
            part('root', { 'data-state': 'idle' }),
            part('step', { 'data-state': 'active', 'data-disabled': '' }),
            hidden,
        );
        expect(() => expectAnatomy(container, demoAnatomy)).not.toThrow();
    });

    it('validates the container itself when it is a scoped part', () => {
        // The common shape: the component's root element is what the test has
        // in hand. Its own violations must not escape the walk.
        const root = part('root', { 'data-state': 'idle' });
        root.append(part('step', { 'data-state': 'active' }));
        expect(() => expectAnatomy(root, demoAnatomy)).not.toThrow();

        const bad = part('root', { 'data-state': 'exploded' });
        expect(() => expectAnatomy(bad, demoAnatomy)).toThrow(/data-state="exploded"/);
    });

    it('fails when nothing rendered for the scope', () => {
        expect(() => expectAnatomy(mount(), demoAnatomy)).toThrow(/no parts rendered/);
    });

    it('fails an undeclared part', () => {
        const container = mount(part('root', { 'data-state': 'idle' }), part('mystery'));
        expect(() => expectAnatomy(container, demoAnatomy)).toThrow(/"mystery" is not declared/);
    });

    it('fails a state outside the closed set', () => {
        const container = mount(part('root', { 'data-state': 'exploded' }));
        expect(() => expectAnatomy(container, demoAnatomy)).toThrow(/data-state="exploded"/);
    });

    it('fails an undeclared flag, and a flag carrying a value', () => {
        expect(() => expectAnatomy(mount(part('root', { 'data-state': 'idle', 'data-checked': '' })), demoAnatomy))
            .toThrow(/undeclared flag "checked"/);
        expect(() => expectAnatomy(mount(part('step', { 'data-state': 'active', 'data-disabled': 'true' })), demoAnatomy))
            .toThrow(/presence-only/);
    });

    it('checks hiddenIn in both directions', () => {
        // Visible in a state hiddenIn names.
        expect(() => expectAnatomy(mount(part('hint', { 'data-state': 'idle' })), demoAnatomy))
            .toThrow(/says otherwise/);
        // Hidden in a state it does not name.
        const wronglyHidden = part('hint', { 'data-state': 'stepping' });
        wronglyHidden.setAttribute('hidden', '');
        expect(() => expectAnatomy(mount(wronglyHidden), demoAnatomy)).toThrow(/says otherwise/);
    });

    it('skips variant surface: contract axes, declared custom axes, and mods', () => {
        const container = mount(part('root', {
            'data-state': 'idle',
            'data-color': 'primary',
            'data-size': 'md',
            'data-variant': 'soft',
            'data-mod-icon-only': '',
            'data-emphasis': 'loud',
        }));
        expect(() => expectAnatomy(container, demoAnatomy, { axes: ['emphasis'] })).not.toThrow();
        // The same custom axis without the declaration reads as an undeclared flag.
        expect(() => expectAnatomy(container, demoAnatomy)).toThrow(/undeclared flag "emphasis"/);
    });

    it('rejects contract-owned names in the axes option', () => {
        const container = mount(part('root', { 'data-state': 'idle' }));
        // A flag from the shared vocabulary, and an axis with a prop of its
        // own — exempting either would silently bypass a real check.
        expect(() => expectAnatomy(container, demoAnatomy, { axes: ['disabled'] })).toThrow(/part of the anatomy contract/);
        expect(() => expectAnatomy(container, demoAnatomy, { axes: ['state'] })).toThrow(/part of the anatomy contract/);
        expect(() => expectAnatomy(container, demoAnatomy, { axes: ['color'] })).toThrow(/part of the anatomy contract/);
        // HTML lowercases attribute names — a camelCase exemption can never
        // match, so it is rejected rather than silently not applying.
        expect(() => expectAnatomy(container, demoAnatomy, { axes: ['iconOnly'] })).toThrow(/kebab-case/);
        // A "mod-…" axis would exempt a modifier from its presence-only check.
        expect(() => expectAnatomy(container, demoAnatomy, { axes: ['mod-icon-only'] })).toThrow(/modifier namespace/);
    });

    it('holds mods to presence-only even though they are exempt from declaration', () => {
        const container = mount(part('root', { 'data-state': 'idle', 'data-mod-icon-only': 'true' }));
        expect(() => expectAnatomy(container, demoAnatomy)).toThrow(/presence-only/);
    });
});

describe('expectAnatomy placements (declared contract data, not a blanket exemption)', () => {
    const placed = defineAnatomy('demo-float', {
        'anchor': { element: 'button' },
        'float': { element: 'div', states: ['open', 'closed'], placements: ['top', 'bottom-start'] },
    });

    const float = (attrs: Record<string, string>): HTMLElement => {
        const el = document.createElement('div');
        el.setAttribute('data-scope', 'demo-float');
        el.setAttribute('data-part', 'float');
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        return el;
    };

    it('passes a declared placement value', () => {
        const container = mount(float({ 'data-state': 'open', 'data-placement': 'bottom-start' }));
        expect(() => expectAnatomy(container, placed)).not.toThrow();
    });

    it('fails a placement value outside the declared subset', () => {
        const container = mount(float({ 'data-state': 'open', 'data-placement': 'left-end' }));
        expect(() => expectAnatomy(container, placed)).toThrow(/data-placement="left-end"/);
    });

    it('fails data-placement on a part that declares no placements', () => {
        // The blanket exemption this replaces let ANY part carry the
        // attribute unchecked.
        const anchor = document.createElement('button');
        anchor.setAttribute('data-scope', 'demo-float');
        anchor.setAttribute('data-part', 'anchor');
        anchor.setAttribute('data-placement', 'top');
        expect(() => expectAnatomy(mount(anchor), placed)).toThrow(/declares no placements/);
    });
});

describe('expectAnatomy nesting (the declared part tree)', () => {
    // A tree with an intermediate that is NOT a part between `popup` and
    // `option` in some renders — the declared parent must be found among
    // ANCESTORS, not required to be the immediate parent element.
    const nested = defineAnatomy('demo-list', {
        'root': { element: 'div' },
        'popup': { element: 'div', parent: 'root', states: ['open', 'closed'] },
        'option': { element: 'div', parent: 'popup' },
    });

    const scoped = (name: string): HTMLElement => {
        const el = document.createElement('div');
        el.setAttribute('data-scope', 'demo-list');
        el.setAttribute('data-part', name);
        return el;
    };

    it('passes a render whose nesting matches the tree', () => {
        const root = scoped('root');
        const popup = scoped('popup');
        popup.setAttribute('data-state', 'open');
        const option = scoped('option');
        popup.append(option);
        root.append(popup);
        expect(() => expectAnatomy(root, nested)).not.toThrow();
    });

    it('accepts non-part markup (or other parts) between parent and child', () => {
        const root = scoped('root');
        const popup = scoped('popup');
        popup.setAttribute('data-state', 'open');
        const wrapper = document.createElement('div'); // consumer markup, no data-scope
        const option = scoped('option');
        wrapper.append(option);
        popup.append(wrapper);
        root.append(popup);
        expect(() => expectAnatomy(root, nested)).not.toThrow();
    });

    it('fails a part rendered outside its declared parent', () => {
        // The option ends up a SIBLING of the popup — the misnesting the tree
        // exists to catch.
        const root = scoped('root');
        root.append(scoped('popup'), scoped('option'));
        expect(() => expectAnatomy(root, nested)).toThrow(/parent "popup"/);
    });

    it('fails a part nested under the wrong part', () => {
        const root = scoped('root');
        const option = scoped('option');
        root.append(option); // option directly under root, popup never involved
        expect(() => expectAnatomy(root, nested)).toThrow(/parent "popup"/);
    });

    it('does not constrain a top-level part, even inside another instance', () => {
        // Instance nesting (card in card): the INNER root sits below the outer
        // instance's parts, and that is legal — a part with no declared parent
        // is making no claim about its ancestors.
        const outer = scoped('root');
        const inner = scoped('root');
        outer.append(inner);
        expect(() => expectAnatomy(outer, nested)).not.toThrow();
    });
});

describe('synthesizesClickFrom (public asChild helper)', () => {
    it('reports native click synthesis per element and key', () => {
        expect(synthesizesClickFrom(document.createElement('button'), ' ')).toBe(true);
        expect(synthesizesClickFrom(document.createElement('a'), 'Enter')).toBe(true);
        expect(synthesizesClickFrom(document.createElement('a'), ' ')).toBe(false);
        expect(synthesizesClickFrom(document.createElement('div'), 'Enter')).toBe(false);
        expect(synthesizesClickFrom(null, 'Enter')).toBe(false);
    });
});
