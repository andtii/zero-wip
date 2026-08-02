/**
 * The declared-step-nobody-honours guard.
 *
 * A design system's `tokens.sizes` / `tokens.variants` / `tokens.roles` /
 * `tokens.axes` are not notes to self. They reach `manifest.json`, the docs
 * site and the generated `register.d.ts`; an app is entitled to pass any value
 * in them and `data-size="2xl"` reaches the DOM whether or not a rule matches.
 * A declared value nothing matches doesn't fail — it silently renders the base.
 *
 * So #258: zero-carbon declared `sm md lg xl 2xl` and only `button` shipped
 * `xl`/`2xl`. The other fourteen size-bearing scopes fell back to their `md`
 * base at both steps, which is *smaller than `lg`* — avatar 48 → 40px, checkbox
 * 22 → 18, switch 56×28 → 48×24. Growing the size axis shrank the control. The
 * full suite was green throughout: the css goldens recorded the absent rules
 * faithfully, `validate-recipes` only asks whether a value names a declared one
 * (it did not exist, so there was nothing to name), and `axis-coverage.test.ts`
 * asks whether a scope wires the axis *at all* — avatar wired `sm` and `lg`, so
 * it was wiring size. Nothing asked whether the ramp had holes in it.
 *
 * ── THE UN-ATTRIBUTED STEP ───────────────────────────────────────────────────
 * The naive rule — "every declared value must emit a rule in every scope" —
 * cannot be stated, because one step per axis legitimately emits nothing:
 *
 *     sm: { root: { base: { minHeight: '2rem' } } },
 *     md: {},   // the base already IS md; restating it is a second copy free to drift
 *     lg: { root: { base: { minHeight: '3rem' } } },
 *
 * That is right, and it is not always `md` — zero-carbon's button writes
 * `lg: {}` because Carbon's default button is the 48px one, and zero-heroui's
 * whole size axis is based on `md`.
 *
 * This guard reads the empty entry AS the claim: **a declared value is
 * accounted for when it emits a rule in the default render, or when the recipe
 * writes it as an entry that emits nothing at all — which says "the base is
 * this step".** No new syntax, no schema change; it is already what every
 * author means. `defaultVariants` is deliberately NOT a second way to say it:
 * it would let a forgotten step be excused by a field written for a different
 * purpose, and the point of the empty entry is that an author who forgot a step
 * wrote nothing at all.
 *
 * "Emits nothing at all" is stricter than "emits nothing here": an entry whose
 * only rule sits inside a `@media` has clearly been thought about and is not
 * claiming to be the base, so it is a gap rather than a claim — which is also
 * the honest reading, since at the default viewport it renders as the base
 * without meaning to.
 *
 * The claim being singular is half the guard (assertion B). Two silent values
 * both stand for the base, so they render identically — which is #258's harm
 * exactly, reached by the other door: "fix" a missing `xl` by writing `xl: {}`
 * and `xl` still renders as `md`. A closes the hole B would open, and B closes
 * A's.
 *
 * ── WHY THE COMPILED CSS ─────────────────────────────────────────────────────
 * The same substrate and the same reasoning as `state-legibility.test.ts` and
 * `button-affordance.test.ts`: a value can be implemented through `variants`,
 * `compoundVariants` or the raw `css` escape hatch, and only the artifact sees
 * all three. Only the *default context* counts — a step whose only rule sits
 * inside a `@media` is not implemented at the default viewport, and what the
 * reader gets there is the base. (The recipe tree is read for exactly one
 * thing: whether a value was WRITTEN, which is not visible in CSS that an
 * empty entry by definition does not emit.)
 *
 * ── WHY IT IS NOT THE NAIVE RULE ─────────────────────────────────────────────
 * Measured before it was written: across the six design systems, "every
 * declared value in every scope with a recipe" reports **1267** findings. That
 * is the shape that got the per-part legibility guard reverted at 164. The
 * scoping below reports **0**, and reports the 28 that #258 actually was.
 *
 * Two restrictions get it there, and each is a claim rather than a threshold:
 *
 * 1. **Only scopes that participate.** A scope wiring nothing for an axis is
 *    not making a promise about it — zero's dialog, popover and tooltip take no
 *    size prop, and `axis-coverage.test.ts` already owns the question of which
 *    scopes ought to. (1267 → 124.)
 * 2. **Only values some scope in the design system implements.** A step
 *    `button` ships is a step the design system has decided exists, and a
 *    sibling that also takes the axis and skips it is the #258 gap. A value NO
 *    recipe implements is a different claim — the design system said a word and
 *    never used it — and assertion C takes that one at design-system
 *    granularity, where it is three findings instead of sixty-four. (124 → 0,
 *    once the un-attributed step is read.)
 */
import { describe, it, expect } from 'vitest';
import { axisClaims, compileDesignSystem, offeredFor } from '@sigx/zero-kit';
import type {
    CompiledDesignSystem,
    ManifestComponent,
    RecipeInput,
    RoleDecl,
    ScopeVocabulary,
} from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';
import { designSystem as basicDS } from '@sigx/zero-basic';
import { designSystem as daisyDS } from '@sigx/zero-daisyui';
import { designSystem as materialDS } from '@sigx/zero-material';
import { designSystem as brutalistDS } from '@sigx/zero-brutalist';
import { designSystem as herouiDS } from '@sigx/zero-heroui';
import { designSystem as carbonDS } from '@sigx/zero-carbon';
import { parseRules } from './helpers/css-rules.js';
import type { CssRule } from './helpers/css-rules.js';

const manifest = {
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
};

// One by one, for the reason `css-golden.test.ts`, `state-legibility.test.ts`
// and `button-affordance.test.ts` all give: `DesignSystemInput<R>` is invariant
// in `R`, so the inputs cannot be widened into one array while the compiled
// results share a non-generic type.
const SYSTEMS: ReadonlyArray<{ name: string; compiled: CompiledDesignSystem }> = [
    { name: 'basic', compiled: compileDesignSystem(basicDS, manifest) },
    { name: 'daisyui', compiled: compileDesignSystem(daisyDS, manifest) },
    { name: 'material', compiled: compileDesignSystem(materialDS, manifest) },
    { name: 'brutalist', compiled: compileDesignSystem(brutalistDS, manifest) },
    { name: 'heroui', compiled: compileDesignSystem(herouiDS, manifest) },
    { name: 'carbon', compiled: compileDesignSystem(carbonDS, manifest) },
];

/**
 * The value vocabulary this design system declares, per axis attribute.
 *
 * Keyed by the attribute the CSS matches on, which is what makes the vendor
 * API remap (#183) a non-issue here: zero-carbon's `kind` is the `variant` axis
 * under a vendor name, spelled kebab in `tokens.variants` and kebab in
 * `[data-variant="danger-tertiary"]`; the double-hyphen spelling exists only at
 * the prop boundary.
 *
 * An axis declared out of existence (`roles: {}`, `sizes: []`) is absent, not
 * empty — there is no vocabulary to honour.
 */
function declaredVocabulary(compiled: CompiledDesignSystem): Record<string, readonly string[]> {
    const out: Record<string, readonly string[]> = {};
    const roles = Object.keys(compiled.tokens.roles);
    if (roles.length > 0) out['color'] = roles;
    if (compiled.tokens.sizes.length > 0) out['size'] = compiled.tokens.sizes;
    if (compiled.tokens.variants.length > 0) out['variant'] = compiled.tokens.variants;
    for (const [axis, values] of Object.entries(compiled.tokens.axes)) {
        if (values.length > 0) out[axis] = values;
    }
    return out;
}

/** Rules that apply somewhere other than the plain, default-viewport render. */
const isDefaultContext = (rule: CssRule): boolean => rule.at.every((p) => p.startsWith('@layer'));

/**
 * The values of `axis` this stylesheet matches on.
 *
 * `where: 'default'` is what the reader gets with no query satisfied — the only
 * render a value can be said to be implemented in. `where: 'anywhere'` includes
 * `@media`, and exists to tell an entry that paints *somewhere* apart from one
 * that paints nowhere at all: only the second is the empty entry that claims
 * the base.
 */
function paintedValues(css: string, axis: string, where: 'default' | 'anywhere'): Set<string> {
    const out = new Set<string>();
    const attr = new RegExp(`\\[data-${axis}="([^"]+)"\\]`, 'g');
    for (const rule of parseRules(css)) {
        if (where === 'default' && !isDefaultContext(rule)) continue;
        for (const [, value] of rule.selector.matchAll(attr)) out.add(value!);
    }
    return out;
}

/**
 * The values of `axis` this recipe WROTE, whether or not they emit anything.
 *
 * `harvestAxes` already collects exactly this — the keys of `variants[axis]`
 * plus any value named in a `compoundVariants` match — which is why the empty
 * entry is legible at all: `md: {}` emits no CSS but is a key.
 */
const writtenValues = (axes: CompiledDesignSystem['components'][string], axis: string): Set<string> =>
    new Set(
        axis === 'color' ? axes.color
            : axis === 'size' ? axes.size
                : axis === 'variant' ? axes.variant
                    : (axes.axes[axis] ?? []),
    );

/**
 * The vocabulary one SCOPE offers for one axis — its `tokens.scopes` entry
 * where it declared one, else the design-system-wide list (#294).
 *
 * The distinction is what keeps rule A honest under a union: once
 * `tokens.variants` is the union of every scope's vocabulary, "a value a
 * sibling implements" stops meaning "a value this scope owes you".
 */
function vocabularyFor(compiled: CompiledDesignSystem, scope: string, axis: string): readonly string[] {
    const wired = compiled.components[scope];
    const offered = wired ? offeredFor(wired, axis) : undefined;
    return offered ?? declaredVocabulary(compiled)[axis] ?? [];
}

interface Cell {
    scope: string;
    axis: string;
    /** Painted in the default render — the only place a value counts as implemented. */
    painted: Set<string>;
    /** Written as an entry, whether or not it emits anything. */
    written: Set<string>;
    /** Written and emitting nothing anywhere: the claim that the base IS this value. */
    claims: string[];
    /** The vocabulary this scope offers for the axis — see `vocabularyFor`. */
    offered: readonly string[];
    /** True when that vocabulary is the scope's own rather than the union's. */
    restricted: boolean;
}

/** Every (scope, axis) in one design system that participates in the axis. */
function participatingCells(compiled: CompiledDesignSystem): Cell[] {
    const cells: Cell[] = [];
    for (const [scope, axes] of Object.entries(compiled.components)) {
        const css = compiled.componentCss[scope] ?? '';
        for (const axis of Object.keys(declaredVocabulary(compiled))) {
            const painted = paintedValues(css, axis, 'default');
            const anywhere = paintedValues(css, axis, 'anywhere');
            const written = writtenValues(axes, axis);
            const declared = offeredFor(axes, axis);
            // A scope that declared the axis out of existence FOR ITSELF is
            // not participating, whatever the CSS says. Wiring an axis you
            // declared away is a `validate-recipes` error, and this guard must
            // not report the same mistake a second time as a coverage gap.
            if (declared?.length === 0) continue;
            // A scope with a vocabulary of its own participates even when it
            // paints and writes nothing. Before per-scope vocabularies there
            // was no way to promise anything, so silence was the only honest
            // reading; a declared vocabulary IS the promise, and promising a
            // vocabulary and shipping none of it is the sharpest #258 there is.
            //
            // Otherwise: a scope that neither paints nor writes a single value
            // of this axis has nothing this guard can hold it to. Whether it
            // *should* participate is `axis-coverage.test.ts`'s question, not
            // this one's — conflating the two would make this fail for a
            // reason it was not built to catch.
            if (!declared && anywhere.size === 0 && written.size === 0) continue;
            cells.push({
                scope,
                axis,
                painted,
                written,
                claims: [...written].filter((v) => !anywhere.has(v)),
                offered: vocabularyFor(compiled, scope, axis),
                restricted: declared !== undefined,
            });
        }
    }
    return cells;
}

/** Values `axis` is implemented for by at least one scope in this design system. */
function implementedSomewhere(compiled: CompiledDesignSystem, axis: string): Set<string> {
    const out = new Set<string>();
    for (const css of Object.values(compiled.componentCss)) {
        for (const value of paintedValues(css, axis, 'default')) out.add(value);
    }
    return out;
}

/** Assertion A: a step a sibling implements, that this scope neither paints nor claims. */
function coverageGaps(compiled: CompiledDesignSystem): string[] {
    const out: string[] = [];
    const declared = declaredVocabulary(compiled);
    const promised = new Map<string, Set<string>>(
        Object.keys(declared).map((axis) => [axis, implementedSomewhere(compiled, axis)]),
    );
    for (const cell of participatingCells(compiled)) {
        const claimed = new Set(cell.claims);
        // Two readings of "owes you this value", and which applies is exactly
        // whether the scope declared a vocabulary (#294):
        //
        // - **Restricted**: it named the values itself, so every one of them is
        //   owed and a sibling's set is irrelevant. This is what stops a union
        //   from making `button.variant: classic` a finding when `classic` was
        //   declared for `select` and painted there.
        // - **Unrestricted**: the original rule, unchanged — a value some
        //   sibling implements, since the whole union is on offer here.
        //
        // A design system where one scope restricts and a sibling does not gets
        // findings against the sibling, and that is the union's honest
        // consequence rather than a bug: the sibling really is still offering
        // values declared for someone else. `validateDesignSystem` names it at
        // the declaration, before it can arrive here.
        const missing = cell.offered.filter(
            (v) => !cell.painted.has(v) && !claimed.has(v)
                && (cell.restricted || promised.get(cell.axis)!.has(v)),
        );
        if (missing.length > 0) out.push(`${cell.scope}.${cell.axis}: ${missing.join(', ')}`);
    }
    return out.sort();
}

/** Assertion B: more than one value claiming to be the base. */
function ambiguousBases(compiled: CompiledDesignSystem): string[] {
    return participatingCells(compiled)
        .filter((cell) => cell.claims.length > 1)
        .map((cell) => `${cell.scope}.${cell.axis}: ${[...cell.claims].sort().join(', ')}`)
        .sort();
}

/**
 * Assertion C, in two classes that the union splits apart (#294):
 *
 * - **`unused`** — declared, in some scope's vocabulary, painted by nothing and
 *   claimed by nothing. The original rule: a word the design system says and
 *   never uses.
 * - **`unclaimed`** — declared, and in NO scope's vocabulary at all. Only
 *   reachable once every scope is restricted; while one is still open its
 *   vocabulary *is* the union, `axisClaims` says so, and the value falls to
 *   `unused` the old way.
 *
 * The two are different mistakes with different fixes — paint it somewhere,
 * versus give it to a scope or drop it from the union — so they are reported
 * apart rather than merged into "nobody uses this".
 */
function unusedVocabulary(
    compiled: CompiledDesignSystem,
): Array<{ axis: string; value: string; reason: 'unused' | 'unclaimed' }> {
    const out: Array<{ axis: string; value: string; reason: 'unused' | 'unclaimed' }> = [];
    const cells = participatingCells(compiled);
    for (const [axis, values] of Object.entries(declaredVocabulary(compiled))) {
        const painted = implementedSomewhere(compiled, axis);
        const claimed = new Set(cells.filter((c) => c.axis === axis).flatMap((c) => c.claims));
        const claims = axisClaims(compiled, axis);
        for (const value of values) {
            if (!claims.unrestricted && !claims.claimed.has(value)) {
                out.push({ axis, value, reason: 'unclaimed' });
            } else if (!painted.has(value) && !claimed.has(value)) {
                out.push({ axis, value, reason: 'unused' });
            }
        }
    }
    return out;
}

/**
 * A role that opted out of `-content` or `-soft` is a fill or a hairline —
 * Material's tonal `surface*` family, its `outline` — which is a token, not
 * something a control can be coloured. `tokens.roles` does double duty as the
 * palette and as the `color` vocabulary, and SKILL.md already tells authors to
 * filter exactly this predicate out of the axis. So the four material roles no
 * recipe wires are the declaration working as intended, not a gap.
 */
const isFillOrHairline = (decl: RoleDecl | undefined): boolean =>
    decl?.content === false || decl?.soft === false;

describe('every declared axis value is honoured or claimed', () => {
    it('reads a vocabulary and a stylesheet worth asserting on', () => {
        // A sanity check on the substrate: every assertion below is an
        // emptiness check, which is also what a guard that can see nothing
        // reports.
        const carbon = SYSTEMS.find((s) => s.name === 'carbon')!.compiled;
        expect(declaredVocabulary(carbon)['size']).toEqual(['sm', 'md', 'lg', 'xl', '2xl']);
        expect([...paintedValues(carbon.componentCss['button']!, 'size', 'default')].sort())
            .toEqual(['2xl', 'md', 'sm', 'xl']);
        // …and `lg` is Carbon's un-attributed button step, written and silent.
        expect(participatingCells(carbon).find((c) => c.scope === 'button' && c.axis === 'size')?.claims)
            .toEqual(['lg']);
        expect(participatingCells(carbon).filter((c) => c.axis === 'size').length).toBe(15);
    });

    it.each(SYSTEMS.map((s) => s.name))(
        '%s: no scope skips a step its siblings implement',
        (name) => {
            const compiled = SYSTEMS.find((s) => s.name === name)!.compiled;
            expect(
                coverageGaps(compiled),
                `${name} declares these values, implements them in some scope, and silently renders the base in these`,
            ).toEqual([]);
        },
    );

    it.each(SYSTEMS.map((s) => s.name))(
        '%s: at most one value per scope claims the base',
        (name) => {
            const compiled = SYSTEMS.find((s) => s.name === name)!.compiled;
            expect(
                ambiguousBases(compiled),
                `${name} writes these values as empty entries, so they all render as the base — and identically to each other`,
            ).toEqual([]);
        },
    );

    it.each(SYSTEMS.map((s) => s.name))(
        '%s: a declared value no recipe uses is a token, not an axis value',
        (name) => {
            const compiled = SYSTEMS.find((s) => s.name === name)!.compiled;
            // The deliberate let-through, made visible rather than silent. A
            // colour role that is a fill or a hairline is legitimately never a
            // `data-color` value; anything else — a size step, a variant, a
            // custom axis value, a full colour role — is a word the design
            // system says and never uses, and this is where it surfaces.
            const unexplained = unusedVocabulary(compiled).filter(
                (u) => !(u.axis === 'color' && isFillOrHairline(compiled.tokens.roles[u.value])),
            );
            expect(
                unexplained.map((u) => `${u.axis}: ${u.value}`).sort(),
                `${name} declares these and no recipe paints or claims them — an app may pass them and get the base`,
            ).toEqual([]);
        },
    );

    it('records the vocabulary that is declared and deliberately unwired', () => {
        // Not a formality: the exemption above is only safe while it is exactly
        // Material's tonal surfaces. If a design system adds a fill role and
        // then starts wiring it, or another one grows an unused role, this
        // fails and the reasoning gets revisited rather than inherited.
        // Both classes in one sorted list, keyed apart: an unclaimed value is
        // a different mistake from an unpainted one, and either breaking this
        // must fail rather than be absorbed by the other.
        const ledger = SYSTEMS.flatMap((s) =>
            unusedVocabulary(s.compiled).map((u) =>
                `${s.name}/${u.axis}: ${u.value}${u.reason === 'unclaimed' ? ' (unclaimed)' : ''}`));
        expect(ledger.sort()).toEqual([
            'material/color: outline',
            'material/color: surface',
            'material/color: surface-container',
            'material/color: surface-container-high',
        ]);
    });
});

/**
 * The guard's own teeth.
 *
 * Everything above asserts six design systems are clean, which is also what a
 * guard that can see nothing reports. So every carve-out gets a fixture that it
 * MUST report — and one that it must NOT, so the carve-out is shown to be a
 * carve-out rather than a blanket.
 */
describe('the guard\'s own teeth', () => {
    const size = (values: Record<string, Record<string, unknown>>): RecipeInput['variants'] =>
        ({ size: values as Record<string, Record<string, never>> });

    const height = (v: string) => ({ root: { base: { minHeight: v } } });

    /** A two-scope design system over the real `button` and `avatar` anatomies. */
    const fixture = (
        sizes: string[],
        button: RecipeInput['variants'],
        avatar: RecipeInput['variants'],
        scopes?: Record<string, ScopeVocabulary>,
    ): CompiledDesignSystem => compileDesignSystem({
        name: 'fixture',
        tokens: {
            roles: { primary: {} },
            sizes,
            ...(scopes ? { scopes } : {}),
            themes: {
                day: {
                    colorScheme: 'light',
                    colors: {
                        'base-100': 'white', 'base-200': 'white', 'base-300': 'white',
                        'base-content': 'black', primary: 'blue', 'primary-content': 'white',
                    },
                },
            },
            defaultLight: 'day',
        },
        recipes: [
            { component: 'button', parts: { root: { base: {} } }, variants: button },
            { component: 'avatar', parts: { root: { base: {} } }, variants: avatar },
        ],
    }, manifest);

    const RAMP = ['sm', 'md', 'lg', 'xl'];

    it('reports #258 verbatim — button ships the tail of the ramp and a sibling does not', () => {
        const ds = fixture(
            RAMP,
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
            size({ sm: height('2rem'), md: {}, lg: height('3rem') }),
        );
        expect(coverageGaps(ds)).toEqual(['avatar.size: xl']);
    });

    it('reports a hole in the MIDDLE of a ramp, not just a short tail', () => {
        const ds = fixture(
            RAMP,
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
            size({ sm: height('2rem'), md: {}, xl: height('4rem') }),
        );
        expect(coverageGaps(ds)).toEqual(['avatar.size: lg']);
    });

    it('reports a step implemented only inside a media query', () => {
        // `xl` matches a selector, so a `toContain('[data-size="xl"]')` would
        // pass it — and at the default viewport the control still renders as
        // `md`, which is the whole bug. It is also why an entry has to paint
        // NOWHERE to count as the base claim: this one paints somewhere, so it
        // is not claiming anything, and A reports the gap.
        const ds = fixture(
            RAMP,
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
            size({
                sm: height('2rem'), md: {}, lg: height('3rem'),
                xl: { root: { at: { print: { base: { minHeight: '4rem' } } } } },
            }),
        );
        expect(coverageGaps(ds)).toEqual(['avatar.size: xl']);
    });

    it('accepts the un-attributed step, wherever in the ramp it sits', () => {
        // Both scopes ship every step, each claiming a DIFFERENT base — which
        // is zero-carbon's real shape (button on `lg`, everything else on `md`).
        const ds = fixture(
            RAMP,
            size({ sm: height('2rem'), md: height('2.5rem'), lg: {}, xl: height('4rem') }),
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
        );
        expect(coverageGaps(ds)).toEqual([]);
        expect(ambiguousBases(ds)).toEqual([]);
    });

    it('reports a gap "fixed" by writing a second empty entry', () => {
        // The escape hatch assertion A would otherwise open: `xl: {}` accounts
        // for `xl` and renders it identically to `md`, i.e. smaller than `lg`.
        const ds = fixture(
            RAMP,
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: {} }),
        );
        expect(coverageGaps(ds)).toEqual([]);
        expect(ambiguousBases(ds)).toEqual(['avatar.size: md, xl']);
    });

    it('says nothing about a scope that wires no step at all', () => {
        // Not this guard's question — `axis-coverage.test.ts` owns whether a
        // scope that ACCEPTS the axis ought to wire it, and the components that
        // take no size prop (dialog, popover, tooltip) must not be reported
        // here at all.
        const ds = fixture(RAMP, size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }), {});
        expect(coverageGaps(ds)).toEqual([]);
        expect(ambiguousBases(ds)).toEqual([]);
        expect(participatingCells(ds).some((c) => c.scope === 'avatar' && c.axis === 'size')).toBe(false);
    });

    // The fixture declares one colour role and wires it on neither component,
    // so `color: primary` is unused in every case below — true, and not what
    // these two are about.
    const unusedSizes = (ds: CompiledDesignSystem): string[] =>
        unusedVocabulary(ds).filter((u) => u.axis === 'size').map((u) => u.value);

    it('reports a declared step no scope implements — at design-system granularity', () => {
        // Assertion A is silent here by design: nothing promised `2xl`, so
        // there is no sibling to hold anyone to. C is the one that speaks, once
        // per design system instead of once per scope.
        const ds = fixture(
            [...RAMP, '2xl'],
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
        );
        expect(coverageGaps(ds)).toEqual([]);
        expect(unusedSizes(ds)).toEqual(['2xl']);
    });

    it('does not call a universally un-attributed base unused', () => {
        // `md` is painted by nobody in this fixture, and it is not a gap: every
        // participating scope writes it as the entry that claims the base.
        const ds = fixture(
            RAMP,
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
        );
        expect(implementedSomewhere(ds, 'size').has('md')).toBe(false);
        expect(unusedSizes(ds)).toEqual([]);
    });

    it('reports an unwired colour role that is a full role, not a fill', () => {
        // Assertion C's carve-out is `content: false` / `soft: false`, and this
        // is the other side of it: the fixture's `primary` is a full role that
        // no recipe paints, and C says so.
        const ds = fixture(
            RAMP,
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
        );
        expect(unusedVocabulary(ds)).toEqual([{ axis: 'color', value: 'primary', reason: 'unused' }]);
        expect(isFillOrHairline(ds.tokens.roles['primary'])).toBe(false);
        // …and the same role declared as a fill is exempt, which is exactly
        // what material's `surface*`/`outline` are.
        expect(isFillOrHairline({ content: false, soft: false })).toBe(true);
    });

    it('sees a value reached only through a compoundVariant', () => {
        // `variants` is not the only door: a value can be implemented by a
        // compound alone, and `harvestAxes` plus the compiled selector both see
        // it. A guard reading `variants` keys only would report a false gap.
        const ds = compileDesignSystem({
            name: 'fixture',
            tokens: {
                roles: { primary: {} },
                sizes: RAMP,
                themes: {
                    day: {
                        colorScheme: 'light',
                        colors: {
                            'base-100': 'white', 'base-200': 'white', 'base-300': 'white',
                            'base-content': 'black', primary: 'blue', 'primary-content': 'white',
                        },
                    },
                },
                defaultLight: 'day',
            },
            recipes: [
                {
                    component: 'button',
                    parts: { root: { base: {} } },
                    variants: size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
                },
                {
                    component: 'avatar',
                    parts: { root: { base: {} } },
                    variants: size({ sm: height('2rem'), md: {}, lg: height('3rem') }),
                    compoundVariants: [
                        { match: { size: 'xl', color: 'primary' }, parts: { root: { base: { minHeight: '4rem' } } } },
                    ],
                },
            ],
        }, manifest);
        expect(coverageGaps(ds)).toEqual([]);
    });

    // ── per-scope vocabularies (#294) ─────────────────────────────────────
    //
    // The union is what makes these necessary. Once `tokens.variants` is the
    // union of every scope's vocabulary rather than one vocabulary they share,
    // "a value a sibling implements" stops meaning "a value this scope owes
    // you" — and every assertion above was written on the old reading.

    const fill = (v: string) => ({ root: { base: { background: v } } });
    const variant = (values: Record<string, Record<string, unknown>>): RecipeInput['variants'] =>
        ({ variant: values as Record<string, Record<string, never>> });

    /** The same two scopes, over a declared `variant` vocabulary. */
    const variantFixture = (
        variants: string[],
        button: RecipeInput['variants'],
        avatar: RecipeInput['variants'],
        scopes?: Record<string, ScopeVocabulary>,
    ): CompiledDesignSystem => compileDesignSystem({
        name: 'fixture',
        tokens: {
            roles: { primary: {} },
            variants,
            ...(scopes ? { scopes } : {}),
            themes: {
                day: {
                    colorScheme: 'light',
                    colors: {
                        'base-100': 'white', 'base-200': 'white', 'base-300': 'white',
                        'base-content': 'black', primary: 'blue', 'primary-content': 'white',
                    },
                },
            },
            defaultLight: 'day',
        },
        recipes: [
            { component: 'button', parts: { root: { base: {} } }, variants: button },
            { component: 'avatar', parts: { root: { base: {} } }, variants: avatar },
        ],
    }, manifest);

    it('says nothing when each scope declares only its own values', () => {
        // The issue's headline: `classic` is select's, `solid` is button's, and
        // the union carries both. On the sibling reading this reports BOTH
        // scopes, which is exactly the false finding the union would otherwise
        // introduce the day per-scope vocabularies were used.
        const ds = variantFixture(
            ['solid', 'classic'],
            variant({ solid: fill('blue') }),
            variant({ classic: fill('grey') }),
            { button: { variants: ['solid'] }, avatar: { variants: ['classic'] } },
        );
        expect(coverageGaps(ds)).toEqual([]);
        expect(unusedVocabulary(ds).filter((u) => u.axis === 'variant')).toEqual([]);
    });

    it('reports the cross-talk when only one side restricts', () => {
        // Half-adopting the union, pinned rather than left to be discovered
        // inside a real design system: `button` still offers the whole union,
        // so `classic` — declared for `avatar` — really does render as the base
        // on a button. `validateDesignSystem` warns about this at the
        // declaration; this is the same fact seen from the coverage side.
        const ds = variantFixture(
            ['solid', 'classic'],
            variant({ solid: fill('blue') }),
            variant({ classic: fill('grey') }),
            { avatar: { variants: ['classic'] } },
        );
        expect(coverageGaps(ds)).toEqual(['button.variant: classic']);
    });

    it('reports a scope that promises a vocabulary and paints none of it', () => {
        // The sharpest #258 available: the declaration is the promise, and this
        // scope shipped nothing against it. Before per-scope vocabularies a
        // scope wiring nothing was silent — correctly, since it had promised
        // nothing.
        const ds = variantFixture(
            ['solid', 'classic'],
            variant({ solid: fill('blue') }),
            {},
            { avatar: { variants: ['classic'] } },
        );
        expect(coverageGaps(ds)).toEqual(['avatar.variant: classic']);
    });

    it('says nothing about a scope that declares the axis out of existence for itself', () => {
        // `variants: []` is the claim "no variant axis here", the same grammar
        // `sizes: []` uses design-system-wide — so there is nothing to cover
        // and no cell at all.
        const ds = variantFixture(
            ['solid'],
            variant({ solid: fill('blue') }),
            {},
            { avatar: { variants: [] } },
        );
        expect(coverageGaps(ds)).toEqual([]);
        expect(participatingCells(ds).some((c) => c.scope === 'avatar' && c.axis === 'variant')).toBe(false);
    });

    it('the empty restriction is not the absent one', () => {
        // Where the natural bug lives: `[] ?? union` keeps the empty list and
        // `[] || union` silently discards it. A scope that WIRES the axis makes
        // the two observably different — absent participates, empty does not.
        const wiring = variant({ solid: fill('grey') });
        const absent = variantFixture(['solid'], variant({ solid: fill('blue') }), wiring);
        const empty = variantFixture(
            ['solid'],
            variant({ solid: fill('blue') }),
            wiring,
            { avatar: { variants: [] } },
        );
        expect(participatingCells(absent).some((c) => c.scope === 'avatar' && c.axis === 'variant')).toBe(true);
        expect(participatingCells(empty).some((c) => c.scope === 'avatar' && c.axis === 'variant')).toBe(false);
    });

    const variantFindings = (ds: CompiledDesignSystem): string[] =>
        unusedVocabulary(ds).filter((u) => u.axis === 'variant').map((u) => `${u.value} (${u.reason})`).sort();

    it('reports a union value no scope\'s vocabulary claims', () => {
        // C2. `assist` is in the union and in nobody's vocabulary — a different
        // mistake from "declared and never painted", with a different fix.
        const ds = variantFixture(
            ['solid', 'classic', 'assist'],
            variant({ solid: fill('blue') }),
            variant({ classic: fill('grey') }),
            { button: { variants: ['solid'] }, avatar: { variants: ['classic'] } },
        );
        expect(variantFindings(ds)).toEqual(['assist (unclaimed)']);
        expect(coverageGaps(ds)).toEqual([]);
    });

    it('does not call a union value unclaimed while any scope is unrestricted', () => {
        // C2's negative, and what makes `unrestricted` legible: with `button`
        // open its vocabulary IS the union, so `assist` is claimed — and C1
        // reports it the old way instead, for the old reason.
        const ds = variantFixture(
            ['solid', 'classic', 'assist'],
            variant({ solid: fill('blue') }),
            variant({ classic: fill('grey') }),
            { avatar: { variants: ['classic'] } },
        );
        expect(variantFindings(ds)).toEqual(['assist (unused)']);
    });

    it('a per-scope size restriction retires a #258 finding', () => {
        // Not variant-only: #258 itself was a size problem, and declaring
        // avatar's ramp is the honest answer to it rather than a suppression.
        const shapes = [
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
            size({ sm: height('2rem'), md: {}, lg: height('3rem') }),
        ] as const;
        expect(coverageGaps(fixture(RAMP, shapes[0], shapes[1]))).toEqual(['avatar.size: xl']);
        expect(coverageGaps(fixture(RAMP, shapes[0], shapes[1], { avatar: { sizes: ['sm', 'md', 'lg'] } })))
            .toEqual([]);
    });

    it('a claim outside the scope\'s own vocabulary is still an ambiguous base', () => {
        // A and B must not start covering for each other: restricting the ramp
        // accounts for the MISSING step, and says nothing about the scope
        // writing a second silent entry that renders identically to its base.
        const ds = fixture(
            RAMP,
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: height('4rem') }),
            size({ sm: height('2rem'), md: {}, lg: height('3rem'), xl: {} }),
            { avatar: { sizes: ['sm', 'md', 'lg'] } },
        );
        expect(coverageGaps(ds)).toEqual([]);
        expect(ambiguousBases(ds)).toEqual(['avatar.size: md, xl']);
    });
});
