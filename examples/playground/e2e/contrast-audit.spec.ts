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
 * `disabled` has its own, lower floor in both matrices (#207). Dimming below
 * AA is the point of the state, so it does not answer to the 3:1 floor — but
 * "dimmed" is not "gone", and readings that were produced and then dropped let
 * a 1.05:1 label pass silently. See `DISABLED_FLOOR`, and `inGroup` for the
 * separation it rests on.
 *
 * Both matrices also carry the design system's own axis surface (#207): a
 * design system whose colour vocabulary rides on `data-variant` — HeroUI's
 * `danger-soft`, carbon's `danger-ghost` — has no colour to measure at all
 * until the attribute is set. See `axisCellsFor` for the cell product and why
 * `size` is not part of it.
 *
 * What this deliberately does NOT cover:
 * - interaction pseudo-classes (`:hover`, `:focus-visible`) — attributes
 *   can't force them; those styles are exercised by the interaction specs;
 * - the axis surface of scopes that wire no `variant` — a bare `data-color`
 *   selects role tokens whose pairing the token validator already checks
 *   statically, and `data-size` moves metrics, not ink. See `axisCellsFor`;
 * - part nesting, in the TEXT matrix — each part renders directly on the app
 *   surface (base-100/base-content), the same backdrop the real surfaces sit
 *   on in every shipped design system. The INDICATOR matrix is the exception:
 *   a mark's whole point is that it sits on its control's fill, which sits on
 *   the page, so there it renders inside its real ancestor chain;
 * - `box-shadow`, in the INDICATOR matrix. A shadow is the one delineation the
 *   reader can lose: `forced-colors: active` strips it outright. A mark whose
 *   only separation from its backdrop is a shadow (basic/daisyUI/HeroUI all
 *   ringed the switch's off-thumb that way) is a mark that disappears in high
 *   contrast mode, so this audit does not count it. `border-color` IS counted —
 *   see `borderInk`: since #232, marks are drawn geometry, and for two of the
 *   six the stroke is the whole shape rather than a ring around a fill.
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

interface Cell {
    scope: string;
    part: string;
    state?: string;
    flag?: string;
    /** Axis attributes to set on the probe — `variant: 'danger'` → `data-variant="danger"`. */
    axes?: Record<string, string>;
    /** Presence-only modifiers to set — `pending` → `data-mod-pending`. */
    mods?: string[];
}

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
 * Combinations this audit does not currently assert. Keep this list SHORT and
 * commented — every entry is either a claim that low contrast is the design,
 * or, as today, DEBT: a cell whose failure is real, filed, and scheduled, held
 * out only so the gate can land ahead of the fixes.
 *
 * A debt entry names its issue and is deleted by the PR that closes it. It is
 * not a decision about the cell.
 *
 * Entries are exact `cellKey` strings on purpose — one key, one cell. Never
 * widen one to a scope or a theme: that would swallow the next regression in
 * the same neighbourhood, which is the failure mode an allowlist has.
 *
 * The list is guarded from both sides, because neither guard alone is enough:
 * `allowlist coverage` fails an entry that names no cell, and `staleEntries`
 * fails one whose cell now passes. Add carelessly and the first catches you;
 * forget to remove and the second does.
 */
const INTENDED_LOW_CONTRAST = new Set<string>([
    // DEBT — signalxjs/zero#263. HeroUI's `pending` modifier is
    // `opacity: 0.7` on the button root, which fades the label with the fill
    // and drops both variants just under the floor (primary 2.92:1, outline
    // 2.97:1) on the light theme. `pending` is a LOADING state, not a disabled
    // one — the reader is waiting on that label — so it gets no WCAG 1.4.3
    // carve-out and no lower floor. Delete these six when #263 lands.
    'heroui/hero-light/button/root/-/-/variant=primary,+pending',
    'heroui/hero-light/button/root/-/focus-visible/variant=primary,+pending',
    'heroui/hero-light/button/root/-/pressed/variant=primary,+pending',
    'heroui/hero-light/button/root/-/-/variant=outline,+pending',
    'heroui/hero-light/button/root/-/focus-visible/variant=outline,+pending',
    'heroui/hero-light/button/root/-/pressed/variant=outline,+pending',
    // DEBT — signalxjs/zero#264. daisyUI's `select/value[data-placeholder]` is
    // `opacity: 0.5` over base-100, which lands at 2.71:1 on nord (the other
    // four themes clear the floor). Delete this one when #264 lands.
    'daisyui/nord/select/value/-/placeholder/-',
]);

/**
 * The floors. `FLOOR` is WCAG's non-text/large-text minimum and what every
 * asserting cell answers to; `AA` is the body-text target, warned about rather
 * than asserted, because a 3.2:1 label is a finding and not yet a build break.
 *
 * `DISABLED_FLOOR` is the state's own, lower bar, and it is measured on the
 * IN-GROUP ratio (see `inGroup`) rather than on what the reader finally sees.
 *
 * The split is the whole point. A disabled control is supposed to recede, and
 * all six design systems do it the same way: one `opacity` between 0.25 and
 * 0.5 on the whole control. That fade is uniform, deliberate and the state
 * working — measured through it, every disabled cell in every design system
 * lands between 1.3:1 and 2:1, which is a statement about `--disabled-opacity`
 * and not about any recipe. What IS a recipe decision is the colour pair
 * chosen underneath the fade, and that is the reading #207 found being
 * produced and then dropped: a `disabled` label painted `base-300` on
 * `base-200` measures 1.05:1 before any fade, and used to pass in silence.
 * So the pair is asserted at 2:1 and the faded reality is annotated beside it.
 *
 * **Do not "fix" this back to the post-fade reading.** It was tried, and it
 * fails 440 cells across 20 of the 30 matrix tests — every disabled cell in every
 * design system, because each one dims by the same uniform token. A test that
 * red across the board on one design decision is not measuring recipes; it is
 * legislating `--disabled-opacity` from inside an e2e spec. WCAG 1.4.3 agrees
 * on the substance: inactive user-interface components are exempt from the
 * contrast minimum. The colour pair underneath is not, and that is what this
 * floor holds.
 */
const FLOOR = 3;
const AA = 4.5;
const DISABLED_FLOOR = 2;

/**
 * The half of an allowlist nobody ever does. `allowlist coverage` proves an
 * entry NAMES a real cell; this proves it is still NEEDED — a suppression whose
 * cell now clears its floor is dead weight, and dead weight is how an allowlist
 * stops being a list of exceptions and becomes a hole in the gate. The recipe
 * fix lands, the entry stays, and the next regression on that exact cell is
 * silently absorbed by a comment citing an issue that closed months ago.
 *
 * It cannot be a static check: only the browser knows a ratio. So each matrix
 * runs it over its OWN readings, against the same floor the cell would have
 * answered to had it not been listed — `DISABLED_FLOOR` on the in-group pair
 * for a `disabled` cell, `FLOOR` on what the reader sees for everything else.
 *
 * `measured` is the caller's answer to "did this cell produce a reading at
 * all" — `unrendered` in the text matrix, `unpainted` in the indicator one.
 * Nothing painted is NOT evidence the entry can go: a cell with no reading has
 * no ratio to clear a floor with, and reporting it stale would trade a dead
 * suppression for a deleted one that was still doing work.
 *
 * It reads the SAME rounded number the failure buckets read, and that is the
 * point rather than an oversight. `failures` asks `ratio < FLOOR` and this asks
 * `ratio >= FLOOR`: exact complements over one value, so every measured cell is
 * in exactly one of "still failing" and "safe to delete". Giving this side an
 * epsilon would open the gap it looks like it closes — a cell that still fails
 * when unlisted while also being reported stale, which no edit can satisfy.
 * Move the rounding and both sides move together; that is the invariant.
 */
interface Suppressible {
    key: string;
    ratio: number;
    inGroup: number;
    disabled: boolean;
}

function staleEntries<R extends Suppressible>(readings: R[], measured: (r: R) => boolean): string[] {
    return readings
        .filter((r) => INTENDED_LOW_CONTRAST.has(r.key) && measured(r))
        .filter((r) => (r.disabled ? r.inGroup >= DISABLED_FLOOR : r.ratio >= FLOOR))
        .map((r) => (r.disabled
            ? `${r.key} → ${r.inGroup}:1 before the state's fade, clearing the ${DISABLED_FLOOR}:1 disabled floor`
            : `${r.key} → ${r.ratio}:1, clearing the ${FLOOR}:1 floor`));
}

const STALE_MESSAGE =
    'INTENDED_LOW_CONTRAST entries whose cell now passes on its own — the suppression is doing nothing. '
    + 'Delete each listed key from INTENDED_LOW_CONTRAST and close the issue its comment cites; '
    + 'left in place it silently absorbs the next regression on that exact cell.';

/** Axis values and modifiers, in a stable spelling — part of a cell's identity. */
const axisTag = (c: Cell): string => [
    ...Object.entries(c.axes ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`),
    ...(c.mods ?? []).map((m) => `+${m}`),
].join(',') || '-';

const cellKey = (ds: string, theme: string, c: Cell): string =>
    [ds, theme, c.scope, c.part, c.state ?? '-', c.flag ?? '-', axisTag(c)].join('/');

// ── The axis surface (#207) ─────────────────────────────────────────────────

/** One scope's wired axis vocabulary, as `@sigx/zero-kit` emits it. */
interface WiredAxes {
    color: string[];
    size: string[];
    variant: string[];
    /** Declared custom axes: name → wired values. */
    axes: Record<string, string[]>;
    /** Presence-only modifiers — rendered `data-mod-<name>`. */
    mods: string[];
}

interface DesignSystemManifest {
    themes: { name: string; colorScheme: string }[];
    components: Record<string, WiredAxes>;
}

/**
 * The part a recipe's variant selectors are anchored on — `root`, else the
 * first declared part. Mirrors `carrierPart` in `@sigx/zero-kit`; the compiler
 * emits `[data-part="<carrier>"][data-variant="x"]` for the carrier itself and
 * `[data-part="<carrier>"][data-variant="x"] [data-part="<other>"]` for
 * everything below it, so the carrier is the only part a ONE-ELEMENT probe can
 * put an axis attribute on. `axis coverage` below is the guard that says so.
 */
const carrierPart = (component: ManifestComponent): string =>
    component.parts.find((p) => p.name === 'root')?.name ?? component.parts[0]!.name;

/** Which axes of a scope can carry colour — see `axisCellsFor`. */
function colourBearingAxes(wired: WiredAxes): Record<string, string[]> {
    const fused: Record<string, string[]> = {};
    if (wired.variant?.length) fused.variant = wired.variant;
    // A design system may also declare a custom axis of its own. None of the
    // six does today — carbon's `kind` is the vendor SPELLING of `variant`,
    // restored at the prop boundary by the generated `./components` module and
    // never an attribute — but the manifest has the field, so this reads it.
    for (const [axis, values] of Object.entries(wired.axes ?? {})) {
        if (values.length) fused[axis] = values;
    }
    return fused;
}

/**
 * The axis cells for one design system: every wired value of every
 * colour-bearing axis, crossed with each declared modifier and with the
 * carrier part's own state/flag combos.
 *
 * **Why the gate is `variant`, and not `color`.** In basic/daisyUI/material/
 * brutalist, `variant` and `color` are orthogonal and `color` alone selects
 * role tokens whose pairing `zero-kit`'s token validator already checks. In
 * HeroUI and carbon there IS no colour axis (`roles: {}`) — colour is fused
 * INTO the variant, so `danger`, `danger-soft` and `danger-ghost` are the only
 * place a destructive colour exists at all, and until `data-variant` is set
 * this matrix measures a stylesheet nobody ships. So the scopes that wire a
 * variant are exactly the scopes whose colour the cascade decides rather than
 * the token file, and there `color` joins the product — a raw role token used
 * as INK on a base surface is the daisyUI #210 bug, and it is per-role
 * (`neutral` measured 1.12:1 where `primary` passed).
 *
 * **Why `size` is not in the product.** It moves padding and font-size, and
 * this audit's floors do not vary with type size. It would triple the cell
 * count to re-measure the same colours.
 *
 * **Why modifiers are taken one at a time** rather than as a power set: a
 * modifier is presence-only and the recipes wire each one independently, so
 * the pairs measure nothing the singles do not. The one that matters is
 * HeroUI's `pending`, which is `opacity: 0.7` on the root — a group fade that
 * changes every ratio underneath it.
 *
 * Cost: `button` is the only variant-wiring scope in all six design systems,
 * and its anatomy is one part with three resting flags.
 */
function axisCellsFor(components: Record<string, WiredAxes>): Cell[] {
    const out: Cell[] = [];
    for (const [scope, wired] of Object.entries(components)) {
        const fused = colourBearingAxes(wired);
        if (Object.keys(fused).length === 0) continue;
        if (wired.color?.length) fused.color = wired.color;

        const component = anatomy.components.find((c) => c.scope === scope);
        if (!component) continue;
        const carrier = component.parts.find((p) => p.name === carrierPart(component))!;
        // Guarded by `axis coverage`: a variant-wiring scope whose carrier
        // renders no text needs the indicator matrix's chain, not this probe.
        if (!carrier.tokens?.includes('text')) continue;

        let axisCombos: Record<string, string>[] = [{}];
        for (const [axis, values] of Object.entries(fused)) {
            axisCombos = axisCombos.flatMap((base) => values.map((v) => ({ ...base, [axis]: v })));
        }
        const modSets: string[][] = [[], ...(wired.mods ?? []).map((m) => [m])];

        for (const axes of axisCombos) {
            for (const mods of modSets) {
                for (const combo of combosFor(carrier)) {
                    out.push({
                        scope,
                        part: carrier.name,
                        ...combo,
                        axes,
                        ...(mods.length > 0 ? { mods } : {}),
                    });
                }
            }
        }
    }
    return out;
}

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
/**
 * `only` is the flag the part cannot exist WITHOUT — the indicator's own
 * version of an ancestor's `=state` pin.
 *
 * `Select.Item` and `Combobox.Item` mount the `✓` only while selected, and
 * always with `data-selected=""` on it (`Select.tsx`, `Combobox.tsx`). Without
 * this, `combosFor()`'s bare `{}` cell would measure an unselected item's
 * indicator — a node that is never in the DOM. That is the same fiction
 * `NOT_RENDERED_ON_WEB` exists to keep out, one level down.
 */
interface IndicatorSpec { scope: string; part: string; ancestors: string[]; glyph?: string; only?: string }

const INDICATORS: IndicatorSpec[] = [
    { scope: 'checkbox', part: 'indicator', ancestors: ['root', 'control'] },
    { scope: 'radio-group', part: 'item-indicator', ancestors: ['root', 'item', 'item-control'] },
    { scope: 'switch', part: 'thumb', ancestors: ['root', 'control'] },
    { scope: 'progress', part: 'range', ancestors: ['root', 'track'] },
    { scope: 'select', part: 'indicator', ancestors: ['root', 'trigger'], glyph: '▾' },
    { scope: 'select', part: 'item-indicator', ancestors: ['root', 'popup=open', 'item'], glyph: '✓', only: 'selected' },
    { scope: 'combobox', part: 'item-indicator', ancestors: ['root', 'popup=open', 'item'], glyph: '✓', only: 'selected' },
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
    const part = partOf(spec.scope, spec.part);
    if (spec.only && !part.flags?.includes(spec.only)) {
        throw new Error(`${spec.scope}/${spec.part} has no flag "${spec.only}"`);
    }
    return combosFor(part)
        .filter((combo) => !spec.only || combo.flag === spec.only)
        .map((combo) => ({
            scope: spec.scope, part: spec.part, ...combo, chain, glyph: spec.glyph,
        }));
});

interface Reading {
    key: string;
    color: string;
    bg: string;
    /** What the reader sees — the group fade applied to ink and backdrop alike. */
    ratio: number;
    /** The colour pair the recipe chose, before the group fade. See DISABLED_FLOOR. */
    inGroup: number;
    disabled: boolean;
    /** Painted nowhere in this state (`display: none`, `opacity: 0`, …). */
    unrendered: boolean;
}

interface IndicatorReading {
    key: string;
    scope: string;
    part: string;
    /** Which layer carried the paint: the element's own fill, or a pseudo's. */
    carrier: string;
    ink: string;
    bg: string;
    /** What the reader sees — the group fade applied to mark and backdrop alike. */
    ratio: number;
    /** The mark against what it is drawn on, before the group fade. See DISABLED_FLOOR. */
    inGroup: number;
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

/**
 * The variant surface has to be reachable from the one-element probe the TEXT
 * matrix builds. It is today — `button` is one part, and that part is its own
 * carrier — and this test is what says so when it stops being true: a
 * variant-wiring scope with text below its carrier needs the ancestor chain
 * the INDICATOR matrix builds, not a bare element, and `axisCellsFor` would
 * otherwise skip the new surface in silence.
 */
test('axis coverage: every variant-wiring scope carries its axes on a text-bearing carrier', ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one engine is enough');

    const unreachable: string[] = [];
    for (const ds of DESIGN_SYSTEMS) {
        const manifest: DesignSystemManifest = JSON.parse(read(`packages/zero-${ds}/dist/manifest.json`));
        for (const [scope, wired] of Object.entries(manifest.components)) {
            const fused = Object.keys(colourBearingAxes(wired));
            if (fused.length === 0) continue;
            const component = anatomy.components.find((c) => c.scope === scope);
            if (!component) {
                unreachable.push(`${ds}/${scope} — the anatomy declares no such component`);
                continue;
            }
            const carrier = carrierPart(component);
            const textParts = component.parts.filter((p) => p.tokens?.includes('text')).map((p) => p.name);
            if (!textParts.includes(carrier)) {
                unreachable.push(`${ds}/${scope} — carrier "${carrier}" is not text-bearing (axes: ${fused.join(', ')})`);
            }
            for (const part of textParts) {
                if (part !== carrier) unreachable.push(`${ds}/${scope}/${part} — text below the carrier "${carrier}"`);
            }
        }
    }

    expect(
        unreachable,
        'variant surfaces the one-element probe cannot render — give the scope an ancestor chain like INDICATORS declares, or the axis cells silently measure nothing',
    ).toEqual([]);
});

/**
 * An allowlist entry that matches no cell suppresses nothing and says nothing
 * — it just sits there looking like coverage. A key is `ds/theme/scope/part/
 * state/flag/axes`, seven segments of vocabulary that all move, so a typo or a
 * renamed part is not a hypothetical.
 *
 * This is the half a browser cannot check: whether the STRING names a cell.
 * Whether the cell it names still needs suppressing is checked inside each
 * matrix, against real readings.
 */
test('allowlist coverage: every INTENDED_LOW_CONTRAST entry names a cell some matrix renders', ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'one engine is enough');

    const known = new Set<string>();
    for (const ds of DESIGN_SYSTEMS) {
        const manifest: DesignSystemManifest = JSON.parse(read(`packages/zero-${ds}/dist/manifest.json`));
        const dsCells: Cell[] = [...cells, ...axisCellsFor(manifest.components), ...indicatorCells];
        for (const theme of manifest.themes) {
            for (const cell of dsCells) known.add(cellKey(ds, theme.name, cell));
        }
    }

    expect(
        [...INTENDED_LOW_CONTRAST].filter((key) => !known.has(key)),
        'INTENDED_LOW_CONTRAST entries matching no cell in either matrix — a mistyped or outdated key, which silences nothing',
    ).toEqual([]);
});

for (const ds of DESIGN_SYSTEMS) {
    const dsCss = read(`packages/zero-${ds}/dist/css/index.css`);
    const dsManifest: DesignSystemManifest = JSON.parse(read(`packages/zero-${ds}/dist/manifest.json`));
    const themes = dsManifest.themes;
    // The axis surface is per design system — a shared list cannot express
    // "carbon wires `danger-ghost` and heroui does not".
    const textCells: Cell[] = [...cells, ...axisCellsFor(dsManifest.components)];

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
                const { resolve, blend, contrast, hasInk } = window.zeroColorMath;
                const bodyBg = resolve(getComputedStyle(document.body).backgroundColor, [255, 255, 255]);
                const num = (v: string): number => {
                    const n = parseFloat(v);
                    return Number.isFinite(n) ? n : 1;
                };
                const out: Reading[] = [];

                for (const cell of cells) {
                    const el = document.createElement('div');
                    el.setAttribute('data-scope', cell.scope);
                    el.setAttribute('data-part', cell.part);
                    if (cell.state) el.setAttribute('data-state', cell.state);
                    if (cell.flag) el.setAttribute('data-' + cell.flag, '');
                    // The design system's own axis surface: `data-variant`,
                    // `data-color` and any custom axis are all `data-<axis>`
                    // (VARIANT_AXES in `@sigx/zero-kit`), modifiers are
                    // presence-only under the `data-mod-` namespace.
                    for (const [axis, value] of Object.entries(cell.axes ?? {})) {
                        el.setAttribute('data-' + axis, value);
                    }
                    for (const mod of cell.mods ?? []) el.setAttribute('data-mod-' + mod, '');
                    el.textContent = 'Sample';
                    document.body.appendChild(el);

                    const cs = getComputedStyle(el);
                    // Effective background: the part's own paint over the app
                    // surface (parts are transparent unless the recipe fills them).
                    const ownBg = cs.backgroundColor;
                    const bg = hasInk(ownBg) ? resolve(ownBg, bodyBg) : bodyBg;
                    // Text renders over that background; semi-transparent ink
                    // (color-mix fades) composites before measuring.
                    const ink = resolve(cs.color, bg);
                    /**
                     * `opacity` makes the element a GROUP: its fill and its
                     * text composite against each other first, and only the
                     * finished group is faded over the page. So the fade is
                     * applied once, to ink and backdrop alike — the same
                     * accounting the indicator matrix does.
                     *
                     * It is load-bearing rather than pedantic. Every design
                     * system spells `disabled` as an `opacity` between 0.25 and
                     * 0.5, and HeroUI's `pending` modifier is `opacity: 0.7`;
                     * measured without this, those cells report the ratio of a
                     * state nobody is looking at.
                     */
                    const opacity = num(cs.opacity);
                    const seenInk = blend(ink, bodyBg, opacity);
                    const seenBg = blend(bg, bodyBg, opacity);
                    out.push({
                        key: cell.key,
                        color: cs.color,
                        bg: hasInk(ownBg) ? ownBg : 'inherit(base-100)',
                        ratio: Math.round(contrast(seenInk, seenBg) * 100) / 100,
                        inGroup: Math.round(contrast(ink, bg) * 100) / 100,
                        disabled: cell.flag === 'disabled',
                        // Nothing painted is nothing to read — the text
                        // matrix's counterpart to the indicator matrix's
                        // `unpainted`, and the honest reading for a part a
                        // recipe hides in this state.
                        unrendered: cs.display === 'none' || cs.visibility === 'hidden' || opacity <= 0,
                    });
                    el.remove();
                }
                return out;
            }, { cells: textCells.map((c) => ({ ...c, key: cellKey(ds, theme.name, c) })) });

            const visible = readings.filter((r) => !r.unrendered && !INTENDED_LOW_CONTRAST.has(r.key));
            for (const r of readings.filter((r) => r.unrendered)) {
                testInfo.annotations.push({ type: 'contrast-unrendered', description: `${r.key} — not painted in this state` });
            }
            // Every suppressed cell puts its live ratio on the record, so the
            // debt is countable from a green run rather than only from the red
            // one that preceded it.
            for (const s of readings.filter((r) => INTENDED_LOW_CONTRAST.has(r.key) && !r.unrendered)) {
                testInfo.annotations.push({
                    type: 'contrast-suppressed',
                    description: `${s.key} → ${s.ratio}:1 (${s.color} on ${s.bg}) — held out by INTENDED_LOW_CONTRAST`,
                });
            }

            const failures = visible.filter((r) => !r.disabled && r.ratio < FLOOR);
            const warnings = visible.filter((r) => !r.disabled && r.ratio >= FLOOR && r.ratio < AA);
            // `disabled` answers to its own floor rather than to none — see
            // DISABLED_FLOOR.
            const disabled = visible.filter((r) => r.disabled);
            const dimmedOut = disabled.filter((r) => r.inGroup < DISABLED_FLOOR);

            for (const w of warnings) {
                testInfo.annotations.push({ type: 'contrast-warning', description: `${w.key} → ${w.ratio}:1 (${w.color} on ${w.bg})` });
            }
            // The band just above the disabled floor, annotated the same way
            // the 3–4.5 band is: the pair is on the record with the faded ratio
            // beside it, which is what makes `--disabled-opacity` arguable
            // rather than invisible. Above 3:1 there is nothing to say — the
            // fade is a pure function of one token and carries no information.
            for (const d of disabled.filter((r) => r.inGroup < FLOOR)) {
                testInfo.annotations.push({
                    type: 'disabled-contrast',
                    description: `${d.key} → ${d.inGroup}:1 before the state's fade, ${d.ratio}:1 as seen (${d.color} on ${d.bg})`,
                });
            }

            // Soft, so one run reports every finding in both buckets rather
            // than stopping at the first — a gate whose output is a work list.
            expect.soft(
                failures.map((f) => `${f.key} → ${f.ratio}:1 (${f.color} on ${f.bg})`),
                `state combinations below ${FLOOR}:1 — a state that changes background must bring a readable color with it`,
            ).toEqual([]);
            expect.soft(
                dimmedOut.map((f) => `${f.key} → ${f.inGroup}:1 (${f.color} on ${f.bg})`),
                `disabled colour pairs below ${DISABLED_FLOOR}:1 before the state's own fade — dimming is the state, choosing ink nobody could have read is not`,
            ).toEqual([]);
            expect.soft(staleEntries(readings, (r) => !r.unrendered), STALE_MESSAGE).toEqual([]);
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
                 * A `clip-path` that encloses no area — the mark is clipped
                 * away, whatever it is painted in.
                 *
                 * This is how five of the six design systems now draw a partial
                 * fill (#232), so reading it is load-bearing rather than
                 * defensive: basic collapses its rating fill to a DEGENERATE
                 * POLYGON (every point on one edge), brutalist to
                 * `inset(0 100% 0 0)`. Measured without this, the `empty` star
                 * reports the full-strength ink it clips entirely away, and a
                 * blank cell reads as a passing mark.
                 *
                 * Percentages only: the shipped clips are all percentage-based,
                 * and a `px` inset would need the box it is relative to. A
                 * length reads as 0 rather than as "unknown", which can only
                 * ever under-report a collapse — never invent one.
                 */
                const clipCollapsed = (clip: string): boolean => {
                    if (!clip || clip === 'none') return false;
                    if (/^(?:circle|ellipse)\(\s*0(?:px|%)?[\s)]/.test(clip)) return true;
                    const inset = /^inset\(([^)]*)\)/.exec(clip);
                    if (inset) {
                        // The optional `round <radius>` tail changes corners, not extent.
                        const sides = inset[1].split(/\s+round\s+/)[0].trim().split(/\s+/)
                            .map((v) => (v.endsWith('%') ? parseFloat(v) : 0));
                        const [t = 0, r = t, b = t, l = r] = sides;
                        if (t + b >= 100 || l + r >= 100) return true;
                    }
                    const poly = /^polygon\(([^)]*)\)/.exec(clip);
                    if (poly) {
                        // A leading fill-rule is legal and says nothing about extent.
                        const points = poly[1].replace(/^\s*(?:nonzero|evenodd)\s*,/, '')
                            .split(',').map((p) => p.trim().split(/\s+/).map(parseFloat));
                        if (points.length >= 3 && points.every((p) => p.length === 2 && p.every(Number.isFinite))) {
                            // Shoelace: zero area means every point is collinear,
                            // which is exactly how a "no fill" star is authored.
                            let area = 0;
                            for (let i = 0; i < points.length; i++) {
                                const [x1, y1] = points[i];
                                const [x2, y2] = points[(i + 1) % points.length];
                                area += x1 * y2 - x2 * y1;
                            }
                            if (Math.abs(area) / 2 < 0.5) return true;
                        }
                    }
                    return false;
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
                 *   right (HeroUI drives `translate`/`rotate`/`scale` directly,
                 *   and carbon wipes its rating fill with `scale: 0 1`);
                 * - `clip-path`, per `clipCollapsed` above.
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
                    return clipCollapsed(cs.getPropertyValue('clip-path'));
                };
                /** Rendered at all — before asking what colour it is. */
                const rendered = (cs: CSSStyleDeclaration): boolean =>
                    cs.display !== 'none' && cs.visibility !== 'hidden' && num(cs.opacity) > 0
                    && !collapsed(cs);

                /**
                 * The ink a glyph actually prints in.
                 *
                 * `-webkit-text-fill-color` WINS over `color` where both are
                 * set, and Material's half-star sets exactly that pair: the
                 * fill colour transparent, the glyph painted by a hard-stop
                 * gradient clipped to the text. Reading `color` alone would
                 * report a transparent glyph — which is why this returns the
                 * fill colour, and why `imageInks` below exists.
                 */
                const glyphInk = (s: CSSStyleDeclaration): string =>
                    s.getPropertyValue('-webkit-text-fill-color') || s.color;

                /**
                 * The colours a `background-image` paints with, in source order.
                 *
                 * Only consulted for a background CLIPPED TO TEXT, where the
                 * image is the glyph's only ink. A gradient painting a BOX is
                 * deliberately not measured: its extent is a `background-size`
                 * this audit cannot reason about, so counting it would let a
                 * zero-width fill layer (HeroUI's rating star) report as paint.
                 *
                 * Computed values have already resolved `var()` and
                 * `color-mix()`, so the stops are concrete colour functions.
                 */
                const imageInks = (image: string): string[] => (image === 'none' ? [] : (
                    image.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)|#[0-9a-f]{3,8}\b/gi) ?? []
                ));

                /** A background painted INSIDE the glyph rather than behind it. */
                const clipsText = (s: CSSStyleDeclaration): boolean =>
                    s.getPropertyValue('background-clip') === 'text'
                    || s.getPropertyValue('-webkit-background-clip') === 'text';

                /**
                 * The mark's own stroke, if it has one — the widest edge that
                 * paints.
                 *
                 * Counted as a carrier because since #232 the stroke IS the
                 * shape for two of the six: carbon's empty rating box is a 2px
                 * `border-strong` frame around nothing, and brutalist's rating
                 * cell is an `inked` frame whose FILL is deliberately the page's
                 * own paper. Measuring fill alone reports the first as unpainted
                 * and the second as 1:1 — both wrong about a mark the reader can
                 * plainly see. `box-shadow` still does not count (see the file
                 * header): a border survives `forced-colors`, a shadow does not.
                 */
                const borderInk = (s: CSSStyleDeclaration): string | undefined => {
                    let widest = 0;
                    let ink: string | undefined;
                    for (const side of ['top', 'right', 'bottom', 'left']) {
                        const style = s.getPropertyValue(`border-${side}-style`);
                        if (style === 'none' || style === 'hidden') continue;
                        const width = parseFloat(s.getPropertyValue(`border-${side}-width`));
                        const color = s.getPropertyValue(`border-${side}-color`);
                        if (!(width > 0) || !hasInk(color) || width <= widest) continue;
                        widest = width;
                        ink = color;
                    }
                    return ink;
                };

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
                    /**
                     * The element's own fill becomes the backdrop for anything
                     * it draws on top of itself — and it is needed twice, at two
                     * different points in the compositing order.
                     *
                     * `opacity` makes the element a GROUP: its fill, its glyph
                     * and its pseudos composite against each other first, and
                     * only the finished group is faded. So a mark drawn on the
                     * element meets `localBg`, the fill NOT yet faded; what the
                     * reader compares it against is `ownBg`, the same fill after
                     * the fade. Using the faded one for both would dilute the
                     * mark a second time against a backdrop that is already
                     * diluted — see the ratio computation below, which applies
                     * the group fade exactly once, to mark and backdrop alike.
                     *
                     * The two are equal whenever the group is opaque, which is
                     * every cell this audit ASSERTS: only `disabled` fades a
                     * chain, and disabled cells are measured and reported, never
                     * asserted.
                     *
                     * `background-clip: text` is excluded because such a fill
                     * paints inside the glyph, not behind it — it is not a
                     * backdrop for anything.
                     */
                    const localBg = hasInk(cs.backgroundColor) && !clipsText(cs)
                        ? resolve(cs.backgroundColor, bg)
                        : bg;
                    const ownBg = blend(localBg, bg, selfOpacity);

                    /**
                     * Every layer that could carry the mark. A shape is a
                     * `background-color` (clip-path or border-radius only change
                     * its outline, not what is measured) or a `border-color`; a
                     * tick drawn as a glyph — by the recipe via `content`, or by
                     * zero as default children — is a `color`.
                     *
                     * `alpha` is the layer's OWN transparency — a pseudo at
                     * `opacity: 0.55` really is 45% backdrop — and it is applied
                     * inside the group, against `inside`. The group's own
                     * `opacity` is applied afterwards, once, by the ratio
                     * computation. `over` is what the reader sees beside the
                     * mark and is what the ratio is against.
                     *
                     * A glyph is only a carrier when it can print: a design
                     * system that draws its own geometry retires zero's fallback
                     * symbol with `font-size: 0` (basic, brutalist, carbon) or a
                     * transparent fill colour (HeroUI, and Material's half), and
                     * counting a symbol that prints nothing would read as a
                     * 1:1 failure on the very cells the geometry got right.
                     */
                    const carriers: { carrier: string; ink: string; alpha: number; inside: RGB; over: RGB }[] = [];
                    const prints = (s: CSSStyleDeclaration): boolean => parseFloat(s.fontSize) > 0;
                    if (rendered(cs)) {
                        // The element's own fill and stroke are drawn ON the
                        // ancestor backdrop, so that is both what they composite
                        // against and what they are read against.
                        if (hasInk(cs.backgroundColor) && !clipsText(cs)) {
                            carriers.push({ carrier: 'background', ink: cs.backgroundColor, alpha: 1, inside: bg, over: bg });
                        }
                        const stroke = borderInk(cs);
                        if (stroke) carriers.push({ carrier: 'border', ink: stroke, alpha: 1, inside: bg, over: bg });
                        if (el.textContent && prints(cs)) {
                            const ink = glyphInk(cs);
                            if (hasInk(ink)) {
                                carriers.push({ carrier: 'color', ink, alpha: 1, inside: localBg, over: ownBg });
                            } else if (clipsText(cs)) {
                                for (const stop of imageInks(cs.backgroundImage)) {
                                    if (hasInk(stop)) carriers.push({ carrier: 'color(clipped)', ink: stop, alpha: 1, inside: localBg, over: ownBg });
                                }
                            }
                        }
                        for (const pseudo of ['::before', '::after']) {
                            const ps = getComputedStyle(el, pseudo);
                            if (ps.content === 'none' || !rendered(ps)) continue;
                            const alpha = num(ps.opacity);
                            if (hasInk(ps.backgroundColor)) {
                                carriers.push({ carrier: `background${pseudo}`, ink: ps.backgroundColor, alpha, inside: localBg, over: ownBg });
                            }
                            const pseudoStroke = borderInk(ps);
                            if (pseudoStroke) {
                                carriers.push({ carrier: `border${pseudo}`, ink: pseudoStroke, alpha, inside: localBg, over: ownBg });
                            }
                            // A quoted, non-empty `content` is a drawn glyph;
                            // `content: ""` is a box, and has no `color` to read.
                            if (/^(["'])(?:.|\n)+\1$/.test(ps.content) && prints(ps) && hasInk(glyphInk(ps))) {
                                carriers.push({ carrier: `color${pseudo}`, ink: glyphInk(ps), alpha, inside: localBg, over: ownBg });
                            }
                        }
                    }

                    const measured = carriers
                        .filter((c) => c.alpha * selfOpacity > 0)
                        .map((c) => {
                            // Inside the group: the layer over what it is drawn
                            // on, at its own transparency (`resolve` composites
                            // the ink's own alpha channel; `blend` the layer's).
                            const inGroup = blend(resolve(c.ink, c.inside), c.inside, c.alpha);
                            // Then the group is faded, once — and `over` was
                            // faded by the same factor, so both sides of the
                            // comparison lose the same light.
                            return {
                                ...c,
                                ratio: contrast(blend(inGroup, bg, selfOpacity), c.over),
                                // The mark against what it is drawn on, before
                                // the group fade — the recipe's own choice, and
                                // what `DISABLED_FLOOR` answers to.
                                inGroup: contrast(inGroup, c.inside),
                            };
                        })
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
                        inGroup: best ? Math.round(best.inGroup * 100) / 100 : 0,
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

            // Same record the text matrix keeps, in the indicator's vocabulary.
            for (const s of painted.filter((r) => INTENDED_LOW_CONTRAST.has(r.key))) {
                testInfo.annotations.push({
                    type: 'indicator-contrast-suppressed',
                    description: `${s.key} → ${s.ratio}:1 (${s.carrier} ${s.ink} on ${s.bg}) — held out by INTENDED_LOW_CONTRAST`,
                });
            }

            const measurable = painted.filter((r) => !INTENDED_LOW_CONTRAST.has(r.key));
            const failures = measurable.filter((r) => !r.disabled && r.ratio < FLOOR);
            const warnings = measurable.filter((r) => !r.disabled && r.ratio >= FLOOR && r.ratio < AA);
            // The same lower floor the text matrix gives `disabled` — a
            // disabled tick recedes with its control, but a tick nobody can
            // find is not a state, it is a missing mark.
            const disabled = measurable.filter((r) => r.disabled);
            const dimmedOut = disabled.filter((r) => r.inGroup < DISABLED_FLOOR);

            for (const w of warnings) {
                testInfo.annotations.push({ type: 'indicator-contrast-warning', description: `${w.key} → ${w.ratio}:1 (${w.carrier} ${w.ink} on ${w.bg})` });
            }
            // Same band, same reasoning as the text matrix's.
            for (const d of disabled.filter((r) => r.inGroup < FLOOR)) {
                testInfo.annotations.push({
                    type: 'indicator-disabled-contrast',
                    description: `${d.key} → ${d.inGroup}:1 before the state's fade, ${d.ratio}:1 as seen (${d.carrier} ${d.ink} on ${d.bg})`,
                });
            }

            expect.soft(
                failures.map((f) => `${f.key} → ${f.ratio}:1 (${f.carrier} ${f.ink} on ${f.bg})`),
                `indicator paint below ${FLOOR}:1 — a mark that is painted has to be visible against what it is painted on`,
            ).toEqual([]);
            expect.soft(
                dimmedOut.map((f) => `${f.key} → ${f.inGroup}:1 (${f.carrier} ${f.ink} on ${f.bg})`),
                `disabled indicator paint below ${DISABLED_FLOOR}:1 before the state's own fade — dimming is the state, drawing a mark nobody could have found is not`,
            ).toEqual([]);
            expect.soft(staleEntries(readings, (r) => !r.unpainted), STALE_MESSAGE).toEqual([]);
        });
    }
}
