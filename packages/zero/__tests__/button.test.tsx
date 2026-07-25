/**
 * Button behaviour.
 *
 * `onClick` gets its own test because sigx forwards no rest props: a handler
 * that isn't declared and wired makes the component silently inert, which is
 * exactly how it shipped the first time.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'sigx';
import { Button, buttonAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers.js';

function mount(node: unknown): HTMLElement {
    const host = document.createElement('div');
    document.body.append(host);
    render(node as never, host);
    return host;
}

const buttonIn = (host: HTMLElement) =>
    host.querySelector<HTMLButtonElement>('[data-scope="button"][data-part="root"]')!;

describe('Button', () => {
    it('renders the declared anatomy on a native button', () => {
        const host = mount(<Button.Root>Save</Button.Root>);
        expectAnatomy(host, buttonAnatomy);
        expect(buttonIn(host).tagName).toBe('BUTTON');
    });

    it('defaults type to button, not the native submit', () => {
        // The native default posts the enclosing form.
        expect(buttonIn(mount(<Button.Root>Save</Button.Root>)).type).toBe('button');
        expect(buttonIn(mount(<Button.Root type="submit">Go</Button.Root>)).type).toBe('submit');
    });

    it('calls onClick', () => {
        const onClick = vi.fn();
        buttonIn(mount(<Button.Root onClick={onClick}>Save</Button.Root>)).click();
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('does not call onClick when disabled', () => {
        const onClick = vi.fn();
        buttonIn(mount(<Button.Root disabled onClick={onClick}>Save</Button.Root>)).click();
        expect(onClick).not.toHaveBeenCalled();
    });

    it('passes the variant axes through as data attributes', () => {
        const el = buttonIn(mount(
            <Button.Root color="success" size="lg" variant="outline">Save</Button.Root>,
        ));
        expect(el.getAttribute('data-color')).toBe('success');
        expect(el.getAttribute('data-size')).toBe('lg');
        expect(el.getAttribute('data-variant')).toBe('outline');
    });

    it('omits the axes it was not given', () => {
        // Absent, not empty — the CSS-only defaults hang off :not([data-size]).
        const el = buttonIn(mount(<Button.Root>Save</Button.Root>));
        expect(el.hasAttribute('data-size')).toBe(false);
        expect(el.hasAttribute('data-variant')).toBe(false);
    });

    it('marks an asChild render disabled, since the element may not support it', () => {
        const host = mount(
            <Button.Root asChild disabled>{(p: Record<string, unknown>) => <a {...p}>Docs</a>}</Button.Root>,
        );
        const el = host.querySelector('[data-scope="button"]')!;
        expect(el.tagName).toBe('A');
        expect(el.getAttribute('aria-disabled')).toBe('true');
        expect(el.hasAttribute('data-disabled')).toBe(true);
    });
});
