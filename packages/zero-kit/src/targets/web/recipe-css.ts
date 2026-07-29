/**
 * Web recipe emitter — compiles a `RecipeInput` to plain CSS against a
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
import type { ManifestComponent, ManifestPart } from '../../contract.js';
import { INTERACTION_STATES, MOD_ATTR_PREFIX, TOKEN_KEY_PATTERN, VARIANT_AXES, carrierPart } from '../../contract.js';
import type { CssProps, PartStyles, RecipeContext, RecipeInput } from '../../recipes.js';
import { BUILTIN_CONDITIONS } from '../../recipes.js';

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
 * A pseudo-element name: `::backdrop`, `::details-content`,
 * `::-webkit-slider-thumb`. The suffix is written into a selector verbatim,
 * so this is the same injection surface as axis values — anything else is a
 * hard error, not something to escape.
 */
const PSEUDO_ELEMENT_PATTERN = /^::-?[a-z][a-z-]*$/;

/**
 * Where a part's rules actually attach: itself, or — for a projected part
 * (`pseudo` in the anatomy) — the host part plus a pseudo-element suffix.
 * The projection is manifest data, so it fails fast like unknown parts and
 * states do: a missing host would silently emit selectors matching nothing,
 * and a malformed suffix is selector injection.
 */
function partProjection(
    component: ManifestComponent,
    partName: string,
): { host: string; suffix: string } {
    const part = findPart(component, partName);
    if (!part.pseudo) return { host: partName, suffix: '' };
    findPart(component, part.pseudo.of);
    if (!PSEUDO_ELEMENT_PATTERN.test(part.pseudo.selector)) {
        throw new Error(
            `[zero-kit] "${component.scope}"."${partName}" projects onto "${part.pseudo.selector}", which is not a pseudo-element — it would be written into a selector verbatim`,
        );
    }
    return { host: part.pseudo.of, suffix: part.pseudo.selector };
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
// `startingStyle` sits last so an entry rule always follows the open-state
// rule it interpolates from. It declares no transition of its own, so it
// neither defeats nor is defeated by the reduced-motion tier.
const TIER = { raw: 0, preference: 1, breakpoint: 2, reducedMotion: 3, startingStyle: 4 } as const;

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

/*
 * `Object.hasOwn`, not `in`: these are plain objects, so `in` is true for
 * inherited keys. A condition named `toString` resolved to Object.prototype's
 * method and emitted `@media (min-width: function toString() { … })`.
 */
function resolveCondition(
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

/**
 * `pseudoSuffix` carries a projected part's pseudo-element (`::backdrop`). It
 * attaches AFTER every attribute/pseudo-class fragment — states narrow the
 * host element, which is the only thing an attribute selector can narrow —
 * so `states.open` on dialog's backdrop compiles to
 * `[data-part="popup"][data-state="open"]::backdrop`.
 */
function emitPartStyles(
    component: ManifestComponent,
    partName: string,
    styles: PartStyles,
    baseSelector: string,
    sink: Sink,
    context: RecipeContext,
    registry: ConditionRegistry,
    pseudoSuffix = '',
    path: readonly Condition[] = [],
): void {
    const part = findPart(component, partName);
    const rule = (selector: string, props: CssProps) =>
        push(sink, path, `${selector} {\n${declBlock(props, '    ')}\n}`);

    if (styles.base && Object.keys(styles.base).length > 0) {
        rule(`${baseSelector}${pseudoSuffix}`, styles.base);
    }
    for (const [state, props] of Object.entries(styles.states ?? {})) {
        const sel = stateSelector(component, part, state);
        // Empty blocks are legal recipe entries (they mark a state as
        // deliberately covered for the validator) but emit no CSS.
        if (Object.keys(props).length === 0) continue;
        rule(`${baseSelector}${sel}${pseudoSuffix}`, props);
    }
    for (const [nested, props] of Object.entries(styles.selectors ?? {})) {
        if (Object.keys(props).length === 0) continue;
        const self = `${baseSelector}${pseudoSuffix}`;
        const sel = nested.includes('&') ? nested.replace(/&/g, self) : `${self} ${nested}`;
        rule(sel, props);
    }
    for (const [key, nested] of Object.entries(styles.at ?? {})) {
        const where = `recipe for "${component.scope}"."${partName}"`;
        const condition = resolveCondition(key, context, where, registry);
        emitPartStyles(component, partName, nested, baseSelector, sink, context, registry, pseudoSuffix, [...path, condition]);
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

function axisAttr(axis: string, scope: string): string {
    return VARIANT_AXES[axis] ?? `data-${assertAxisToken('axis', axis, scope)}`;
}

/** A presence-only modifier's attribute — `[data-mod-block]`, never valued. */
function modAttr(name: string, scope: string): string {
    return `${MOD_ATTR_PREFIX}${assertAxisToken('modifier', name, scope)}`;
}

/**
 * Axis names and values become `[data-<axis>="<value>"]`, so they have to be
 * spellable as an identifier.
 *
 * The vocabularies are open by design — a design system names its own roles,
 * sizes and variants — but "open" stops at what can survive being written into
 * a selector. A value carrying a `"` closes the attribute early and everything
 * after it is read as CSS: `size: { 'x"], [data-part="panel': … }` emitted a
 * second, unrelated selector that styled every tab inside any panel. That is
 * selector injection, not a typo.
 *
 * A hard error rather than escaping, for the reason this module already throws
 * on unknown parts and states: the contract is the contract, and failing the
 * build is how recipes stay honest. `validateRecipes` reports the same thing
 * as a collected error with a friendlier message; this is the backstop for
 * calling `compileRecipeCss` directly, which is public API.
 */
function assertAxisToken(kind: 'axis' | 'value' | 'modifier', token: string, scope: string): string {
    if (!TOKEN_KEY_PATTERN.test(token)) {
        throw new Error(
            `[zero-kit] recipe for "${scope}" uses ${kind} "${token}", which is not a kebab-case identifier — it would be written into a [data-…] selector`,
        );
    }
    return token;
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
        const { host, suffix } = partProjection(component, partName);
        emitPartStyles(component, partName, styles, partSelector(component.scope, host), sink, context, registry, suffix);
    }

    for (const [axis, values] of Object.entries(recipe.variants ?? {})) {
        const attr = axisAttr(axis, component.scope);
        for (const [value, parts] of Object.entries(values)) {
            for (const [partName, styles] of Object.entries(parts)) {
                const { host, suffix } = partProjection(component, partName);
                const selector = variantSelector(component, host, `[${attr}="${assertAxisToken('value', value, component.scope)}"]`);
                emitPartStyles(component, partName, styles, selector, sink, context, registry, suffix);

                // CSS-only default: the same styles apply when the attribute
                // is absent. Never conflicts with the explicit-value rule —
                // the attribute is either present or not.
                if (recipe.defaultVariants?.[axis] === value) {
                    const dflt = variantSelector(component, host, `:not([${attr}])`);
                    emitPartStyles(component, partName, styles, dflt, sink, context, registry, suffix);
                }
            }
        }
    }

    // Presence-only modifiers: `[data-mod-<name>]`, no value to match on.
    for (const [name, parts] of Object.entries(recipe.modifiers ?? {})) {
        const attr = modAttr(name, component.scope);
        for (const [partName, styles] of Object.entries(parts)) {
            const { host, suffix } = partProjection(component, partName);
            const selector = variantSelector(component, host, `[${attr}]`);
            emitPartStyles(component, partName, styles, selector, sink, context, registry, suffix);
        }
    }

    for (const compoundVariant of recipe.compoundVariants ?? []) {
        // `match` is a conjunction over two different grammars. An axis
        // contributes an equality test, and a modifier — spelled `true` —
        // contributes a presence-only attribute, which has no value to
        // compare. On top of that, an axis sitting at its DEFAULT value is
        // expressed by the attribute being absent as much as by it carrying
        // the value, the same CSS-only default the single-axis loop emits
        // above. So each entry contributes one alternative, or two when it is
        // a defaulted axis value, and the rule set is their cross product.
        // Without it a compound naming a defaulted axis matches nothing at
        // all: `<Button color="primary">` under
        // `defaultVariants: { variant: 'solid' }` carries no `data-variant`.
        const alternatives = Object.entries(compoundVariant.match).map(([axis, value]) => {
            if (value === true) return [`[${modAttr(axis, component.scope)}]`];
            const attr = axisAttr(axis, component.scope);
            const present = `[${attr}="${assertAxisToken('value', value, component.scope)}"]`;
            return recipe.defaultVariants?.[axis] === value ? [present, `:not([${attr}])`] : [present];
        });
        const matches = alternatives.reduce<string[]>(
            (acc, alts) => acc.flatMap((prefix) => alts.map((alt) => `${prefix}${alt}`)),
            [''],
        );
        for (const [partName, styles] of Object.entries(compoundVariant.parts)) {
            const { host, suffix } = partProjection(component, partName);
            // Separate rules rather than one comma-joined selector:
            // `emitPartStyles` appends pseudo-element suffixes, state selectors
            // and `&` substitutions to what it is handed, and those bind only to
            // the last selector of a list.
            for (const attrs of matches) {
                emitPartStyles(component, partName, styles, variantSelector(component, host, attrs), sink, context, registry, suffix);
            }
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
