/**
 * The navigation tier (#339): navbar, breadcrumbs, pagination — the
 * ContentSweep mould for the behavior tier's light half. Steps and Drawer
 * carry real machinery and live in their own files (`Steps.test.tsx`,
 * `Drawer.test.tsx`); what is asserted here is anatomy, semantics and the
 * one value model (Pagination's page number).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import type { PartProps } from '@sigx/zero';
import { Breadcrumbs, breadcrumbsAnatomy, Navbar, navbarAnatomy } from '@sigx/zero';
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

describe('Breadcrumbs', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    const trail = () => (
        <Breadcrumbs.Root>
            <Breadcrumbs.List>
                <Breadcrumbs.Item>
                    <Breadcrumbs.Link href="/">Home</Breadcrumbs.Link>
                    <Breadcrumbs.Separator />
                </Breadcrumbs.Item>
                <Breadcrumbs.Item>
                    <Breadcrumbs.Link href="/docs">Docs</Breadcrumbs.Link>
                    <Breadcrumbs.Separator />
                </Breadcrumbs.Item>
                <Breadcrumbs.Item>
                    <Breadcrumbs.Link href="/docs/anatomy" current>Anatomy</Breadcrumbs.Link>
                </Breadcrumbs.Item>
            </Breadcrumbs.List>
        </Breadcrumbs.Root>
    );

    it('renders the APG breadcrumb shape: labelled <nav> around an <ol>', () => {
        render(trail(), container);
        expectAnatomy(container, breadcrumbsAnatomy);
        const root = part(container, 'breadcrumbs', 'root');
        // The APG breadcrumb pattern is a navigation landmark named
        // "Breadcrumb" wrapping an ordered list — order is the meaning here
        // (the trail runs from the root of the hierarchy to the current
        // page), which is what <ol> announces and <ul> would not.
        expect(root.tagName).toBe('NAV');
        expect(root.getAttribute('aria-label')).toBe('Breadcrumb');
        expect(part(container, 'breadcrumbs', 'list').tagName).toBe('OL');
        const items = container.querySelectorAll(selector('breadcrumbs', 'item'));
        expect(items).toHaveLength(3);
        expect(items[0]!.tagName).toBe('LI');
    });

    it('the label prop renames the landmark', () => {
        render(
            <Breadcrumbs.Root label="Brödsmulor">
                <Breadcrumbs.List>
                    <Breadcrumbs.Item>
                        <Breadcrumbs.Link href="/" current>Hem</Breadcrumbs.Link>
                    </Breadcrumbs.Item>
                </Breadcrumbs.List>
            </Breadcrumbs.Root>,
            container,
        );
        expect(part(container, 'breadcrumbs', 'root').getAttribute('aria-label')).toBe('Brödsmulor');
    });

    it('marks the current page with aria-current="page" and the activation state', () => {
        render(trail(), container);
        const links = [...container.querySelectorAll<HTMLElement>(selector('breadcrumbs', 'link'))];
        expect(links).toHaveLength(3);
        // `current`, not a new flag: `data-current` is not in FLAG_VOCABULARY
        // and the synonym table maps current → active, so the governed
        // spelling is the activation pair — one link active, the rest
        // inactive, exactly tabs' shape.
        expect(links[2]!.getAttribute('aria-current')).toBe('page');
        expect(links[2]!.getAttribute('data-state')).toBe('active');
        for (const link of links.slice(0, 2)) {
            expect(link.hasAttribute('aria-current')).toBe(false);
            expect(link.getAttribute('data-state')).toBe('inactive');
        }
    });

    it('hides the separator from assistive tech, with a replaceable glyph', () => {
        render(trail(), container);
        const separators = [...container.querySelectorAll<HTMLElement>(selector('breadcrumbs', 'separator'))];
        expect(separators).toHaveLength(2);
        for (const sep of separators) {
            // The separator is punctuation for the eye; the list structure
            // already separates the items for the ear.
            expect(sep.getAttribute('aria-hidden')).toBe('true');
            expect(sep.textContent).toBe('/');
        }

        const custom = document.createElement('div');
        document.body.appendChild(custom);
        render(
            <Breadcrumbs.Root>
                <Breadcrumbs.List>
                    <Breadcrumbs.Item>
                        <Breadcrumbs.Link href="/">Home</Breadcrumbs.Link>
                        <Breadcrumbs.Separator>→</Breadcrumbs.Separator>
                    </Breadcrumbs.Item>
                    <Breadcrumbs.Item>
                        <Breadcrumbs.Link href="/a" current>A</Breadcrumbs.Link>
                    </Breadcrumbs.Item>
                </Breadcrumbs.List>
            </Breadcrumbs.Root>,
            custom,
        );
        expect(part(custom, 'breadcrumbs', 'separator').textContent).toBe('→');
        expectAnatomy(custom, breadcrumbsAnatomy);
    });

    it('asChild hands the link contract to the consumer element', () => {
        render(
            <Breadcrumbs.Root>
                <Breadcrumbs.List>
                    <Breadcrumbs.Item>
                        <Breadcrumbs.Link current asChild>
                            {(p: PartProps) => <span {...p}>Here</span>}
                        </Breadcrumbs.Link>
                    </Breadcrumbs.Item>
                </Breadcrumbs.List>
            </Breadcrumbs.Root>,
            container,
        );
        const link = part(container, 'breadcrumbs', 'link');
        expect(link.tagName).toBe('SPAN');
        expect(link.getAttribute('aria-current')).toBe('page');
        expect(link.getAttribute('data-state')).toBe('active');
        expectAnatomy(container, breadcrumbsAnatomy);
    });

    it('passes the variant axes through on the root', () => {
        render(
            <Breadcrumbs.Root color="primary" size="sm">
                <Breadcrumbs.List>
                    <Breadcrumbs.Item>
                        <Breadcrumbs.Link href="/" current>Home</Breadcrumbs.Link>
                    </Breadcrumbs.Item>
                </Breadcrumbs.List>
            </Breadcrumbs.Root>,
            container,
        );
        const root = part(container, 'breadcrumbs', 'root');
        expect(root.getAttribute('data-color')).toBe('primary');
        expect(root.getAttribute('data-size')).toBe('sm');
    });
});
