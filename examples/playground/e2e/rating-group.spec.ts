/**
 * RatingGroup half-star pointer math in real engines — the part happy-dom
 * cannot prove: `getBoundingClientRect` is real here, so the left half of a
 * symbol must commit index − 0.5 and the right half the full index, and the
 * whole mapping must flip under RTL.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('zero-ds', 'basic');
    });
    await page.goto('/');
    await expect(page.locator('link[data-zero-ds]')).toHaveAttribute('data-zero-ds', 'basic');
    await page.getByRole('tab', { name: 'Forms' }).click();
});

const halves = (page: import('@playwright/test').Page) =>
    page.locator('[data-scope="rating-group"][data-part="root"]').first();
const hidden = (page: import('@playwright/test').Page) =>
    halves(page).locator('[data-part="hidden-input"]');
const item = (page: import('@playwright/test').Page, n: number) =>
    halves(page).locator('[data-part="item"]').nth(n - 1);

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
