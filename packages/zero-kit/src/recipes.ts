/**
 * Recipe layer — typed per-part styles compiled to plain CSS against a
 * component's anatomy. Zero runtime: the output is a static stylesheet.
 *
 * State names resolve through the anatomy manifest:
 * - machine states → `[data-state="open"]`
 * - boolean flags → `[data-disabled]`
 * - interaction states → real pseudo-classes (`:hover:not([data-disabled])`)
 *
 * Unknown parts or states are hard errors — the manifest is the contract,
 * and failing the build is how recipes stay in lockstep with core.
 */
import type { ManifestComponent, ManifestPart } from './contract.js';
import { INTERACTION_STATES, VARIANT_AXES } from './contract.js';

export type CssProps = Record<string, string | number>;

export interface PartStyles {
    base?: CssProps;
    /** state/flag/interaction name → declarations. */
    states?: Record<string, CssProps>;
    /** Nested selectors; `&` is the part selector. */
    selectors?: Record<string, CssProps>;
    /**
     * Conditional styles for the same part — condition → the same shape,
     * recursively. Nesting composes the at-rules.
     *
     * Keys resolve in this order:
     * - starts with `@` → used verbatim as the at-rule prelude
     *   (`'@container (min-width: 20rem)'`, `'@supports (…)'`,
     *   `'@starting-style'`)
     * - a name in the design system's `breakpoints` → `@media (min-width: …)`
     * - a built-in: see `BUILTIN_CONDITIONS`
     * - anything else is a hard error listing what was available
     *
     * `variants` and `compoundVariants` hold `PartStyles` too, so responsive
     * variants need no separate mechanism.
     */
    at?: Record<string, PartStyles>;
}

/**
 * Condition keys that don't come from the design system's breakpoints.
 *
 * `prefers-dark` is deliberately not called `dark`: it compiles to
 * `prefers-color-scheme` and so ignores `[data-theme="…-dark"]` entirely.
 * `at.dark` would read as "my dark theme" and silently mean something else —
 * the exact class of trap the recipe layer keeps eliminating elsewhere.
 */
export const BUILTIN_CONDITIONS: Readonly<Record<string, string>> = {
    'reduced-motion': '@media (prefers-reduced-motion: reduce)',
    'hover-none': '@media (hover: none)',
    'prefers-dark': '@media (prefers-color-scheme: dark)',
    'forced-colors': '@media (forced-colors: active)',
};

/** Compile-time context a recipe needs beyond its own component anatomy. */
export interface RecipeContext {
    /** The design system's declared breakpoints, in mobile-first order. */
    breakpoints?: Record<string, string>;
}

export interface RecipeInput {
    /** The component scope this recipe styles (e.g. `'tabs'`). */
    component: string;
    /** Component-level tokens declared on the first part, overridable per theme. */
    tokens?: Record<string, string>;
    parts: Record<string, PartStyles>;
    /** axis → value → part → styles. Contract axes: color, size, variant. */
    variants?: Record<string, Record<string, Record<string, PartStyles>>>;
    compoundVariants?: Array<{
        match: Record<string, string>;
        parts: Record<string, PartStyles>;
    }>;
    /** Values applied when the axis attribute is absent (CSS-only defaults). */
    defaultVariants?: Record<string, string>;
    /** name → raw keyframes body (`from { … } to { … }`). */
    keyframes?: Record<string, string>;
    /**
     * Raw CSS appended verbatim at the end of this component's
     * `@layer zero.recipes` block — the escape hatch for anything the typed
     * surface can't express. Lands in the component's own stylesheet, so it
     * stays with the rules it relates to.
     */
    css?: string;
    /**
     * Declared states intentionally left unstyled — silences the validator's
     * coverage warning for them.
     */
    skipStates?: Record<string, readonly string[]>;
}

/** Identity with typing — the authoring entry point. */
export function defineRecipe(recipe: RecipeInput): RecipeInput {
    return recipe;
}

const kebab = (prop: string): string =>
    prop.startsWith('--') ? prop : prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const declBlock = (props: CssProps, indent: string): string =>
    Object.entries(props)
        .map(([k, v]) => `${indent}${kebab(k)}: ${v};`)
        .join('\n');

function findPart(component: ManifestComponent, part: string): ManifestPart {
    const found = component.parts.find((p) => p.name === part);
    if (!found) {
        const known = component.parts.map((p) => p.name).join(', ');
        throw new Error(
            `[zero-kit] recipe for "${component.scope}" styles unknown part "${part}" (known: ${known})`,
        );
    }
    return found;
}

function stateSelector(component: ManifestComponent, part: ManifestPart, state: string): string {
    // Anatomy wins over interaction pseudo-classes: a part with a machine
    // state named `active` styles [data-state="active"], not `:active`.
    const fromAnatomy = part.selectors[state];
    if (fromAnatomy) return fromAnatomy;
    const interaction = INTERACTION_STATES[state];
    if (interaction) return interaction;
    const known = [...Object.keys(part.selectors), ...Object.keys(INTERACTION_STATES)].join(', ');
    throw new Error(
        `[zero-kit] recipe for "${component.scope}"."${part.name}" styles unknown state "${state}" (known: ${known})`,
    );
}

const partSelector = (scope: string, part: string): string =>
    `[data-scope="${scope}"][data-part="${part}"]`;

/**
 * The part that carries the variant attributes (`data-color` etc.) — by
 * convention the part named `root`, else the first declared part.
 */
function carrierPart(component: ManifestComponent): string {
    return component.parts.find((p) => p.name === 'root')?.name ?? component.parts[0]!.name;
}

/**
 * Selector for a part narrowed by a variant axis value. On the carrier part
 * the attribute sits on the element itself; on other parts it is inherited
 * from the carrier ancestor.
 */
function variantSelector(
    component: ManifestComponent,
    part: string,
    axisAttrs: string,
): string {
    const carrier = carrierPart(component);
    if (part === carrier) return `${partSelector(component.scope, part)}${axisAttrs}`;
    return `${partSelector(component.scope, carrier)}${axisAttrs} ${partSelector(component.scope, part)}`;
}

/** One resolved `at` key. `tier`/`ordinal` decide emission order. */
interface Condition {
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
const TIER = { raw: 0, preference: 1, breakpoint: 2, reducedMotion: 3 } as const;

/** Rules grouped by their (possibly nested) at-rule chain. */
type Sink = Map<string, { conditions: Condition[]; rules: string[] }>;

const sinkKey = (path: readonly Condition[]): string => path.map((c) => c.prelude).join(' >> ');

function push(sink: Sink, path: readonly Condition[], rule: string): void {
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
type ConditionRegistry = Map<string, { condition: Condition; via: string }>;

function resolveCondition(
    key: string,
    context: RecipeContext,
    where: string,
    registry: ConditionRegistry,
): Condition {
    const breakpoints = context.breakpoints ?? {};
    let condition: Condition;

    if (key.startsWith('@')) {
        condition = { prelude: key, tier: TIER.raw, ordinal: registry.size };
    } else if (key in breakpoints) {
        condition = {
            prelude: `@media (min-width: ${breakpoints[key]})`,
            tier: TIER.breakpoint,
            ordinal: Object.keys(breakpoints).indexOf(key),
        };
    } else if (BUILTIN_CONDITIONS[key]) {
        condition = {
            prelude: BUILTIN_CONDITIONS[key]!,
            tier: key === 'reduced-motion' ? TIER.reducedMotion : TIER.preference,
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

function emitPartStyles(
    component: ManifestComponent,
    partName: string,
    styles: PartStyles,
    baseSelector: string,
    sink: Sink,
    context: RecipeContext,
    registry: ConditionRegistry,
    path: readonly Condition[] = [],
): void {
    const part = findPart(component, partName);
    const rule = (selector: string, props: CssProps) =>
        push(sink, path, `${selector} {\n${declBlock(props, '    ')}\n}`);

    if (styles.base && Object.keys(styles.base).length > 0) {
        rule(baseSelector, styles.base);
    }
    for (const [state, props] of Object.entries(styles.states ?? {})) {
        const sel = stateSelector(component, part, state);
        // Empty blocks are legal recipe entries (they mark a state as
        // deliberately covered for the validator) but emit no CSS.
        if (Object.keys(props).length === 0) continue;
        rule(`${baseSelector}${sel}`, props);
    }
    for (const [nested, props] of Object.entries(styles.selectors ?? {})) {
        if (Object.keys(props).length === 0) continue;
        const sel = nested.includes('&') ? nested.replace(/&/g, baseSelector) : `${baseSelector} ${nested}`;
        rule(sel, props);
    }
    for (const [key, nested] of Object.entries(styles.at ?? {})) {
        const where = `recipe for "${component.scope}"."${partName}"`;
        const condition = resolveCondition(key, context, where, registry);
        emitPartStyles(component, partName, nested, baseSelector, sink, context, registry, [...path, condition]);
    }
}

/** Prefix every non-empty line with `depth` levels of indentation. */
const indent = (text: string, depth: number): string => {
    const pad = '    '.repeat(depth);
    return text.split('\n').map((line) => (line ? pad + line : line)).join('\n');
};

/** Lexicographic order over the (tier, ordinal) pairs along a chain. */
function compareChains(a: Condition[], b: Condition[]): number {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const x = a[i]!;
        const y = b[i]!;
        if (x.tier !== y.tier) return x.tier - y.tier;
        if (x.ordinal !== y.ordinal) return x.ordinal - y.ordinal;
    }
    return a.length - b.length;
}

/** Render one bucket, nesting the at-rules and indenting the rules inside. */
function renderBucket(conditions: Condition[], rules: string[]): string {
    let body = rules.map((r) => indent(r, conditions.length + 1)).join('\n\n');
    for (let i = conditions.length - 1; i >= 0; i--) {
        const pad = '    '.repeat(i + 1);
        body = `${pad}${conditions[i]!.prelude} {\n${body}\n${pad}}`;
    }
    return body;
}

function axisAttr(axis: string): string {
    return VARIANT_AXES[axis] ?? `data-${axis}`;
}

/** Compile one recipe to CSS (inside `@layer zero.recipes`). */
export function compileRecipeCss(
    recipe: RecipeInput,
    component: ManifestComponent,
    context: RecipeContext = {},
): string {
    if (recipe.component !== component.scope) {
        throw new Error(
            `[zero-kit] recipe component "${recipe.component}" does not match anatomy scope "${component.scope}"`,
        );
    }
    const sink: Sink = new Map();
    const registry: ConditionRegistry = new Map();

    // Component-level tokens on the carrier part.
    if (recipe.tokens && Object.keys(recipe.tokens).length > 0) {
        const carrier = partSelector(component.scope, carrierPart(component));
        push(sink, [], `${carrier} {\n${declBlock(recipe.tokens, '    ')}\n}`);
    }

    for (const [partName, styles] of Object.entries(recipe.parts)) {
        emitPartStyles(component, partName, styles, partSelector(component.scope, partName), sink, context, registry);
    }

    for (const [axis, values] of Object.entries(recipe.variants ?? {})) {
        const attr = axisAttr(axis);
        for (const [value, parts] of Object.entries(values)) {
            for (const [partName, styles] of Object.entries(parts)) {
                findPart(component, partName);
                const selector = variantSelector(component, partName, `[${attr}="${value}"]`);
                emitPartStyles(component, partName, styles, selector, sink, context, registry);

                // CSS-only default: the same styles apply when the attribute
                // is absent. Never conflicts with the explicit-value rule —
                // the attribute is either present or not.
                if (recipe.defaultVariants?.[axis] === value) {
                    const dflt = variantSelector(component, partName, `:not([${attr}])`);
                    emitPartStyles(component, partName, styles, dflt, sink, context, registry);
                }
            }
        }
    }

    for (const compoundVariant of recipe.compoundVariants ?? []) {
        const attrs = Object.entries(compoundVariant.match)
            .map(([axis, value]) => `[${axisAttr(axis)}="${value}"]`)
            .join('');
        for (const [partName, styles] of Object.entries(compoundVariant.parts)) {
            findPart(component, partName);
            emitPartStyles(component, partName, styles, variantSelector(component, partName, attrs), sink, context, registry);
        }
    }

    // Flat rules first, then every conditional bucket. At-rules add no
    // specificity, so a conditional rule can only override the flat rule it
    // refines by coming later in the stylesheet.
    const flat = sink.get('');
    const conditional = [...sink.values()]
        .filter((b) => b.conditions.length > 0)
        .sort((a, b) => compareChains(a.conditions, b.conditions));

    const blocks: string[] = [];
    if (flat) blocks.push(flat.rules.map((r) => indent(r, 1)).join('\n\n'));
    for (const bucket of conditional) blocks.push(renderBucket(bucket.conditions, bucket.rules));
    if (recipe.css?.trim()) blocks.push(indent(recipe.css.trim(), 1));

    let css = `@layer zero.recipes {\n${blocks.join('\n\n')}\n}\n`;
    for (const [name, body] of Object.entries(recipe.keyframes ?? {})) {
        css += `@keyframes ${name} {\n    ${body.trim()}\n}\n`;
    }
    return css;
}
