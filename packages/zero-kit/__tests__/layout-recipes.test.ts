/**
 * The layout pack — what every design system gets for its layout tier.
 *
 * The pack exists so the tier cannot drift between skins: `gap="md"` has to
 * mean the `md` rung of `--space-*` in all six, or a page laid out against
 * one falls apart under the next. So the assertions here are mostly about
 * SAMENESS across skins, and about the two places the output legitimately
 * differs — the ramp a skin declares, and the breakpoints it names.
 */
import { describe, expect, it } from 'vitest';
import { LAYOUT_SCOPES, layoutCss, layoutRecipes, layoutScopes } from '@sigx/zero-kit';
import type { TokensInput } from '@sigx/zero-kit';
import { designSystem as basicDS } from '@sigx/zero-basic';
import { designSystem as daisyDS } from '@sigx/zero-daisyui';
import { designSystem as materialDS } from '@sigx/zero-material';
import { designSystem as brutalistDS } from '@sigx/zero-brutalist';
import { designSystem as herouiDS } from '@sigx/zero-heroui';
import { designSystem as carbonDS } from '@sigx/zero-carbon';

const SKINS = [
    ['basic', basicDS], ['daisyui', daisyDS], ['material', materialDS],
    ['brutalist', brutalistDS], ['heroui', herouiDS], ['carbon', carbonDS],
] as const;

describe('layoutRecipes', () => {
    it('emits exactly the declared layout scopes', () => {
        expect(layoutRecipes(basicDS.tokens as TokensInput).map((r) => r.component).sort())
            .toEqual([...LAYOUT_SCOPES].sort());
    });

    it('is identical for every design system', () => {
        // The recipes read nothing from the tokens — only the TABLE does.
        // That is what keeps `gap="md"` meaning the same thing everywhere;
        // if a skin could change the rules, the tier would be six tiers.
        const [, first] = SKINS[0]!;
        const reference = JSON.stringify(layoutRecipes(first.tokens as TokensInput));
        for (const [name, ds] of SKINS) {
            expect(JSON.stringify(layoutRecipes(ds.tokens as TokensInput)), name).toBe(reference);
        }
    });

    it('declares a default for every property it consumes', () => {
        // The anti-inheritance rule, and the reason lynx renders a sane
        // baseline: a `var(--l-*)` with nothing declaring it would inherit a
        // parent layout part's value on the web and dangle on lynx.
        for (const recipe of layoutRecipes(basicDS.tokens as TokensInput)) {
            const declared = new Set(Object.keys(recipe.tokens ?? {}));
            for (const [partName, styles] of Object.entries(recipe.parts)) {
                for (const [prop, value] of Object.entries(styles.base ?? {})) {
                    if (prop.startsWith('--')) declared.add(prop);
                    for (const [, ref] of String(value).matchAll(/var\((--l-[a-z-]+)\)/g)) {
                        expect(declared.has(ref!), `${recipe.component}.${partName}: ${prop} reads ${ref}`).toBe(true);
                    }
                }
            }
        }
    });
});

describe('layoutCss', () => {
    const table = (ds: (typeof SKINS)[number][1]) => layoutCss(ds.tokens as TokensInput);

    it('maps each spacing rung to the design system\'s own token', () => {
        const css = table(basicDS);
        expect(css).toContain('[data-scope][data-part][data-l-gap="md"] {\n    --l-gap: var(--space-md);\n}');
        // `none` is the one rung that is a literal rather than a token —
        // `--space-none` would be a worse thing to have than the zero.
        expect(css).toContain('[data-scope][data-part][data-l-gap="none"] {\n    --l-gap: 0;\n}');
    });

    it('out-specifies the component-token block it has to override', () => {
        // (0,3,0) vs the carrier's (0,2,0). Written as a rule rather than
        // left to source order, because both are custom properties and the
        // failure would be silent: the default would simply keep winning.
        for (const line of table(basicDS).split('\n')) {
            if (!line.includes('[data-l-')) continue;
            expect(line, line).toMatch(/^\s*\[data-scope\]\[data-part\]\[data-l-/);
        }
    });

    it('emits a rung only when the design system declares it', () => {
        const sparse = {
            ...(basicDS.tokens as TokensInput),
            system: { ...(basicDS.tokens as TokensInput).system, spacing: { md: '1rem' } },
        } as TokensInput;
        const css = layoutCss(sparse);
        expect(css).toContain('data-l-gap="md"');
        // An undeclared rung emits NOTHING rather than substituting a
        // neighbour: quietly using a different step would make two design
        // systems disagree about what the same prop means.
        expect(css).not.toContain('data-l-gap="2xl"');
        expect(css).toContain('data-l-gap="none"');
    });

    it('emits one media block per declared breakpoint, in ascending order', () => {
        const css = table(basicDS);
        const widths = [...css.matchAll(/@media \(min-width: ([^)]+)\)/g)].map((m) => m[1]!);
        expect(widths).toEqual(Object.values((basicDS.tokens as TokensInput).breakpoints ?? {}));
        // Ascending is a correctness property, not tidiness: the blocks sit
        // in one layer at one specificity, so the later rule wins and a
        // descending emission would make the wider breakpoint lose.
        expect(widths).toEqual([...widths].sort((a, b) => parseFloat(a) - parseFloat(b)));
    });

    it('varies only the attributes the vocabulary marks responsive', () => {
        const css = table(basicDS);
        expect(css).toContain('data-l-md-gap=');
        expect(css).toContain('data-l-md-align=');
        // `wrap` and `grow` describe what a box IS rather than how much room
        // it takes, and every responsive attribute multiplies the emitted
        // CSS by the number of breakpoints.
        expect(css).not.toContain('data-l-md-wrap=');
        expect(css).not.toContain('data-l-md-grow=');
    });

    it('emits nothing responsive for a design system with no breakpoints', () => {
        const noBreakpoints = { ...(basicDS.tokens as TokensInput), breakpoints: undefined } as TokensInput;
        const css = layoutCss(noBreakpoints);
        expect(css).not.toContain('@media');
        expect(css).toContain('data-l-gap="md"');
    });
});

describe('layoutScopes', () => {
    it('declares every layout scope out of the colour and size axes', () => {
        // Not decoration: `axis-coverage` walks every scope that HAS a
        // recipe, so without this each layout scope raises two findings per
        // skin. A Stack is geometry — `data-color` on it would paint nothing.
        for (const scope of LAYOUT_SCOPES) {
            expect(layoutScopes[scope]).toEqual({ colors: [], sizes: [], variants: [] });
        }
    });

    it('is adopted by every shipped design system', () => {
        for (const [name, ds] of SKINS) {
            for (const scope of LAYOUT_SCOPES) {
                expect((ds.tokens as TokensInput).scopes?.[scope], `${name}.${scope}`)
                    .toEqual({ colors: [], sizes: [], variants: [] });
            }
        }
    });

    it('is adopted alongside the recipes and the table, in every skin', () => {
        // The three edits are one adoption; a skin with the recipes but not
        // the table would render every layout prop as its default.
        for (const [name, ds] of SKINS) {
            const components = ds.recipes.map((r) => r.component);
            for (const scope of LAYOUT_SCOPES) expect(components, name).toContain(scope);
            expect((ds.css ?? []).join('\n'), name).toContain('[data-l-gap="md"]');
        }
    });
});
