/**
 * The `hidden` attribute must actually hide (signalxjs/zero#209).
 *
 * Several zero parts hide themselves with nothing but the HTML `hidden`
 * attribute — `tree-view.branch-content` when a branch is collapsed,
 * `tabs.panel` when inactive, `avatar.image`/`avatar.fallback` depending on
 * load state. That relies on the UA sheet's `[hidden] { display: none }`,
 * which is the weakest declaration in the document: any author-origin
 * `display` on the same element beats it. Every design system's recipe for
 * `branch-content` emitted an unconditional `display: flex` into
 * `@layer zero.recipes`, so collapsing a branch hid nothing in all six.
 *
 * This is the only place the regression can be caught. happy-dom does not
 * resolve a layered cascade — it has no UA stylesheet to lose to and no
 * `@layer` ordering to apply — so every unit test in the repo reports
 * `display: ''` and passes either way. It takes a real engine with a real UA
 * sheet, real cascade layers and the real compiled design-system CSS.
 *
 * Two claims per design system:
 *   1. the sweep — EVERY `[data-scope][data-part][hidden]` in the document
 *      computes `display: none`, on every tab;
 *   2. the TreeView limb — collapsing `src` genuinely removes its subtree
 *      from layout (the bug measured 75–149px of visible content per design
 *      system, so a zero/absent box is the direct inverse), and expanding it
 *      brings it back, which is what keeps claim 1 from passing vacuously.
 *
 * Skipped on the derived chromium projects (reduced-motion, forced-colors):
 * this measures the cascade, which those contexts do not change. The three
 * engines are each meaningful — the rule under test is a negotiation with
 * each UA's own stylesheet.
 */
import { test, expect, type Page } from '@playwright/test';

const DESIGN_SYSTEMS = ['basic', 'daisyui', 'material', 'brutalist', 'heroui', 'carbon'] as const;

/** The playground's top-level tabs — every panel gets swept. */
const TABS = ['Components', 'Forms', 'About'] as const;

/**
 * Pin the design system before the app boots and wait for its stylesheet.
 *
 * The playground restores its choice from localStorage, so seeding the key in
 * an init script is a pin rather than a race against the toolbar. Exactly one
 * `link[data-zero-ds]` is live at a time, and it only carries the id once the
 * stylesheet has loaded — asserting on it is how we know the design system
 * under test is the one painting.
 */
async function pin(page: Page, ds: string): Promise<void> {
    await page.addInitScript((id) => {
        localStorage.setItem('zero-ds', id);
    }, ds);
    await page.goto('/');
    await expect(page.locator('link[data-zero-ds]')).toHaveAttribute('data-zero-ds', ds);
}

interface Offender {
    scope: string;
    part: string;
    state: string | null;
    display: string;
    height: number;
    text: string;
}

/** Every `[hidden]` part the UA rule failed to hide, with what it measured. */
const sweep = (page: Page): Promise<Offender[]> => page.evaluate(() => {
    const out: Offender[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('[data-scope][data-part][hidden]')) {
        const display = getComputedStyle(el).display;
        if (display === 'none') continue;
        out.push({
            scope: el.getAttribute('data-scope') ?? '',
            part: el.getAttribute('data-part') ?? '',
            state: el.getAttribute('data-state'),
            display,
            height: Math.round(el.getBoundingClientRect().height * 100) / 100,
            text: (el.textContent ?? '').trim().slice(0, 40),
        });
    }
    return out;
});

const describeOffender = (o: Offender): string =>
    `${o.scope}/${o.part}[data-state=${o.state}] → display:${o.display}, ${o.height}px, "${o.text}"`;

for (const ds of DESIGN_SYSTEMS) {
    test.describe(`hidden parts: ${ds}`, () => {
        test.beforeEach(async ({ page }, testInfo) => {
            test.skip(
                testInfo.project.name === 'reduced-motion' || testInfo.project.name === 'forced-colors',
                'cascade layering is unaffected by motion/contrast preferences; the three engines cover it',
            );
            await pin(page, ds);
        });

        test('a part the runtime marks `hidden` computes display:none', async ({ page }) => {
            for (const tab of TABS) {
                await page.getByRole('tab', { name: tab, exact: true }).click();
                // The panel swap is synchronous, but the sweep must read the
                // committed frame, not the one mid-swap.
                await expect(page.getByRole('tab', { name: tab, exact: true }))
                    .toHaveAttribute('data-state', 'active');

                expect(
                    (await sweep(page)).map(describeOffender),
                    `${ds} / ${tab}: a recipe \`display\` outranks the UA's [hidden] rule — `
                    + 'the zero.structure layer must win',
                ).toEqual([]);
            }
        });

        test('collapsing a TreeView branch removes its subtree from layout', async ({ page }) => {
            await page.getByRole('tab', { name: 'Components', exact: true }).click();

            const tree = page.locator('[data-scope="tree-view"][data-part="tree"]');
            // The outermost branch is `src`; the playground expands it by default.
            const src = tree.locator('> [data-scope="tree-view"][data-part="branch"]').first();
            const trigger = src.locator('> [data-part="branch-trigger"]');
            const content = src.locator('> [data-part="branch-content"]');

            await content.scrollIntoViewIfNeeded();
            await expect(content).toHaveAttribute('data-state', 'open');
            await expect(content).toBeVisible();

            // The nested `components` branch starts collapsed — the state the
            // playground shipped broken, visible at first paint.
            const nested = content.locator('[data-part="branch-content"]').first();
            await expect(nested).toHaveAttribute('data-state', 'closed');
            // Soft, so a regression here still lets the collapse measurement
            // below report its own number rather than hiding behind this one.
            expect.soft(
                await nested.evaluate((el) => getComputedStyle(el).display),
                `${ds}: an initially-collapsed branch must not be laid out`,
            ).toBe('none');

            await trigger.click();
            await expect(content).toHaveAttribute('data-state', 'closed');
            // Presence, not value: `hidden` is a boolean attribute, and the
            // anatomy contract promises only that it is THERE — asserting a
            // serialization (`""` vs `"hidden"`) would fail on a runtime
            // change that broke nothing. It still has to be there, though:
            // the computed `display` below only means something if it is.
            await expect(content).toHaveAttribute('hidden');

            const collapsed = await content.evaluate((el) => ({
                display: getComputedStyle(el).display,
                height: Math.round(el.getBoundingClientRect().height * 100) / 100,
            }));
            expect(
                collapsed,
                `${ds}: collapsed branch content is still laid out — `
                + `${collapsed.height}px of "index.ts / components / App.tsx / Nav.tsx" on screen`,
            ).toEqual({ display: 'none', height: 0 });
            await expect(content).toBeHidden();
            await expect(content.getByText('index.ts')).toBeHidden();

            // …and it comes back, so the assertions above are about `hidden`
            // rather than about an element that is never laid out at all.
            await trigger.click();
            await expect(content).toHaveAttribute('data-state', 'open');
            await expect(content).toBeVisible();
            expect(await content.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(0);
        });
    });
}
