/**
 * Recipe CONTENT validation — the half of the generate → validate → iterate
 * loop that was missing.
 *
 * Structure was already checked hard: an unknown part or state fails the
 * build. But nothing looked inside a declaration, so the mistakes a generator
 * actually makes were all silent — a typo'd `var(--color-brnad)` compiled
 * straight through to the shipped stylesheet, where it resolves to nothing.
 */
import { parse, converter } from 'culori';
import type { ManifestPart, ZeroManifest } from './contract.js';
import { TOKEN_KEY_PATTERN, VARIANT_AXES } from './contract.js';
import type { CssProps, PartStyles, RecipeInput } from './recipes.js';
import type { ValidationIssue } from './validate.js';
import type { TokenVocabulary } from './vocabulary.js';

const VAR_REF = /var\(\s*(--[A-Za-z0-9_-]+)\s*(,)?/g;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const COLOR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
/** A bare time, i.e. not `var(--duration-…)`. */
const BARE_TIME = /(?:^|[\s,(])(-?(?:\d+\.?\d*|\.\d+)m?s)(?=[\s,)]|$)/;

/** Properties whose values are prose or identifiers, not colors. */
const NOT_COLOR_VALUED = new Set([
    'content', 'font', 'fontFamily', 'gridTemplateAreas', 'counterReset', 'counterIncrement',
]);

const toOklch = converter('oklch');

/**
 * Achromatic-with-alpha values are shadows and scrims, not palette colors.
 *
 * Without this every raw color in both shipped design systems — all of them
 * `oklch(0% 0 0 / α)` — would be flagged, and the rule would be turned off
 * rather than obeyed.
 */
/**
 * The properties that keep an element rendered through its exit. Transitioning
 * one of these with `allow-discrete` is what buys the closing animation;
 * `overlay` is additionally what keeps a popup in the top layer.
 */
const DISCRETE_PRESENCE_PROPERTIES = ['display', 'overlay', 'content-visibility'] as const;

function isScrim(literal: string): boolean {
    const parsed = parse(literal);
    if (!parsed) return false;
    if ((parsed.alpha ?? 1) >= 1) return false;
    return (toOklch(parsed)?.c ?? 0) < 0.02;
}

/**
 * Remove every `var(…)` call, matching parens rather than scanning to the
 * first `)`. A fallback can itself contain a function
 * (`var(--x, color-mix(in oklab, …))`), which the naive form cuts in half and
 * leaves fragments of behind.
 */
function stripVars(value: string): string {
    let out = '';
    for (let i = 0; i < value.length; i++) {
        if (!value.startsWith('var(', i)) {
            out += value[i];
            continue;
        }
        let depth = 0;
        let j = i + 3;
        for (; j < value.length; j++) {
            if (value[j] === '(') depth++;
            else if (value[j] === ')' && --depth === 0) break;
        }
        i = j; // skip the whole call; an unbalanced tail drops entirely
    }
    return out;
}

/** Every color literal in a value, ignoring the contents of `var()`. */
function colorLiterals(value: string): string[] {
    const withoutVars = stripVars(value);
    const found = [...withoutVars.matchAll(HEX)].map((m) => m[0]);
    for (const m of withoutVars.matchAll(COLOR_FN)) {
        // Balance from the opening paren so nested functions come along.
        let depth = 0;
        for (let i = m.index! + m[0].length - 1; i < withoutVars.length; i++) {
            if (withoutVars[i] === '(') depth++;
            else if (withoutVars[i] === ')' && --depth === 0) {
                found.push(withoutVars.slice(m.index!, i + 1));
                break;
            }
        }
    }
    return found;
}

/** Walk every declaration a recipe contains, with a path for diagnostics. */
function* declarations(recipe: RecipeInput): Generator<{ path: string; props: CssProps }> {
    function* fromPart(path: string, styles: PartStyles): Generator<{ path: string; props: CssProps }> {
        if (styles.base) yield { path: `${path}.base`, props: styles.base };
        for (const [state, props] of Object.entries(styles.states ?? {})) {
            yield { path: `${path}.states.${state}`, props };
        }
        for (const [sel, props] of Object.entries(styles.selectors ?? {})) {
            yield { path: `${path}.selectors["${sel}"]`, props };
        }
        for (const [key, nested] of Object.entries(styles.at ?? {})) {
            yield* fromPart(`${path}.at["${key}"]`, nested);
        }
    }

    if (recipe.tokens) yield { path: 'tokens', props: recipe.tokens };
    for (const [part, styles] of Object.entries(recipe.parts)) yield* fromPart(`parts.${part}`, styles);
    for (const [axis, values] of Object.entries(recipe.variants ?? {})) {
        for (const [value, parts] of Object.entries(values)) {
            for (const [part, styles] of Object.entries(parts)) {
                yield* fromPart(`variants.${axis}.${value}.${part}`, styles);
            }
        }
    }
    const compounds = recipe.compoundVariants ?? [];
    for (let i = 0; i < compounds.length; i++) {
        for (const [part, styles] of Object.entries(compounds[i]!.parts)) {
            yield* fromPart(`compoundVariants[${i}].parts.${part}`, styles);
        }
    }
}

/** Custom properties a recipe defines itself, so referencing them is fine. */
function locallyDefined(recipe: RecipeInput): Set<string> {
    const names = new Set(Object.keys(recipe.tokens ?? {}));
    for (const { props } of declarations(recipe)) {
        for (const prop of Object.keys(props)) if (prop.startsWith('--')) names.add(prop);
    }
    return names;
}

/** Every state/flag name a part can carry. */
const partVocabulary = (part: ManifestPart): string[] => [
    ...(part.states ?? []),
    ...(part.flags ?? []),
];

export function validateRecipes(
    recipes: readonly RecipeInput[],
    manifest: Pick<ZeroManifest, 'components'>,
    vocabulary: TokenVocabulary,
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const error = (where: string, message: string) => issues.push({ level: 'error', where, message });
    const warn = (where: string, message: string) => issues.push({ level: 'warning', where, message });

    // Axis names and values are interpolated into `[data-<axis>="<value>"]`.
    // The vocabularies are open by design, so "open" has to stop at what can
    // actually be an attribute — otherwise a value carrying a quote closes the
    // selector early and everything after it is read as CSS, silently styling
    // parts the recipe never named. `compileRecipeCss` escapes the value as
    // well; this is where an author gets told.
    const checkAxisName = (axis: string, where: string) => {
        if (!TOKEN_KEY_PATTERN.test(axis)) {
            error(where, `axis "${axis}" is not a kebab-case identifier — it becomes the attribute name data-${axis}`);
        }
    };
    const checkAxisValue = (axis: string, value: string, where: string) => {
        if (!TOKEN_KEY_PATTERN.test(value)) {
            error(where, `"${value}" is not a kebab-case identifier — it becomes the attribute value in [data-${axis}="…"]`);
        }
    };

    const byScope = new Map(manifest.components.map((c) => [c.scope, c]));

    // ── every component the manifest declares should be styled ──
    const styled = new Set(recipes.map((r) => r.component));
    const unstyled = manifest.components.map((c) => c.scope).filter((s) => !styled.has(s));
    if (unstyled.length > 0) {
        warn(
            'recipes',
            `${unstyled.length} component(s) have no recipe and will render unstyled: ${unstyled.join(', ')}`,
        );
    }

    for (const recipe of recipes) {
        const component = byScope.get(recipe.component);
        if (!component) continue; // already an error elsewhere
        const where = `recipes.${recipe.component}`;
        const local = locallyDefined(recipe);
        const partsByName = new Map(component.parts.map((p) => [p.name, p]));

        // ── token references and literal values ──
        const values: Array<{ path: string; prop: string; value: string }> = [];
        for (const { path, props } of declarations(recipe)) {
            for (const [prop, raw] of Object.entries(props)) {
                values.push({ path, prop, value: String(raw) });
            }
        }
        for (const [name, body] of Object.entries(recipe.keyframes ?? {})) {
            values.push({ path: `keyframes.${name}`, prop: '', value: body });
        }
        if (recipe.css) values.push({ path: 'css', prop: '', value: recipe.css });

        for (const { path, prop, value } of values) {
            for (const match of value.matchAll(VAR_REF)) {
                const token = match[1]!;
                const hasFallback = Boolean(match[2]);
                if (vocabulary.names.has(token) || local.has(token)) continue;
                const near = vocabulary.nearest(token);
                const hint = near ? ` — did you mean "${near}"?` : '';
                if (hasFallback) {
                    warn(
                        `${where}.${path}`,
                        `references undeclared token "${token}", but has a fallback so it still renders${hint}`,
                    );
                } else {
                    error(
                        `${where}.${path}`,
                        `references "${token}", which this design system never declares — it resolves to nothing${hint}`,
                    );
                }
            }

            if (!NOT_COLOR_VALUED.has(prop) && !value.includes('"') && !value.includes("'")) {
                for (const literal of colorLiterals(value)) {
                    if (isScrim(literal)) continue;
                    warn(
                        `${where}.${path}`,
                        `hardcodes the color "${literal}" — reference a declared role so the design system can retheme it`,
                    );
                }
            }

            // A literal duration opts the rule out of prefers-reduced-motion,
            // which only collapses `var(--duration-*)`. Looping animations are
            // exempt: collapsing those speeds them up instead of stopping them.
            const isTiming = prop === 'transition' || prop.startsWith('transition');
            if (isTiming && BARE_TIME.test(value)) {
                warn(
                    `${where}.${path}`,
                    `"${prop}" uses a literal duration — reference var(--duration-*) so reduced motion applies`,
                );
            }
        }

        // ── presence: an entry animation without an exit ──
        //
        // `@starting-style` gives the state an element animates FROM, so a
        // part that declares it is asking for an entry animation. Two ways
        // that silently half-works, both checkable:
        //
        //  - no `transition` at all, so there is nothing to interpolate and
        //    the starting styles are simply never used;
        //  - a transition that doesn't carry `display`/`overlay` through
        //    `allow-discrete`, so the element is gone before the exit can
        //    play. The entry animates, the exit does not, and nothing says so.
        const declaresEntry = (styles: PartStyles): boolean =>
            Object.entries(styles.at ?? {}).some(
                ([key, nested]) =>
                    key === 'starting-style' || key.trim() === '@starting-style' || declaresEntry(nested),
            );
        const transitionValues = (styles: PartStyles): string[] => [
            ...[styles.base, ...Object.values(styles.states ?? {}), ...Object.values(styles.selectors ?? {})]
                .flatMap((block) => Object.entries(block ?? {}))
                .filter(([prop]) => prop === 'transition' || prop === 'transitionBehavior')
                .map(([, value]) => String(value)),
            ...Object.values(styles.at ?? {}).flatMap(transitionValues),
        ];
        // Every source of styles for a part, keyed by part: a variant can
        // carry an entry animation as readily as the base block, and its
        // transition may live in either.
        const partSources = new Map<string, PartStyles[]>();
        const addSource = (part: string, styles: PartStyles): void => {
            partSources.set(part, [...(partSources.get(part) ?? []), styles]);
        };
        for (const [part, styles] of Object.entries(recipe.parts)) addSource(part, styles);
        for (const values of Object.values(recipe.variants ?? {})) {
            for (const parts of Object.values(values)) {
                for (const [part, styles] of Object.entries(parts)) addSource(part, styles);
            }
        }
        for (const compound of recipe.compoundVariants ?? []) {
            for (const [part, styles] of Object.entries(compound.parts)) addSource(part, styles);
        }

        for (const [partName, sources] of partSources) {
            // Recursive: a responsive entry animation nests the starting
            // styles under the breakpoint, and needs the exit half just the same.
            if (!sources.some(declaresEntry)) continue;
            const transitions = sources.flatMap(transitionValues);
            if (transitions.length === 0) {
                warn(
                    `${where}.${partName}`,
                    'declares starting-style but never transitions, so the entry styles are never used',
                );
                continue;
            }
            // Both halves are needed, and they can live in separate
            // declarations (`transition-behavior` alongside a `transition`
            // list). `allow-discrete` on its own changes nothing if the list
            // holds only continuous properties like opacity — the element
            // still stops being rendered immediately.
            const allowsDiscrete = transitions.some((value) => value.includes('allow-discrete'));
            const movesDiscrete = transitions.some((value) =>
                DISCRETE_PRESENCE_PROPERTIES.some((prop) => new RegExp(`(^|[\\s,])${prop}([\\s,]|$)`).test(value)));
            if (!allowsDiscrete || !movesDiscrete) {
                warn(
                    `${where}.${partName}`,
                    'declares starting-style but does not transition a discrete property with allow-discrete — ' +
                    'the entry will animate and the exit will not, because the element stops being rendered ' +
                    'before it can play. Transition `display` (and `overlay`, for a top-layer popup) with ' +
                    'allow-discrete',
                );
            }
        }

        // ── focus-visible coverage ──
        const focusableParts = component.parts.filter((p) => (p.flags ?? []).includes('focus-visible'));
        if (focusableParts.length > 0) {
            // An EMPTY block doesn't count. `states: { 'focus-visible': {} }`
            // is the established "deliberately covered, no styling" idiom, so
            // accepting it here would let a recipe satisfy the rule while
            // rendering no visible ring at all — `skipStates` is how you say
            // the ring lives somewhere else.
            const stylesFocus = (styles: PartStyles | undefined): boolean => {
                if (!styles) return false;
                if (Object.keys(styles.states?.['focus-visible'] ?? {}).length > 0) return true;
                return Object.values(styles.at ?? {}).some(stylesFocus);
            };
            const anywhere = focusableParts.some((p) => stylesFocus(recipe.parts[p.name]));
            if (!anywhere) {
                error(
                    where,
                    `styles no focus-visible state, so keyboard focus is invisible on ${focusableParts.map((p) => p.name).join(', ')}`,
                );
            }
            for (const part of focusableParts) {
                const skipped = new Set(recipe.skipStates?.[part.name] ?? []);
                if (recipe.parts[part.name] && !stylesFocus(recipe.parts[part.name]) && !skipped.has('focus-visible')) {
                    warn(
                        `${where}.${part.name}`,
                        'declares focus-visible but does not style it — delegate deliberately by listing it in skipStates',
                    );
                }
            }
        }

        // ── skipStates must name something real ──
        for (const [partName, skipped] of Object.entries(recipe.skipStates ?? {})) {
            const part = partsByName.get(partName);
            if (!part) {
                error(`${where}.skipStates`, `"${partName}" is not a part of "${recipe.component}"`);
                continue;
            }
            const known = new Set(partVocabulary(part));
            for (const name of skipped) {
                if (!known.has(name)) {
                    error(
                        `${where}.skipStates.${partName}`,
                        `"${name}" is neither a state nor a flag of "${partName}" (has: ${[...known].join(', ') || 'none'})`,
                    );
                }
            }
        }

        // ── variant axes and values ──
        for (const [axis, values_] of Object.entries(recipe.variants ?? {})) {
            checkAxisName(axis, `${where}.variants`);
            for (const value of Object.keys(values_)) {
                checkAxisValue(axis, value, `${where}.variants.${axis}`);
            }
            if (!Object.hasOwn(VARIANT_AXES, axis)) {
                warn(
                    `${where}.variants`,
                    `axis "${axis}" is not a contract axis (${Object.keys(VARIANT_AXES).join(', ')}) — the data-${axis} selectors are emitted, but no zero component ever sets that attribute, so nothing can match them`,
                );
            }
            if (axis === 'size') {
                // Checked against the DESIGN SYSTEM's ramp, not a fixed one:
                // `tokens.sizes` if it declared its own (Material's density
                // steps, a numbered ramp), else the recommended xs–xl.
                for (const value of Object.keys(values_)) {
                    if (!vocabulary.sizes.includes(value)) {
                        warn(
                            `${where}.variants.size`,
                            `"${value}" is not on this design system's size ramp (${vocabulary.sizes.join(', ')}) — declare it in tokens.sizes if it belongs there`,
                        );
                    }
                }
            }
        }

        for (const compound of recipe.compoundVariants ?? []) {
            for (const [axis, value] of Object.entries(compound.match)) {
                checkAxisName(axis, `${where}.compoundVariants`);
                checkAxisValue(axis, value, `${where}.compoundVariants.${axis}`);
            }
        }

        // ── variants need a `root` part to hang the attribute on ──
        const hasVariants = Object.keys(recipe.variants ?? {}).length > 0
            || (recipe.compoundVariants?.length ?? 0) > 0;
        if (hasVariants && !partsByName.has('root')) {
            error(
                `${where}.variants`,
                `"${recipe.component}" has no "root" part, so the variant attribute falls back to "${component.parts[0]?.name}" — ` +
                'the generated descendant selectors would not match and the rules are dead',
            );
        }
    }

    return issues;
}
