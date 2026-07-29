/**
 * The conformance fixtures — RFC 0003 §7 (#174).
 *
 * INTERIM. This file currently exercises the fixtures themselves: they compile,
 * they validate clean, and they emit the selector strings their rows will claim.
 * The row↔fixture parity layers — every Tier-1/2 row has a fixture and every
 * fixture has a row, `exact`/`renamed` rows name an artifact that exists, and
 * Tier-3 rows regenerate from `buildReport` — land with
 * `docs/design-system-conformance.md`, which does not exist yet.
 *
 * What is here already matters on its own: §7.4 makes the emitted selector the
 * unit of proof, so a compiler regression has to break a conformance claim
 * directly rather than quietly.
 */
import { describe, it, expect } from 'vitest';
import { compileDesignSystem, validateDesignSystem, TOKEN_KEY_PATTERN } from '@sigx/zero-kit';
import type { CompiledDesignSystem, DesignSystemInput, ManifestComponent } from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';
import * as radix from '../skills/design-system/conformance/radix.js';
import * as material from '../skills/design-system/conformance/material.js';
import * as ant from '../skills/design-system/conformance/ant.js';
import * as carbon from '../skills/design-system/conformance/carbon.js';

const manifest = {
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
};

const PACK = [radix, material, ant, carbon];

const inputOf = (fixture: (typeof PACK)[number]): DesignSystemInput =>
    ({
        name: fixture.conformance.id,
        tokens: fixture.tokens,
        recipes: [fixture.button],
    }) as DesignSystemInput;

const compiled = new Map<string, CompiledDesignSystem>(
    PACK.map((f) => [f.conformance.id, compileDesignSystem(inputOf(f), manifest)]),
);

/** Spelled out rather than imported from the compiler — the string IS the claim. */
const ROOT = '[data-scope="button"][data-part="root"]';

describe.each(PACK.map((f) => [f.conformance.id, f] as const))('fixture: %s', (id, fixture) => {
    const result = validateDesignSystem(inputOf(fixture), manifest);

    it('validates with no errors', () => {
        expect(result.errors.map((e) => `${e.where}: ${e.message}`)).toEqual([]);
    });

    it('warns only about the components it deliberately leaves unstyled', () => {
        // Button-only by design (§7.2 — five full skins is the wrong cost
        // curve). Every OTHER warning is real: a declared value no recipe
        // wires, a contrast failure, a literal duration. In particular this is
        // what forces a fixture to wire its entire declared vocabulary, so
        // "their vocabulary" in the matrix is exactly what the fixture proves.
        const unexpected = result.warnings.filter((w) => !w.message.includes('have no recipe'));
        expect(unexpected.map((w) => `${w.where}: ${w.message}`)).toEqual([]);
    });

    it('compiles its Button recipe', () => {
        expect(compiled.get(id)!.componentCss.button).toBeTruthy();
    });
});

/**
 * The claims each fixture exists to make, as the exact strings the compiler
 * must emit. Not exhaustive — the generated matrix will cover every row — but
 * these are the ones no other design system in the repo proves.
 */
describe('the axis surfaces these fixtures exist to prove', () => {
    it.each([
        // Radix: a numeric size ramp, where every other system uses names.
        ['radix', `${ROOT}[data-size="1"]`],
        ['radix', `${ROOT}[data-size="4"]`],
        // Radix: the repo's FIRST `tokens.axes` value. Declared and validated
        // since the axis work landed, exercised by no design system until now.
        ['radix', `${ROOT}[data-radius="full"]`],
        ['radix', `${ROOT}[data-mod-high-contrast]`],
        ['radix', `${ROOT}[data-variant="soft"][data-mod-high-contrast]`],
        // Material: the vocabulary `packages/zero-material` does NOT declare —
        // it ships the four-name convention instead (#175).
        ['material', `${ROOT}[data-variant="tonal"]`],
        ['material', `${ROOT}[data-variant="elevated"]`],
        // Ant: a genuine extra axis, and three independent booleans.
        ['ant', `${ROOT}[data-shape="circle"]`],
        ['ant', `${ROOT}[data-type="primary"]`],
        ['ant', `${ROOT}[data-mod-block]`],
        ['ant', `${ROOT}[data-variant="solid"][data-mod-danger]`],
        // Carbon: a fused vocabulary, respelled off the vendor's double hyphen.
        ['carbon', `${ROOT}[data-variant="danger-tertiary"]`],
        ['carbon', `${ROOT}[data-mod-icon-only]`],
        // …and a modifier whose meaning is conditional on an axis value.
        ['carbon', `${ROOT}[data-size="lg"][data-mod-expressive]`],
    ])('%s emits %s', (id, selector) => {
        expect(compiled.get(id)!.componentCss.button).toContain(selector);
    });
});

/**
 * The gaps these fixtures record, pinned as negatives.
 *
 * These fail when the gap CLOSES, which is the point: the matrix row, its note
 * and its issue then get revisited together instead of the row quietly staying
 * wrong.
 */
describe('the gaps these fixtures record are still gaps', () => {
    it.each(PACK.map((f) => [f.conformance.id] as const))(
        'a custom axis never reaches an ancestor in %s',
        (id) => {
            // `tokens.axes` is COMPONENT vocabulary: the only CSS naming an axis
            // is the recipe selector, always prefixed [data-scope][data-part].
            // `compileTokensCss` emits `:where(:root)`, the prefers-color-scheme
            // block, `[data-theme="…"]` and reduced-motion — and nothing else.
            // So Radix's `<Theme radius scaling>` has no emission path at all.
            expect(compiled.get(id)!.tokensCss).not.toMatch(/data-(radius|shape|type|scaling)/);
        },
    );

    it('vendor values outside the identifier grammar cannot be axis values', () => {
        // Two systems force this independently, which is why it is a contract
        // gap rather than a Carbon quirk. Carbon's kind vocabulary is respelled
        // in `tokens.variants` and the vendor spelling survives only in `api`.
        for (const value of ['danger--tertiary', 'danger--ghost', '105%', '90%']) {
            expect(TOKEN_KEY_PATTERN.test(value)).toBe(false);
        }
    });
});
