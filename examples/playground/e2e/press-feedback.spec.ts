/**
 * The press-feedback contract, driven with real input.
 *
 * Every test reads `window.__pressLog` — an instrumentation stream of
 * `data-pressed` / `data-press-animating` mutations and `*-ripple`
 * animationstarts installed before the app boots. Real clicks are too fast
 * to observe the attributes after the fact; the log records the transient
 * truth.
 *
 * Two deliberate leniencies, learned from cross-engine runs:
 * - The relative order of press-END versus animation-START varies by engine
 *   (a quick click can release before or after the first animation frame),
 *   so ordering is asserted per concern, never across concerns.
 * - An element hidden by its own activation (a select option or menu item
 *   closing its popup) races its ripple: Chromium starts the animation
 *   before the hide lands, Firefox does not. Those tests assert the press
 *   lifecycle and the activation outcome, not the ripple.
 */
import { test, expect, type Page } from '@playwright/test';

const media = (name: string) => name === 'reduced-motion' || name === 'forced-colors';

// Linux WebKit (WPE, as on CI runners) does not reliably synthesize keyboard
// and touch input in headless mode — the same tests pass on macOS WebKit and
// on the other engines. Pointer coverage on WebKit is unaffected.
const webkitOnLinux = (name: string) => name === 'webkit' && process.platform === 'linux';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('zero-ds', 'material');
        const log: string[] = [];
        (window as unknown as { __pressLog: string[] }).__pressLog = log;
        const tag = (el: Element) => {
            const d = (el as HTMLElement).dataset;
            return `${d?.scope ?? el.tagName}/${d?.part ?? '?'}`;
        };
        const observe = () => {
            new MutationObserver((muts) => {
                for (const m of muts) {
                    if (m.attributeName?.startsWith('data-press')) {
                        const has = (m.target as Element).hasAttribute(m.attributeName);
                        log.push(`${tag(m.target as Element)}:${m.attributeName}:${has ? 'on' : 'off'}`);
                    }
                }
            }).observe(document.documentElement, {
                attributes: true,
                subtree: true,
                attributeFilter: ['data-pressed', 'data-press-animating'],
            });
            document.addEventListener('animationstart', (e) => {
                if ((e as AnimationEvent).animationName.endsWith('-ripple')) {
                    log.push(`anim:${(e as AnimationEvent).animationName}`);
                }
            }, true);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe);
        else observe();
    });
    await page.goto('/');
    await expect(page.locator('link[data-zero-ds]')).toHaveAttribute('data-zero-ds', 'material');
});

const readLog = (page: Page): Promise<string[]> =>
    page.evaluate(() => (window as unknown as { __pressLog: string[] }).__pressLog);

const clearLog = (page: Page): Promise<void> =>
    page.evaluate(() => { (window as unknown as { __pressLog: string[] }).__pressLog.length = 0; });

/** Poll until the log contains `entry`, then return the log. */
const logWith = async (page: Page, entry: string): Promise<string[]> => {
    await expect
        .poll(async () => (await readLog(page)).includes(entry), { timeout: 10_000 })
        .toBe(true);
    return readLog(page);
};

/** Assert `entries` appear in the log in this relative order. */
const expectSequence = (log: string[], entries: string[]) => {
    let from = 0;
    for (const entry of entries) {
        const at = log.indexOf(entry, from);
        expect(log.slice(from), `expected "${entry}" after index ${from}`).toContain(entry);
        from = at + 1;
    }
};

const part = (page: Page, scope: string, name: string) =>
    page.locator(`[data-scope="${scope}"][data-part="${name}"]`);

test('button: a real click plays the full press lifecycle, ripple outliving release', async ({ page }) => {
    test.skip(media(test.info().project.name), 'covered by the media-specific tests');
    await part(page, 'button', 'root').first().click();
    const log = await logWith(page, 'button/root:data-press-animating:off');
    expectSequence(log, ['button/root:data-pressed:on', 'button/root:data-pressed:off']);
    expectSequence(log, [
        'button/root:data-press-animating:on',
        'anim:btn-ripple',
        'button/root:data-press-animating:off',
    ]);
});

test('button: real keyboard Enter presses at the center', async ({ page }) => {
    test.skip(media(test.info().project.name), 'covered by the media-specific tests');
    test.skip(webkitOnLinux(test.info().project.name), 'Linux WebKit headless keyboard synthesis');
    // WebKit occasionally hasn't granted a fresh headless page keyboard
    // focus when the first synthetic key arrives — focus-and-press until the
    // press registers instead of pressing once into the void.
    const button = part(page, 'button', 'root').first();
    await expect
        .poll(async () => {
            await button.focus();
            await page.keyboard.press('Enter');
            return (await readLog(page)).includes('button/root:data-pressed:on');
        }, { timeout: 10_000 })
        .toBe(true);
    const log = await logWith(page, 'button/root:data-press-animating:off');
    expectSequence(log, ['button/root:data-pressed:on', 'anim:btn-ripple']);
});

test('disabled button: nothing is published', async ({ page }) => {
    await page.locator('[data-scope="button"][data-part="root"][data-disabled]').first()
        .click({ force: true });
    await page.waitForTimeout(300);
    expect(await readLog(page)).toEqual([]);
});

test('tabs: click ripples; arrow roving still works and is not a press', async ({ page }) => {
    test.skip(media(test.info().project.name), 'covered by the media-specific tests');
    const tabs = part(page, 'tabs', 'tab');
    await tabs.first().click();
    const log = await logWith(page, 'anim:tab-ripple');
    expectSequence(log, ['tabs/tab:data-pressed:on', 'anim:tab-ripple']);
    await logWith(page, 'tabs/tab:data-press-animating:off');
    await clearLog(page);
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toHaveAttribute('data-state', 'active');
    expect(await readLog(page)).toEqual([]);
});

test('switch: pressing the label row marks the control and toggles exactly once', async ({ page }) => {
    const input = part(page, 'switch', 'hidden-input').first();
    const before = await input.isChecked();
    await part(page, 'switch', 'label').first().click();
    const log = await logWith(page, 'switch/control:data-pressed:off');
    expectSequence(log, ['switch/control:data-pressed:on', 'switch/control:data-pressed:off']);
    expect(log).not.toContain('switch/root:data-pressed:on');
    await expect
        .poll(() => input.isChecked())
        .toBe(!before);
});

test('checkbox and radio: label-row press lands on the control with the halo ripple', async ({ page }) => {
    test.skip(media(test.info().project.name), 'covered by the media-specific tests');
    await part(page, 'tabs', 'tab').nth(1).click(); // Forms
    await clearLog(page);
    await part(page, 'checkbox', 'label').first().click();
    await part(page, 'radio-group', 'item-label').nth(1).click();
    const log = await logWith(page, 'anim:radio-ripple');
    expectSequence(log, ['checkbox/control:data-pressed:on', 'anim:checkbox-ripple']);
    expectSequence(log, ['radio-group/item-control:data-pressed:on', 'anim:radio-ripple']);
});

test('select: the trigger ripples; a real option press selects', async ({ page }) => {
    test.skip(media(test.info().project.name), 'covered by the media-specific tests');
    await part(page, 'tabs', 'tab').nth(1).click(); // Forms
    await clearLog(page);
    await part(page, 'select', 'trigger').click();
    const log = await logWith(page, 'anim:select-ripple');
    expectSequence(log, ['select/trigger:data-pressed:on', 'anim:select-ripple']);
    await part(page, 'select', 'item').first().click();
    // The option's own ripple races the popup close (engine-dependent) —
    // assert the press and the outcome, not the animation.
    const itemLog = await logWith(page, 'select/item:data-pressed:off');
    expectSequence(itemLog, ['select/item:data-pressed:on', 'select/item:data-pressed:off']);
    await expect(part(page, 'select', 'value')).not.toHaveText(/Pick a fruit/);
});

test('menu: the trigger ripples; a real item press activates and closes', async ({ page }) => {
    test.skip(media(test.info().project.name), 'covered by the media-specific tests');
    await part(page, 'menu', 'trigger').click();
    const log = await logWith(page, 'anim:menu-ripple');
    expectSequence(log, ['menu/trigger:data-pressed:on', 'anim:menu-ripple']);
    await part(page, 'menu', 'item').first().click();
    const itemLog = await logWith(page, 'menu/item:data-pressed:off');
    expectSequence(itemLog, ['menu/item:data-pressed:on', 'menu/item:data-pressed:off']);
    await expect(part(page, 'menu', 'popup')).not.toBeVisible();
});

test('disclosure triggers ripple on their native summaries', async ({ page }) => {
    test.skip(media(test.info().project.name), 'covered by the media-specific tests');
    await part(page, 'collapsible', 'trigger').click();
    const log = await logWith(page, 'anim:collapsible-ripple');
    expectSequence(log, ['collapsible/trigger:data-pressed:on', 'anim:collapsible-ripple']);
});

test('slider: the press survives a drag that leaves the track (capture) and never one-shots', async ({ page }) => {
    await part(page, 'tabs', 'tab').nth(1).click(); // Forms
    const slider = part(page, 'slider', 'input');
    await slider.hover(); // scrolls into view; coordinates measured after
    const box = (await slider.boundingBox())!;
    const before = await slider.evaluate((el) => (el as HTMLInputElement).value);
    await clearLog(page);

    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
    await page.mouse.down();
    await expect(slider).toHaveAttribute('data-pressed', ''); // press started
    // drag along the track first — the value must follow the pointer
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 5 });
    // then wander far BELOW the input — off its box, mid-gesture
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height + 120, { steps: 8 });
    await expect(slider).toHaveAttribute('data-pressed', ''); // survived leaving
    await page.mouse.up();

    await expect(slider).not.toHaveAttribute('data-pressed', '');
    const after = await slider.evaluate((el) => (el as HTMLInputElement).value);
    expect(after).not.toBe(before);
    expect(await readLog(page)).not.toContain('slider/input:data-press-animating:on');
});

test('touch: a real tap presses and the ripple completes', async ({ page }) => {
    test.skip(!test.info().project.use.hasTouch, 'project has no touchscreen');
    test.skip(webkitOnLinux(test.info().project.name), 'Linux WebKit headless touch synthesis');
    const box = (await part(page, 'button', 'root').first().boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    const log = await logWith(page, 'button/root:data-press-animating:off');
    expectSequence(log, ['button/root:data-pressed:on', 'button/root:data-pressed:off']);
    expect(log).toContain('anim:btn-ripple');
});

test('reduced motion: the one-shot resolves instantly and the held tint remains', async ({ page }) => {
    test.skip(test.info().project.name !== 'reduced-motion');
    const button = part(page, 'button', 'root').first();
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    // durations collapse to 0.01ms — animationend must fire almost at once
    await expect(button).not.toHaveAttribute('data-press-animating', '');
    await expect(button).toHaveAttribute('data-pressed', '');
    const tint = await button.evaluate((el) => getComputedStyle(el, '::before').opacity);
    expect(tint).toBe('0.12');
    await page.mouse.up();
    // the animation still STARTED (0.01ms, not 0) — the lifecycle never strands
    expect(await readLog(page)).toContain('anim:btn-ripple');
});

test('forced colors: decorative press layers are hidden', async ({ page }) => {
    test.skip(test.info().project.name !== 'forced-colors');
    const button = part(page, 'button', 'root').first();
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    const layers = await button.evaluate((el) => ({
        before: getComputedStyle(el, '::before').display,
        after: getComputedStyle(el, '::after').display,
    }));
    expect(layers).toEqual({ before: 'none', after: 'none' });
    await page.mouse.up();
});

test('design-system swap mid-ripple leaves no stale press state', async ({ page }) => {
    test.skip(media(test.info().project.name), 'covered by the media-specific tests');
    await part(page, 'button', 'root').first().click();
    await page.getByRole('button', { name: 'Basic', exact: true }).click();
    await expect(page.locator('link[data-zero-ds]')).toHaveAttribute('data-zero-ds', 'basic');
    await expect.poll(() => page.locator('[data-press-animating]').count()).toBe(0);
    await expect.poll(() => page.locator('[data-pressed]').count()).toBe(0);
});
