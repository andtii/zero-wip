/**
 * Combobox over popover="manual" + the dismiss layer, in real engines.
 *
 * The part the unit suite cannot prove: that opting out of native light
 * dismiss actually buys the behavior it exists for — clicking back into the
 * input (a caret click) keeps the list open, while a genuinely outside
 * click closes it.
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

const input = (page: import('@playwright/test').Page) =>
    page.locator('[data-scope="combobox"][data-part="input"]');
const popup = (page: import('@playwright/test').Page) =>
    page.locator('[data-scope="combobox"][data-part="popup"]');

test('typing filters, a caret click keeps the list open, outside click closes', async ({ page }) => {
    await input(page).click();
    await input(page).pressSequentially('den');
    await expect(popup(page)).toHaveAttribute('data-state', 'open');
    const items = page.locator('[data-scope="combobox"][data-part="item"]');
    await expect(items).toHaveCount(2); // Denmark, Sweden
    // A click back into the input must NOT light-dismiss the manual popover.
    await input(page).click();
    await expect(popup(page)).toHaveAttribute('data-state', 'open');
    // A genuinely outside click closes via the dismiss layer.
    await page.locator('h1').click();
    await expect(popup(page)).toHaveAttribute('data-state', 'closed');
});

test('keyboard selects and fills the input; the form value follows', async ({ page }) => {
    await input(page).click();
    await input(page).pressSequentially('ice');
    await input(page).press('ArrowDown');
    await input(page).press('Enter');
    await expect(input(page)).toHaveValue('Iceland');
    await expect(popup(page)).toHaveAttribute('data-state', 'closed');
    await expect(page.locator('[data-scope="combobox"][data-part="hidden-input"]')).toHaveValue('iceland');
});
