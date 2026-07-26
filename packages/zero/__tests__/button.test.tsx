/**
 * Button behaviour.
 *
 * `onClick` gets its own test because sigx forwards no rest props: a handler
 * that isn't declared and wired makes the component silently inert, which is
 * exactly how it shipped the first time.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { Button, buttonAnatomy } from '@sigx/zero';
import { expectAnatomy } from './helpers';

describe('Button', () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    const root = () =>
        container.querySelector<HTMLButtonElement>('[data-scope="button"][data-part="root"]')!;

    it('renders the declared anatomy on a native button', () => {
        render(<Button.Root>Save</Button.Root>, container);
        expectAnatomy(container, buttonAnatomy);
        expect(root().tagName).toBe('BUTTON');
    });

    it('defaults type to button, not the native submit', () => {
        // The native default posts the enclosing form.
        render(<Button.Root>Save</Button.Root>, container);
        expect(root().type).toBe('button');
    });

    it('honours an explicit type', () => {
        render(<Button.Root type="submit">Go</Button.Root>, container);
        expect(root().type).toBe('submit');
    });

    it('calls onClick', () => {
        const onClick = vi.fn();
        render(<Button.Root onClick={onClick}>Save</Button.Root>, container);
        root().click();
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('does not call onClick when disabled', () => {
        const onClick = vi.fn();
        render(<Button.Root disabled onClick={onClick}>Save</Button.Root>, container);
        root().click();
        expect(onClick).not.toHaveBeenCalled();
    });

    it('passes the variant axes through as data attributes', () => {
        render(
            <Button.Root color="success" size="lg" variant="outline">Save</Button.Root>,
            container,
        );
        expect(root().getAttribute('data-color')).toBe('success');
        expect(root().getAttribute('data-size')).toBe('lg');
        expect(root().getAttribute('data-variant')).toBe('outline');
    });

    it('accepts a design-system size name off the recommended ramp', () => {
        // The `size` axis is DS vocabulary, not contract: Material specifies
        // density, other systems number their steps. This is as much a
        // type-level assertion as a runtime one — `size="comfortable"` was a
        // compile error while `SizeScale` was a closed union, so a design
        // system with its own ramp could not be consumed at all.
        render(
            <Button.Root color="brand" size="comfortable" variant="tonal">Save</Button.Root>,
            container,
        );
        expect(root().getAttribute('data-size')).toBe('comfortable');
        expect(root().getAttribute('data-color')).toBe('brand');
        expect(root().getAttribute('data-variant')).toBe('tonal');
    });

    it('omits the axes it was not given', () => {
        // Absent, not empty — the CSS-only defaults hang off :not([data-size]).
        render(<Button.Root>Save</Button.Root>, container);
        expect(root().hasAttribute('data-size')).toBe(false);
        expect(root().hasAttribute('data-variant')).toBe(false);
    });

    it('does not call onClick when asChild and disabled', () => {
        // The native <button disabled> case is enforced by the platform; an
        // <a> is not, so this branch does it by hand and is the one that can
        // regress silently.
        const onClick = vi.fn();
        render(
            <Button.Root asChild disabled onClick={onClick}>
                {(p: Record<string, unknown>) => <a href="/docs" {...p}>Docs</a>}
            </Button.Root>,
            container,
        );
        container.querySelector<HTMLElement>('[data-scope="button"]')!.click();
        expect(onClick).not.toHaveBeenCalled();
    });

    it('still calls onClick for an enabled asChild render', () => {
        const onClick = vi.fn();
        render(
            <Button.Root asChild onClick={onClick}>
                {(p: Record<string, unknown>) => <a href="/docs" {...p}>Docs</a>}
            </Button.Root>,
            container,
        );
        container.querySelector<HTMLElement>('[data-scope="button"]')!.click();
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('marks an asChild render disabled, since the element may not support it', () => {
        render(
            <Button.Root asChild disabled>
                {(p: Record<string, unknown>) => <a {...p}>Docs</a>}
            </Button.Root>,
            container,
        );
        const el = container.querySelector('[data-scope="button"]')!;
        expect(el.tagName).toBe('A');
        expect(el.getAttribute('aria-disabled')).toBe('true');
        expect(el.hasAttribute('data-disabled')).toBe(true);
    });
});
