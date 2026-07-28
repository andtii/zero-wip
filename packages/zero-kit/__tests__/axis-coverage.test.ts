/**
 * The accepts-but-unwired guard.
 *
 * A component that composes `WithVariantAxes` accepts `color` / `size` /
 * `variant` at runtime and renders them as `data-*`. If no design system wires
 * an axis, the attribute matches nothing — and under an opted-in `/register`
 * module the generated type is `never`, so the prop is offered and then
 * rejected. RFC 0002 §4.1 calls that the tier-2 failure; #103 removed it once.
 *
 * It came straight back. NumberInput (#136), RatingGroup (#142) and TreeView
 * (#144) all landed AFTER #103 merged, each carrying the axis props with
 * nothing wired, and nothing failed. That is the gap this file closes: the
 * check is structural, so component #24 cannot reintroduce it quietly.
 *
 * The carrier list is read from the component sources rather than hardcoded,
 * for the same reason: a hardcoded list is one more thing to forget.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileDesignSystem } from '@sigx/zero-kit';
import type { ManifestComponent } from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';
import { designSystem as basicDS } from '@sigx/zero-basic';
import { designSystem as daisyDS } from '@sigx/zero-daisyui';
import { designSystem as materialDS } from '@sigx/zero-material';
import { designSystem as brutalistDS } from '@sigx/zero-brutalist';

const manifest = {
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
};

// Resolved from the vitest root, like every other filesystem-reading test
// here: `import.meta.url` is rewritten by the test server and does not hit
// disk (see `schemas.test.ts` and `contract-parity.test.ts`).
const COMPONENTS_DIR = resolve(process.cwd(), 'packages/zero/src/components');

/**
 * Component scopes whose props compose `WithVariantAxes`. The directory name
 * IS the scope (`tree-view`, `number-input`), which the anatomy assertion
 * below pins.
 */
const carriers: string[] = readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((entry) => {
        const dir = resolve(COMPONENTS_DIR, entry.name);
        return readdirSync(dir)
            .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
            .some((f) => readFileSync(resolve(dir, f), 'utf8').includes('WithVariantAxes'));
    })
    .map((e) => e.name)
    .sort();

const designSystems = {
    basic: compileDesignSystem(basicDS, manifest),
    daisyui: compileDesignSystem(daisyDS, manifest),
    material: compileDesignSystem(materialDS, manifest),
    brutalist: compileDesignSystem(brutalistDS, manifest),
};

/**
 * `variant` is exempt, deliberately and with a recorded reason (RFC 0003
 * §1.1 / §9 phase 5).
 *
 * Only `button` wires it, and its vocabulary — `solid | outline | soft |
 * ghost` — is convention rather than contract: all four design systems
 * declare the same four values, derived from roughly two real design systems,
 * and nothing requires it. Wiring that set across every remaining carrier
 * would encode the convention harder in exactly the place a divergent design
 * system (HeroUI v3 fuses colour into `variant` and has no `color` prop at
 * all) has to unpick it. For several carriers the honest answer is also "no
 * variant here", which `never` already states correctly.
 *
 * When that question is settled, delete this constant rather than extending
 * it.
 */
const DEFERRED_AXES = ['variant'] as const;

const CHECKED_AXES = (['color', 'size'] as const);

describe('no component accepts an axis no design system wires', () => {
    it('finds the carriers by reading the component sources', () => {
        // A sanity check on the discovery itself: if this returns nothing, the
        // whole suite would pass vacuously.
        expect(carriers.length).toBeGreaterThan(10);
        expect(carriers).toContain('tree-view');
        expect(carriers).toContain('button');
    });

    it('every carrier is a real anatomy scope', () => {
        const scopes = new Set(manifest.components.map((c) => c.scope));
        for (const carrier of carriers) expect(scopes).toContain(carrier);
    });

    it.each(Object.keys(designSystems))('%s wires colour and size for every carrier', (name) => {
        const compiled = designSystems[name as keyof typeof designSystems];
        const gaps: string[] = [];
        for (const scope of carriers) {
            const wired = compiled.components[scope];
            // A carrier with no recipe at all is a different failure, already
            // warned about by the validator — but it is still a gap here.
            if (!wired) {
                gaps.push(`${scope} (no recipe)`);
                continue;
            }
            for (const axis of CHECKED_AXES) {
                if (wired[axis].length === 0) gaps.push(`${scope}.${axis}`);
            }
        }
        expect(gaps, `${name} accepts these axes at runtime and wires nothing for them`).toEqual([]);
    });

    it('records what is still deferred, so the exemption stays visible', () => {
        // Not a formality: this asserts the deferral is exactly `variant` and
        // exactly on the carriers that are not `button`. If a design system
        // starts wiring `variant` more widely, or a new axis joins the deferred
        // set, this fails and the reason above has to be revisited.
        const deferred = carriers.filter((scope) =>
            Object.values(designSystems).every((ds) =>
                DEFERRED_AXES.every((axis) => (ds.components[scope]?.[axis].length ?? 0) === 0)));
        expect(deferred).toEqual(carriers.filter((c) => c !== 'button'));
    });
});
