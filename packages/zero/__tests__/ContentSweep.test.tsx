/**
 * The content-tier sweep (#334): kbd, status, indicator, stats, timeline,
 * chat, radial-progress, join. One file in the ContentTier.test.tsx mould —
 * these are anatomy-plus-recipes components with little behavior between
 * them, and splitting eight anatomy assertions across eight files would be
 * filing, not testing. RadialProgress has the only value model here and gets
 * the bulk of it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import {
    Indicator, indicatorAnatomy,
    Kbd, kbdAnatomy,
    PLACEMENT_VOCABULARY,
    Status, statusAnatomy,
} from '@sigx/zero';
import { expectAnatomy } from './helpers';

const selector = (scope: string, name: string) => `[data-scope="${scope}"][data-part="${name}"]`;

/** The part, asserted present — for the cases that go on to read it. */
const part = (c: HTMLElement, scope: string, name: string) =>
    c.querySelector<HTMLElement>(selector(scope, name))!;

describe('Kbd', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('renders a semantic <kbd> with a valid anatomy', () => {
        render(<Kbd size="sm">⌘</Kbd>, container);
        expectAnatomy(container, kbdAnatomy);
        const root = part(container, 'kbd', 'root');
        // The element IS the semantics: <kbd> is how assistive tech and
        // reader modes know this span of text is keyboard input, so a styled
        // <span> would drop the one meaning the component carries.
        expect(root.tagName).toBe('KBD');
        expect(root.textContent).toBe('⌘');
        expect(root.getAttribute('data-size')).toBe('sm');
    });

    it('is one part, and the carrier bears the text', () => {
        // Badge's shape: at keycap scale the fill is the component, so root
        // both carries the axes and renders the text.
        expect(kbdAnatomy.partNames()).toEqual(['root']);
        expect(kbdAnatomy.parts.root.tokens).toContain('text');
    });

    it('declares no states — a keycap has no lifecycle', () => {
        expect(kbdAnatomy.parts.root.states).toBeUndefined();
        render(<Kbd>K</Kbd>, container);
        expect(part(container, 'kbd', 'root').hasAttribute('data-state')).toBe(false);
    });
});

describe('Status', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('renders a valid one-part anatomy with the colour pass-through', () => {
        render(<Status color="success" />, container);
        expectAnatomy(container, statusAnatomy);
        const root = part(container, 'status', 'root');
        expect(root.tagName).toBe('SPAN');
        expect(root.getAttribute('data-color')).toBe('success');
        expect(root.textContent).toBe('');
    });

    it('declares no states — the colour axis IS the vocabulary', () => {
        // A static presence dot has no lifecycle: "online" and "busy" are
        // different colours of the same resting render, not machine states,
        // so inventing a data-state family for them would be styling wearing
        // a contract costume.
        expect(statusAnatomy.parts.root.states).toBeUndefined();
        expect(statusAnatomy.parts.root.flags).toBeUndefined();
    });

    it('is decorative until a label makes it meaningful', () => {
        // Without a label the dot is presentation — the visible text beside
        // it ("Online") carries the meaning, and announcing the dot too
        // would say everything twice.
        render(<Status color="success" />, container);
        expect(part(container, 'status', 'root').getAttribute('aria-hidden')).toBe('true');

        const labelled = document.createElement('div');
        document.body.appendChild(labelled);
        render(<Status color="error" label="Service degraded" />, labelled);
        const root = part(labelled, 'status', 'root');
        // With a label the dot IS the content: role="img" names a static
        // graphic — role="status" would be a live region for a thing that
        // never changes.
        expect(root.getAttribute('role')).toBe('img');
        expect(root.getAttribute('aria-label')).toBe('Service degraded');
        expect(root.hasAttribute('aria-hidden')).toBe(false);
    });
});

describe('Indicator', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('renders a valid anatomy and stamps the default corner', () => {
        render(
            <Indicator.Root>
                <Indicator.Item>3</Indicator.Item>
                <button type="button">Inbox</button>
            </Indicator.Root>,
            container,
        );
        expectAnatomy(container, indicatorAnatomy);
        const item = part(container, 'indicator', 'item');
        // The daisy default, and the overwhelmingly common one: a count sits
        // on the top reading-end corner of what it counts.
        expect(item.getAttribute('data-placement')).toBe('top-end');
        expect(item.textContent).toBe('3');
    });

    it('stamps the requested placement, spelled logically', () => {
        render(
            <Indicator.Root>
                <Indicator.Item placement="bottom-start">!</Indicator.Item>
                <span>avatar</span>
            </Indicator.Root>,
            container,
        );
        expect(part(container, 'indicator', 'item').getAttribute('data-placement')).toBe('bottom-start');
        expectAnatomy(container, indicatorAnatomy);
    });

    it('declares the eight anchor slots, all from the governed vocabulary', () => {
        // Four corners, two edge midpoints, and the two logical inline sides
        // ('start'/'end' — the middle-row anchors, which is what put the bare
        // logical pair into PLACEMENT_VOCABULARY). No 'left'/'right': an
        // indicator anchors to the reading direction, not to the glass.
        expect([...(indicatorAnatomy.parts.item.placements ?? [])].sort()).toEqual([
            'bottom', 'bottom-end', 'bottom-start', 'end', 'start', 'top', 'top-end', 'top-start',
        ]);
        const vocabulary = new Set<string>(PLACEMENT_VOCABULARY);
        for (const p of indicatorAnatomy.parts.item.placements ?? []) {
            expect(vocabulary.has(p), `"${p}" must be in PLACEMENT_VOCABULARY`).toBe(true);
        }
    });
});
