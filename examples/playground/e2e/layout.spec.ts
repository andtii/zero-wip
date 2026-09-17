/**
 * The layout tier's actual claim: spacing comes from the design system, so
 * switching the toolbar re-spaces the page rather than only re-skinning its
 * controls.
 *
 * Every other test of this tier asserts ATTRIBUTES — the unit tests check
 * what zero renders, the kit goldens check what each skin compiles. Neither
 * proves the two halves meet, because the step table and the component's
 * default are both custom properties: a specificity mistake between them
 * would leave every layout prop silently resolving to its default, and every
 * one of those tests would still pass. This measures the pixels instead.
 *
 * Chromium only. Nothing here is engine-specific — `column-gap`, custom
 * property resolution and `@media` are not where browsers differ — and the
 * cost is one page load per design system.
 */
import { expect, test } from '@playwright/test';
import { bootPage } from './nav';

/** The two skins whose spacing ramps differ most, so a real change is visible. */
const TIGHT = 'basic';
const COARSE = 'brutalist';

/**
 * The gap of the `Row` inside the demo labelled with a spacing step.
 *
 * Located through the labelled demo rather than a page-wide
 * `[data-scope="stack"]`, per the convention in `demo.ts`: the page renders
 * a dozen stacks and `.first()` would couple this to document order.
 */
async function gapOf(page: import('@playwright/test').Page, step: string): Promise<number> {
    const row = page.locator('[data-scope="stack"][data-part="root"]')
        .filter({ has: page.locator(`xpath=preceding-sibling::code[text()="${step}"]`) })
        .first();
    await expect(row).toBeVisible();
    return row.evaluate((el) => parseFloat(getComputedStyle(el).columnGap));
}

test.describe('the layout tier resolves through the design system', () => {
    test('a gap step is a real length, not the unset default', async ({ page }) => {
        // The failure this catches: the table losing to the component's own
        // `--l-gap: 0` default. Every attribute assertion elsewhere would
        // still pass while the page rendered with no spacing at all.
        await bootPage(page, 'layout', TIGHT);
        for (const step of ['xs', 'sm', 'md', 'xl']) {
            expect(await gapOf(page, step), `${TIGHT} ${step}`).toBeGreaterThan(0);
        }
    });

    test('the ramp is ordered — a larger step is a larger gap', async ({ page }) => {
        await bootPage(page, 'layout', TIGHT);
        const [xs, sm, md, xl] = await Promise.all(
            ['xs', 'sm', 'md', 'xl'].map((s) => gapOf(page, s)),
        );
        expect(xs).toBeLessThan(sm!);
        expect(sm).toBeLessThan(md!);
        expect(md).toBeLessThan(xl!);
    });

    test('switching the design system re-spaces the same markup', async ({ page }) => {
        // THE claim. Same component, same prop, same DOM — a different
        // number, because `md` is a rung of a ramp each skin declares for
        // itself and the app never names a length.
        //
        // A page per skin, rather than re-booting one: `bootPage` pins the
        // design system through an init script, and those accumulate on a
        // page rather than replacing each other.
        const gapUnder = async (ds: string): Promise<number> => {
            const fresh = await page.context().newPage();
            await bootPage(fresh, 'layout', ds);
            const gap = await gapOf(fresh, 'md');
            await fresh.close();
            return gap;
        };
        expect(await gapUnder(COARSE)).not.toBe(await gapUnder(TIGHT));
    });

    test('a nested stack keeps its own spacing', async ({ page }) => {
        // Custom properties inherit, so this is the regression guard for the
        // anti-inheritance rule: without a re-declared default on each
        // carrier, the inner rows would both take the outer Col's gap.
        await bootPage(page, 'layout', TIGHT);
        const outer = page.locator('[data-scope="stack"][data-part="root"][data-l-gap="lg"]').first();
        await expect(outer).toBeVisible();
        const inner = outer.locator('[data-scope="stack"][data-part="root"]');
        const tightGap = await inner.filter({ has: page.locator('text=tight') }).first()
            .evaluate((el) => parseFloat(getComputedStyle(el).columnGap));
        const looseGap = await inner.filter({ has: page.locator('text=loose') }).first()
            .evaluate((el) => parseFloat(getComputedStyle(el).columnGap));
        const outerGap = await outer.evaluate((el) => parseFloat(getComputedStyle(el).columnGap));

        expect(tightGap).toBeLessThan(looseGap);
        expect(tightGap).not.toBe(outerGap);
    });

    test('a responsive value changes across the breakpoint it names', async ({ page }) => {
        // `gap={{ base: 'xs', md: 'xl' }}` — the per-instance half of the
        // contract, and the half a static stylesheet cannot express. Measured
        // either side of this design system's own `md`.
        await bootPage(page, 'layout', TIGHT);
        const responsive = page.locator('[data-scope="stack"][data-part="root"][data-l-md-gap="xl"]').first();
        await expect(responsive).toBeVisible();
        const gap = () => responsive.evaluate((el) => parseFloat(getComputedStyle(el).columnGap));

        await page.setViewportSize({ width: 1280, height: 800 });
        const wide = await gap();
        await page.setViewportSize({ width: 480, height: 800 });
        const narrow = await gap();

        expect(narrow).toBeLessThan(wide);
    });

    test('Spacer flexes by default and is fixed when given a step', async ({ page }) => {
        await bootPage(page, 'layout', TIGHT);
        const widthOf = (sel: string) => page.locator(sel).first()
            .evaluate((el) => el.getBoundingClientRect().width);

        // The toolbar spacer takes the leftover room…
        const flexible = await widthOf('[data-scope="spacer"][data-part="root"]:not([data-l-space])');
        // …while the one given a rung is that rung wide, and much smaller.
        const fixed = await widthOf('[data-scope="spacer"][data-part="root"][data-l-space="2xl"]');
        expect(fixed).toBeGreaterThan(0);
        expect(flexible).toBeGreaterThan(fixed);
    });
});
