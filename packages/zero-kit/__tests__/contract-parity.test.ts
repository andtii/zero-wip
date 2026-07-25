/**
 * The parity guard for the deliberately duplicated token contract.
 *
 * `@sigx/zero-kit` keeps its own copy of `@sigx/zero`'s token vocabulary
 * (`packages/zero-kit/src/contract.ts` vs
 * `packages/zero/src/contract/tokens.ts`) so the kit stays a pure Node tool
 * with no runtime dependency on zero. That duplication is only safe if
 * something fails when the copies drift — this file is that something.
 *
 * Three layers, because a hand-written list of things to compare is a list
 * that falls behind:
 *
 * 1. VALUE parity for every constant the two modules share.
 * 2. COMPLETENESS — the *set* of same-named exports shared by both modules
 *    must equal the table below, so adding a shared export without a table
 *    row fails here rather than silently going unguarded.
 * 3. SEMANTIC parity — the claims the constants encode still hold against
 *    zero's actual behavior, not just against a copied literal.
 */
import { describe, it, expect } from 'vitest';
import * as zero from '@sigx/zero/contract';
import * as kit from '../src/contract.js';

/**
 * Constants that exist in both modules under the same name and must agree.
 * Keyed by export name so layer 2 can check this table is exhaustive.
 */
const SHARED: Record<string, [unknown, unknown]> = {
    RECOMMENDED_ROLE_LIST: [zero.RECOMMENDED_ROLE_LIST, kit.RECOMMENDED_ROLE_LIST],
    BASE_SURFACE_TOKEN_LIST: [zero.BASE_SURFACE_TOKEN_LIST, kit.BASE_SURFACE_TOKEN_LIST],
    ROLE_NAME_PATTERN: [zero.ROLE_NAME_PATTERN.source, kit.ROLE_NAME_PATTERN.source],
};

/**
 * Same-named exports that are deliberately NOT compared, with the reason.
 * Empty today; kept so layer 2 has an explicit place to record exemptions
 * instead of people widening the intersection filter.
 */
const KNOWN_UNSHARED: Record<string, string> = {};

describe('kit ↔ zero contract parity', () => {
    // ── 1. value parity ──
    it.each(Object.keys(SHARED))('%s is identical in both contract copies', (name) => {
        const [fromZero, fromKit] = SHARED[name]!;
        expect(fromKit).toEqual(fromZero);
    });

    it('the reserved-name sets agree (named differently on each side)', () => {
        // zero calls them CSS_COLOR_KEYWORDS (values resolveColorToken must not
        // rewrite); the kit calls them RESERVED_ROLE_NAMES (names a design
        // system must not declare as roles). Same set, two vantage points.
        expect([...kit.RESERVED_ROLE_NAMES].sort()).toEqual([...zero.CSS_COLOR_KEYWORDS].sort());
    });

    // ── 2. completeness ──
    it('every shared export name is covered by the table above', () => {
        const shared = Object.keys(zero)
            .filter((name) => name in kit)
            .sort();
        const accounted = [...Object.keys(SHARED), ...Object.keys(KNOWN_UNSHARED)].sort();
        expect(shared).toEqual(accounted);
    });

    // ── 3. semantic parity ──
    it('every reserved role name really is unresolvable as a token', () => {
        // The kit rejects these as role names on the grounds that
        // resolveColorToken would never turn them into var(--color-<role>).
        // Verify that justification against zero's actual implementation.
        for (const name of kit.RESERVED_ROLE_NAMES) {
            expect(zero.resolveColorToken(name)).toBe(name);
        }
    });

    it('every recommended role and base surface does resolve by convention', () => {
        for (const role of kit.RECOMMENDED_ROLE_LIST) {
            expect(zero.resolveColorToken(role)).toBe(`var(--color-${role})`);
        }
        for (const surface of kit.BASE_SURFACE_TOKEN_LIST) {
            expect(zero.resolveColorToken(surface)).toBe(`var(--color-${surface})`);
        }
    });

    it('the role-name pattern accepts the recommended vocabulary and rejects the reserved one', () => {
        for (const role of kit.RECOMMENDED_ROLE_LIST) {
            expect(kit.ROLE_NAME_PATTERN.test(role)).toBe(true);
        }
        // Reserved names are *shaped* like valid roles — that is exactly why
        // they need a separate deny-list rather than a stricter pattern.
        expect(kit.ROLE_NAME_PATTERN.test('transparent')).toBe(true);
        expect(kit.RESERVED_ROLE_NAMES.has('transparent')).toBe(true);
    });

    it('the base-* namespace is reserved against role declarations', () => {
        // validate.ts rejects roles named base or base-*; that rule only makes
        // sense while the fixed surfaces actually live in that namespace.
        for (const surface of kit.BASE_SURFACE_TOKEN_LIST) {
            expect(surface.startsWith('base-')).toBe(true);
        }
    });
});
