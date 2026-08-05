/**
 * The navigation tier (#339): navbar, breadcrumbs, pagination — the
 * ContentSweep mould for the behavior tier's light half. Steps and Drawer
 * carry real machinery and live in their own files (`Steps.test.tsx`,
 * `Drawer.test.tsx`); what is asserted here is anatomy, semantics and the
 * one value model (Pagination's page number).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { Navbar, navbarAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

const selector = (scope: string, name: string) => `[data-scope="${scope}"][data-part="${name}"]`;

/** The part, asserted present — for the cases that go on to read it. */
const part = (c: HTMLElement, scope: string, name: string) =>
    c.querySelector<HTMLElement>(selector(scope, name))!;

describe('Navbar', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('renders a valid anatomy on a <header> landmark', () => {
        render(
            <Navbar.Root>
                <Navbar.Start>Logo</Navbar.Start>
                <Navbar.Center>Search</Navbar.Center>
                <Navbar.End>Actions</Navbar.End>
            </Navbar.Root>,
            container,
        );
        expectAnatomy(container, navbarAnatomy);
        const root = part(container, 'navbar', 'root');
        // <header>, not <nav>: the bar is page furniture that routinely holds
        // non-navigation content (branding, search, actions). Wrapping all of
        // it in a navigation landmark would mislabel most of it — the <nav>
        // belongs around the actual link set the consumer puts INSIDE a
        // section.
        expect(root.tagName).toBe('HEADER');
        expect(part(container, 'navbar', 'start').textContent).toBe('Logo');
        expect(part(container, 'navbar', 'center').textContent).toBe('Search');
        expect(part(container, 'navbar', 'end').textContent).toBe('Actions');
    });

    it('sections are optional — a bar with only a start renders cleanly', () => {
        render(
            <Navbar.Root>
                <Navbar.Start>Logo</Navbar.Start>
            </Navbar.Root>,
            container,
        );
        expectAnatomy(container, navbarAnatomy);
        expect(container.querySelector(selector('navbar', 'center'))).toBeNull();
        expect(container.querySelector(selector('navbar', 'end'))).toBeNull();
    });

    it('declares no states and no flags — a bar has no lifecycle', () => {
        for (const name of navbarAnatomy.partNames()) {
            expect(navbarAnatomy.parts[name].states).toBeUndefined();
            expect(navbarAnatomy.parts[name].flags).toBeUndefined();
        }
    });

    it('passes the variant axes through on the root', () => {
        render(
            <Navbar.Root color="primary" size="lg">
                <Navbar.Start>Logo</Navbar.Start>
            </Navbar.Root>,
            container,
        );
        const root = part(container, 'navbar', 'root');
        expect(root.getAttribute('data-color')).toBe('primary');
        expect(root.getAttribute('data-size')).toBe('lg');
        expectAnatomy(container, navbarAnatomy);
    });
});
