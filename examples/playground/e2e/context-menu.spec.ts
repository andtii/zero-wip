/**
 * Context menu in real engines — the parts happy-dom cannot prove: the
 * popup actually lands at the pointer coordinates (top layer + fixed
 * positioning), a second right-click repositions without closing, and
 * Escape restores focus to the surface.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('zero-ds', 'basic');
    });
    await page.goto('/');
    await expect(page.locator('link[data-zero-ds]')).toHaveAttribute('data-zero-ds', 'basic');
});

const surface = (page: import('@playwright/test').Page) =>
    page.locator('[data-scope="menu"][data-part="context-trigger"]');
// The demo page holds several menus; aria-controls pins THE popup this
// surface opens.
async function popup(page: import('@playwright/test').Page) {
    const id = await surface(page).getAttribute('aria-controls');
    return page.locator(`#${id}`);
}

/** The enter transition translates the popup; measure only after it lands. */
async function settledBox(loc: import('@playwright/test').Locator) {
    await loc.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {}))));
    return (await loc.boundingBox())!;
}

async function rightClickAt(page: import('@playwright/test').Page, dx: number, dy: number) {
    await surface(page).scrollIntoViewIfNeeded();
    const box = (await surface(page).boundingBox())!;
    const x = box.x + dx;
    const y = box.y + dy;
    await page.mouse.click(x, y, { button: 'right' });
    return { x, y };
}

test('right-click opens the popup at the pointer', async ({ page }) => {
    const { x, y } = await rightClickAt(page, 60, 40);
    await expect(await popup(page)).toHaveAttribute('data-state', 'open');
    const pb = await settledBox(await popup(page));
    // bottom-start off a zero-size anchor: the popup's top-left hugs the
    // point (offset 4, flip/shift may nudge, so a loose tolerance).
    expect(Math.abs(pb.x - x)).toBeLessThan(24);
    expect(pb.y).toBeGreaterThan(y);
    expect(pb.y - y).toBeLessThan(24);
});

test('a second right-click repositions without closing', async ({ page }) => {
    await rightClickAt(page, 40, 30);
    await expect(await popup(page)).toHaveAttribute('data-state', 'open');
    const first = await settledBox(await popup(page));
    // Well clear of the open popup — a right-click INSIDE it belongs to the
    // popup, not the surface.
    const { x } = await rightClickAt(page, 420, 20);
    await expect(await popup(page)).toHaveAttribute('data-state', 'open');
    const second = await settledBox(await popup(page));
    expect(Math.abs(second.x - x)).toBeLessThan(24);
    expect(second.x).not.toBe(first.x);
});

test('a submenu opens inside the context menu', async ({ page }) => {
    await rightClickAt(page, 60, 40);
    const sub = (await popup(page)).locator('[data-part="sub-trigger"]');
    await sub.click();
    await expect((await popup(page)).locator('[data-part="sub-popup"]')).toHaveAttribute('data-state', 'open');
});

test('Shift+F10 opens anchored to the surface element', async ({ page }) => {
    await surface(page).scrollIntoViewIfNeeded();
    // The demo surface content carries tabIndex=0 — focus it and invoke.
    await surface(page).locator('div').first().focus();
    await page.keyboard.press('Shift+F10');
    await expect(await popup(page)).toHaveAttribute('data-state', 'open');
    const sb = (await surface(page).boundingBox())!;
    const pb = await settledBox(await popup(page));
    // Anchored to the element rect (bottom-start), not to a stale pointer.
    expect(Math.abs(pb.x - sb.x)).toBeLessThan(24);
});

test('Escape closes and restores focus to the surface content', async ({ page }) => {
    await surface(page).scrollIntoViewIfNeeded();
    const inner = surface(page).locator('div').first();
    await inner.focus();
    await page.keyboard.press('Shift+F10');
    await expect(await popup(page)).toHaveAttribute('data-state', 'open');
    await page.keyboard.press('Escape');
    await expect(await popup(page)).toHaveAttribute('data-state', 'closed');
    await expect(inner).toBeFocused();
});

test('outside click closes via light dismiss', async ({ page }) => {
    await rightClickAt(page, 60, 40);
    await expect(await popup(page)).toHaveAttribute('data-state', 'open');
    await page.locator('h1').click();
    await expect(await popup(page)).toHaveAttribute('data-state', 'closed');
});
