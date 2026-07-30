/**
 * State-matrix contrast audit — the dynamic half of the split-pair problem
 * (signalxjs/zero#116, #118, #119).
 *
 * The token validator contrast-checks declared role PAIRS; it cannot see what
 * the recipe cascade produces when states combine. This audit can. It runs two
 * matrices over the same colour math:
 *
 * 1. **text legibility** — for every part whose anatomy hints text, in every
 *    renderable state combination (each `data-state` value, each boolean flag,
 *    each state × flag pair), across every design system × theme, it renders
 *    the attribute combination against the compiled CSS and checks the computed
 *    text color against the effective background;
 * 2. **indicator paint** (signalxjs/zero#228) — the same check for parts whose
 *    entire job is paint rather than text: the checkbox tick, the radio dot,
 *    the switch thumb, the progress range, the select/tree chevrons, the
 *    rating star. Text legibility cannot see these at all — an indicator
 *    declares `tokens: ['color']`, never `['text']` — which is how Material's
 *    radio dot shipped at 1.02:1 (#211): pure white painted over an unfilled
 *    control on a 99%-white page.
 *
 * What this deliberately does NOT cover:
 * - interaction pseudo-classes (`:hover`, `:focus-visible`) — attributes
 *   can't force them; those styles are exercised by the interaction specs;
 * - `disabled` combinations — dimming below AA is the point of the state;
 *   they are measured and logged, never asserted;
 * - variant axes — the default variant only, to keep the matrix honest
 *   about what it covers rather than exploding into thousands of cells;
 * - part nesting, in the TEXT matrix — each part renders directly on the app
 *   surface (base-100/base-content), the same backdrop the real surfaces sit
 *   on in every shipped design system. The INDICATOR matrix is the exception:
 *   a mark's whole point is that it sits on its control's fill, which sits on
 *   the page, so there it renders inside its real ancestor chain;
 * - `box-shadow` and `border-color`, in the INDICATOR matrix — fill and glyph
 *   only. A design system may delineate a mark with a ring instead of with
 *   fill contrast (basic/daisyUI/HeroUI ring the switch's off-thumb), and this
 *   audit will still hold the FILL to 3:1 against the track. That is
 *   deliberate: a ring is a hairline, the fill is the whole shape.
 *
 * Chromium-only: the math is engine-independent (computed colors resolved
 * through a canvas pixel, so oklch()/oklab()/color-mix() outputs all work),
 * so one engine is enough and the forced-colors/reduced-motion projects
 * would only distort it.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p: string): string => readFileSync(join(root, p), 'utf8');

interface ManifestPart {
    name: string;
    element?: string;
    states?: string[];
    flags?: string[];
    tokens?: string[];
}
interface ManifestComponent { scope: string; parts: ManifestPart[] }

const anatomy: { components: ManifestComponent[] } = JSON.parse(read('packages/zero/dist/manifest.json'));
const baseCss = read('packages/zero/css/base.css');

const DESIGN_SYSTEMS = ['basic', 'daisyui', 'material', 'brutalist', 'heroui', 'carbon'] as const;

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

// ── Colour math, shared by both matrices ────────────────────────────────────

type RGB = [number, number, number];

interface ColorMath {
    /** Resolve any computed CSS color to sRGB, composited over `under`. */
    resolve(color: string, under?: RGB): RGB;
    /** `over` seen through `t` opacity on top of `under`. */
    blend(over: RGB, under: RGB, t: number): RGB;
    contrast(a: RGB, b: RGB): number;
    alphaOf(color: string): number;
    hasInk(color: string): boolean;
}

declare global {
    interface Window { zeroColorMath: ColorMath }
}

/**
 * Installed into the page once per test. Both matrices resolve colors through
 * the same 1x1 canvas: assigning `fillStyle` is the only reliable way to turn
 * `oklch()` / `color-mix()` / `lab()` output into sRGB, and reading the pixel
 * back composites semi-transparent ink for free.
 */
function installColorMath(): void {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const resolve = (color: string, under?: RGB): RGB => {
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
    const blend = (over: RGB, under: RGB, t: number): RGB => [
        Math.round(under[0] + (over[0] - under[0]) * t),
        Math.round(under[1] + (over[1] - under[1]) * t),
        Math.round(under[2] + (over[2] - under[2]) * t),
    ];
    const luminance = ([r, g, b]: RGB): number => {
        const lin = (c: number): number => {
            const s = c / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const contrast = (a: RGB, b: RGB): number => {
        const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (l1 + 0.05) / (l2 + 0.05);
    };
    /**
     * Exact alpha via canvas normalization: assigning fillStyle
     * canonicalizes any CSS color to `#rrggbb` (opaque) or
     * `rgba(r, g, b, a)` — no string-sniffing the many spellings
     * of transparent.
     */
    const alphaOf = (c: string): number => {
        ctx.fillStyle = '#000';
        ctx.fillStyle = c;
        const s = String(ctx.fillStyle);
        if (s.startsWith('#')) return 1;
        const m = /rgba?\([^)]*[,\s/]\s*([\d.]+)\s*\)$/.exec(s);
        return m ? parseFloat(m[1]) : 1;
    };
    window.zeroColorMath = { resolve, blend, contrast, alphaOf, hasInk: (c) => alphaOf(c) > 0 };
}

// ── The indicator matrix (#228) ─────────────────────────────────────────────

/**
 * Selection rule — which parts are "indicators", read off the anatomy rather
 * than listed by hand:
 *
 *   a part is an indicator when it declares no `text` token AND its name comes
 *   from the anatomy's closed paint-only vocabulary — `indicator`,
 *   `<thing>-indicator`, `thumb`, `range`.
 *
 * Checked against the shipped manifest, that selects exactly the parts whose
 * whole job is paint: checkbox/indicator, radio-group/item-indicator,
 * switch/thumb, select/indicator, select/item-indicator,
 * combobox/item-indicator, tree-view/branch-indicator, progress/range, plus
 * slider/range and slider/thumb (excluded below — the web never renders them).
 *
 * The rule sketched in #228 — "tokens include `color` but not `text`, and 2+
 * `data-state` values" — was tried first and rejected. It drags in a dozen
 * SURFACES (dialog/popup, dialog/backdrop, popover/popup, menu/popup,
 * menu/sub-popup, collapsible/root, accordion/item, avatar/root, select/popup,
 * combobox/control, combobox/trigger, and the bare checkbox/switch/radio
 * roots) which legitimately paint the same base surface the page paints —
 * measured as "ink" those read ~1:1 and would fail for being correct. It also
 * MISSES select/item-indicator and combobox/item-indicator (whose only axis is
 * the `selected` flag, so zero states) and tree-view/branch-indicator (which
 * declares no tokens at all).
 *
 * `rating-group/item` is the one part the vocabulary cannot name: the star is
 * named after what it repeats rather than after its role. Same bug class — a
 * mark whose only job is paint — so it is opted in explicitly.
 */
const PAINT_ONLY_PART = /^(?:.*-)?(?:indicator|thumb|range)$/;

/**
 * Selected parts the web never renders. Slider's track/range/thumb are the
 * anatomy's projection for platforms without a native range widget; on the web
 * the design systems style the `<input type="range">` pseudo-elements instead
 * (see `Slider.tsx`). Measuring them would measure fiction.
 */
const NOT_RENDERED_ON_WEB = new Set(['slider/range', 'slider/thumb']);

/**
 * The manifest declares parts, not nesting — so each indicator's real ancestor
 * chain is stated here, mirroring the component's own JSX (outermost first).
 * The ancestors are the whole point: the dot sits on the control's fill, which
 * sits on the page, and every ancestor that declares the same `data-state`
 * carries it in the real DOM too (`Checkbox.Root` puts `data-state` on root,
 * control AND indicator), which is exactly why a checked control's fill is the
 * backdrop the tick has to survive.
 *
 * An ancestor written `part=state` is PINNED to that state — the state it has
 * to be in for the indicator to exist at all. `popup=open` is the load-bearing
 * case: a closed popup is `visibility: hidden`, which inherits, so a `✓` inside
 * a default-state popup measures as "not painted" and the cell would silently
 * vanish from the matrix.
 *
 * `glyph` is the default mark the component itself renders when the app passes
 * no children (`Select.Indicator` → `▾`, item indicators → `✓`,
 * `TreeView.BranchIndicator` → `›`, `RatingGroup.Item` → `★`). The
 * checkbox/radio/switch/progress marks are drawn by the recipe, not by zero,
 * so those parts stay empty here — as they are on screen.
 */
interface IndicatorSpec { scope: string; part: string; ancestors: string[]; glyph?: string }

const INDICATORS: IndicatorSpec[] = [
    { scope: 'checkbox', part: 'indicator', ancestors: ['root', 'control'] },
    { scope: 'radio-group', part: 'item-indicator', ancestors: ['root', 'item', 'item-control'] },
    { scope: 'switch', part: 'thumb', ancestors: ['root', 'control'] },
    { scope: 'progress', part: 'range', ancestors: ['root', 'track'] },
    { scope: 'select', part: 'indicator', ancestors: ['root', 'trigger'], glyph: '▾' },
    { scope: 'select', part: 'item-indicator', ancestors: ['root', 'popup=open', 'item'], glyph: '✓' },
    { scope: 'combobox', part: 'item-indicator', ancestors: ['root', 'popup=open', 'item'], glyph: '✓' },
    {
        scope: 'tree-view',
        part: 'branch-indicator',
        ancestors: ['root', 'tree', 'branch', 'branch-trigger'],
        glyph: '›',
    },
    // The one non-`indicator`-named mark; see PAINT_ONLY_PART above. `★` for
    // every state — the recipes differ in `color`, not in the glyph.
    { scope: 'rating-group', part: 'item', ancestors: ['root', 'control'], glyph: '★' },
];

const partOf = (scope: string, name: string): ManifestPart => {
    const part = anatomy.components.find((c) => c.scope === scope)?.parts.find((p) => p.name === name);
    if (!part) throw new Error(`anatomy declares no ${scope}/${name}`);
    return part;
};

/** One node of a rendered chain — enough for the page to rebuild it. */
interface NodeSpec { part: string; element: string; states: string[]; flags: string[]; pin?: string }

interface IndicatorCell extends Cell {
    /** Outermost ancestor first; the indicator itself is last. */
    chain: NodeSpec[];
    glyph?: string;
}

const indicatorCells: IndicatorCell[] = INDICATORS.flatMap((spec) => {
    const chain: NodeSpec[] = [...spec.ancestors, spec.part].map((entry) => {
        const [name, pin] = entry.split('=');
        const part = partOf(spec.scope, name);
        if (pin && !part.states?.includes(pin)) throw new Error(`${spec.scope}/${name} has no state "${pin}"`);
        return {
            part: name,
            element: part.element ?? 'div',
            states: part.states ?? [],
            flags: part.flags ?? [],
            pin,
        };
    });
    return combosFor(partOf(spec.scope, spec.part)).map((combo) => ({
        scope: spec.scope, part: spec.part, ...combo, chain, glyph: spec.glyph,
    }));
});

interface Reading { key: string; color: string; bg: string; ratio: number; disabled: boolean }

interface IndicatorReading {
    key: string;
    scope: string;
    part: string;
    /** Which layer carried the paint: the element's own fill, or a pseudo's. */
    carrier: string;
    ink: string;
    bg: string;
    ratio: number;
    disabled: boolean;
    /** True when nothing is painted in this state — see `collapsed` below. */
    unpainted: boolean;
}

test('indicator coverage: every paint-only part has an ancestor chain', ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one engine is enough');

    const selected = anatomy.components.flatMap((component) => component.parts
        .filter((part) => !part.tokens?.includes('text') && PAINT_ONLY_PART.test(part.name))
        .map((part) => `${component.scope}/${part.name}`))
        .filter((key) => !NOT_RENDERED_ON_WEB.has(key));
    const covered = new Set(INDICATORS.map((i) => `${i.scope}/${i.part}`));

    expect(
        selected.filter((key) => !covered.has(key)),
        'paint-only parts with no ancestor chain declared — add them to INDICATORS (or, if the web never renders them, to NOT_RENDERED_ON_WEB)',
    ).toEqual([]);
});

for (const ds of DESIGN_SYSTEMS) {
    const dsCss = read(`packages/zero-${ds}/dist/css/index.css`);
    const themes: { name: string; colorScheme: string }[] =
        JSON.parse(read(`packages/zero-${ds}/dist/manifest.json`)).themes;

    /** The app baseline every real app provides, plus the compiled DS CSS. */
    const stage = async (page: Page, theme: string): Promise<void> => {
        await page.setContent(
            `<style>${baseCss}\n${dsCss}</style>` +
            // Unlayered app baseline — what every real app provides.
            `<style>body { background: var(--color-base-100); color: var(--color-base-content); }</style>`,
        );
        await page.evaluate((themeName) => {
            document.documentElement.setAttribute('data-theme', themeName);
        }, theme);
        await page.evaluate(installColorMath);
    };

    for (const theme of themes) {
        test(`contrast: ${ds} / ${theme.name}`, async ({ page }, testInfo) => {
            test.skip(testInfo.project.name !== 'chromium', 'one engine; canvas-resolved colors are engine-independent');

            await stage(page, theme.name);

            const readings: Reading[] = await page.evaluate(({ cells }) => {
                const { resolve, contrast, hasInk } = window.zeroColorMath;
                const bodyBg = resolve(getComputedStyle(document.body).backgroundColor, [255, 255, 255]);
                const out: Reading[] = [];

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

        test(`indicator contrast: ${ds} / ${theme.name}`, async ({ page }, testInfo) => {
            test.skip(testInfo.project.name !== 'chromium', 'one engine; canvas-resolved colors are engine-independent');

            await stage(page, theme.name);
            // Resting styles only. Indicators live inside popups, and a popup
            // with `@starting-style` + `transition` computes its ENTRY style
            // (`opacity: 0`) for the frame it is inserted in — which would read
            // as "the ✓ is not painted" and silently drop the cell. Killing
            // transitions and animations settles every chain immediately; entry
            // and exit motion is not what this audit measures anyway.
            await page.addStyleTag({
                content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
            });

            const readings: IndicatorReading[] = await page.evaluate(({ cells }) => {
                const { resolve, blend, contrast, hasInk } = window.zeroColorMath;
                const bodyBg = resolve(getComputedStyle(document.body).backgroundColor, [255, 255, 255]);
                const num = (v: string): number => {
                    const n = parseFloat(v);
                    return Number.isFinite(n) ? n : 1;
                };

                /**
                 * Geometry that collapses a mark to nothing — the honest way to
                 * tell "unchecked, so there is no dot" from "there is a dot and
                 * nobody can see it". Both are `background: white`; only the
                 * geometry differs, so it is read rather than guessed:
                 *
                 * - `transform` always resolves to a matrix, so a zero
                 *   determinant covers `scale(0)`, `scale(1, 0)` and the
                 *   `matrix3d` equivalents (Material and brutalist grow their
                 *   radio dot from `scale(0)`);
                 * - the independent `scale` property is checked in its own
                 *   right (HeroUI drives `translate`/`rotate`/`scale` directly);
                 * - `clip-path` collapsed to nothing — no shipped design system
                 *   uses it today, but #228 names it as a way to draw a mark, so
                 *   a collapsed circle/inset counts as unpainted.
                 */
                const collapsed = (cs: CSSStyleDeclaration): boolean => {
                    const matrix = /^matrix(3d)?\(([^)]*)\)$/.exec(cs.transform);
                    if (matrix) {
                        const n = matrix[2].split(',').map(Number);
                        const det = matrix[1]
                            ? n[0] * (n[5] * n[10] - n[9] * n[6])
                                - n[4] * (n[1] * n[10] - n[9] * n[2])
                                + n[8] * (n[1] * n[6] - n[5] * n[2])
                            : n[0] * n[3] - n[1] * n[2];
                        if (Math.abs(det) < 1e-6) return true;
                    }
                    const scale = cs.getPropertyValue('scale');
                    if (scale && scale !== 'none' && scale.split(/\s+/).some((v) => parseFloat(v) === 0)) return true;
                    const clip = cs.getPropertyValue('clip-path');
                    if (/^circle\(\s*0(px|%)?[\s)]/.test(clip)) return true;
                    const inset = /^inset\(\s*([\d.]+)%\s*\)$/.exec(clip);
                    return !!inset && parseFloat(inset[1]) >= 50;
                };
                /** Rendered at all — before asking what colour it is. */
                const rendered = (cs: CSSStyleDeclaration): boolean =>
                    cs.display !== 'none' && cs.visibility !== 'hidden' && num(cs.opacity) > 0
                    && !collapsed(cs);

                const out: IndicatorReading[] = [];

                for (const cell of cells) {
                    // Rebuild the real chain: root > control > indicator, each
                    // node carrying the state/flag it declares — the same
                    // attributes the component itself writes.
                    const nodes: HTMLElement[] = [];
                    let parent: HTMLElement = document.body;
                    for (const node of cell.chain) {
                        const el = document.createElement(node.element);
                        el.setAttribute('data-scope', cell.scope);
                        el.setAttribute('data-part', node.part);
                        if (node.pin) el.setAttribute('data-state', node.pin);
                        else if (cell.state && node.states.includes(cell.state)) {
                            el.setAttribute('data-state', cell.state);
                        }
                        if (cell.flag && node.flags.includes(cell.flag)) {
                            el.setAttribute('data-' + cell.flag, '');
                        }
                        parent.appendChild(el);
                        nodes.push(el);
                        parent = el;
                    }
                    const el = nodes[nodes.length - 1];
                    if (cell.glyph) el.textContent = cell.glyph;

                    // The backdrop, composited top-down through the whole chain
                    // rather than stopping at the nearest opaque fill: daisyUI's
                    // `color-mix(... transparent)` surfaces are translucent, so
                    // what is underneath them still shows through.
                    let bg = bodyBg;
                    let group = 1;
                    let bgLabel = 'base-100';
                    for (const ancestor of nodes.slice(0, -1)) {
                        const acs = getComputedStyle(ancestor);
                        const opacity = num(acs.opacity);
                        group *= opacity;
                        if (!hasInk(acs.backgroundColor) || opacity <= 0) continue;
                        bg = blend(resolve(acs.backgroundColor, bg), bg, opacity);
                        bgLabel = `${ancestor.getAttribute('data-part')}:${acs.backgroundColor}`;
                    }

                    const cs = getComputedStyle(el);
                    const selfOpacity = num(cs.opacity) * group;
                    // The element's own fill becomes the backdrop for any glyph
                    // it draws on top of itself.
                    const ownBg = hasInk(cs.backgroundColor)
                        ? blend(resolve(cs.backgroundColor, bg), bg, selfOpacity)
                        : bg;

                    /**
                     * Every layer that could carry the mark. A shape is a
                     * `background-color` (clip-path or border-radius only change
                     * its outline, not what is measured); a tick drawn as a
                     * glyph — by the recipe via `content`, or by zero as default
                     * children — is a `color`. `opacity` is folded in, because a
                     * mark at 0.55 really is 45% backdrop.
                     */
                    const carriers: { carrier: string; ink: string; opacity: number; over: RGB }[] = [];
                    if (rendered(cs)) {
                        if (hasInk(cs.backgroundColor)) {
                            carriers.push({ carrier: 'background', ink: cs.backgroundColor, opacity: selfOpacity, over: bg });
                        }
                        if (el.textContent) {
                            carriers.push({ carrier: 'color', ink: cs.color, opacity: selfOpacity, over: ownBg });
                        }
                        for (const pseudo of ['::before', '::after']) {
                            const ps = getComputedStyle(el, pseudo);
                            if (ps.content === 'none' || !rendered(ps)) continue;
                            const opacity = num(ps.opacity) * selfOpacity;
                            if (hasInk(ps.backgroundColor)) {
                                carriers.push({ carrier: `background${pseudo}`, ink: ps.backgroundColor, opacity, over: ownBg });
                            }
                            // A quoted, non-empty `content` is a drawn glyph;
                            // `content: ""` is a box, and has no `color` to read.
                            if (/^(["'])(?:.|\n)+\1$/.test(ps.content)) {
                                carriers.push({ carrier: `color${pseudo}`, ink: ps.color, opacity, over: ownBg });
                            }
                        }
                    }

                    const measured = carriers
                        .filter((c) => c.opacity > 0)
                        .map((c) => ({
                            ...c,
                            ratio: contrast(blend(resolve(c.ink, c.over), c.over, c.opacity), c.over),
                        }))
                        // The mark is visible if ANY of its layers is: a recipe
                        // that draws the tick on a pseudo still leaves the host
                        // element's own (absent) fill measurable.
                        .sort((a, b) => b.ratio - a.ratio);
                    const best = measured[0];

                    out.push({
                        key: cell.key,
                        scope: cell.scope,
                        part: cell.part,
                        carrier: best?.carrier ?? 'none',
                        ink: best?.ink ?? 'none',
                        bg: bgLabel,
                        ratio: best ? Math.round(best.ratio * 100) / 100 : 0,
                        disabled: cell.flag === 'disabled',
                        unpainted: !best,
                    });
                    nodes[0].remove();
                }
                return out;
            }, { cells: indicatorCells.map((c) => ({ ...c, key: cellKey(ds, theme.name, c) })) });

            // Intentionally unpainted states (unchecked → `scale(0)`, no
            // `content`, transparent fill) are not a contrast problem; they are
            // the state working. A part that paints in NO state is a different
            // bug class — a missing mark, #226's business — so it is annotated,
            // never asserted here.
            const painted = readings.filter((r) => !r.unpainted);
            const paintedParts = new Set(painted.map((r) => `${r.scope}/${r.part}`));
            for (const spec of INDICATORS) {
                if (paintedParts.has(`${spec.scope}/${spec.part}`)) continue;
                testInfo.annotations.push({
                    type: 'indicator-never-painted',
                    description: `${ds}/${theme.name}/${spec.scope}/${spec.part} — no state paints anything`,
                });
            }

            const failures = painted.filter((r) =>
                !r.disabled && r.ratio < 3 && !INTENDED_LOW_CONTRAST.has(r.key));
            const warnings = painted.filter((r) =>
                !r.disabled && r.ratio >= 3 && r.ratio < 4.5 && !INTENDED_LOW_CONTRAST.has(r.key));

            for (const w of warnings) {
                testInfo.annotations.push({ type: 'indicator-contrast-warning', description: `${w.key} → ${w.ratio}:1 (${w.carrier} ${w.ink} on ${w.bg})` });
            }

            expect(
                failures.map((f) => `${f.key} → ${f.ratio}:1 (${f.carrier} ${f.ink} on ${f.bg})`),
                'indicator paint below 3:1 — a mark that is painted has to be visible against what it is painted on',
            ).toEqual([]);
        });
    }
}
