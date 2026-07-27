import { expect } from 'vitest';
import type { Anatomy } from '@sigx/zero/anatomy';

/**
 * The anatomy doubles as a test oracle: walk every rendered part of a scope
 * and check it against the declaration — known part, `data-state` from the
 * closed set, flags from the declared set, presence-only flag values.
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
