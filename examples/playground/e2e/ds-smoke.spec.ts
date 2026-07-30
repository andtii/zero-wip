/**
 * DS-generic smoke: the invariants every design system owes, in a real engine
 * (signalxjs/zero#206, #209).
 *
 * Every other spec in this suite pins ONE design system in `beforeEach` and
 * never touches the toolbar. That is the right shape for an interaction spec —
 * and it is why a break that reproduced in all six systems survived five PRs
 * (#209, the collapsed TreeView). This file is the other shape: no
 * per-component knowledge, no interaction script, just structural claims
 * checked against every design system the playground ships.
 *
 * Four invariants, all of them things a design system can break without any
 * component changing:
 *
 *   1. **`hidden` hides.** Every `[data-scope][data-part][hidden]` computes
 *      `display: none`. Several zero parts hide themselves with nothing but
 *      the HTML `hidden` attribute — `tree-view.branch-content` when a branch
 *      is collapsed, `tabs.panel` when inactive, `avatar.image`/`fallback`
 *      depending on load state. That relies on the UA sheet's
 *      `[hidden] { display: none }`, the weakest declaration in the document:
 *      any author-origin `display` on the same element beats it. Every design
 *      system's recipe for `branch-content` emitted an unconditional
 *      `display: flex` into `@layer zero.recipes`, so collapsing a branch hid
 *      nothing in all six.
 *   2. **No undeclared axis value is rendered.** No element carries a
 *      `data-color` / `data-size` / `data-variant` / `data-mod-*` the active
 *      design system's manifest does not declare. An unmatched axis attribute
 *      is silent — it is just an attribute nobody styled — which is how the
 *      toolbar shipped a `solid` variant carbon has never declared (#215) and
 *      a hardcoded `success|warning|error` role row (#216).
 *   3. **Swap, don't stack.** Exactly one `link[data-zero-ds]` with a live
 *      sheet once each switch has settled. Note the wording: the invariant is
 *      one live *sheet*, not one `<link>` ELEMENT.
 *      `activateDesignSystem` appends the incoming link and removes the
 *      outgoing one only after it loads, so a two-element window is BY DESIGN
 *      and the incoming sheet is inert (`.sheet === null`) for most of it.
 *      Counting elements would fail on a legitimate transient — and asserting
 *      liveness per frame is flaky for a reason worth reading before you try
 *      it (see `readSheets`).
 *   4. **A clean boot.** Zero `console.error` and zero uncaught exceptions,
 *      on every page this file loads. Worth having on its own: a boot failure
 *      in the playground currently surfaces as a ~30-minute e2e hang rather
 *      than a failure, because every spec then waits out its own timeouts.
 *
 * Only #1 needs an engine each — it is a negotiation with the UA's own
 * stylesheet, and happy-dom cannot host it at all (no UA sheet to lose to, no
 * `@layer` ordering to apply, so every unit test in the repo reports
 * `display: ''` and passes either way). #2 and #3 are engine-independent DOM
 * bookkeeping and run on chromium only.
 *
 * COST. Bounded by design, and it must stay that way: the per-DS block is two
 * page loads per design system per engine, and the switcher block is ONE page
 * load in total for all six systems. Nothing here names a component, so none
 * of it grows as components are added, and none of it duplicates what the
 * pinned-DS interaction specs already prove.
 *
 * If you ever extend this to measure a top-layer popup, do not screenshot or
 * sample it the moment it becomes visible: the enter transition is
 * `opacity 0 → 1` via `@starting-style` (e.g. `popupPresence` in zero-heroui's
 * recipes), so an immediate read catches a half-painted or fully transparent
 * box. The playground sweep that motivated this file produced blank popup
 * screenshots exactly that way. Poll computed opacity to 1, or wait out
 * `--duration-fast`, first.
 *
 * Skipped on the derived chromium projects (reduced-motion, forced-colors):
 * nothing here is changed by a motion or contrast preference.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

interface DesignSystem {
    id: string;
    /** The toolbar's own label — how the switcher item is named to a user. */
    label: string;
}

const DESIGN_SYSTEMS: DesignSystem[] = [
    { id: 'basic', label: 'Basic' },
    { id: 'daisyui', label: 'daisyUI' },
    { id: 'material', label: 'Material' },
    { id: 'brutalist', label: 'Brutalist' },
    { id: 'heroui', label: 'HeroUI' },
    { id: 'carbon', label: 'Carbon' },
];

/** The playground's top-level tabs — every panel gets swept. */
const TABS = ['Components', 'Forms', 'About'] as const;

// ── The declared vocabulary, read from the compiled manifests ───────────────

/**
 * Read node-side from `dist/`, the same way `contrast-audit.spec.ts` reads
 * zero's own anatomy. It has to come from the manifest rather than a literal
 * here: a literal is exactly the mistake invariant 2 exists to catch, and it
 * would let this spec agree with a design system that had changed underneath
 * it.
 */
interface Vocabulary {
    colors: string[];
    sizes: string[];
    variants: string[];
    modifiers: string[];
    themes: string[];
}

interface Manifest {
    themes: { name: string }[];
    tokens: {
        roles: Record<string, unknown>;
        sizes: string[];
        variants: string[];
        modifiers?: string[];
    };
}

function vocabularyOf(id: string): Vocabulary {
    const path = join(repoRoot, 'packages', `zero-${id}`, 'dist', 'manifest.json');
    const manifest = JSON.parse(readFileSync(path, 'utf8')) as Manifest;
    return {
        colors: Object.keys(manifest.tokens.roles),
        sizes: [...manifest.tokens.sizes],
        variants: [...manifest.tokens.variants],
        // Optional: a manifest built before modifiers existed has no such key.
        modifiers: [...(manifest.tokens.modifiers ?? [])],
        themes: manifest.themes.map((theme) => theme.name),
    };
}

const vocabularies = new Map(DESIGN_SYSTEMS.map((ds) => [ds.id, vocabularyOf(ds.id)]));

const vocabularyFor = (id: string): Vocabulary => {
    const vocabulary = vocabularies.get(id);
    if (!vocabulary) throw new Error(`no manifest read for design system "${id}"`);
    return vocabulary;
};

// ── Invariant 4: a clean boot ──────────────────────────────────────────────

/**
 * The playground renders a deliberately broken avatar (`/definitely-missing.png`)
 * to demonstrate `avatar.image`'s error state, and the browser logs the 404 as
 * a console error of its own. That is the fixture working, not a defect.
 *
 * Keep this list SHORT and commented — every entry is a claim that an error in
 * the console is intended.
 */
const EXPECTED_CONSOLE_ERRORS = [/definitely-missing\.png/];

/** Console errors and uncaught exceptions seen on a page, in order. */
const diagnostics = new WeakMap<Page, string[]>();

/**
 * Start listening BEFORE the first navigation, so boot is actually covered.
 *
 * Both channels matter and neither subsumes the other: `console` carries
 * `console.error` (how `design-systems.ts` reports a stylesheet or manifest
 * that failed to load), `pageerror` carries an uncaught exception (how a
 * broken boot reports itself, and the one that turns into the long hang).
 */
function watchConsole(page: Page): void {
    const seen: string[] = [];
    diagnostics.set(page, seen);
    page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (EXPECTED_CONSOLE_ERRORS.some((allowed) => allowed.test(text))) return;
        seen.push(`console.error: ${text}`);
    });
    page.on('pageerror', (error) => {
        seen.push(`uncaught: ${error.message}`);
    });
}

// ── Booting a pinned design system ─────────────────────────────────────────

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
    watchConsole(page);
    await page.addInitScript((id) => {
        localStorage.setItem('zero-ds', id);
    }, ds);
    await page.goto('/');
    await expect(page.locator('link[data-zero-ds]')).toHaveAttribute('data-zero-ds', ds);
}

// ── Invariant 1: `hidden` hides ────────────────────────────────────────────

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

// ── Invariant 2: no undeclared axis value ──────────────────────────────────

/** What the document actually rendered on each contract axis. */
interface RenderedAxes {
    /** One line per offending element, deduplicated — the failure message. */
    undeclared: string[];
    colors: string[];
    sizes: string[];
    variants: string[];
}

/**
 * Every element is inspected, not just `[data-scope]` ones: an axis attribute
 * on something that is not a zero part is itself a finding worth the failure.
 */
const readAxes = (page: Page, vocabulary: Vocabulary): Promise<RenderedAxes> =>
    page.evaluate((declared) => {
        const undeclared: string[] = [];
        const seen = {
            colors: new Set<string>(),
            sizes: new Set<string>(),
            variants: new Set<string>(),
        };

        const where = (el: Element): string => {
            const scope = el.getAttribute('data-scope');
            const part = el.getAttribute('data-part');
            return scope && part ? `${scope}/${part}` : `<${el.tagName.toLowerCase()}>`;
        };

        const axes = [
            { attr: 'data-color', allowed: declared.colors, bucket: seen.colors },
            { attr: 'data-size', allowed: declared.sizes, bucket: seen.sizes },
            { attr: 'data-variant', allowed: declared.variants, bucket: seen.variants },
        ];

        for (const el of document.querySelectorAll<HTMLElement>('*')) {
            for (const axis of axes) {
                const value = el.getAttribute(axis.attr);
                if (value === null) continue;
                axis.bucket.add(value);
                if (!axis.allowed.includes(value)) {
                    undeclared.push(`${where(el)} ${axis.attr}="${value}"`);
                }
            }
            for (const attribute of el.attributes) {
                if (!attribute.name.startsWith('data-mod-')) continue;
                const name = attribute.name.slice('data-mod-'.length);
                if (!declared.modifiers.includes(name)) {
                    undeclared.push(`${where(el)} ${attribute.name}`);
                }
            }
        }

        const sorted = (values: Set<string>): string[] => [...values].sort();
        return {
            // De-duplicated: the same mistake repeated across a row of buttons
            // is one finding, and a 40-line list buries it.
            undeclared: [...new Set(undeclared)].sort(),
            colors: sorted(seen.colors),
            sizes: sorted(seen.sizes),
            variants: sorted(seen.variants),
        };
    }, vocabulary);

// ── Invariant 3: exactly one live sheet ────────────────────────────────────

/**
 * SETTLED, deliberately — do not turn this into a per-frame sampler.
 *
 * `design-systems.ts` used to claim that "sampling per animation frame, the
 * number of links with a non-null `.sheet` never exceeds one". The first
 * version of this spec asserted exactly that, with a rAF sampler running
 * across each swap, and it is FLAKY: one run in ten (six swaps each, chromium,
 * `--repeat-each=10`) caught a frame in which both the outgoing and the
 * incoming sheet were live.
 *
 * That is a real frame, not a measurement artifact. A rAF callback runs before
 * its own frame is painted, and `previous.remove()` runs in a task — the
 * microtask after the incoming link's `load` event. When the sheet becomes
 * live before that event is dispatched, the frame in between paints with both
 * design systems' recipes blended. Usually the sampler misses it (the sheet
 * goes live after the rAF callback has already read, and the removal lands
 * before the next one); occasionally it does not.
 *
 * So the transient is a real product wart, filed as #256 — and the thing
 * this suite asserts is the settled claim #206 actually asks for: after each
 * switch, exactly one link, live, and the one that was asked for. Asserting
 * per frame would import a known 10% flake into every CI run.
 *
 * Every `link[data-zero-ds]` in the document, and whether its sheet is live.
 * Liveness rather than element count: a stylesheet still loading has a null
 * `.sheet` and applies nothing, so the two-ELEMENT window is by design.
 */
const readSheets = (page: Page): Promise<{ id: string; live: boolean }[]> =>
    page.evaluate(() => [...document.querySelectorAll<HTMLLinkElement>('link[data-zero-ds]')]
        .map((link) => ({ id: link.getAttribute('data-zero-ds') ?? '?', live: link.sheet !== null })));

// ── The per-design-system block ────────────────────────────────────────────

for (const ds of DESIGN_SYSTEMS) {
    test.describe(`design system: ${ds.id}`, () => {
        test.beforeEach(async ({ page }, testInfo) => {
            test.skip(
                testInfo.project.name === 'reduced-motion' || testInfo.project.name === 'forced-colors',
                'cascade layering is unaffected by motion/contrast preferences; the three engines cover it',
            );
            await pin(page, ds.id);
        });

        // Invariant 4, over every page this block loads — a listener rather
        // than a page load of its own, so it costs nothing.
        test.afterEach(async ({ page }) => {
            expect(
                diagnostics.get(page) ?? [],
                `${ds.id}: the console must be clean — an error here is a boot defect, and in this suite `
                + 'a broken boot otherwise surfaces as every other spec timing out',
            ).toEqual([]);
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
                    `${ds.id} / ${tab}: a recipe \`display\` outranks the UA's [hidden] rule — `
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
                `${ds.id}: an initially-collapsed branch must not be laid out`,
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
                `${ds.id}: collapsed branch content is still laid out — `
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

// ── The switcher block: all six design systems, one page load ──────────────

test.describe('the toolbar switcher', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'chromium',
            'DOM bookkeeping rather than rendering — one engine settles it',
        );
    });

    test.afterEach(async ({ page }) => {
        expect(
            diagnostics.get(page) ?? [],
            'switching design systems must not log an error — a stylesheet or manifest that failed to '
            + 'load reports itself here, and nowhere else',
        ).toEqual([]);
    });

    test('every design system swaps in cleanly and declares what it renders', async ({ page }) => {
        watchConsole(page);
        // Boot on the LAST design system in the list, so the loop below opens
        // with a real change and closes by returning to one already visited —
        // the path that re-reads a cached manifest instead of fetching one.
        await page.addInitScript(() => {
            localStorage.setItem('zero-ds', 'carbon');
        });
        await page.goto('/');
        await expect(page.locator('link[data-zero-ds]')).toHaveAttribute('data-zero-ds', 'carbon');

        const switcher = page.getByRole('group', { name: 'Design system' });
        const themeGroup = page.getByRole('group', { name: 'Theme' });

        for (const ds of DESIGN_SYSTEMS) {
            const vocabulary = vocabularyFor(ds.id);
            const item = switcher.getByRole('button', { name: ds.label, exact: true });

            await item.click();

            // Wait on the TOOLBAR, not on the links: the toolbar re-reads the
            // document once the swap resolves (`switchTo`'s `finally`), so its
            // selection is an independent commit signal. Waiting on the link
            // count instead would be waiting for the very thing invariant 3
            // asserts, and would pass vacuously.
            await expect(item).toHaveAttribute('data-state', 'on');
            await expect(item).not.toBeDisabled();

            expect(
                await readSheets(page),
                `${ds.id}: once the swap has committed there must be exactly one link[data-zero-ds], `
                + 'and it must be live — recipe CSS is not [data-theme]-scoped, so a second live sheet '
                + 'BLENDS into the first rather than replacing it',
            ).toEqual([{ id: ds.id, live: true }]);

            // Invariant 2, against the design system that is now live.
            const rendered = await readAxes(page, vocabulary);
            expect(
                rendered.undeclared,
                `${ds.id}: rendered an axis value its manifest does not declare — nothing styles it, so `
                + `the mistake is silent. Declared: colors=[${vocabulary.colors.join('|')}] `
                + `sizes=[${vocabulary.sizes.join('|')}] variants=[${vocabulary.variants.join('|')}] `
                + `modifiers=[${vocabulary.modifiers.join('|')}]`,
            ).toEqual([]);

            // …and the converse, which is what proves the vocabulary was
            // REFETCHED rather than left behind by the outgoing design system:
            // the playground builds its variant and size rows out of the live
            // manifest, so every declared value must appear. Colours are
            // deliberately excluded — the swatch row caps at four, so
            // material's thirteen roles could never all render.
            expect(
                { variants: rendered.variants, sizes: rendered.sizes },
                `${ds.id}: the axis rows do not cover the declared vocabulary — the manifest refetch did `
                + 'not land, and the demo is describing a design system that is no longer loaded',
            ).toEqual({
                variants: [...vocabulary.variants].sort(),
                sizes: [...vocabulary.sizes].sort(),
            });

            // The theme registry is REPLACED, not extended (`clearThemes()`
            // then `installThemes()`), so a stale name here means the page is
            // advertising themes whose CSS left with the previous stylesheet.
            await expect(
                themeGroup.getByRole('button'),
                `${ds.id}: the theme registry still holds another design system's themes`,
            ).toHaveText(vocabulary.themes);
        }
    });
});
