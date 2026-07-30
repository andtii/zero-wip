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
 */
import { describe, it, expect } from 'vitest';
import { compileDesignSystem } from '@sigx/zero-kit';
import type { CompiledDesignSystem, ManifestComponent, RecipeInput } from '@sigx/zero-kit';
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

/**
 * The one exemption `skipStates` cannot express, because it is not a design
 * system's claim to make.
 *
 * Avatar's three states ARE CSS-identical in all six design systems, and that
 * is correct: zero toggles the `hidden` attribute, rendering the image while
 * `loaded` and the fallback while `error` (`Avatar.tsx`). Presence is the
 * difference, and the runtime owns it. Expressing this through `skipStates`
 * would mean six design systems each restating three times a fact that belongs
 * to the anatomy — which is why the durable fix is a `hiddenIn` field on
 * `PartSpec`, filed separately. Until then: one entry, with its reason, and the
 * staleness test below so a rename fails loudly instead of widening this.
 */
const RUNTIME_HIDDEN: ReadonlyArray<{
    scope: string;
    parts: readonly string[];
    states: readonly string[];
    why: string;
}> = [
    {
        scope: 'avatar',
        parts: ['image', 'fallback'],
        states: ['loading', 'loaded', 'error'],
        why: 'The runtime toggles `hidden`: the image is hidden while `error`, the '
            + 'fallback while `loaded`. Presence is the difference, so identical CSS is '
            + 'correct. Replace with the anatomy\'s own `hiddenIn` when that lands.',
    },
];

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
        if (groupOf(rule) !== group) continue;
        if (!fragments.some((f) => rule.selector.includes(f))) continue;
        let selector = rule.selector;
        for (const f of fragments) selector = selector.split(f).join('[data-state="§"]');
        out.push([...rule.at, selector, [...rule.decls].sort().join('; ')].join(' | '));
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
    recipe: RecipeInput;
    rules: CssRule[];
    groups: string[];
    /** States any part of this recipe declares intentionally unstyled. */
    skipped: Set<string>;
}

const CASES: Case[] = SYSTEMS.flatMap(({ name, recipes, compiled }) =>
    manifest.components.flatMap((component) => {
        const css = compiled.componentCss[component.scope];
        const recipe = recipes.find((r) => r.component === component.scope);
        // A component with no recipe is a different failure the validator
        // already warns about ("will render unstyled"); conflating the two would
        // make this fail for a reason it was not built to catch.
        if (!css || !recipe) return [];
        const rules = parseRules(css);
        const groups = [...new Set(rules.map(groupOf).filter((g): g is string => Boolean(g)))];
        return [{
            ds: name,
            scope: component.scope,
            component,
            recipe,
            rules,
            groups,
            skipped: new Set(Object.values(recipe.skipStates ?? {}).flat()),
        }];
    }));

/** Is this pair exempt, and why — `undefined` means it is not. */
function exemption(c: Case, part: string | undefined, a: string, b: string): string | undefined {
    // `skipStates` already means "this declared state is intentionally left
    // unstyled". A state left unstyled on purpose is a state the design system
    // has said does not need to look different — the same claim, so the same
    // opt-out, declared in the design system's own source next to the recipe
    // rather than in a test file its author never opens.
    if (c.skipped.has(a) || c.skipped.has(b)) return 'skipStates';
    const hidden = RUNTIME_HIDDEN.find((h) =>
        h.scope === c.scope
        && h.states.includes(a) && h.states.includes(b)
        && (part === undefined || h.parts.includes(part)));
    return hidden ? 'RUNTIME_HIDDEN' : undefined;
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

    /**
     * ASSERTION A — at COMPONENT level, not part level.
     *
     * "The difference lives on a sibling part" is legitimate and extremely
     * common: a checkbox's `control` renders `checked` and `indeterminate`
     * identically in most design systems because the `indicator` inside draws a
     * check versus a dash. Judging per part reports 164 of those; judging per
     * component reports the real thing, and the carve-out is structural instead
     * of an allowlist somebody has to maintain.
     */
    it.each(SYSTEMS.map((s) => s.name))('%s: no component renders two of a part\'s states alike', (ds) => {
        const findings: string[] = [];
        for (const c of CASES.filter((x) => x.ds === ds)) {
            const sets = new Set(
                c.component.parts
                    .filter((p) => p.states?.length)
                    .map((p) => JSON.stringify(p.states)),
            );
            for (const set of sets) {
                for (const [a, b] of pairsOf(JSON.parse(set) as string[])) {
                    if (exemption(c, undefined, a, b)) continue;
                    if (c.groups.some((g) => distinguishes(c.rules, g, a, b))) continue;
                    findings.push(
                        `${ds}/${c.scope}: states "${a}" and "${b}" are visually identical — no `
                        + `part of the component styles them differently. Style one of them, or `
                        + `declare skipStates: { <part>: ['${b}'] } with a reason.`,
                    );
                }
            }
        }
        expect(findings.sort()).toEqual([]);
    });

    /**
     * ASSERTION B — an indicator must distinguish its own states.
     *
     * Contract-grade rather than heuristic: an indicator part exists for
     * exactly one reason, which is to show which state the thing is in. If it
     * renders identically across its declared states it is not an indicator,
     * it is a spacer. Its own pseudo-elements count as itself — that is where
     * zero-basic and zero-daisyui legitimately draw their marks.
     */
    it.each(SYSTEMS.map((s) => s.name))('%s: every stateful indicator part differs across its states', (ds) => {
        const findings: string[] = [];
        for (const c of CASES.filter((x) => x.ds === ds)) {
            for (const part of c.component.parts) {
                if (part.name !== 'indicator' && !part.name.endsWith('-indicator')) continue;
                if (!part.states?.length) continue;
                const own = c.groups.filter((g) => g === part.name || g.startsWith(`${part.name}::`));
                const alike = pairsOf(part.states).filter(([a, b]) =>
                    !exemption(c, part.name, a, b) && !own.some((g) => distinguishes(c.rules, g, a, b)));
                if (!alike.length) continue;
                const pairs = alike.map(([a, b]) => `"${a}"/"${b}"`).join(', ');
                findings.push(
                    `${ds}/${c.scope}.${part.name}: an indicator part renders identically for `
                    + `${pairs} — nothing it emits, on itself or its pseudo-elements, tells those `
                    + `states apart. Draw the mark (this part exists for nothing else), or declare `
                    + `skipStates: { '${part.name}': ['${alike[0]![1]}'] } with a reason.`
                    + (own.length ? '' : ' It emits no rules at all.'),
                );
            }
        }
        expect(findings.sort()).toEqual([]);
    });

    it('every RUNTIME_HIDDEN entry still names a real scope and parts', () => {
        // Not a formality: a part rename or an anatomy change must fail here
        // rather than silently widening the exemption to nothing (a stale entry
        // matches no case, so it stops exempting and stops being noticed).
        for (const entry of RUNTIME_HIDDEN) {
            const component = manifest.components.find((c) => c.scope === entry.scope);
            expect(component, `RUNTIME_HIDDEN names unknown scope "${entry.scope}"`).toBeDefined();
            const declared = new Set(component!.parts.map((p) => p.name));
            for (const part of entry.parts) expect(declared).toContain(part);
            // Every exempted state must still be a state those parts declare.
            for (const part of entry.parts) {
                const states = component!.parts.find((p) => p.name === part)!.states ?? [];
                for (const state of entry.states) expect(states).toContain(state);
            }
            expect(entry.why.length).toBeGreaterThan(40);
        }
    });
});
