import { expect } from 'vitest';
import type { Anatomy } from '@sigx/zero/anatomy';

/**
 * The anatomy doubles as a test oracle: walk every rendered part of a scope
 * and check it against the declaration — known part, `data-state` from the
 * closed set, flags from the declared set, presence-only flag values, and the
 * `hidden` attribute exactly where `hiddenIn` says it goes.
 */
export function expectAnatomy(container: HTMLElement, anatomy: Anatomy): void {
    const rendered = container.querySelectorAll<HTMLElement>(`[data-scope="${anatomy.scope}"]`);
    expect(rendered.length, `no parts rendered for scope "${anatomy.scope}"`).toBeGreaterThan(0);

    for (const el of rendered) {
        const partName = el.getAttribute('data-part');
        expect(partName, 'every scoped element declares data-part').toBeTruthy();
        const spec = anatomy.parts[partName!];
        expect(spec, `part "${partName}" is declared in the ${anatomy.scope} anatomy`).toBeTruthy();

        const state = el.getAttribute('data-state');
        if (state !== null) {
            expect(spec!.states ?? [], `part "${partName}" declares data-state values`).toContain(state);
        }

        // `hiddenIn` is a promise about the DOM, and design systems style
        // against it (a state that never paints needs no rule), so it is
        // checked in BOTH directions: hidden in every state it names, visible
        // in every state it doesn't. An undeclared `hidden` is the failure
        // that matters — it makes a real state invisible to the reader while
        // the contract says it paints.
        const hiddenIn = spec!.hiddenIn ?? [];
        const isHidden = el.hasAttribute('hidden');
        if (isHidden || hiddenIn.length) {
            expect(
                isHidden,
                `part "${partName}" in state "${state}" is hidden exactly when the anatomy `
                + `says so (hiddenIn: [${hiddenIn.join(', ')}])`,
            ).toBe(state !== null && hiddenIn.includes(state));
        }

        for (const attr of el.getAttributeNames()) {
            // data-placement is published positioning data, not a flag: the
            // fixed position strategy writes it on open floats, and toast
            // parts carry it for placement-keyed styling.
            if (!attr.startsWith('data-') || ['data-scope', 'data-part', 'data-state', 'data-orientation', 'data-color', 'data-size', 'data-variant', 'data-placement'].includes(attr)) continue;
            const flag = attr.slice(5);
            expect(spec!.flags ?? [], `part "${partName}" declares flag "${flag}"`).toContain(flag);
            expect(el.getAttribute(attr), `flag ${attr} is presence-only`).toBe('');
        }
    }
}
