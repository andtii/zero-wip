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

function emitPartStyles(
    component: ManifestComponent,
    partName: string,
    styles: PartStyles,
    baseSelector: string,
    out: string[],
): void {
    const part = findPart(component, partName);
    if (styles.base && Object.keys(styles.base).length > 0) {
        out.push(`    ${baseSelector} {\n${declBlock(styles.base, '        ')}\n    }`);
    }
    for (const [state, props] of Object.entries(styles.states ?? {})) {
        const sel = stateSelector(component, part, state);
        // Empty blocks are legal recipe entries (they mark a state as
        // deliberately covered for the validator) but emit no CSS.
        if (Object.keys(props).length === 0) continue;
        out.push(`    ${baseSelector}${sel} {\n${declBlock(props, '        ')}\n    }`);
    }
    for (const [nested, props] of Object.entries(styles.selectors ?? {})) {
        if (Object.keys(props).length === 0) continue;
        const sel = nested.includes('&') ? nested.replace(/&/g, baseSelector) : `${baseSelector} ${nested}`;
        out.push(`    ${sel} {\n${declBlock(props, '        ')}\n    }`);
    }
}

function axisAttr(axis: string): string {
    return VARIANT_AXES[axis] ?? `data-${axis}`;
}

/** Compile one recipe to CSS (inside `@layer zero.recipes`). */
export function compileRecipeCss(recipe: RecipeInput, component: ManifestComponent): string {
    if (recipe.component !== component.scope) {
        throw new Error(
            `[zero-kit] recipe component "${recipe.component}" does not match anatomy scope "${component.scope}"`,
        );
    }
    const out: string[] = [];

    // Component-level tokens on the carrier part.
    if (recipe.tokens && Object.keys(recipe.tokens).length > 0) {
        const carrier = partSelector(component.scope, carrierPart(component));
        out.push(`    ${carrier} {\n${declBlock(recipe.tokens, '        ')}\n    }`);
    }

    for (const [partName, styles] of Object.entries(recipe.parts)) {
        emitPartStyles(component, partName, styles, partSelector(component.scope, partName), out);
    }

    for (const [axis, values] of Object.entries(recipe.variants ?? {})) {
        const attr = axisAttr(axis);
        for (const [value, parts] of Object.entries(values)) {
            for (const [partName, styles] of Object.entries(parts)) {
                findPart(component, partName);
                const selector = variantSelector(component, partName, `[${attr}="${value}"]`);
                emitPartStyles(component, partName, styles, selector, out);

                // CSS-only default: the same styles apply when the attribute
                // is absent. Never conflicts with the explicit-value rule —
                // the attribute is either present or not.
                if (recipe.defaultVariants?.[axis] === value) {
                    const dflt = variantSelector(component, partName, `:not([${attr}])`);
                    emitPartStyles(component, partName, styles, dflt, out);
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
            emitPartStyles(component, partName, styles, variantSelector(component, partName, attrs), out);
        }
    }

    let css = `@layer zero.recipes {\n${out.join('\n\n')}\n}\n`;
    for (const [name, body] of Object.entries(recipe.keyframes ?? {})) {
        css += `@keyframes ${name} {\n    ${body.trim()}\n}\n`;
    }
    return css;
}
