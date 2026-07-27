/**
 * State-matrix contrast audit — the dynamic half of the split-pair problem
 * (signalxjs/zero#116, #118, #119).
 *
 * The token validator contrast-checks declared role PAIRS; it cannot see what
 * the recipe cascade produces when states combine. This audit can: for every
 * part whose anatomy hints text, in every renderable state combination (each
 * `data-state` value, each boolean flag, each state × flag pair), across
 * every design system × theme, it renders the attribute combination against
 * the compiled CSS and checks the computed text color against the effective
 * background.
 *
 * What it deliberately does NOT cover:
 * - interaction pseudo-classes (`:hover`, `:focus-visible`) — attributes
 *   can't force them; those styles are exercised by the interaction specs;
 * - `disabled` combinations — dimming below AA is the point of the state;
 *   they are measured and logged, never asserted;
 * - variant axes — the default variant only, to keep the matrix honest
 *   about what it covers rather than exploding into thousands of cells;
 * - part nesting — each part renders directly on the app surface
 *   (base-100/base-content), the same backdrop the real surfaces sit on in
 *   every shipped design system.
 *
 * Chromium-only: the math is engine-independent (computed colors resolved
 * through a canvas pixel, so oklch()/oklab()/color-mix() outputs all work),
 * so one engine is enough and the forced-colors/reduced-motion projects
 * would only distort it.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p: string): string => readFileSync(join(root, p), 'utf8');

interface ManifestPart {
    name: string;
    states?: string[];
    flags?: string[];
    tokens?: string[];
}
interface ManifestComponent { scope: string; parts: ManifestPart[] }

const anatomy: { components: ManifestComponent[] } = JSON.parse(read('packages/zero/dist/manifest.json'));
const baseCss = read('packages/zero/css/base.css');

const DESIGN_SYSTEMS = ['basic', 'daisyui', 'material', 'brutalist'] as const;

/** One renderable attribute combination for a part. */
interface Combo { state?: string; flag?: string }

/** Every state, every flag, every state × flag pair — plus the bare part. */
function combosFor(part: ManifestPart): Combo[] {
    const states = part.states ?? [];
    // `press-animating` is a one-shot animation frame, not a resting style.
    const flags = (part.flags ?? []).filter((f) => f !== 'press-animating');
    const combos: Combo[] = [{}];
    for (const state of states) combos.push({ state });
    for (const flag of flags) combos.push({ flag });
    for (const state of states) for (const flag of flags) combos.push({ state, flag });
    return combos;
}

interface Cell { scope: string; part: string; state?: string; flag?: string }

const cells: Cell[] = anatomy.components.flatMap((component) =>
    component.parts
        // Text-bearing parts only, per the anatomy's own hint — checking the
        // `color` of a part that never renders text is noise, not coverage.
        .filter((part) => part.tokens?.includes('text'))
        .flatMap((part) => combosFor(part).map((combo) => ({
            scope: component.scope, part: part.name, ...combo,
        }))),
);

/**
 * Combinations a design system dims on purpose. Keep this list SHORT and
 * commented — every entry is a claim that low contrast is the design.
 */
const INTENDED_LOW_CONTRAST = new Set<string>([
    // (none yet)
]);

const cellKey = (ds: string, theme: string, c: Cell): string =>
    [ds, theme, c.scope, c.part, c.state ?? '-', c.flag ?? '-'].join('/');

interface Reading { key: string; color: string; bg: string; ratio: number; disabled: boolean }

for (const ds of DESIGN_SYSTEMS) {
    const dsCss = read(`packages/zero-${ds}/dist/css/index.css`);
    const themes: { name: string; colorScheme: string }[] =
        JSON.parse(read(`packages/zero-${ds}/dist/manifest.json`)).themes;

    for (const theme of themes) {
        test(`contrast: ${ds} / ${theme.name}`, async ({ page }, testInfo) => {
            test.skip(testInfo.project.name !== 'chromium', 'one engine; canvas-resolved colors are engine-independent');

            await page.setContent(
                `<style>${baseCss}\n${dsCss}</style>` +
                // Unlayered app baseline — what every real app provides.
                `<style>body { background: var(--color-base-100); color: var(--color-base-content); }</style>`,
            );
            await page.evaluate((themeName) => {
                document.documentElement.setAttribute('data-theme', themeName);
            }, theme.name);

            const readings: Reading[] = await page.evaluate(({ cells }) => {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 1;
                const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
                /** Resolve any computed CSS color to sRGB, composited over `under`. */
                const resolve = (color: string, under?: [number, number, number]): [number, number, number] => {
                    ctx.clearRect(0, 0, 1, 1);
                    if (under) {
                        ctx.fillStyle = `rgb(${under[0]} ${under[1]} ${under[2]})`;
                        ctx.fillRect(0, 0, 1, 1);
                    }
                    ctx.fillStyle = color;
                    ctx.fillRect(0, 0, 1, 1);
                    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                    return [r, g, b];
                };
                const luminance = ([r, g, b]: [number, number, number]): number => {
                    const lin = (c: number) => {
                        const s = c / 255;
                        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
                    };
                    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
                };
                const contrast = (a: [number, number, number], b: [number, number, number]): number => {
                    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
                    return (l1 + 0.05) / (l2 + 0.05);
                };
                const hasInk = (c: string): boolean => !c.includes('transparent') && !/\/\s*0\)/.test(c) && c !== 'rgba(0, 0, 0, 0)';

                const bodyBg = resolve(getComputedStyle(document.body).backgroundColor, [255, 255, 255]);
                const out: { key: string; color: string; bg: string; ratio: number; disabled: boolean }[] = [];

                for (const cell of cells) {
                    const el = document.createElement('div');
                    el.setAttribute('data-scope', cell.scope);
                    el.setAttribute('data-part', cell.part);
                    if (cell.state) el.setAttribute('data-state', cell.state);
                    if (cell.flag) el.setAttribute('data-' + cell.flag, '');
                    el.textContent = 'Sample';
                    document.body.appendChild(el);

                    const cs = getComputedStyle(el);
                    // Effective background: the part's own paint over the app
                    // surface (parts are transparent unless the recipe fills them).
                    const ownBg = cs.backgroundColor;
                    const bg = hasInk(ownBg) ? resolve(ownBg, bodyBg) : bodyBg;
                    // Text renders over that background; semi-transparent ink
                    // (color-mix fades) composites before measuring.
                    const text = resolve(cs.color, bg);
                    out.push({
                        key: cell.key,
                        color: cs.color,
                        bg: hasInk(ownBg) ? ownBg : 'inherit(base-100)',
                        ratio: Math.round(contrast(text, bg) * 100) / 100,
                        disabled: cell.flag === 'disabled',
                    });
                    el.remove();
                }
                return out;
            }, { cells: cells.map((c) => ({ ...c, key: cellKey(ds, theme.name, c) })) });

            const failures = readings.filter((r) =>
                !r.disabled && r.ratio < 3 && !INTENDED_LOW_CONTRAST.has(r.key));
            const warnings = readings.filter((r) =>
                !r.disabled && r.ratio >= 3 && r.ratio < 4.5 && !INTENDED_LOW_CONTRAST.has(r.key));

            for (const w of warnings) {
                testInfo.annotations.push({ type: 'contrast-warning', description: `${w.key} → ${w.ratio}:1 (${w.color} on ${w.bg})` });
            }

            expect(
                failures.map((f) => `${f.key} → ${f.ratio}:1 (${f.color} on ${f.bg})`),
                'state combinations below 3:1 — a state that changes background must bring a readable color with it',
            ).toEqual([]);
        });
    }
}
