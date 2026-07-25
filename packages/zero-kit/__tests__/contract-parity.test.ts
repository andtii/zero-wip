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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
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
    // Compared as RegExp objects, not `.source` — deep equality covers the
    // flags too, so adding `i` to one copy and not the other still fails.
    ROLE_NAME_PATTERN: [zero.ROLE_NAME_PATTERN, kit.ROLE_NAME_PATTERN],
    TOKEN_KEY_PATTERN: [zero.TOKEN_KEY_PATTERN, kit.TOKEN_KEY_PATTERN],
    // Deep-compared including order: the categories drive emission order, so
    // a reordering in one copy is real drift, not cosmetic.
    TOKEN_CATEGORIES: [zero.TOKEN_CATEGORIES, kit.TOKEN_CATEGORIES],
};

/**
 * Same-named exports that are deliberately NOT value-compared, with the
 * reason. Layer 2 checks this table is exhaustive, so an exemption has to be
 * recorded here rather than by widening the intersection filter.
 */
const KNOWN_UNSHARED: Record<string, string> = {
    // Functions aren't meaningfully value-comparable; parity is asserted
    // behaviorally in the semantic layer below instead.
    tokenProperty: 'function — compared by behavior, not by value',
};

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

    it('tokenProperty spells identical names in both copies', () => {
        for (const category of kit.TOKEN_CATEGORIES) {
            const keys = category.recommended.length > 0 ? category.recommended : [undefined];
            for (const key of keys) {
                expect(kit.tokenProperty(category, key)).toBe(zero.tokenProperty(category, key));
            }
        }
    });

    it('category prefixes cannot collide with each other or with colors', () => {
        // A `scale` prefix that prefixes another would make `--x-y-z`
        // ambiguous between categories, and anything under `--color-` would
        // collide with the role grammar.
        const scales = kit.TOKEN_CATEGORIES.filter((c) => c.shape === 'scale');
        for (const a of kit.TOKEN_CATEGORIES) {
            expect(a.prefix.startsWith('--color-')).toBe(false);
            for (const b of scales) {
                if (a === b) continue;
                expect(b.prefix.startsWith(a.prefix)).toBe(false);
            }
        }
    });

    it('category ids are unique and every recommended key is well-formed', () => {
        const ids = kit.TOKEN_CATEGORIES.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const category of kit.TOKEN_CATEGORIES) {
            for (const key of category.recommended) {
                expect(kit.TOKEN_KEY_PATTERN.test(key)).toBe(true);
            }
            // A scalar category holds one value, so recommended keys would
            // have nothing to attach to.
            if (category.shape === 'scalar') expect(category.recommended).toEqual([]);
        }
    });

    it('base.css fallbacks sit in a layer a design system outranks', () => {
        // The fallbacks are on `:root` (0,1,0) while a compiled design system
        // emits `:where(:root)` (0,0,0) — so sharing one layer let the
        // fallback beat the design system's own default until a theme was
        // explicitly selected. A separate, earlier layer makes the ordering
        // independent of both specificity and import order.
        const baseCss = readFileSync(
            resolve(process.cwd(), 'packages/zero/css/base.css'),
            'utf8',
        );
        const order = /@layer\s+([^;]+);/.exec(baseCss);
        expect(order, 'base.css must declare the layer order').not.toBeNull();
        const layers = order![1]!.split(',').map((l) => l.trim());
        expect(layers.indexOf('zero.fallback')).toBeGreaterThan(-1);
        expect(layers.indexOf('zero.fallback')).toBeLessThan(layers.indexOf('zero.tokens'));

        // …and the fallback values must actually live in that layer.
        const fallbackBlock = baseCss.slice(baseCss.indexOf('@layer zero.fallback'));
        expect(fallbackBlock).toContain('--radius-box:');
    });

    it('base.css ships a fallback for every recommended key', () => {
        // A category a design system never mentions must still resolve, which
        // is what makes "absence is never a validation error" safe.
        // Resolved from the vitest root (import.meta.url is a transform URL
        // here, not a file: one).
        const baseCss = readFileSync(
            resolve(process.cwd(), 'packages/zero/css/base.css'),
            'utf8',
        );
        for (const category of kit.TOKEN_CATEGORIES) {
            const keys = category.recommended.length > 0 ? category.recommended : [undefined];
            for (const key of keys) {
                expect(baseCss).toContain(`${kit.tokenProperty(category, key)}:`);
            }
        }
    });

    it('the base-* namespace is reserved against role declarations', () => {
        // validate.ts rejects roles named base or base-*; that rule only makes
        // sense while the fixed surfaces actually live in that namespace.
        for (const surface of kit.BASE_SURFACE_TOKEN_LIST) {
            expect(surface.startsWith('base-')).toBe(true);
        }
    });
});
