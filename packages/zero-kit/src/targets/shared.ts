/**
 * Target-neutral emitter machinery — what every emit target shares, moved
 * out of the web emitter verbatim (#348) so a second target (lynx) reuses
 * the exact guards and ordering rather than re-deriving them:
 *
 * - declaration hygiene: property-name and breakout guards, `declBlock`
 * - manifest lookups: `findPart`
 * - the emission sink: rules grouped by (possibly nested) at-rule chains,
 *   with the tiered condition registry that makes emission order a
 *   correctness property rather than a visit-order accident
 * - selector-token guards: `assertAxisToken`, `assertKeyframesName`
 *
 * Selector SHAPES stay per-target: the web target writes
 * `[data-scope][data-part]` attribute selectors, a lynx target writes class
 * compounds from the shared grammar — neither belongs here.
 */
import type { ManifestComponent, ManifestPart } from '../contract.js';
import { TOKEN_KEY_PATTERN } from '../contract.js';
import type { CssProps, RecipeContext } from '../recipes.js';
import { BUILTIN_CONDITIONS } from '../recipes.js';

export const kebab = (prop: string): string =>
    prop.startsWith('--') ? prop : prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/**
 * A CSS property name after kebab-casing: an optional vendor prefix
 * (`-webkit-line-clamp`) followed by a kebab-case identifier, or a custom
 * property. Everything else is written into a declaration verbatim, so it is
 * the same injection surface `assertAxisToken` closes for axis values — a
 * property name carrying `;` or `{` ends the declaration early and everything
 * after it is read as CSS. `base: { 'x;} [data-scope]{color': 'red' }`
 * emitted a rule that restyled every scoped element on the page.
 */
export const PROPERTY_NAME_PATTERN = /^(?:--[A-Za-z_][A-Za-z0-9_-]*|-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/;

/**
 * What can never appear in a declaration value or a selector fragment: the
 * structural characters that end the current declaration/rule and start
 * another. Quotes, commas and parens all stay legal — `content: '";"'` is the
 * one legitimate spelling this rejects, and a hard error beats an escape.
 */
export const CSS_BREAKOUT = /[{};\n\r]/;

export function assertDeclaration(where: string, prop: string, value: string): void {
    if (!PROPERTY_NAME_PATTERN.test(kebab(prop))) {
        throw new Error(
            `[zero-kit] ${where} declares "${prop}", which is not a CSS property name — it would be written into the stylesheet verbatim`,
        );
    }
    if (CSS_BREAKOUT.test(value)) {
        throw new Error(
            `[zero-kit] ${where}: the value of "${prop}" cannot hold a brace, semicolon or newline — it would end the declaration and everything after it would be read as CSS`,
        );
    }
}

export const declBlock = (props: CssProps, indentation: string, where = 'recipe'): string =>
    Object.entries(props)
        .map(([k, v]) => {
            assertDeclaration(where, k, String(v));
            return `${indentation}${kebab(k)}: ${v};`;
        })
        .join('\n');

export function findPart(component: ManifestComponent, part: string): ManifestPart {
    const found = component.parts.find((p) => p.name === part);
    if (!found) {
        const known = component.parts.map((p) => p.name).join(', ');
        throw new Error(
            `[zero-kit] recipe for "${component.scope}" styles unknown part "${part}" (known: ${known})`,
        );
    }
    return found;
}

/** One resolved `at` key. `tier`/`ordinal` decide emission order. */
export interface Condition {
    prelude: string;
    tier: number;
    ordinal: number;
}

/**
 * Emission tiers. An at-rule adds NO specificity, so a conditional rule only
 * beats the flat rule it refines by coming later — which makes ordering a
 * correctness concern, not a cosmetic one.
 *
 * Feature and container queries sort first (they refine the base), then
 * preference queries, then breakpoints ascending, and `reduced-motion` last so
 * an accessibility override is never overwritten by a wider viewport.
 */
// `startingStyle` sits last so an entry rule always follows the open-state
// rule it interpolates from. It declares no transition of its own, so it
// neither defeats nor is defeated by the reduced-motion tier.
export const TIER = { raw: 0, preference: 1, breakpoint: 2, reducedMotion: 3, startingStyle: 4 } as const;

/** Rules grouped by their (possibly nested) at-rule chain. */
export type Sink = Map<string, { conditions: Condition[]; rules: string[] }>;

export const sinkKey = (path: readonly Condition[]): string => path.map((c) => c.prelude).join(' >> ');

export function push(sink: Sink, path: readonly Condition[], rule: string): void {
    const key = sinkKey(path);
    const bucket = sink.get(key) ?? { conditions: [...path], rules: [] };
    bucket.rules.push(rule);
    sink.set(key, bucket);
}

/**
 * Prelude → the condition it resolved to, for one recipe.
 *
 * Buckets are keyed by prelude, so the same prelude reached from two places
 * has to agree on its tier — otherwise the merged block's emission order
 * would depend on which part happened to be visited first. The registry also
 * makes a raw key's ordinal stable across parts, so two parts using the same
 * `@supports` still merge into one block.
 */
export type ConditionRegistry = Map<string, { condition: Condition; via: string }>;

/*
 * `Object.hasOwn`, not `in`: these are plain objects, so `in` is true for
 * inherited keys. A condition named `toString` resolved to Object.prototype's
 * method and emitted `@media (min-width: function toString() { … })`.
 */
export function resolveCondition(
    key: string,
    context: RecipeContext,
    where: string,
    registry: ConditionRegistry,
): Condition {
    const breakpoints = context.breakpoints ?? {};
    let condition: Condition;

    if (key.startsWith('@')) {
        // `@starting-style` is spellable both as the built-in name and as the
        // raw prelude, so the raw form takes the same tier — otherwise the
        // two spellings would emit in different places and only one of them
        // would reliably follow the rule it interpolates from.
        const tier = key.trim() === '@starting-style' ? TIER.startingStyle : TIER.raw;
        condition = { prelude: key, tier, ordinal: registry.size };
    } else if (Object.hasOwn(breakpoints, key)) {
        condition = {
            prelude: `@media (min-width: ${breakpoints[key]})`,
            tier: TIER.breakpoint,
            ordinal: Object.keys(breakpoints).indexOf(key),
        };
    } else if (Object.hasOwn(BUILTIN_CONDITIONS, key)) {
        condition = {
            prelude: BUILTIN_CONDITIONS[key]!,
            tier: key === 'reduced-motion'
                ? TIER.reducedMotion
                : key === 'starting-style' ? TIER.startingStyle : TIER.preference,
            ordinal: registry.size,
        };
    } else {
        const declared = Object.keys(breakpoints);
        throw new Error(
            `[zero-kit] ${where} uses unknown condition "${key}"\n` +
            `  declared breakpoints: ${declared.length ? declared.join(', ') : '(none — declare them in tokens.breakpoints)'}\n` +
            `  built-ins: ${Object.keys(BUILTIN_CONDITIONS).join(', ')}\n` +
            `  or start the key with "@" for a raw prelude, e.g. "@container (min-width: 30rem)"`,
        );
    }

    const seen = registry.get(condition.prelude);
    if (!seen) {
        registry.set(condition.prelude, { condition, via: key });
        return condition;
    }
    if (seen.condition.tier !== condition.tier) {
        // e.g. a raw `@media (min-width: 640px)` alongside a declared
        // `sm: '640px'`. They'd share a bucket, and its emission tier would
        // depend on visit order. Ambiguity, not a preference to resolve.
        throw new Error(
            `[zero-kit] ${where}: conditions "${seen.via}" and "${key}" both resolve to ` +
            `"${condition.prelude}" but sort differently — use "${seen.via}" for both, ` +
            `or give them distinct conditions`,
        );
    }
    return seen.condition;
}

/** Prefix every non-empty line with `depth` levels of indentation. */
export const indent = (text: string, depth: number): string => {
    const pad = '    '.repeat(depth);
    return text.split('\n').map((line) => (line ? pad + line : line)).join('\n');
};

/** Lexicographic order over the (tier, ordinal) pairs along a chain. */
export function compareChains(a: Condition[], b: Condition[]): number {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const x = a[i]!;
        const y = b[i]!;
        if (x.tier !== y.tier) return x.tier - y.tier;
        if (x.ordinal !== y.ordinal) return x.ordinal - y.ordinal;
    }
    return a.length - b.length;
}

/** Render one bucket, nesting the at-rules and indenting the rules inside. */
export function renderBucket(conditions: Condition[], rules: string[]): string {
    let body = rules.map((r) => indent(r, conditions.length + 1)).join('\n\n');
    for (let i = conditions.length - 1; i >= 0; i--) {
        const pad = '    '.repeat(i + 1);
        body = `${pad}${conditions[i]!.prelude} {\n${body}\n${pad}}`;
    }
    return body;
}

/**
 * Axis names and values become selector fragments (`[data-<axis>="<value>"]`
 * on the web, `.zx-a-<axis>-<value>` on lynx), so they have to be spellable
 * as an identifier.
 *
 * The vocabularies are open by design — a design system names its own roles,
 * sizes and variants — but "open" stops at what can survive being written into
 * a selector. A value carrying a `"` closes the attribute early and everything
 * after it is read as CSS: `size: { 'x"], [data-part="panel': … }` emitted a
 * second, unrelated selector that styled every tab inside any panel. That is
 * selector injection, not a typo.
 *
 * A hard error rather than escaping, for the reason the emitters already throw
 * on unknown parts and states: the contract is the contract, and failing the
 * build is how recipes stay honest. `validateRecipes` reports the same thing
 * as a collected error with a friendlier message; this is the backstop for
 * calling the compile functions directly, which are public API.
 */
export function assertAxisToken(kind: 'axis' | 'value' | 'modifier', token: string, scope: string): string {
    if (!TOKEN_KEY_PATTERN.test(token)) {
        throw new Error(
            `[zero-kit] recipe for "${scope}" uses ${kind} "${token}", which is not a kebab-case identifier — it would be written into a selector fragment verbatim`,
        );
    }
    return token;
}

/**
 * A `@keyframes` name is a CSS custom identifier — written after the at-rule
 * verbatim, so the grammar is the guard, exactly as for axis tokens. Looser
 * than `TOKEN_KEY_PATTERN` on purpose (camelCase animation names are
 * idiomatic CSS), but still a single identifier: anything with a space or
 * brace escapes the prelude. The CSS-wide keywords plus `none` are excluded —
 * `animation: none` must never resolve to a design system's keyframes.
 */
export const KEYFRAMES_NAME_PATTERN = /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/;
export const RESERVED_KEYFRAMES_NAMES = new Set(['none', 'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'default']);

export function assertKeyframesName(name: string, scope: string): void {
    if (!KEYFRAMES_NAME_PATTERN.test(name)) {
        throw new Error(
            `[zero-kit] recipe for "${scope}" declares keyframes "${name}", which is not a CSS identifier — it would be written into the @keyframes prelude verbatim`,
        );
    }
    if (RESERVED_KEYFRAMES_NAMES.has(name.toLowerCase())) {
        throw new Error(
            `[zero-kit] recipe for "${scope}" declares keyframes "${name}", which is a CSS keyword — \`animation-name\` could never reference it`,
        );
    }
}
