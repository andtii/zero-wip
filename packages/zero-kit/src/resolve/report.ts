/**
 * The coverage report — what a design system *covers*, as opposed to what is
 * wrong with it (RFC 0003 §7.4, RFC 0002 §8).
 *
 * `validateDesignSystem` answers "is this correct". It returns a flat list of
 * issues, which is what an author needs while fixing one. It never answers "how
 * much of the contract did I actually skin", which is what a reviewer — human
 * or otherwise — needs when looking at a generated design system for the first
 * time. This module answers that, in a shape a tool can read: Tier-3 rows of
 * the conformance matrix are generated from it, so they cannot go stale by hand.
 *
 * Target-neutral by construction. Everything here reads the compiled design
 * system, the authoring input and the anatomy manifest; nothing reads emitted
 * CSS, and nothing is web-specific.
 *
 * Two properties are load-bearing and deliberately not re-derived:
 *
 * - **The `never` set matches the register artifact.** `undeclaredAxes` and the
 *   empty-harvest test both live in `design-system.ts`, and `compileRegisterDts`
 *   reads the same two. A component's `never` here is exactly the set of axes
 *   typed `never` there — the gate #173 puts on this report.
 * - **Divergence keeps the colour rule's semantics** (`validate-recipes.ts`):
 *   compared against the union wired ANYWHERE rather than against the declared
 *   vocabulary, so a value held back everywhere on purpose says nothing while a
 *   component lagging behind its siblings does.
 */
import { parse, wcagContrast } from 'culori';
import type { ManifestComponent, ManifestPart, ZeroManifest } from '../contract.js';
import { contrastPairs } from '../contract.js';
import type { CompiledDesignSystem, DesignSystemInput } from '../design-system.js';
import { undeclaredAxes } from '../design-system.js';
import type { PartStyles, RecipeInput } from '../recipes.js';
import type { ValidationResult } from './validate.js';

/** The contract axes, in the order the register artifact emits them. */
const CONTRACT_AXES = ['color', 'size', 'variant'] as const;
type ContractAxis = (typeof CONTRACT_AXES)[number];

export const REPORT_SCHEMA_URL = 'https://signalxjs.github.io/zero/schemas/report.schema.json';

/**
 * Whether an axis is wired, left unwired, or declared out of existence.
 *
 * `undeclared` is reachable only for `color` and `size` — see `undeclaredAxes`.
 * Both non-`wired` states produce `never` in the register artifact; they differ
 * only in what an author should do about it, which is why the report keeps them
 * apart rather than collapsing to a boolean.
 */
export type AxisStatus = 'wired' | 'unwired' | 'undeclared';

export interface AxisReport {
    /** The values this component's recipe wires, sorted. */
    wired: string[];
    status: AxisStatus;
}

/**
 * How one part's declared vocabulary is covered.
 *
 * `coveredIndirectly` is the honest middle: a state styled only inside an `at`
 * condition, a variant block, a compound or a modifier IS styled, but not
 * unconditionally — and the validator's coverage warning deliberately only
 * looks at `parts.<part>.states`. Splitting the two lets the report be more
 * thorough than that warning without contradicting it.
 */
export interface CoverageSplit {
    covered: string[];
    coveredIndirectly: string[];
    /** Listed in the recipe's `skipStates` — deliberately delegated elsewhere. */
    skipped: string[];
    uncovered: string[];
}

export interface PartReport {
    /** Whether the recipe has a block for this part at all. */
    styled: boolean;
    /** Coverage of `ManifestPart.states` — the closed `data-state` vocabulary. */
    states: CoverageSplit;
    /** Coverage of `ManifestPart.flags` — the presence-only flags. */
    flags: CoverageSplit;
}

export interface StyledComponentReport {
    styled: true;
    axes: Record<ContractAxis, AxisReport>;
    /** Custom axes (`tokens.axes`) this recipe wires: name → sorted values. */
    customAxes: Record<string, string[]>;
    /** Presence-only modifiers this recipe wires, sorted. */
    mods: string[];
    /** The recipe's `defaultVariants`, when it has any. */
    defaults?: Record<string, string>;
    /**
     * The contract axes typed `never` by this design system's register
     * artifact, sorted. Present only on styled components — `compileRegisterDts`
     * emits no entry at all for a scope with no recipe.
     */
    never: string[];
    parts: Record<string, PartReport>;
}

export interface UnstyledComponentReport {
    styled: false;
    /** Always empty: with no recipe there is nothing to cover, part by part. */
    parts: Record<string, never>;
}

export type ComponentReport = StyledComponentReport | UnstyledComponentReport;

export interface AxisDivergence {
    /** Every value any component wires for this axis, sorted. */
    wiredAnywhere: string[];
    /** scope → its sorted value set. Only components wiring at least one value. */
    byComponent: Record<string, string[]>;
    /**
     * Components wiring a STRICT subset of `wiredAnywhere` — the divergence
     * the report exists to surface. A component wiring nothing is not listed:
     * that is not divergence, and it is already visible as `never`.
     */
    subsets: Array<{ scope: string; wired: string[]; missing: string[] }>;
}

export interface ThemeContrastReport {
    name: string;
    colorScheme: 'light' | 'dark';
    pair?: string;
    /**
     * The smallest WCAG ratio across every declared role pair, rounded to two
     * decimals — the margin the theme has left. `null` when no pair could be
     * measured (a theme missing or mis-spelling its colour tokens, which the
     * validator reports as errors of its own).
     */
    minContrast: number | null;
    worstPair: [string, string] | null;
    /** Pairs below the 3:1 hard floor, and below the 4.5:1 AA text threshold. */
    belowMin: number;
    belowAA: number;
    pairs: Array<{ bg: string; fg: string; ratio: number }>;
}

export interface DesignSystemReport {
    $schema: string;
    reportVersion: 1;
    name: string;
    coverage: {
        componentsStyled: number;
        componentsTotal: number;
        /** Manifest scopes with no recipe — they render unstyled. Sorted. */
        unstyled: string[];
    };
    vocabulary: {
        roles: string[];
        sizes: string[];
        variants: string[];
        axes: Record<string, string[]>;
        modifiers: string[];
        /** Axes declared OUT of existence (`roles: {}`, `sizes: []`), sorted. */
        declaredOut: string[];
    };
    /**
     * Declared, but wired by no recipe anywhere — the attribute renders and
     * matches nothing. The validator warns for `variant`, custom axes and
     * modifiers; `color` and `size` have no such check, so for those this is
     * the only place the gap surfaces.
     */
    unwired: {
        color: string[];
        size: string[];
        variant: string[];
        axes: Record<string, string[]>;
        modifiers: string[];
    };
    components: Record<string, ComponentReport>;
    /** Axis name → its per-component partition. `mods` is included as an axis. */
    divergence: Record<string, AxisDivergence>;
    themes: ThemeContrastReport[];
    issues?: { errors: number; warnings: number };
}

const sorted = (values: Iterable<string>): string[] => [...new Set(values)].sort();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whether a raw selector key styles the state whose manifest fragment this is.
 *
 * Every shipped design system reaches `pressed` as
 * `'&[data-pressed]:not([data-disabled])'` rather than through `states`, so a
 * report that only read `states` would tell an author to style something they
 * already styled. Occurrences inside `:not()` are stripped first — that
 * selector styles the ABSENCE of `disabled`, and counting it as coverage is the
 * same mistake pointed the other way. Structural, matching the press-animating
 * check in `validate-recipes.ts`, rather than a substring test.
 */
function gatesOn(selector: string, fragment: string): boolean {
    const negated = new RegExp(`:not\\(\\s*${escapeRegExp(fragment)}\\s*\\)`, 'g');
    return selector.replace(negated, '').includes(fragment);
}

/** What one part's styles cover, split by whether an attribute has to match first. */
interface PartScan {
    /** State/flag names keyed in `states`. */
    states: Set<string>;
    /** Raw `selectors` keys, tested against the manifest's selector fragments. */
    selectors: string[];
}

const emptyScan = (): PartScan => ({ states: new Set(), selectors: [] });

/** Fold a block and everything below it into one sink. */
function scanInto(styles: PartStyles | undefined, into: PartScan): void {
    if (!styles) return;
    for (const state of Object.keys(styles.states ?? {})) into.states.add(state);
    into.selectors.push(...Object.keys(styles.selectors ?? {}));
    for (const nested of Object.values(styles.at ?? {})) scanInto(nested, into);
}

/**
 * A top-level `parts.<part>` block: its own declarations are unconditional,
 * while anything under an `at` condition is conditional however deep it sits.
 */
function scanPart(styles: PartStyles | undefined, direct: PartScan, conditional: PartScan): void {
    if (!styles) return;
    for (const state of Object.keys(styles.states ?? {})) direct.states.add(state);
    direct.selectors.push(...Object.keys(styles.selectors ?? {}));
    for (const nested of Object.values(styles.at ?? {})) scanInto(nested, conditional);
}

/**
 * Per part: what is styled unconditionally on `parts.<part>`, and what is only
 * reachable through a condition, a variant, a compound or a modifier.
 *
 * `validate-recipes.ts` has a `declarations()` walker, but it yields flattened
 * path strings for the token/colour checks — the wrong shape to key by part.
 */
function scanByPart(recipe: RecipeInput): Map<string, { direct: PartScan; indirect: PartScan }> {
    const byPart = new Map<string, { direct: PartScan; indirect: PartScan }>();
    const entry = (part: string) => {
        let found = byPart.get(part);
        if (!found) byPart.set(part, (found = { direct: emptyScan(), indirect: emptyScan() }));
        return found;
    };

    for (const [part, styles] of Object.entries(recipe.parts)) {
        const found = entry(part);
        scanPart(styles, found.direct, found.indirect);
    }

    // Everything below styles the part only when an axis or modifier attribute
    // matches, so it covers the state conditionally however it is spelled.
    const indirectBlock = (parts: Record<string, PartStyles>): void => {
        for (const [part, styles] of Object.entries(parts)) scanInto(styles, entry(part).indirect);
    };
    for (const values of Object.values(recipe.variants ?? {})) {
        for (const parts of Object.values(values)) indirectBlock(parts);
    }
    for (const parts of Object.values(recipe.modifiers ?? {})) indirectBlock(parts);
    for (const compound of recipe.compoundVariants ?? []) indirectBlock(compound.parts);

    return byPart;
}

function splitCoverage(
    vocabulary: readonly string[],
    fragments: Record<string, string>,
    scan: { direct: PartScan; indirect: PartScan } | undefined,
    skipped: ReadonlySet<string>,
): CoverageSplit {
    const split: CoverageSplit = { covered: [], coveredIndirectly: [], skipped: [], uncovered: [] };
    const hits = (side: PartScan | undefined, name: string): boolean => {
        if (!side) return false;
        if (side.states.has(name)) return true;
        const fragment = fragments[name];
        return fragment !== undefined && side.selectors.some((sel) => gatesOn(sel, fragment));
    };
    for (const name of vocabulary) {
        // Styled beats skipped: `skipStates` states an intent, but a rule that
        // exists is coverage whatever the recipe also claims about it.
        if (hits(scan?.direct, name)) split.covered.push(name);
        else if (hits(scan?.indirect, name)) split.coveredIndirectly.push(name);
        else if (skipped.has(name)) split.skipped.push(name);
        else split.uncovered.push(name);
    }
    for (const list of Object.values(split)) list.sort();
    return split;
}

function partReport(
    part: ManifestPart,
    byPart: Map<string, { direct: PartScan; indirect: PartScan }>,
    recipe: RecipeInput,
): PartReport {
    const scan = byPart.get(part.name);
    const skipped = new Set(recipe.skipStates?.[part.name] ?? []);
    return {
        styled: Boolean(recipe.parts[part.name]),
        states: splitCoverage(part.states ?? [], part.selectors, scan, skipped),
        flags: splitCoverage(part.flags ?? [], part.selectors, scan, skipped),
    };
}

/**
 * The per-axis partition promised by RFC 0003 §4 — the cheap half of
 * per-component vocabularies, generalised from the colour-only warning.
 */
function divergence(compiled: CompiledDesignSystem): Record<string, AxisDivergence> {
    const byAxis = new Map<string, Map<string, string[]>>();
    const record = (axis: string, scope: string, values: readonly string[]): void => {
        if (values.length === 0) return; // wiring nothing is `never`, not divergence
        let scopes = byAxis.get(axis);
        if (!scopes) byAxis.set(axis, (scopes = new Map()));
        scopes.set(scope, sorted(values));
    };

    for (const [scope, axes] of Object.entries(compiled.components)) {
        for (const axis of CONTRACT_AXES) record(axis, scope, axes[axis]);
        for (const [axis, values] of Object.entries(axes.axes)) record(axis, scope, values);
        // Modifiers have no value vocabulary — the NAMES are the vocabulary, so
        // the same subset question applies unchanged.
        record('mods', scope, axes.mods);
    }

    const out: Record<string, AxisDivergence> = {};
    for (const axis of [...byAxis.keys()].sort()) {
        const scopes = byAxis.get(axis)!;
        const wiredAnywhere = sorted([...scopes.values()].flat());
        const subsets: AxisDivergence['subsets'] = [];
        const byComponent: Record<string, string[]> = {};
        for (const scope of [...scopes.keys()].sort()) {
            const wired = scopes.get(scope)!;
            byComponent[scope] = wired;
            const missing = wiredAnywhere.filter((value) => !wired.includes(value));
            if (missing.length > 0) subsets.push({ scope, wired, missing });
        }
        out[axis] = { wiredAnywhere, byComponent, subsets };
    }
    return out;
}

function themeReports(ds: DesignSystemInput, compiled: CompiledDesignSystem): ThemeContrastReport[] {
    const pairs = contrastPairs(compiled.tokens.roles);
    return Object.entries(ds.tokens.themes).map(([name, theme]) => {
        const colors = theme.colors as Record<string, string>;
        const measured: Array<{ bg: string; fg: string; ratio: number }> = [];
        for (const [bg, fg] of pairs) {
            const a = colors[bg];
            const b = colors[fg];
            // Same guard as the validator: an unparseable or missing token is
            // an error there, and silence here rather than a bogus ratio.
            if (!a || !b || !parse(a) || !parse(b)) continue;
            // Rounded: this lands in a committed artifact, and raw float tails
            // would make every report a diff against itself across platforms.
            measured.push({ bg, fg, ratio: Number(wcagContrast(a, b).toFixed(2)) });
        }
        const worst = measured.reduce<(typeof measured)[number] | null>(
            (min, pair) => (min === null || pair.ratio < min.ratio ? pair : min),
            null,
        );
        return {
            name,
            colorScheme: theme.colorScheme,
            ...(theme.pair ? { pair: theme.pair } : {}),
            minContrast: worst ? worst.ratio : null,
            worstPair: worst ? [worst.bg, worst.fg] : null,
            belowMin: measured.filter((p) => p.ratio < 3).length,
            belowAA: measured.filter((p) => p.ratio < 4.5).length,
            pairs: measured,
        };
    });
}

/**
 * Declared values no recipe anywhere wires.
 *
 * The validator already warns for `variant`, `tokens.axes` and `modifiers`.
 * `color` and `size` have no such check — material declares thirteen roles and
 * wires nine — so for those two this is the only place the gap is stated.
 */
function unwired(compiled: CompiledDesignSystem): DesignSystemReport['unwired'] {
    const entries = Object.values(compiled.components);
    const wiredIn = (pick: (axes: (typeof entries)[number]) => readonly string[]): Set<string> =>
        new Set(entries.flatMap((axes) => [...pick(axes)]));

    const color = wiredIn((a) => a.color);
    const size = wiredIn((a) => a.size);
    const variant = wiredIn((a) => a.variant);
    const mods = wiredIn((a) => a.mods);

    return {
        color: Object.keys(compiled.tokens.roles).filter((role) => !color.has(role)).sort(),
        size: compiled.tokens.sizes.filter((value) => !size.has(value)).sort(),
        variant: compiled.tokens.variants.filter((value) => !variant.has(value)).sort(),
        axes: Object.fromEntries(
            Object.entries(compiled.tokens.axes).map(([axis, values]) => {
                const declared = wiredIn((a) => a.axes[axis] ?? []);
                return [axis, values.filter((value) => !declared.has(value)).sort()];
            }),
        ),
        modifiers: compiled.tokens.modifiers.filter((name) => !mods.has(name)).sort(),
    };
}

/**
 * Build the coverage report for one design system.
 *
 * `manifest` is `Pick<…, 'components'>` to match `compileDesignSystem`: each
 * design-system `build.mjs` assembles a manifest from `@sigx/zero/anatomy` with
 * no `zeroVersion`, so nothing here may depend on the rest of it.
 *
 * `result` is optional and only fills the issue counts — the report is about
 * coverage, and stands on its own without a validation pass.
 */
export function buildReport(
    compiled: CompiledDesignSystem,
    ds: DesignSystemInput,
    manifest: Pick<ZeroManifest, 'components'>,
    result?: ValidationResult,
): DesignSystemReport {
    const undeclared = undeclaredAxes(compiled);
    const recipesByScope = new Map<string, RecipeInput>(ds.recipes.map((r) => [r.component, r]));
    const byScope = new Map<string, ManifestComponent>(manifest.components.map((c) => [c.scope, c]));

    const components: Record<string, ComponentReport> = {};
    const unstyled: string[] = [];
    for (const scope of [...byScope.keys()].sort()) {
        const axes = compiled.components[scope];
        const recipe = recipesByScope.get(scope);
        if (!axes || !recipe) {
            unstyled.push(scope);
            components[scope] = { styled: false, parts: {} };
            continue;
        }
        const byPart = scanByPart(recipe);
        const parts: Record<string, PartReport> = {};
        for (const part of byScope.get(scope)!.parts) {
            parts[part.name] = partReport(part, byPart, recipe);
        }
        const axisReports = {} as Record<ContractAxis, AxisReport>;
        for (const axis of CONTRACT_AXES) {
            axisReports[axis] = {
                wired: sorted(axes[axis]),
                status: axes[axis].length > 0 ? 'wired' : undeclared.has(axis) ? 'undeclared' : 'unwired',
            };
        }
        components[scope] = {
            styled: true,
            axes: axisReports,
            customAxes: Object.fromEntries(
                Object.entries(axes.axes)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([axis, values]) => [axis, sorted(values)]),
            ),
            mods: sorted(axes.mods),
            ...(axes.defaults ? { defaults: { ...axes.defaults } } : {}),
            never: CONTRACT_AXES.filter((axis) => axisReports[axis].status !== 'wired'),
            parts,
        };
    }

    return {
        $schema: REPORT_SCHEMA_URL,
        reportVersion: 1,
        name: compiled.name,
        coverage: {
            componentsStyled: Object.keys(compiled.components).length,
            componentsTotal: manifest.components.length,
            unstyled,
        },
        vocabulary: {
            // Declared vocabularies keep DECLARATION order — `xs`…`xl` is a
            // ramp, and sorting it would say something the design system
            // didn't. Harvested sets are sorted everywhere else, since there
            // the order is an artifact of recipe authoring rather than intent.
            roles: Object.keys(compiled.tokens.roles).sort(),
            sizes: [...compiled.tokens.sizes],
            variants: [...compiled.tokens.variants],
            axes: Object.fromEntries(
                Object.entries(compiled.tokens.axes)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([axis, values]) => [axis, [...values]]),
            ),
            modifiers: [...compiled.tokens.modifiers].sort(),
            declaredOut: [...undeclared].sort(),
        },
        unwired: unwired(compiled),
        components,
        divergence: divergence(compiled),
        themes: themeReports(ds, compiled),
        ...(result ? { issues: { errors: result.errors.length, warnings: result.warnings.length } } : {}),
    };
}

/** `n/total (pct%)`, the one number a reviewer reads first. */
const ratio = (n: number, total: number): string =>
    `${n}/${total} (${total === 0 ? 0 : Math.round((n / total) * 100)}%)`;

/**
 * The human-readable convenience view. The JSON is the deliverable — §7.4
 * consumes it — so this stays a summary and never tries to be lossless.
 *
 * Returned as lines rather than printed: the CLI logger prefixes every line
 * with `[sigx] `, and the caller decides where they go.
 */
export function formatReport(report: DesignSystemReport): string[] {
    const lines: string[] = [`${report.name} — coverage report`];

    lines.push(`  components styled: ${ratio(report.coverage.componentsStyled, report.coverage.componentsTotal)}`);
    if (report.coverage.unstyled.length > 0) {
        lines.push(`    unstyled: ${report.coverage.unstyled.join(', ')}`);
    }

    if (report.vocabulary.declaredOut.length > 0) {
        lines.push(`  declared out of existence: ${report.vocabulary.declaredOut.join(', ')}`);
    }

    // Per-axis wiring, counted over the components that HAVE a recipe — an
    // unstyled component wires nothing by definition and would drown the signal.
    const styledScopes = Object.entries(report.components).flatMap(([scope, c]) => (c.styled ? [[scope, c] as const] : []));
    for (const axis of CONTRACT_AXES) {
        const wired = styledScopes.filter(([, c]) => c.axes[axis].status === 'wired');
        const status = styledScopes.length > 0 && wired.length === 0
            ? report.vocabulary.declaredOut.includes(axis) ? ' — no such axis' : ' — wired by nothing'
            : '';
        lines.push(`  ${axis} wired: ${ratio(wired.length, styledScopes.length)}${status}`);
    }

    for (const [axis, values] of Object.entries(report.unwired.axes)) {
        if (values.length > 0) lines.push(`  axes.${axis} declared but unwired: ${values.join(', ')}`);
    }
    for (const axis of ['color', 'size', 'variant', 'modifiers'] as const) {
        const values = report.unwired[axis];
        if (values.length > 0) lines.push(`  ${axis} declared but unwired: ${values.join(', ')}`);
    }

    for (const [axis, part] of Object.entries(report.divergence)) {
        if (part.subsets.length === 0) continue;
        lines.push(`  ${axis} diverges across components:`);
        for (const { scope, wired, missing } of part.subsets) {
            lines.push(`    ${scope}: ${wired.length}/${part.wiredAnywhere.length} — missing ${missing.join(', ')}`);
        }
    }

    let covered = 0;
    let indirect = 0;
    let skippedTotal = 0;
    let total = 0;
    for (const [, component] of styledScopes) {
        for (const part of Object.values(component.parts)) {
            for (const split of [part.states, part.flags]) {
                covered += split.covered.length;
                indirect += split.coveredIndirectly.length;
                skippedTotal += split.skipped.length;
                total += split.covered.length + split.coveredIndirectly.length + split.skipped.length + split.uncovered.length;
            }
        }
    }
    lines.push(
        `  states+flags covered: ${ratio(covered + indirect, total)}`
        + ` (${indirect} conditionally, ${skippedTotal} skipped deliberately)`,
    );

    for (const theme of report.themes) {
        const margin = theme.minContrast === null ? 'not measurable' : `${theme.minContrast.toFixed(2)}:1`;
        const flags = [
            theme.belowMin > 0 ? `${theme.belowMin} below 3:1` : '',
            theme.belowAA > 0 ? `${theme.belowAA} below 4.5:1 AA` : '',
        ].filter(Boolean);
        lines.push(
            `  theme ${theme.name}: min contrast ${margin}`
            + (theme.worstPair ? ` (${theme.worstPair[0]} vs ${theme.worstPair[1]})` : '')
            + (flags.length > 0 ? ` — ${flags.join(', ')}` : ''),
        );
    }

    if (report.issues) {
        lines.push(`  validation: ${report.issues.errors} errors, ${report.issues.warnings} warnings`);
    }
    return lines;
}
