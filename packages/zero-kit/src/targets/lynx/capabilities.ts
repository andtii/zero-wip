/**
 * The lynx capability set — the formalization `RUNTIME_PROPERTIES`' doc in
 * `../../contract.ts` promised: what the lynx target translates, drops, or
 * refuses, stated as one table so the emitters consult a decision instead of
 * re-deciding inline.
 *
 * Lynx's style engine (ground truth: the lynx repo's css-engine-probe and
 * `@sigx/lynx-plugin`'s README) supports class, compound and descendant
 * selectors, stylesheet/inline custom properties on a host class,
 * `@keyframes`/`transition`/`@font-face` — and none of the web's attribute
 * selectors, pseudo-classes, pseudo-elements, `:root`, `@layer`, `@property`,
 * `@starting-style`, `oklch()`, `color-mix()` or `light-dark()`.
 *
 * `var()` indirection: measured on device (signalxjs/lynx#1029, iPhone 16 Pro
 * / iOS 18.3, via the Zero Pilot probe card), lynx resolves a color token
 * `var()`, a var→var chain, `rem`, and `calc()` over a token `var()`. This
 * file previously assumed the last two did not work and dropped every
 * declaration using them — 216 of zero-daisyui's 594 drops, including the
 * whole of daisy's size system, which is `calc(var(--size-*) * n)`.
 *
 * The one thing `var()` does NOT do here is fall back. An unresolvable
 * reference does not compute to an initial value the way the web's
 * invalid-at-computed-value-time rule does; the declaration is dropped and
 * the element paints nothing at all. That is why `assertNoDanglingVars`
 * refuses to ship a stylesheet reading a property nothing defines.
 *
 * Second round of on-device measurement (signalxjs/lynx#1075, iOS 18.3):
 *
 * - A `var(--x)` consumption is ALSO dropped whenever `--x`'s own value
 *   contains `calc()` — bare, with a fallback, or nested inside a calc().
 *   Plain var→var chains and direct `calc(var())` keep working; only the
 *   indirection through a calc-holding property fails. Such chains are
 *   inlined at compile time (`calc-chains.ts`) or refused — never shipped;
 *   `assertNoCalcVarChains` backstops the whole stylesheet for cross-scope
 *   chains the per-recipe pass cannot see.
 * - `display: inline-flex` does not resolve (no inline formatting context) —
 *   the view keeps the broken default linear layout. The emitter rewrites it
 *   to `flex`. `grid`/`inline-grid` are equally unsupported but have NO
 *   mechanical rewrite, so they pass through as authored (daisy's toast
 *   still ships grid properties) — a lynx recipe target section is the fix.
 * - Descendant-from-host selectors (`.zx-root.zx-theme-x .zx-part`) and
 *   theme-baked plain per-theme definitions are proven working as emitted.
 *
 * Three verdicts:
 *
 * - **translate** — silently, because the result is semantically equivalent:
 *   interaction states onto the runtime-stamped flag classes, anatomy pseudo
 *   parts onto real part classes, color functions onto culori-baked literals,
 *   `@layer` onto source order, `--text-fixed-*` onto materialized literals.
 * - **drop, with a report entry** — the declaration cannot exist on lynx and
 *   losing it is legible styling degradation an author may want to patch in
 *   a lynx recipe section: `hover` states, pseudo-element `selectors:` keys,
 *   `@starting-style`, `@media`/`@supports` conditions, any `selectors:` key
 *   the class grammar cannot express.
 * - **reject, failing the build** — the recipe depends on a web runtime
 *   mechanism with no lynx equivalent (`var(--press-x)` and the other
 *   `RUNTIME_PROPERTIES`) or on a value nothing can bake. Silence would ship
 *   a stylesheet that quietly never paints what the author wrote.
 */
import { formatHex, formatHex8, interpolate, parse } from 'culori';
import { RUNTIME_PROPERTIES } from '../../contract.js';

/** One translated/dropped declaration, recorded for `report.json`. */
export interface LynxFinding {
    /** The validator's `where` style: `recipe for "tabs"."tab"`, `tokens theme "dark"`, … */
    where: string;
    /** What was found — a state name, a selector key, a property. */
    what: string;
    /** What happened to it, in one sentence. */
    detail: string;
}

/** The capability report the lynx target folds into `report.json`. */
export interface LynxCapabilityReport {
    translated: LynxFinding[];
    dropped: LynxFinding[];
}

export const emptyReport = (): LynxCapabilityReport => ({ translated: [], dropped: [] });

/**
 * Interaction states on lynx: the runtime stamps `zx-f-*` classes from its
 * own press/focus behaviors (zero publishes `focus-visible` and `pressed` as
 * contract flags; plain `focus` exists only on inputs). `hover` has no
 * pointer to translate to — dropped with a report entry. The web target's
 * `INTERACTION_STATES` pseudo-classes are unreachable here by construction.
 */
export const INTERACTION_STATE_CLASSES: Record<string, string | null> = {
    hover: null,
    focus: 'zx-f-focus',
    'focus-visible': 'zx-f-focus-visible',
    active: 'zx-f-pressed',
};

/**
 * A reference to a runtime-published property (`var(--press-x)` …) — the
 * web-only mechanism the contract's `RUNTIME_PROPERTIES` doc names. Matching
 * the bare property too (not only `var()`) so a recipe *writing* one of these
 * on lynx is caught as well; both spellings depend on the same absent
 * runtime.
 */
const RUNTIME_PROPERTY_PATTERN = new RegExp(
    `(?:^|[^a-zA-Z0-9-])(${RUNTIME_PROPERTIES.map((p) => p.replace(/[-]/g, '\\-')).join('|')})(?![a-zA-Z0-9-])`,
);

/** The runtime property a declaration value/name references, if any. */
export function runtimePropertyIn(text: string): string | undefined {
    return RUNTIME_PROPERTY_PATTERN.exec(text)?.[1];
}

/**
 * Color functions lynx cannot parse; every occurrence must bake or reject.
 * Kept in lockstep with `COLOR_FN_START` below — a function only one of the
 * two knows either bypasses baking (leaks into emitted CSS) or bakes without
 * ever being flagged; the capabilities test pins the two lists equal.
 *
 * Case-insensitive, here and in every other function pattern in this file:
 * CSS function names are ASCII case-insensitive, so `OKLCH(…)` is the same
 * function to a browser and would otherwise walk straight past the gate.
 */
const COLOR_FUNCTION_PATTERN = /\b(?:oklch|oklab|lch|lab|color-mix|light-dark|color|hwb)\(/i;

export const hasUnsupportedColorFunction = (value: string): boolean =>
    COLOR_FUNCTION_PATTERN.test(value);

/**
 * CSS Values 4 comparison functions, which lynx's engine does not implement.
 *
 * `min()` was measured failing on device in both the shapes daisyUI uses —
 * `min(var, var)` and `min()` nested inside `calc()` — with the declaration
 * dropped and the element laid out as though it had never been written
 * (signalxjs/lynx#1066, iPhone 16 Pro / iOS 18.3). `max()` and `clamp()` are
 * the same spec feature; no engine has ever shipped one of the three without
 * the others, so they are refused on that evidence rather than each waiting
 * for its own probe.
 *
 * Dropped rather than folded. A folder would need to be unit-aware, and the
 * motivating case defeats it anyway: daisy's switch radius mixes `rem` (the
 * theme's radii) with `px` (`--border`), which cannot reduce to a single
 * literal without assuming a root font size. A recorded drop tells the design
 * system to supply a lynx replacement; emitting it anyway ships a declaration
 * that never applies, which is precisely the failure mode this target was
 * already bitten by.
 */
const COMPARISON_FUNCTION_PATTERN = /\b(?:min|max|clamp)\(/i;

export const hasComparisonFunction = (value: string): boolean =>
    COMPARISON_FUNCTION_PATTERN.test(value);

/**
 * Fold `calc()` of NUMERIC LITERALS to the number it computes —
 * `calc(1 * 0.1)` → `0.1`. daisyUI spells constant alphas that way
 * (`oklch(0% 0 0 / calc(1 * 0.1))`), and culori cannot parse calc. Only pure
 * numbers and `+ - * /` fold; anything carrying a unit or a `var()` is left
 * for the caller's error path. A tiny recursive-descent evaluator, not
 * `eval` — the grammar is five tokens.
 */
export function foldConstantCalc(text: string): string {
    // No parens inside the expression — a nested group would let the greedy
    // class swallow the closing paren of the surrounding color function.
    // `calc((1 + 2) * 0.5)` therefore does not fold; it surfaces through the
    // caller's error path if a design system ever writes one.
    return text.replace(/calc\(([0-9.+\-*/\s]+)\)/g, (whole, expr: string) => {
        const tokens = expr.match(/\d*\.?\d+|[+\-*/()]/g);
        if (!tokens || tokens.join('').replace(/\s/g, '') !== expr.replace(/\s/g, '')) return whole;
        let pos = 0;
        const peek = () => tokens[pos];
        const parseExpr = (): number => {
            let left = parseTerm();
            while (peek() === '+' || peek() === '-') {
                const op = tokens[pos++];
                const right = parseTerm();
                left = op === '+' ? left + right : left - right;
            }
            return left;
        };
        const parseTerm = (): number => {
            let left = parseFactor();
            while (peek() === '*' || peek() === '/') {
                const op = tokens[pos++];
                const right = parseFactor();
                left = op === '*' ? left * right : left / right;
            }
            return left;
        };
        const parseFactor = (): number => {
            if (peek() === '(') {
                pos++;
                const inner = parseExpr();
                pos++; // ')'
                return inner;
            }
            return Number(tokens[pos++]);
        };
        const result = parseExpr();
        return pos === tokens.length && Number.isFinite(result)
            ? String(Math.round(result * 1e6) / 1e6)
            : whole;
    });
}

/**
 * Bake one author color to a literal lynx's engine parses. Hex when opaque,
 * 8-digit hex with alpha. Throws on anything culori cannot parse — an
 * unresolvable color is a reject, not a drop: the author wrote a value and
 * silence would paint the platform default instead.
 */
export function bakeColor(value: string, where: string): string {
    // Lower-cased for culori, which matches function names case-sensitively
    // while CSS does not — `OKLCH(…)` is a real colour a browser accepts, and
    // before the patterns above went case-insensitive it slipped past the gate
    // into the emitted stylesheet instead of being baked. Every part of a CSS
    // colour (keywords, hex digits, function names) is case-insensitive, so
    // there is nothing here that lower-casing can damage.
    const parsed = parse(foldConstantCalc(value).toLowerCase());
    if (!parsed) {
        throw new Error(
            `[zero-kit] ${where}: cannot resolve "${value}" to a literal color for the lynx target — `
            + `lynx parses hex/rgb()/hsl() only, and this value is not a color culori can evaluate`,
        );
    }
    const alpha = parsed.alpha ?? 1;
    return alpha >= 1 ? formatHex(parsed) : formatHex8(parsed);
}

/**
 * The soft-tint derivation, baked: the same oklab mix the web writes as live
 * `color-mix(in oklab, var(--color-<role>) <mix>%, var(--color-base-100))`,
 * evaluated at compile time against this theme's own colors. Every emit
 * target derives soft the same way — this is that promise, kept with culori
 * instead of the CSS function.
 */
export function bakeSoft(role: string, base: string, mix: number, where: string): string {
    const mixer = interpolate([bakeColor(base, where), bakeColor(role, where)], 'oklab');
    return formatHex(mixer(mix));
}

/** The interpolation spaces `color-mix(in <space>, …)` may name here. */
const MIX_SPACES: Record<string, 'oklab' | 'oklch' | 'rgb' | 'hsl' | 'lab' | 'lch'> = {
    oklab: 'oklab', oklch: 'oklch', srgb: 'rgb', hsl: 'hsl', lab: 'lab', lch: 'lch',
};

/** Index just past the matching `)` for the `(` at `open`. */
function balancedEnd(text: string, open: number): number {
    let depth = 0;
    for (let i = open; i < text.length; i++) {
        if (text[i] === '(') depth++;
        else if (text[i] === ')' && --depth === 0) return i + 1;
    }
    return -1;
}

/** Split on top-level commas only — arguments may themselves hold parens. */
function splitTopLevel(text: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '(') depth++;
        else if (text[i] === ')') depth--;
        else if (text[i] === ',' && depth === 0) {
            parts.push(text.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(text.slice(start));
    return parts.map((p) => p.trim());
}

const COLOR_FN_START = /\b(oklch|oklab|lch|lab|color-mix|light-dark|color|hwb)\(/i;

/**
 * Bake every color-FUNCTION occurrence inside a longer value (a shadow, a
 * gradient stop, a border shorthand) to a literal, resolving `var(--color-*)`
 * references against the theme's own baked colors first — legal because on
 * this target every theme block is a full restatement, so the baked result is
 * exactly what the live function would have computed in that theme.
 *
 * - `light-dark(a, b)` picks the side this theme's `colorScheme` names.
 * - `color-mix(in <space>, A p%?, B q%?)` is evaluated with culori in that
 *   space, CSS-normalized weights.
 * - plain color functions parse directly.
 *
 * Bare `var(--color-*)` references OUTSIDE a color function are left alone —
 * single-level color `var()` is the one lynx-proven indirection, and leaving
 * it live keeps the emitted blocks smaller.
 *
 * Throws where nothing can be resolved: the author wrote paint, and silence
 * would ship a stylesheet that quietly never renders it.
 */
export function bakeColorValue(
    value: string,
    colors: Record<string, string>,
    colorScheme: 'light' | 'dark',
    where: string,
): string {
    const substituteColorVars = (text: string): string =>
        text.replace(/var\(\s*--color-([a-z0-9-]+)\s*(?:,\s*([^()]*))?\)/g, (whole, token: string, fallback?: string) => {
            const resolved = colors[token] ?? fallback?.trim();
            if (!resolved) {
                throw new Error(
                    `[zero-kit] ${where}: a color function reads var(--color-${token}), which this theme does not define — nothing to bake with`,
                );
            }
            return resolved;
        });

    const bakeOne = (expr: string): string => {
        const match = COLOR_FN_START.exec(expr);
        if (!match) return bakeColor(substituteColorVars(expr), where);
        // Lower-cased for the same reason as `bakeColor`: CSS function
        // names are case-insensitive, so the dispatch below must not be.
        const fn = match[1]!.toLowerCase();
        if (fn === 'light-dark') {
            const open = expr.indexOf('(', match.index);
            const args = splitTopLevel(expr.slice(open + 1, balancedEnd(expr, open) - 1));
            if (args.length !== 2) throw new Error(`[zero-kit] ${where}: light-dark() takes exactly two colors`);
            return bakeOne(args[colorScheme === 'dark' ? 1 : 0]!);
        }
        if (fn === 'color-mix') {
            const open = expr.indexOf('(', match.index);
            const args = splitTopLevel(expr.slice(open + 1, balancedEnd(expr, open) - 1));
            const spaceMatch = /^in\s+([a-z-]+)/i.exec(args[0] ?? '');
            const space = spaceMatch && MIX_SPACES[spaceMatch[1]!.toLowerCase()];
            if (!space || args.length !== 3) {
                throw new Error(
                    `[zero-kit] ${where}: cannot evaluate "${expr}" — color-mix() needs "in <space>, <color> <pct>?, <color> <pct>?" with a known space (${Object.keys(MIX_SPACES).join(', ')})`,
                );
            }
            const component = (arg: string): { color: string; pct?: number } => {
                const pct = /\s([0-9.]+)%\s*$/.exec(arg);
                return pct
                    ? { color: arg.slice(0, pct.index).trim(), pct: Number(pct[1]) }
                    : { color: arg.trim() };
            };
            const a = component(args[1]!);
            const b = component(args[2]!);
            // CSS normalization: a missing percentage takes the complement;
            // both missing is 50/50.
            const pa = a.pct ?? (b.pct !== undefined ? 100 - b.pct : 50);
            const pb = b.pct ?? 100 - pa;
            const t = pb / (pa + pb);
            const mixer = interpolate([bakeOne(a.color), bakeOne(b.color)], space);
            const mixed = mixer(t);
            const alpha = mixed.alpha ?? 1;
            return alpha >= 1 ? formatHex(mixed) : formatHex8(mixed);
        }
        return bakeColor(substituteColorVars(expr), where);
    };

    let out = value;
    for (let guard = 0; guard < 16; guard++) {
        const match = COLOR_FN_START.exec(out);
        if (!match) break;
        const open = out.indexOf('(', match.index);
        const end = balancedEnd(out, open);
        if (end === -1) throw new Error(`[zero-kit] ${where}: unbalanced parentheses in "${value}"`);
        const span = out.slice(match.index, end);
        out = out.slice(0, match.index) + bakeOne(span) + out.slice(end);
    }
    return out;
}
