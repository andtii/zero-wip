/**
 * RatingGroup half-star pointer math in real engines — the part happy-dom
 * cannot prove: `getBoundingClientRect` is real here, so the left half of a
 * symbol must commit index − 0.5 and the right half the full index, and the
 * whole mapping must flip under RTL.
 *
 * Plus the other thing only a real engine can answer: whether the default
 * symbol has font coverage at all (#222).
 */
import { test, expect } from '@playwright/test';

const halves = (page: import('@playwright/test').Page) =>
    page.locator('[data-scope="rating-group"][data-part="root"]').first();
const hidden = (page: import('@playwright/test').Page) =>
    halves(page).locator('[data-part="hidden-input"]');
const item = (page: import('@playwright/test').Page, n: number) =>
    halves(page).locator('[data-part="item"]').nth(n - 1);

/** Boot the playground with one design system pinned, on the Forms tab. */
const pin = (ds: string) => async ({ page }: { page: import('@playwright/test').Page }) => {
    await page.addInitScript((value) => {
        localStorage.setItem('zero-ds', value);
    }, ds);
    await page.goto('/');
    await expect(page.locator('link[data-zero-ds]')).toHaveAttribute('data-zero-ds', ds);
    await page.getByRole('tab', { name: 'Forms' }).click();
};

test.describe('half-star pointer and keyboard math', () => {
    test.beforeEach(pin('basic'));

    test('the left half of a star commits index − 0.5, the right half the index', async ({ page }) => {
        const third = item(page, 3);
        await third.scrollIntoViewIfNeeded();
        const box = (await third.boundingBox())!;
        await page.mouse.click(box.x + box.width * 0.25, box.y + box.height / 2);
        await expect(hidden(page)).toHaveValue('2.5');
        await expect(third).toHaveAttribute('data-state', 'half');

        await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
        await expect(hidden(page)).toHaveValue('3');
        await expect(third).toHaveAttribute('data-state', 'full');
    });

    test('hover previews the fill without committing', async ({ page }) => {
        const fifth = item(page, 5);
        await fifth.scrollIntoViewIfNeeded();
        const box = (await fifth.boundingBox())!;
        await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
        await expect(fifth).toHaveAttribute('data-state', 'full');
        await expect(fifth).toHaveAttribute('data-highlighted', '');
        // The committed value did not move (playground model starts at 3.5).
        await expect(hidden(page)).toHaveValue('3.5');
        // Leaving the control restores the committed display.
        await page.locator('h1').hover();
        await expect(fifth).toHaveAttribute('data-state', 'empty');
    });

    test('RTL flips the half mapping', async ({ page }) => {
        await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
        const third = item(page, 3);
        await third.scrollIntoViewIfNeeded();
        const box = (await third.boundingBox())!;
        // Visual LEFT half is now the FULL side (reading direction runs
        // right-to-left), and the right half is the half-step.
        await page.mouse.click(box.x + box.width * 0.25, box.y + box.height / 2);
        await expect(hidden(page)).toHaveValue('3');
        await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
        await expect(hidden(page)).toHaveValue('2.5');
    });

    test('keyboard steps the value and the tab stop follows', async ({ page }) => {
        const second = item(page, 2);
        await second.scrollIntoViewIfNeeded();
        // Focus the current tab stop (ceil(3.5) = item 4) via keyboard-visible path.
        await item(page, 4).focus();
        await page.keyboard.press('ArrowUp');
        await expect(hidden(page)).toHaveValue('4');
        await page.keyboard.press('End');
        await expect(hidden(page)).toHaveValue('5');
        await expect(item(page, 5)).toBeFocused();
        await page.keyboard.press('Home');
        await expect(hidden(page)).toHaveValue('0.5');
        await expect(item(page, 1)).toBeFocused();
    });
});

/**
 * The default symbol must actually be in the font (#222).
 *
 * Pinned to `material` on purpose. Four of the six design systems retire the
 * runtime's text symbol outright (`font-size: 0`, or a transparent fill), so
 * measuring it there proves nothing — `basic`, which the block above uses, is
 * one of them. `material` and `daisyui` are the two that still PAINT the
 * symbol and merely halve it (a hard-stop gradient under `background-clip:
 * text` here, a `mask-size: 50% 100%` there), so on those two an unmapped
 * codepoint is visibly on screen — and halving a tofu box yields half a tofu
 * box.
 *
 * The instrument is the one from the issue, and the only one that works:
 * `document.fonts.check()` consults `@font-face` rules and returns true for
 * anything, so instead measure the glyph's advance width in the item's OWN
 * computed font and compare it against U+10FFFD, a guaranteed-unmapped
 * codepoint. Equal widths mean both resolved to the same last-resort glyph.
 */
test.describe('the default symbol resolves to a real glyph', () => {
    test.beforeEach(pin('material'));

    test('every state\'s symbol measures differently from an unmapped codepoint', async ({ page }) => {
        // The playground's first rating is 3.5: 1–3 full, 4 half, 5 empty.
        await expect(item(page, 4)).toHaveAttribute('data-state', 'half');

        const measured = await halves(page).evaluate((root) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const UNMAPPED = '\u{10FFFD}';
            return [...root.querySelectorAll<HTMLElement>('[data-part="item"]')].map((el) => {
                const cs = getComputedStyle(el);
                ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
                const glyph = el.textContent ?? '';
                return {
                    state: el.getAttribute('data-state'),
                    glyph,
                    children: el.children.length,
                    font: ctx.font,
                    width: ctx.measureText(glyph).width,
                    unmapped: ctx.measureText(UNMAPPED).width,
                };
            });
        });

        expect(measured.map((m) => m.state))
            .toEqual(['full', 'full', 'full', 'half', 'empty']);
        // A bare text node in every state — design systems gate their drawn
        // geometry on `:not(:has(> *))` / `:has(*)`, so the default must never
        // become an element.
        expect(measured.map((m) => m.children)).toEqual([0, 0, 0, 0, 0]);
        expect(measured.map((m) => m.glyph)).toEqual(['★', '★', '★', '★', '☆']);

        for (const m of measured) {
            // The canvas took the item's real font, not the 10px default.
            expect(m.font).not.toBe('10px sans-serif');
            expect(m.width).toBeGreaterThan(0);
            // The load-bearing assertion: `⯪` (U+2BEA) measured EXACTLY the
            // unmapped width in all six design systems before the fix.
            expect(Math.abs(m.width - m.unmapped),
                `${m.state} symbol ${JSON.stringify(m.glyph)} measured the unmapped width in ${m.font}`)
                .toBeGreaterThan(0.01);
        }
    });
});
