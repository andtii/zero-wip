/**
 * The no-UA-chrome guard.
 *
 * zero picks the element each part renders as, and sixteen parts across the
 * component set render as a real `<button>`. That is an accessibility decision
 * (it is a button, so it is a `<button>`), and it comes with a styling
 * obligation the design system — not zero — owes: a `<button>` that no rule
 * claims is painted by the user agent. Chrome draws a 13.33px Arial chip with a
 * 2px outset bevel and its own focus ring, which belongs to no design system in
 * this repo and looks like a bug in all six.
 *
 * Nothing asked. `validate-recipes` warns when a part is missing entirely, but
 * `trigger: { base: {}, states: { open: {}, closed: {}, disabled: {} } }`
 * mentions the part and every state, so it warned about nothing. The css
 * goldens recorded the absence faithfully and understood none of it. The
 * state-legibility guard asks whether two states differ, and `{}` vs `{}` under
 * a component whose OTHER part carries the difference is a legitimate answer.
 * So #213: all six design systems shipped a `tooltip/trigger` with no button
 * treatment at all, four of them as raw UA chrome, for as long as the component
 * has existed.
 *
 * ── THE PROXY ────────────────────────────────────────────────────────────────
 * `appearance` is the one declaration that means "I have taken this element's
 * paint away from the user agent", and it is the only one that means it: a
 * background, a border and a font can each be set on a `<button>` while the UA
 * still supplies the rest of the chip. Requiring it is narrow enough to be
 * mechanically checkable and honest about what it proves — it proves the design
 * system LOOKED at the part. A recipe can still set `appearance: none` and
 * nothing else, and this guard will pass it; what it cannot do any more is
 * never mention the part at all, which is the failure that actually happened.
 *
 * ── THE DEFAULT CONTEXT ──────────────────────────────────────────────────────
 * The same substrate and the same reasoning as `state-legibility.test.ts`: the
 * compiled CSS (because a reset can arrive through `base`, `selectors`,
 * `variants.*` or the raw `css` escape hatch, and only the artifact sees all of
 * them), read for the render a reader actually gets. A reset that only applies
 * under a `@media` query, in one state, or for one non-default variant leaves
 * the un-attributed button beveled, so only the unconditional rule counts.
 */
import { describe, it, expect } from 'vitest';
import { compileDesignSystem, compileRecipeCss } from '@sigx/zero-kit';
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

interface System {
    name: string;
    compiled: CompiledDesignSystem;
}

// One by one, for the reason `css-golden.test.ts` and `state-legibility.test.ts`
// give: `DesignSystemInput<R>` is invariant in `R`, so the inputs cannot be
// widened into one array while the compiled results share a non-generic type.
const SYSTEMS: readonly System[] = [
    { name: 'basic', compiled: compileDesignSystem(basicDS, manifest) },
    { name: 'daisyui', compiled: compileDesignSystem(daisyDS, manifest) },
    { name: 'material', compiled: compileDesignSystem(materialDS, manifest) },
    { name: 'brutalist', compiled: compileDesignSystem(brutalistDS, manifest) },
    { name: 'heroui', compiled: compileDesignSystem(herouiDS, manifest) },
    { name: 'carbon', compiled: compileDesignSystem(carbonDS, manifest) },
];

/** Every `(scope, part)` zero renders as a real `<button>`. */
const BUTTON_PARTS: ReadonlyArray<{ scope: string; part: string }> = manifest.components.flatMap(
    (c) => c.parts.filter((p) => p.element === 'button').map((p) => ({ scope: c.scope, part: p.name })),
);

/** Rules that apply somewhere other than the plain, un-attributed render. */
const isDefaultContext = (rule: CssRule): boolean => rule.at.every((p) => p.startsWith('@layer'));

/**
 * Does this rule apply to `part` with nothing else asked of the element?
 *
 * `[data-scope][data-part]` and any ancestor written the same way are the
 * unconditional cascade; a `[data-state=…]`, `[data-variant=…]`, `:hover` or
 * `::before` left over means the rule is conditional and the plain render does
 * not get it.
 */
function isUnconditionalFor(rule: CssRule, part: string): boolean {
    const subjects = [...rule.selector.matchAll(/\[data-part="([^"]+)"\]/g)];
    if (subjects[subjects.length - 1]?.[1] !== part) return false;
    const residue = rule.selector
        .replace(/\[data-scope="[^"]+"\]/g, '')
        .replace(/\[data-part="[^"]+"\]/g, '')
        .trim();
    return residue === '';
}

const declares = (rule: CssRule, prop: string): boolean =>
    rule.decls.some((d) => d.slice(0, d.indexOf(':')).trim().toLowerCase().replace(/^-\w+-/, '') === prop);

/** The cells in one design system where a `<button>` keeps its UA chrome. */
function findings(system: System): string[] {
    const out: string[] = [];
    for (const { scope, part } of BUTTON_PARTS) {
        const css = system.compiled.componentCss[scope];
        // No CSS at all is the "renders unstyled" failure `validate-recipes`
        // already warns about; conflating the two would make this fail for a
        // reason it was not built to catch.
        if (css === undefined) continue;
        const reset = parseRules(css).some(
            (r) => isDefaultContext(r) && isUnconditionalFor(r, part) && declares(r, 'appearance'),
        );
        if (reset) continue;
        out.push(`${system.name}/${scope}.${part}`);
    }
    return out;
}

describe('button affordance', () => {
    it('knows which parts zero renders as a <button>', () => {
        // A sanity check on the substrate: if the manifest stopped carrying
        // `element`, every assertion below would pass vacuously.
        const names = BUTTON_PARTS.map((p) => `${p.scope}.${p.part}`);
        expect(names).toContain('tooltip.trigger');
        expect(names).toContain('button.root');
        expect(names).toContain('toggle-group.item');
        expect(names.length).toBe(26);
    });

    // No allowlist. #213 shipped with three exemptions — heroui's dialog,
    // popover and menu triggers, the last `{ cursor: 'pointer' }` holdouts —
    // and #214 adopted `overlayTrigger` on all three, so there is nothing left
    // to excuse. 18 parts × 6 design systems = 108 cells, all clean
    // (`alert.close` from #311; `dialog.cancel` from #325).
    it.each(SYSTEMS.map((s) => s.name))('%s: no <button> part leaves its paint to the UA', (ds) => {
        const system = SYSTEMS.find((s) => s.name === ds)!;
        expect(findings(system).sort()).toEqual([]);
    });
});

/**
 * The guard's own teeth.
 *
 * Everything above asserts six design systems are clean, which is also what a
 * guard that can see nothing reports. So the failure mode gets fixtures: recipes
 * compiled through the real compiler that this file MUST report, including the
 * three near-misses — a reset behind a state, behind a variant, and behind a
 * media query — that each leave the plain render beveled.
 */
describe('the guard\'s own teeth', () => {
    const tooltip = manifest.components.find((c) => c.scope === 'tooltip')!;

    const report = (parts: RecipeInput['parts']): string[] => {
        const recipe: RecipeInput = { component: 'tooltip', parts };
        const css = compileRecipeCss(recipe, tooltip);
        const rules = parseRules(css);
        return rules.some((r) => isDefaultContext(r) && isUnconditionalFor(r, 'trigger') && declares(r, 'appearance'))
            ? []
            : ['tooltip.trigger'];
    };

    it('reports #213 verbatim — a mentioned part with an empty base', () => {
        expect(report({ trigger: { base: {}, states: { open: {}, closed: {}, disabled: {} } } }))
            .toEqual(['tooltip.trigger']);
    });

    it('reports a part painted everywhere except where the UA is', () => {
        // Background, border and font are all set and the chip survives: the UA
        // still supplies the bevel-shaped box. This is what makes `appearance`
        // the proxy rather than "any declaration".
        expect(report({
            trigger: {
                base: { background: 'red', border: '1px solid blue', fontFamily: 'serif', cursor: 'help' },
                states: { open: {}, closed: {}, disabled: {} },
            },
        })).toEqual(['tooltip.trigger']);
    });

    it('reports a reset that only applies in one state', () => {
        expect(report({
            trigger: { base: {}, states: { open: { appearance: 'none' }, closed: {}, disabled: {} } },
        })).toEqual(['tooltip.trigger']);
    });

    it('reports a reset that only applies on hover', () => {
        expect(report({
            trigger: {
                base: {},
                selectors: { '&:hover': { appearance: 'none' } },
                states: { open: {}, closed: {}, disabled: {} },
            },
        })).toEqual(['tooltip.trigger']);
    });

    it('reports a reset that only applies under a media query', () => {
        const out = report({
            trigger: { base: {}, at: { print: { base: { appearance: 'none' } } }, states: { open: {}, closed: {}, disabled: {} } },
        });
        expect(out).toEqual(['tooltip.trigger']);
    });

    it('accepts an unconditional reset, prefixed or not', () => {
        expect(report({ trigger: { base: { appearance: 'none' }, states: { open: {}, closed: {}, disabled: {} } } }))
            .toEqual([]);
        expect(report({ trigger: { base: { WebkitAppearance: 'none' }, states: { open: {}, closed: {}, disabled: {} } } }))
            .toEqual([]);
    });
});
