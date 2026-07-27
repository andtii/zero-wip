/**
 * Submenus over nested `popover="auto"`, in real engines.
 *
 * The unit suite proves the state machine; this proves the parts the
 * platform owns: nested auto popovers keeping ancestors open, Escape
 * closing exactly one level, and focus really moving on keyboard open.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('zero-ds', 'basic');
    });
    await page.goto('/');
    await expect(page.locator('link[data-zero-ds]')).toHaveAttribute('data-zero-ds', 'basic');
});

test('keyboard opens a nested submenu; Escape closes one level at a time', async ({ page }, testInfo) => {
    // Linux WebKit headless does not reliably synthesize keyboard input.
    test.skip(testInfo.project.name === 'webkit' && process.platform === 'linux', 'headless WPE keyboard');
    await page.getByRole('button', { name: 'Actions' }).click();
    const share = page.locator('[data-scope="menu"][data-part="sub-trigger"]', { hasText: 'Share' });
    await share.focus();
    await page.keyboard.press('ArrowRight');
    const subPopup = page.locator('[data-scope="menu"][data-part="sub-popup"]').first();
    await expect(subPopup).toHaveAttribute('data-state', 'open');
    // Focus moved to the first sub item on keyboard open.
    await expect(page.locator('[data-scope="menu"][data-part="item"]', { hasText: 'Email' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(subPopup).toHaveAttribute('data-state', 'closed');
    // The parent level survives the first Escape.
    await expect(page.locator('[data-scope="menu"][data-part="popup"]').first()).toHaveAttribute('data-state', 'open');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-scope="menu"][data-part="popup"]').first()).toHaveAttribute('data-state', 'closed');
});

test('hover opens with intent delay and selection bubbles to the root', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (msg) => logs.push(msg.text()));
    await page.getByRole('button', { name: 'Actions' }).click();
    const share = page.locator('[data-scope="menu"][data-part="sub-trigger"]', { hasText: 'Share' });
    await share.hover();
    const subPopup = page.locator('[data-scope="menu"][data-part="sub-popup"]').first();
    await expect(subPopup).toHaveAttribute('data-state', 'open');
    await page.locator('[data-scope="menu"][data-part="item"]', { hasText: 'Copy link' }).click();
    await expect(page.locator('[data-scope="menu"][data-part="popup"]').first()).toHaveAttribute('data-state', 'closed');
    expect(logs.some((l) => l.includes('menu select: link'))).toBe(true);
});

test('a third level opens while both ancestors stay open', async ({ page }) => {
    await page.getByRole('button', { name: 'Actions' }).click();
    const subPopups = page.locator('[data-scope="menu"][data-part="sub-popup"]');
    await page.locator('[data-scope="menu"][data-part="sub-trigger"]', { hasText: 'Share' }).hover();
    // Leaving the trigger before the submenu opens cancels the pending open
    // (a swipe across an item must not open it) — wait like a human would.
    await expect(subPopups.nth(0)).toHaveAttribute('data-state', 'open');
    const social = page.locator('[data-scope="menu"][data-part="sub-trigger"]', { hasText: 'Social' });
    await social.hover();
    await expect(subPopups.nth(1)).toHaveAttribute('data-state', 'open');
    await expect(subPopups.nth(0)).toHaveAttribute('data-state', 'open');
    await expect(page.locator('[data-scope="menu"][data-part="popup"]').first()).toHaveAttribute('data-state', 'open');
    await expect(page.locator('[data-scope="menu"][data-part="item"]', { hasText: 'Mastodon' })).toBeVisible();
});
