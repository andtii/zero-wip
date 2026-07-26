/**
 * Press feedback — the runtime half of pointer-anchored press effects.
 *
 * The DOM writes are the contract here: a design system consumes exactly
 * `data-pressed`, `data-press-animating` and `--press-x/y/r`, so the tests
 * assert those, not internal state. happy-dom reports all-zero layout rects,
 * so coordinate assertions check presence and the `px` unit rather than
 * geometry, and `getAnimations` (absent in happy-dom) is stubbed where the
 * no-animation guard is under test.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createPressFeedback } from '@sigx/zero';
import type { PressFeedbackHandlers } from '@sigx/zero';

const pointerdown = (x = 0, y = 0): PointerEvent =>
    new PointerEvent('pointerdown', { button: 0, clientX: x, clientY: y });

describe('createPressFeedback', () => {
    let el: HTMLElement;
    let disabled: boolean;
    let press: PressFeedbackHandlers;

    beforeEach(() => {
        el = document.createElement('button');
        document.body.appendChild(el);
        disabled = false;
        press = createPressFeedback({
            getElement: () => el,
            isDisabled: () => disabled,
        });
    });

    it('marks a pointer press and publishes the press point', () => {
        press.onPointerdown(pointerdown());
        expect(el.hasAttribute('data-pressed')).toBe(true);
        expect(el.hasAttribute('data-press-animating')).toBe(true);
        expect(el.style.getPropertyValue('--press-x')).toBe('0px');
        expect(el.style.getPropertyValue('--press-y')).toBe('0px');
        expect(el.style.getPropertyValue('--press-r')).toBe('0px');
    });

    it('ignores non-primary buttons', () => {
        press.onPointerdown(new PointerEvent('pointerdown', { button: 2 }));
        expect(el.hasAttribute('data-pressed')).toBe(false);
    });

    it.each([
        ['onPointerup', () => press.onPointerup(new PointerEvent('pointerup'))],
        ['onPointercancel', () => press.onPointercancel(new PointerEvent('pointercancel'))],
        ['onPointerleave', () => press.onPointerleave(new PointerEvent('pointerleave'))],
        ['onBlur', () => press.onBlur(new FocusEvent('blur'))],
    ] as const)('%s ends the held state', (_name, end) => {
        press.onPointerdown(pointerdown());
        end();
        expect(el.hasAttribute('data-pressed')).toBe(false);
    });

    it('keeps the coordinates after release, for release fades', () => {
        press.onPointerdown(pointerdown());
        press.onPointerup(new PointerEvent('pointerup'));
        expect(el.style.getPropertyValue('--press-x')).toBe('0px');
        expect(el.style.getPropertyValue('--press-r')).toBe('0px');
    });

    it.each(['Enter', ' '])('presses at the box center on %j', (key) => {
        press.onKeydown(new KeyboardEvent('keydown', { key }));
        expect(el.hasAttribute('data-pressed')).toBe(true);
        expect(el.style.getPropertyValue('--press-x')).toBe('0px');
        press.onKeyup(new KeyboardEvent('keyup', { key }));
        expect(el.hasAttribute('data-pressed')).toBe(false);
    });

    it('ignores key repeat — holding Enter is one press, not a stream', () => {
        press.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
        el.removeAttribute('data-pressed');
        press.onKeydown(new KeyboardEvent('keydown', { key: 'Enter', repeat: true }));
        expect(el.hasAttribute('data-pressed')).toBe(false);
    });

    it('ignores non-activation keys', () => {
        press.onKeydown(new KeyboardEvent('keydown', { key: 'a' }));
        expect(el.hasAttribute('data-pressed')).toBe(false);
    });

    it('does nothing while disabled', () => {
        disabled = true;
        press.onPointerdown(pointerdown());
        press.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(el.hasAttribute('data-pressed')).toBe(false);
        expect(el.hasAttribute('data-press-animating')).toBe(false);
        expect(el.style.getPropertyValue('--press-x')).toBe('');
    });

    it('does nothing before the element mounts', () => {
        const unmounted = createPressFeedback({ getElement: () => null });
        expect(() => unmounted.onPointerdown(pointerdown())).not.toThrow();
        expect(() => unmounted.onPointerup(new PointerEvent('pointerup'))).not.toThrow();
    });

    describe('the one-shot flag', () => {
        const stubAnimations = (count: number) => {
            el.getAnimations = () =>
                Array.from({ length: count }, () => ({} as Animation));
        };

        it('outlives release and clears on animationend', () => {
            stubAnimations(1);
            press.onPointerdown(pointerdown());
            press.onPointerup(new PointerEvent('pointerup'));
            expect(el.hasAttribute('data-press-animating')).toBe(true);
            el.dispatchEvent(new AnimationEvent('animationend'));
            expect(el.hasAttribute('data-press-animating')).toBe(false);
        });

        it('clears on animationcancel too', () => {
            stubAnimations(1);
            press.onPointerdown(pointerdown());
            el.dispatchEvent(new AnimationEvent('animationcancel'));
            expect(el.hasAttribute('data-press-animating')).toBe(false);
        });

        it('ignores animationend bubbling from a child', () => {
            stubAnimations(1);
            const child = document.createElement('span');
            el.appendChild(child);
            press.onPointerdown(pointerdown());
            child.dispatchEvent(new AnimationEvent('animationend', { bubbles: true }));
            expect(el.hasAttribute('data-press-animating')).toBe(true);
        });

        it('clears synchronously when the design system attaches no animation', () => {
            stubAnimations(0);
            press.onPointerdown(pointerdown());
            expect(el.hasAttribute('data-press-animating')).toBe(false);
            // The held state is untouched by the guard.
            expect(el.hasAttribute('data-pressed')).toBe(true);
        });

        it('restarts on a re-press while still animating', () => {
            stubAnimations(1);
            press.onPointerdown(pointerdown());
            press.onPointerup(new PointerEvent('pointerup'));
            press.onPointerdown(pointerdown());
            expect(el.hasAttribute('data-press-animating')).toBe(true);
            // The first press's listeners were detached by the restart: one
            // animationend must not leave a second, stale pair behind that
            // would clear the NEXT press early.
            el.dispatchEvent(new AnimationEvent('animationend'));
            expect(el.hasAttribute('data-press-animating')).toBe(false);
            press.onPointerdown(pointerdown());
            expect(el.hasAttribute('data-press-animating')).toBe(true);
        });
    });
});
