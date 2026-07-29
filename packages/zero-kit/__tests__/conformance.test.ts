/**
 * The conformance fixtures are documentation that runs (RFC 0003 §7.1, issue
 * #179) — the same rule the brief pack follows.
 *
 * Each fixture in `skills/design-system/conformance/` is a real vendor's
 * Button axis surface written as a real, validated `api` declaration. The
 * grades the matrix will print for these systems are DERIVED here from the
 * declarations — a row and its artifact are the same object, which is what
 * keeps §7.4's "column 8 is load-bearing" mechanism from going stale.
 */
import { describe, expect, it } from 'vitest';
import type { ConformanceGrade } from '@sigx/zero-kit';
import { apiGrade, modifierGrade, validateApi } from '@sigx/zero-kit';
import * as carbon from '../skills/design-system/conformance/carbon.js';
import * as ant from '../skills/design-system/conformance/ant.js';
import * as radix from '../skills/design-system/conformance/radix.js';
import * as heroui from '../skills/design-system/conformance/heroui.js';
import { tokens as herouiPackageTokens } from '../../zero-heroui/src/tokens.js';

const FIXTURES = [
    ['carbon', carbon],
    ['ant', ant],
    ['radix', radix],
    ['heroui', heroui],
] as const;

describe.each(FIXTURES)('conformance fixture: %s', (_name, fixture) => {
    it('names a dated source', () => {
        expect(fixture.source.url).toMatch(/^https:\/\//);
        expect(fixture.source.verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(fixture.source.version.length).toBeGreaterThan(0);
    });

    it('declares an api that validates clean against its own vocabulary', () => {
        expect(validateApi(fixture.api, fixture.vocabulary)).toEqual([]);
    });
});

/** The grades the matrix claims for these rows — asserted independently. */
const EXPECTED: Record<string, Record<string, ConformanceGrade>> = {
    carbon: { variant: 'reshaped', 'mods.icon-only': 'reshaped', 'mods.expressive': 'reshaped' },
    ant: {
        variant: 'renamed',
        'axes.shape': 'exact',
        'mods.danger': 'reshaped',
        'mods.ghost': 'reshaped',
        'mods.block': 'reshaped',
    },
    radix: {
        variant: 'exact',
        'axes.radius': 'exact',
        'mods.high-contrast': 'reshaped',
        'mods.loading': 'reshaped',
    },
    heroui: { variant: 'exact', 'mods.icon-only': 'reshaped', 'mods.pending': 'reshaped' },
};

describe.each(FIXTURES)('derived grades: %s', (name, fixture) => {
    it('match what the matrix row claims', () => {
        const derived: Record<string, ConformanceGrade> = {};
        if (fixture.api.variant) derived['variant'] = apiGrade(fixture.api.variant);
        for (const [axis, entry] of Object.entries(fixture.api.axes ?? {})) {
            derived[`axes.${axis}`] = apiGrade(entry);
        }
        for (const [mod, entry] of Object.entries(fixture.api.modifiers ?? {})) {
            derived[`mods.${mod}`] = modifierGrade(entry);
        }
        expect(derived).toEqual(EXPECTED[name]);
    });
});

describe('the heroui fixture describes the in-repo package', () => {
    // The graduation path: the fixture's vocabulary IS the package's declared
    // vocabulary, so when zero-heroui ships this api (phase 2), its matrix
    // row and its artifact stay one object. A drift here means the fixture
    // describes a design system that no longer exists.
    it('vocabulary matches @sigx/zero-heroui verbatim', () => {
        expect([...heroui.vocabulary.variants]).toEqual([...(herouiPackageTokens.variants ?? [])]);
        expect([...heroui.vocabulary.modifiers]).toEqual([...(herouiPackageTokens.modifiers ?? [])]);
    });
});
