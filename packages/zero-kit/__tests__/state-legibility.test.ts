/**
 * The states-look-alike guard.
 *
 * `data-state` is the contract's promise that a component tells you which state
 * it is in. A design system can accept that promise and then break it silently:
 * declare every state, style none of them differently, and every existing check
 * still passes. The validator's coverage warning only asks whether a state was
 * MENTIONED. The css goldens see the whole artifact and understand none of it.
 * Nothing asked whether two states actually render differently.
 *
 * So they did not. Before #226: material's and brutalist's checkbox indicator
 * painted no mark at all — three identical empty boxes — and every design
 * system's rating group set the same `color` for `full` and `half`, so a half
 * star rendered as a full one. Six design systems, the same two bugs, none of
 * them caught.
 *
 * ── WHY THE COMPILED CSS, NOT THE RECIPE TREE ───────────────────────────────
 * State styling reaches the stylesheet through `states`, `selectors`,
 * `variants.*`, `compoundVariants`, `modifiers`, nested `at`, and the raw `css`
 * escape hatch. Only the emitted CSS sees all seven. A guard reading `states`
 * would have called zero-basic and zero-daisyui broken for putting their tick
 * in `selectors['&[data-state="checked"]::after']` — the two that were right.
 * `css-golden.test.ts` already establishes compiled CSS as this package's
 * assertion substrate; this is a second reader of it, one that understands what
 * it reads.
 *
 * ── WHAT COUNTS AS A DIFFERENCE ──────────────────────────────────────────────
 * The default render, and only what the reader can see in it. Rules under any
 * `@media` are excluded (`isDefaultContext`) and motion-only declarations are
 * dropped (`isVisual`) — a guard that accepted either would have accepted the
 * bug it was written for: #226 gives every drawn mark a `forced-colors`/`print`
 * glyph fallback, so `content: "\2713"` vs `content: "\2212"` would have made
 * "the indicator distinguishes `checked` from `indeterminate`" true of an
 * indicator that draws two identical empty boxes. `the guard's own teeth` at the
 * bottom of this file keeps both holes shut with fixtures.
 */
import { describe, it, expect } from 'vitest';
import { compileDesignSystem, compileRecipeCss } from '@sigx/zero-kit';
import type { CompiledDesignSystem, ManifestComponent, PartStyles, RecipeInput } from '@sigx/zero-kit';
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

// Compiled one by one for the same reason `css-golden.test.ts` does it:
// `DesignSystemInput<R>` is invariant in `R`, so the inputs cannot be widened
// into one array, while the compiled results share a non-generic type. The
// recipes ride along because `skipStates` is this guard's exemption and lives on
// the recipe, not in the CSS.
interface System {
    name: string;
    recipes: readonly RecipeInput[];
    compiled: CompiledDesignSystem;
}

const SYSTEMS: readonly System[] = [
    { name: 'basic', recipes: basicDS.recipes, compiled: compileDesignSystem(basicDS, manifest) },
    { name: 'daisyui', recipes: daisyDS.recipes, compiled: compileDesignSystem(daisyDS, manifest) },
    { name: 'material', recipes: materialDS.recipes, compiled: compileDesignSystem(materialDS, manifest) },
    { name: 'brutalist', recipes: brutalistDS.recipes, compiled: compileDesignSystem(brutalistDS, manifest) },
    { name: 'heroui', recipes: herouiDS.recipes, compiled: compileDesignSystem(herouiDS, manifest) },
    { name: 'carbon', recipes: carbonDS.recipes, compiled: compileDesignSystem(carbonDS, manifest) },
];

/**
 * States the browser also carries natively, and the selectors that read them.
 *
 * A design system may style `open` as `[open]` on a `<details>` or `:checked`
 * on a real input rather than through `data-state` — zero renders both. Without
 * this, material's `<details>`-based accordion and collapsible look
 * undifferentiated when they are styled through
 * `[data-part="root"][open]::details-content`.
 */
const NATIVE_PROXIES: Readonly<Record<string, readonly string[]>> = {
    open: ['[open]', ':popover-open', ':open'],
    checked: [':checked'],
    indeterminate: [':indeterminate'],
};

/** Every fragment that means "this rule applies in state `s`". */
const fragmentsFor = (state: string): readonly string[] =>
    [`[data-state="${state}"]`, ...(NATIVE_PROXIES[state] ?? [])];

/** The part a rule's subject is, plus any pseudo-element hung off it. */
function groupOf(rule: CssRule): string | undefined {
    // The LAST `data-part` is the subject — `[data-color="x"] [data-part="y"]`
    // styles `y`, and pseudo-projected parts (`dialog.backdrop` →
    // `[data-part="popup"]::backdrop`) land under their host's name.
    const parts = [...rule.selector.matchAll(/\[data-part="([^"]+)"\]/g)];
    const part = parts[parts.length - 1]?.[1];
    if (!part) return undefined;
    // Key by (host part, pseudo suffix): a recipe-authored `::after` is a
    // different surface from the element itself, and a component that draws its
    // mark there is drawing it somewhere real.
    const pseudo = /(::[a-z-]+(?:\([^)]*\))?)\s*$/.exec(rule.selector)?.[1] ?? '';
    return `${part}${pseudo}`;
}

/**
 * Rules that only apply somewhere other than the default render.
 *
 * The question this guard asks is whether the state is legible in the render
 * the reader gets — so only the unconditional cascade counts. `@layer` is
 * structure and stays; every condition is disqualifying, and the two that
 * matter most are `forced-colors` and `print`. Both carry the glyph fallbacks
 * the drawn marks swap in (`content: "\2713"` vs `"\2212"`), and counting those
 * would make this assertion vacuous for exactly the pair it exists to protect:
 * an indicator that draws NOTHING in either state would still be "legible"
 * because a palette the reader is not using tells them apart. A breakpoint or a
 * `hover: none` difference is disqualified for the same reason — a difference
 * some readers never see is not the default render differentiating.
 */
const isDefaultContext = (rule: CssRule): boolean => rule.at.every((p) => p.startsWith('@layer'));

/**
 * Declarations that cannot change how a RESTING state looks.
 *
 * A state whose only declaration is `transition: scale … var(--duration-fast)`
 * differs in how it ARRIVES, not in how it looks once it has: material's
 * `&[data-state="checked"]::after` restates the transition to stagger the
 * second arm, and that alone must not count as drawing a mark. Kept out of the
 * fingerprint rather than out of the CSS, and a rule left with nothing else is
 * dropped whole — otherwise its bare existence would still differentiate.
 *
 * `animation-delay` joins them for the same reason; `animation` itself does
 * not, since a state can legitimately BE an animation (daisy's radio dot).
 */
const NON_VISUAL: ReadonlySet<string> = new Set([
    'transition',
    'transition-property',
    'transition-duration',
    'transition-timing-function',
    'transition-delay',
    'transition-behavior',
    'will-change',
    'animation-delay',
]);

const isVisual = (decl: string): boolean =>
    !NON_VISUAL.has(decl.slice(0, decl.indexOf(':')).trim().toLowerCase());

/**
 * The rules that apply to one group in one state, with the state itself blanked.
 *
 * Blanking is what makes the comparison meaningful: two rules that differ ONLY
 * in which state they name are the same paint, so the states are
 * indistinguishable. Declarations are sorted, because a reordering is not a
 * visual difference.
 */
function fingerprint(rules: readonly CssRule[], group: string, state: string): string[] {
    const fragments = fragmentsFor(state);
    const out: string[] = [];
    for (const rule of rules) {
        if (!isDefaultContext(rule)) continue;
        if (groupOf(rule) !== group) continue;
        if (!fragments.some((f) => rule.selector.includes(f))) continue;
        const decls = rule.decls.filter(isVisual);
        if (!decls.length) continue;
        let selector = rule.selector;
        for (const f of fragments) selector = selector.split(f).join('[data-state="§"]');
        out.push([...rule.at, selector, [...decls].sort().join('; ')].join(' | '));
    }
    return out.sort();
}

const distinguishes = (rules: readonly CssRule[], group: string, a: string, b: string): boolean =>
    fingerprint(rules, group, a).join('\n') !== fingerprint(rules, group, b).join('\n');

/** Every unordered pair of a closed state set. */
function pairsOf(states: readonly string[]): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) pairs.push([states[i]!, states[j]!]);
    }
    return pairs;
}

interface Case {
    ds: string;
    scope: string;
    component: ManifestComponent;
    rules: CssRule[];
    groups: string[];
    /** The recipe's own exemptions, kept per part — see `skipsPair`. */
    skipStates: Readonly<Record<string, readonly string[]>>;
}

/** One judgeable unit: an anatomy, the recipe for it, and the CSS that came out. */
function caseOf(ds: string, component: ManifestComponent, recipe: RecipeInput, css: string): Case {
    const rules = parseRules(css);
    return {
        ds,
        scope: component.scope,
        component,
        rules,
        groups: [...new Set(rules.map(groupOf).filter((g): g is string => Boolean(g)))],
        skipStates: recipe.skipStates ?? {},
    };
}

const CASES: Case[] = SYSTEMS.flatMap(({ name, recipes, compiled }) =>
    manifest.components.flatMap((component) => {
        const css = compiled.componentCss[component.scope];
        const recipe = recipes.find((r) => r.component === component.scope);
        // A component with no recipe is a different failure the validator
        // already warns about ("will render unstyled"); conflating the two would
        // make this fail for a reason it was not built to catch.
        if (!css || !recipe) return [];
        return [caseOf(name, component, recipe, css)];
    }));

/**
 * Has `part` declared this pair intentionally unstyled?
 *
 * `skipStates` already means "this declared state is intentionally left
 * unstyled" — the same claim this guard tests, so the same opt-out, declared in
 * the design system's own source next to the recipe rather than in a test file
 * its author never opens. But it is declared PER PART, and it has to be read per
 * part: zero-brutalist's radio-group skips `checked`/`unchecked` on `item` and
 * `item-label` (a row and a text label that do not change when selected), and
 * that must not quietly excuse `item-indicator` — the one part whose entire job
 * is to look different. Flattening the map, as the first draft of this file did,
 * turned two honest per-part claims into a component-wide opt-out.
 */
const skipsPair = (c: Case, part: string, a: string, b: string): boolean => {
    const skipped = c.skipStates[part] ?? [];
    return skipped.includes(a) || skipped.includes(b);
};

/**
 * Is this pair one the runtime differentiates by PRESENCE rather than by CSS?
 *
 * The one exemption `skipStates` cannot express, because it is not a design
 * system's claim to make. Avatar's three states are CSS-identical in all six
 * design systems and that is correct: zero sets `hidden` on the image while
 * `error` and on the fallback while `loaded`, so a rule for those states can
 * never paint. Stating it through `skipStates` would mean six design systems
 * each restating a fact about zero's runtime; stating it here (as this file
 * did until #227) means a test carrying a hand-maintained table of it. It is
 * the anatomy's fact, so the anatomy declares it — `PartSpec.hiddenIn`, read
 * back out of the manifest. A part rename now breaks the declaration at its
 * source instead of quietly widening an allowlist here.
 *
 * Unlike `skipStates` this reads with `some` over the parts, not `every`: a
 * skip is a WAIVER, which every part owning the states has to sign, whereas
 * `hiddenIn` is a DIFFERENTIATION — one part appearing and disappearing is
 * enough for the component to tell the two states apart, exactly as one part
 * painting them differently is.
 */
const runtimeHides = (c: Case, parts: readonly string[], a: string, b: string): boolean =>
    parts.some((name) => {
        const hidden = c.component.parts.find((p) => p.name === name)?.hiddenIn ?? [];
        return hidden.includes(a) || hidden.includes(b);
    });

/**
 * ASSERTION A, for one component — at COMPONENT level, not part level.
 *
 * "The difference lives on a sibling part" is legitimate and extremely common:
 * a checkbox's `control` renders `checked` and `indeterminate` identically in
 * most design systems because the `indicator` inside draws a check versus a
 * dash. Judging per part reports 164 of those; judging per component reports
 * the real thing, and the carve-out is structural instead of an allowlist
 * somebody has to maintain.
 */
function componentFindings(c: Case): string[] {
    const findings: string[] = [];
    // Every distinct closed state set, with the parts that declare it — the
    // owners are what scopes a skip to the states it actually speaks about.
    const sets = new Map<string, string[]>();
    for (const part of c.component.parts) {
        if (!part.states?.length) continue;
        const key = JSON.stringify(part.states);
        const owners = sets.get(key) ?? [];
        owners.push(part.name);
        sets.set(key, owners);
    }
    for (const [key, owners] of sets) {
        for (const [a, b] of pairsOf(JSON.parse(key) as string[])) {
            // A skip is a claim about ONE part, so a component-wide "these two
            // states may look the same" needs it from every part that has those
            // states. Material's checkbox skips them on `root` and `label`
            // because a row and its text do not change when you tick it — which
            // says nothing about the box and the mark, and must not excuse them
            // both rendering nothing (#212). `hiddenIn`, in contrast, states a
            // difference rather than waiving one, so one matching part is enough.
            if (owners.every((p) => skipsPair(c, p, a, b))) continue;
            if (runtimeHides(c, owners, a, b)) continue;
            if (c.groups.some((g) => distinguishes(c.rules, g, a, b))) continue;
            findings.push(
                `${c.ds}/${c.scope}: states "${a}" and "${b}" are visually identical — no `
                + `part of the component styles them differently. Style one of them, or `
                + `declare skipStates: { <part>: ['${b}'] } with a reason.`,
            );
        }
    }
    return findings;
}

/**
 * ASSERTION B, for one component — an indicator must distinguish its own states.
 *
 * Contract-grade rather than heuristic: an indicator part exists for exactly
 * one reason, which is to show which state the thing is in. If it renders
 * identically across its declared states it is not an indicator, it is a
 * spacer. Its own pseudo-elements count as itself — that is where zero-basic
 * and zero-daisyui legitimately draw their marks.
 */
function indicatorFindings(c: Case): string[] {
    const findings: string[] = [];
    for (const part of c.component.parts) {
        if (part.name !== 'indicator' && !part.name.endsWith('-indicator')) continue;
        if (!part.states?.length) continue;
        const own = c.groups.filter((g) => g === part.name || g.startsWith(`${part.name}::`));
        const alike = pairsOf(part.states).filter(([a, b]) =>
            !skipsPair(c, part.name, a, b)
            && !runtimeHides(c, [part.name], a, b)
            && !own.some((g) => distinguishes(c.rules, g, a, b)));
        if (!alike.length) continue;
        const pairs = alike.map(([a, b]) => `"${a}"/"${b}"`).join(', ');
        findings.push(
            `${c.ds}/${c.scope}.${part.name}: an indicator part renders identically for `
            + `${pairs} — nothing it emits, on itself or its pseudo-elements, tells those `
            + `states apart. Draw the mark (this part exists for nothing else), or declare `
            + `skipStates: { '${part.name}': ['${alike[0]![1]}'] } with a reason.`
            + (own.length ? '' : ' It emits no rules at all.'),
        );
    }
    return findings;
}

describe('state legibility', () => {
    it('reads a rule per state out of the compiled CSS', () => {
        // A sanity check on the substrate: if parsing yielded nothing, every
        // assertion below would pass vacuously.
        expect(CASES.length).toBeGreaterThan(100);
        const checkbox = CASES.find((c) => c.ds === 'material' && c.scope === 'checkbox')!;
        expect(checkbox.groups).toContain('control');
        expect(checkbox.groups).toContain('indicator');
        expect(fingerprint(checkbox.rules, 'control', 'checked').length).toBeGreaterThan(0);
    });

    it.each(SYSTEMS.map((s) => s.name))('%s: no component renders two of a part\'s states alike', (ds) => {
        const findings = CASES.filter((x) => x.ds === ds).flatMap(componentFindings);
        expect(findings.sort()).toEqual([]);
    });

    it.each(SYSTEMS.map((s) => s.name))('%s: every stateful indicator part differs across its states', (ds) => {
        const findings = CASES.filter((x) => x.ds === ds).flatMap(indicatorFindings);
        expect(findings.sort()).toEqual([]);
    });

    it('the presence exemption comes from the manifest, and avatar still claims it', () => {
        // The exemption is only as real as the declaration it reads, so assert
        // the declaration is there: if `hiddenIn` ever stopped reaching the
        // manifest, every assertion above would still pass — by failing to
        // exempt anything AND by six design systems quietly having to restate
        // it. Avatar is the case the field was added for.
        const avatar = manifest.components.find((c) => c.scope === 'avatar')!;
        const hiddenIn = Object.fromEntries(
            avatar.parts.filter((p) => p.hiddenIn?.length).map((p) => [p.name, p.hiddenIn]));
        expect(hiddenIn).toEqual({ image: ['error'], fallback: ['loaded'] });
        // …and it covers every pair of avatar's states, which is why avatar is
        // silent here despite painting all three identically everywhere.
        const c = CASES.find((x) => x.ds === 'basic' && x.scope === 'avatar')!;
        for (const [a, b] of pairsOf(['loading', 'loaded', 'error'])) {
            expect(runtimeHides(c, ['root', 'image', 'fallback'], a, b), `${a}/${b}`).toBe(true);
        }
    });
});

/**
 * The guard's own teeth.
 *
 * Everything above asserts that six design systems are clean, which is exactly
 * what a guard that finds nothing also reports. So the failure mode gets its own
 * coverage: state-blind fixture recipes, compiled through the real compiler,
 * that the assertions above MUST report. Three of these are mutations that
 * passed an earlier draft of this file — the forced-colors glyph, the print
 * glyph and the transition-only state — and each one made the assertion vacuous
 * for the very pair (#212's `checked`/`indeterminate`) it was written to
 * protect.
 */
describe('the guard\'s own teeth', () => {
    const checkbox = manifest.components.find((c) => c.scope === 'checkbox')!;

    const fixture = (
        parts: RecipeInput['parts'],
        skipStates?: RecipeInput['skipStates'],
        // The anatomy is a parameter because one exemption — `hiddenIn` —
        // lives there rather than in the recipe.
        component: ManifestComponent = checkbox,
    ): { c: Case; css: string } => {
        const recipe: RecipeInput = { component: 'checkbox', parts, ...(skipStates ? { skipStates } : {}) };
        const css = compileRecipeCss(recipe, component);
        return { c: caseOf('fixture', component, recipe, css), css };
    };

    /** The same checkbox, but the runtime hides `indicator` while indeterminate. */
    const hidingIndicator: ManifestComponent = {
        ...checkbox,
        parts: checkbox.parts.map((p) => (p.name === 'indicator' ? { ...p, hiddenIn: ['indeterminate'] } : p)),
    };

    /** A control that says "selected" without saying which kind — as they all do. */
    const control: PartStyles = {
        base: { width: '1rem', height: '1rem', border: '1px solid gray' },
        states: {
            checked: { background: 'blue' },
            indeterminate: { background: 'blue' },
            unchecked: {},
        },
    };

    /** #212 verbatim: three declared states, one empty box, nothing drawn. */
    const blind: PartStyles = {
        base: { width: '100%', height: '100%' },
        states: { checked: {}, unchecked: {}, indeterminate: {} },
    };

    const GLYPH_FALLBACK: PartStyles = {
        selectors: {
            '&[data-state="checked"]::before': { content: '"\\2713"' },
            '&[data-state="indeterminate"]::before': { content: '"\\2212"' },
        },
    };

    it('reports an indicator that draws nothing', () => {
        const { c } = fixture({ control, indicator: blind });
        expect(indicatorFindings(c)).toHaveLength(1);
        expect(indicatorFindings(c)[0]).toContain('"checked"/"indeterminate"');
        expect(indicatorFindings(c)[0]).toContain('"checked"/"unchecked"');
    });

    it('reports it even when a forced-colors or print glyph tells the states apart', () => {
        const { c, css } = fixture({
            control,
            indicator: { ...blind, at: { 'forced-colors': GLYPH_FALLBACK, print: GLYPH_FALLBACK } },
        });
        // The fallback really is in the artifact — this is not a compile failure
        // dressed up as a finding.
        expect(css).toContain('@media (forced-colors: active)');
        expect(css).toContain('@media print');
        expect(css.match(/content: "\\2713"/g)).toHaveLength(2);
        expect(indicatorFindings(c)[0]).toContain('"checked"/"indeterminate"');
    });

    it('reports it when the only difference is how the state arrives', () => {
        const { c, css } = fixture({
            control,
            indicator: {
                ...blind,
                states: {
                    checked: { transition: 'scale 150ms linear' },
                    indeterminate: { transition: 'scale 400ms linear', willChange: 'scale' },
                    unchecked: {},
                },
            },
        });
        expect(css).toContain('transition: scale 150ms linear');
        expect(indicatorFindings(c)[0]).toContain('"checked"/"indeterminate"');
    });

    it('accepts a mark that is actually drawn', () => {
        const { c } = fixture({
            control,
            indicator: {
                ...blind,
                states: {
                    checked: { clipPath: 'polygon(0 0, 100% 0, 100% 100%)' },
                    indeterminate: { clipPath: 'polygon(0 40%, 100% 40%, 100% 60%, 0 60%)' },
                    unchecked: { clipPath: 'polygon(0 0, 0 0, 0 0)' },
                },
            },
        });
        expect(indicatorFindings(c)).toEqual([]);
    });

    it('does not let a sibling part\'s skipStates excuse the indicator', () => {
        // The real shape of this: zero-brutalist's radio-group skips
        // `checked`/`unchecked` on `item` and `item-label`.
        const { c } = fixture(
            { control, indicator: blind, label: { base: { fontSize: '1rem' } } },
            { control: ['checked', 'unchecked', 'indeterminate'], label: ['checked'] },
        );
        expect(indicatorFindings(c)[0]).toContain('"checked"/"indeterminate"');
    });

    it('honours skipStates declared on the indicator itself', () => {
        const { c } = fixture(
            { control, indicator: blind },
            { indicator: ['checked', 'unchecked', 'indeterminate'] },
        );
        expect(indicatorFindings(c)).toEqual([]);
        // …and only for the states it names.
        const partial = fixture({ control, indicator: blind }, { indicator: ['indeterminate'] });
        expect(indicatorFindings(partial.c)[0]).toContain('"checked"/"unchecked"');
        expect(indicatorFindings(partial.c)[0]).not.toContain('"checked"/"indeterminate"');
    });

    it('reports a component where no part tells two states apart', () => {
        const { c } = fixture({ control, indicator: blind });
        // `control` paints `checked` and `indeterminate` the same and the
        // indicator paints nothing, so the component as a whole cannot say
        // which of the two it is in — #212's render exactly.
        expect(componentFindings(c)).toHaveLength(1);
        expect(componentFindings(c)[0]).toContain('"checked" and "indeterminate"');
    });

    it('does not let a skip on the row and the text excuse the whole component', () => {
        // Material's and daisy's checkboxes both skip the selection states on
        // `root` and `label` — honestly, since neither changes when you tick the
        // box. That must not add up to "the component may render `checked` and
        // `indeterminate` alike".
        const { c } = fixture(
            { control, indicator: blind, label: { base: { fontSize: '1rem' } } },
            { root: ['checked', 'unchecked', 'indeterminate'], label: ['checked', 'unchecked', 'indeterminate'] },
        );
        expect(componentFindings(c)[0]).toContain('"checked" and "indeterminate"');
    });

    it('honours the anatomy\'s hiddenIn, for exactly the states it names', () => {
        // Avatar's shape, run on the fixture: identical CSS, one line of
        // anatomy between "unstyled" and "correct". Same recipe both times.
        const before = fixture({ control, indicator: blind });
        expect(indicatorFindings(before.c)[0]).toContain('"checked"/"indeterminate"');
        expect(componentFindings(before.c)).toHaveLength(1);

        const { c } = fixture({ control, indicator: blind }, undefined, hidingIndicator);
        // A state that never paints cannot be reported for not painting…
        expect(indicatorFindings(c)[0]).not.toContain('"indeterminate"');
        expect(componentFindings(c)).toEqual([]);
        // …and every other pair still has to earn its difference.
        expect(indicatorFindings(c)[0]).toContain('"checked"/"unchecked"');
    });

    it('accepts a component whose difference lives on a sibling part', () => {
        const { c } = fixture({
            control,
            indicator: {
                ...blind,
                states: {
                    checked: { clipPath: 'polygon(0 0, 100% 0, 100% 100%)' },
                    indeterminate: { clipPath: 'polygon(0 40%, 100% 40%, 100% 60%, 0 60%)' },
                    unchecked: { clipPath: 'polygon(0 0, 0 0, 0 0)' },
                },
            },
        });
        expect(componentFindings(c)).toEqual([]);
    });
});
