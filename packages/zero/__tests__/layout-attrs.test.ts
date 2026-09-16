/**
 * The layout pass-through and its parse. Both are cross-package contracts —
 * the kit mirrors them and `contract-parity.test.ts` holds the copies
 * together — so the behavior is pinned here rather than inferred from the
 * components that will use it.
 */
import { describe, expect, it } from 'vitest';
import {
    LAYOUT_ATTR_PREFIX,
    LAYOUT_VOCABULARY,
    SPACE_STEPS,
    layoutAttrs,
    layoutAttrSpec,
    parseLayoutAttr,
} from '../src/contract/index.js';

const ALL = Object.keys(LAYOUT_VOCABULARY);

describe('layoutAttrs', () => {
    it('renders a bare value as one prefixed attribute', () => {
        expect(layoutAttrs({ gap: 'md' }, ['gap'])).toEqual({ 'data-l-gap': 'md' });
    });

    it('stringifies numbers, because `cols={4}` is how this gets written', () => {
        expect(layoutAttrs({ cols: 4 }, ['cols'])).toEqual({ 'data-l-cols': '4' });
    });

    it('expands a responsive record, with `base` unqualified', () => {
        expect(layoutAttrs({ gap: { base: 'sm', md: 'lg' } }, ['gap'])).toEqual({
            'data-l-gap': 'sm',
            'data-l-md-gap': 'lg',
        });
    });

    it('allows a record with no `base` — vary only above a breakpoint', () => {
        expect(layoutAttrs({ cols: { lg: 3 } }, ['cols'])).toEqual({ 'data-l-lg-cols': '3' });
    });

    it('skips undefined before the guards, so an unset optional prop is inert', () => {
        expect(layoutAttrs({ gap: undefined }, [])).toEqual({});
        expect(layoutAttrs({ gap: { base: undefined, md: 'lg' } }, ['gap']))
            .toEqual({ 'data-l-md-gap': 'lg' });
    });

    // Three throwing guards, all for `variantAttrs`' reason: the value comes
    // from application code, and a silently missing attribute is the exact
    // failure this mechanism exists to remove.
    it('throws on an attribute the part does not declare', () => {
        expect(() => layoutAttrs({ gap: 'md' }, ['pad']))
            .toThrow(/does not declare "gap"/);
    });

    it('throws on a value outside the closed set', () => {
        expect(() => layoutAttrs({ gap: 'roomy' }, ['gap']))
            .toThrow(/"roomy" is not a value of "gap"/);
    });

    it('throws when a non-responsive attribute is given a record', () => {
        expect(() => layoutAttrs({ wrap: { md: 'wrap' } }, ['wrap']))
            .toThrow(/does not vary per breakpoint/);
    });
});

describe('parseLayoutAttr', () => {
    it('round-trips every attribute in the vocabulary, bare and per-breakpoint', () => {
        for (const attr of ALL) {
            expect(parseLayoutAttr(`${LAYOUT_ATTR_PREFIX}${attr}`)).toEqual({ attr });
            const responsive = layoutAttrSpec(attr as never).responsive;
            expect(parseLayoutAttr(`${LAYOUT_ATTR_PREFIX}md-${attr}`))
                .toEqual(responsive ? { attr, breakpoint: 'md' } : undefined);
        }
    });

    it('prefers the whole name over a split, which is what keeps `gap-x` unambiguous', () => {
        // The trap this guards: split-first would read `gap-x` as breakpoint
        // `gap` + attribute `x`, and `gap-x` is a real attribute.
        expect(parseLayoutAttr('data-l-gap-x')).toEqual({ attr: 'gap-x' });
    });

    it('accepts a breakpoint name that starts with a digit', () => {
        // Token keys may lead with a digit (`--text-2xl`), so a design system
        // may legitimately name a breakpoint `2xl`.
        expect(parseLayoutAttr('data-l-2xl-gap')).toEqual({ attr: 'gap', breakpoint: '2xl' });
    });

    it('returns undefined for anything that is not ours', () => {
        for (const name of ['data-color', 'data-state', 'data-l-', 'data-l-gutter', 'gap', '']) {
            expect(parseLayoutAttr(name), name).toBeUndefined();
        }
    });
});

describe('the vocabulary itself', () => {
    it('spells the spacing ramp exactly as the token contract recommends', () => {
        // The two must agree or `gap="2xl"` resolves to a `--space-2xl` no
        // design system was ever asked to declare.
        expect([...SPACE_STEPS]).toEqual(['none', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']);
        for (const attr of ['gap', 'gap-x', 'gap-y', 'pad', 'pad-x', 'pad-y', 'space']) {
            expect(layoutAttrSpec(attr as never).values, attr).toEqual([...SPACE_STEPS]);
        }
    });

    it('every value is attribute-selector- and class-safe', () => {
        // Values land in a quoted attribute selector on the web and in an
        // unescaped class name on lynx, so the alphabet has to survive both.
        for (const attr of ALL) {
            expect(attr).toMatch(/^[a-z][a-z0-9-]*$/);
            for (const value of layoutAttrSpec(attr as never).values) {
                expect(value, `${attr}=${value}`).toMatch(/^[a-z0-9][a-z0-9-]*$/);
            }
        }
    });

    it('declares no attribute whose name collides with a reserved axis', () => {
        // The prefix is what makes this true, and it is worth asserting: an
        // unprefixed family would have had to seize all of these names.
        const reserved = new Set(['scope', 'part', 'state', 'orientation']);
        for (const attr of ALL) expect(reserved.has(attr), attr).toBe(false);
    });
});
