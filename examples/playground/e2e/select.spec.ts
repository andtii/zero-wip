/**
 * Select — the select-only combobox pattern in real engines.
 *
 * What the unit suite cannot prove: that the popover listbox actually shows
 * and hides in a real top layer, that a real click on an option lands the
 * value in the hidden form input, and that the keyboard path
 * (aria-activedescendant — focus never leaves the trigger) drives a visible
 * highlight through a real render pipeline.
 */
import { test, expect, type Page } from '@playwright/test';
import { bootPage } from './nav';
import { demoPosting } from './demo';

test.beforeEach(async ({ page }) => {
    await bootPage(page, 'select', 'basic');
});

/**
 * The fruit Select, named by the field it posts — the select page renders an
 * invalid sample and a variants row beside it, all the same anatomy. See
 * `demo.ts` for why `.first()` is never the answer.
 */
const demo = (page: Page) => demoPosting(page, 'select', 'fruit');

test('click opens the listbox, an option click selects and posts', async ({ page }) => {
    const parts = demo(page);
    await parts('trigger').click();
    await expect(parts('popup')).toHaveAttribute('data-state', 'open');
    await expect(parts('popup')).toBeVisible();

    await parts('item').nth(1).click(); // Banana — index within this one demo's ordered set
    await expect(parts('popup')).toHaveAttribute('data-state', 'closed');
    await expect(parts('value')).toHaveText('Banana');
    await expect(parts('hidden-input')).toHaveValue('banana');
});

test('full keyboard flow: open, highlight via activedescendant, select, close', async ({ page }) => {
    const parts = demo(page);
    const trigger = parts('trigger');
    await trigger.focus();
    await trigger.press('ArrowDown'); // opens, highlights the first option
    await expect(parts('popup')).toHaveAttribute('data-state', 'open');
    await expect(parts('item').nth(0)).toHaveAttribute('data-highlighted', '');

    await trigger.press('ArrowDown');
    await expect(parts('item').nth(1)).toHaveAttribute('data-highlighted', '');
    // Focus never moved: the highlight is conveyed by reference.
    await expect(trigger).toBeFocused();
    const activeId = await trigger.getAttribute('aria-activedescendant');
    await expect(parts('item').nth(1)).toHaveAttribute('id', activeId!);

    await trigger.press('Enter');
    await expect(parts('popup')).toHaveAttribute('data-state', 'closed');
    await expect(parts('value')).toHaveText('Banana');
    await expect(parts('hidden-input')).toHaveValue('banana');
    await expect(trigger).toBeFocused();
});

test('Escape closes without selecting; outside click light-dismisses', async ({ page }) => {
    const parts = demo(page);
    await parts('trigger').click();
    await expect(parts('popup')).toHaveAttribute('data-state', 'open');
    await parts('trigger').press('Escape');
    await expect(parts('popup')).toHaveAttribute('data-state', 'closed');
    await expect(parts('hidden-input')).toHaveValue('');

    await parts('trigger').click();
    await expect(parts('popup')).toHaveAttribute('data-state', 'open');
    // popover="auto": a genuinely outside click is the platform's dismissal.
    await page.locator('h1').click();
    await expect(parts('popup')).toHaveAttribute('data-state', 'closed');
});

test('the listbox is labelled by the trigger', async ({ page }) => {
    const parts = demo(page);
    const triggerId = await parts('trigger').getAttribute('id');
    expect(triggerId).toBeTruthy();
    await expect(parts('popup')).toHaveAttribute('aria-labelledby', triggerId!);
});
