/**
 * Lynx recipe emitter — compiles a `RecipeInput` against a component's
 * anatomy into class-grammar CSS. Same manifest contract as the web emitter
 * (unknown parts and states are hard errors), different projection:
 *
 * - Every selector is a flat class compound on the styled part itself.
 *   `[data-scope="tabs"][data-part="tab"][data-state="active"]` becomes
 *   `.zx-tabs__tab.zx-s-active`. Machine states and flags resolve through
 *   the manifest's `states`/`flags`; the web's interaction pseudo-classes
 *   resolve through `INTERACTION_STATE_CLASSES` (runtime-stamped flag
 *   classes; `hover` has no pointer and is dropped with a report entry).
 * - Axis rules follow the push-down contract: the runtime stamps
 *   `zx-a-*`/`zx-m-*` classes on every part from carrier context, so a
 *   variant rule is `.zx-btn__root.zx-a-variant-solid { … }` on ANY part —
 *   never a descendant selector, and never the web's `@scope` donut or
 *   `:not()` default twins (the runtime always stamps a concrete value).
 * - Anatomy `pseudo` parts are REAL parts here (a lynx dialog backdrop is a
 *   rendered view), so they style as their own part class — `partProjection`
 *   has no lynx counterpart by design.
 * - Conditions (`at:`) and `selectors:` keys the grammar cannot express are
 *   dropped with report entries; two attribute patterns the contract owns
 *   (`&[data-orientation="…"]`, `&[data-placement="…"]`) translate to their
 *   grammar classes instead.
 * - Declarations are capability-checked one by one: `var(--press-*)` rejects
 *   (web-runtime mechanism), color functions bake to literals (theme-var-
 *   dependent ones drop with a report — a recipe is theme-agnostic, so
 *   nothing here can bake them per theme), `calc()` over `var()` drops
 *   (unproven on lynx), and the `flex: <n>` shorthand expands to long-form
 *   (lynx expands it RN-style, collapsing layout).
 */
import type { ManifestComponent, ManifestPart } from '../../contract.js';
import { carrierPart } from '../../contract.js';
import type { CssProps, PartStyles, RecipeInput } from '../../recipes.js';
import { assertAxisToken, assertKeyframesName, declBlock, findPart, kebab } from '../shared.js';
import type { LynxCapabilityReport } from './capabilities.js';
import {
    INTERACTION_STATE_CLASSES,
    bakeColorValue,
    hasUnsupportedColorFunction,
    runtimePropertyIn,
} from './capabilities.js';
import { axisClass, flagClass, modClass, orientationClass, partClass, placementClass, stateClass } from './class-names.js';

/**
 * One state key resolved to the class that narrows it, `null` for a state
 * that exists on the web and has no lynx projection (`hover`), or an error
 * for a state the contract does not know at all.
 */
function stateClassFor(component: ManifestComponent, part: ManifestPart, state: string): string | null {
    // Anatomy wins over interaction states, exactly like the web emitter: a
    // part with a machine state named `active` styles `.zx-s-active`, not the
    // pressed flag.
    if (part.states?.includes(state)) return `.${stateClass(state)}`;
    if (part.flags?.includes(state)) return `.${flagClass(state)}`;
    if (state in INTERACTION_STATE_CLASSES) {
        const cls = INTERACTION_STATE_CLASSES[state];
        return cls ? `.${cls}` : null;
    }
    const known = [
        ...(part.states ?? []),
        ...(part.flags ?? []),
        ...Object.keys(INTERACTION_STATE_CLASSES),
    ].join(', ');
    throw new Error(
        `[zero-kit] recipe for "${component.scope}"."${part.name}" styles unknown state "${state}" (known: ${known})`,
    );
}

/**
 * The two `selectors:` patterns the contract itself owns and the grammar can
 * therefore express: `&[data-orientation="…"]` and `&[data-placement="…"]`.
 * Everything else in the escape hatch is web spelling by definition.
 */
const CONTRACT_ATTR_PATTERN = /^&\[data-(orientation|placement)="([a-z-]+)"\]$/;

/** `flex: <number>` — the shorthand lynx expands RN-style (grow N shrink 1 basis auto). */
const FLEX_NUMBER = /^\s*(\d+(?:\.\d+)?)\s*$/;

/**
 * Capability-check one declaration block. Returns the props to emit; pushes
 * report entries for what it drops; throws for what the target must refuse.
 */
function checkedProps(
    props: CssProps,
    where: string,
    report: LynxCapabilityReport,
): CssProps {
    const out: CssProps = {};
    for (const [prop, raw] of Object.entries(props)) {
        const value = String(raw);
        const runtime = runtimePropertyIn(`${prop} ${value}`);
        if (runtime) {
            throw new Error(
                `[zero-kit] ${where}: "${prop}" references ${runtime}, a web-runtime-published property with no lynx equivalent — move the declaration into the recipe's web target section`,
            );
        }
        const flexNumber = kebab(prop) === 'flex' ? FLEX_NUMBER.exec(value) : null;
        if (flexNumber) {
            // `flex: <n>` means grow n / shrink 1 / basis 0% — lynx expands
            // the shorthand to `1 1 auto` instead, collapsing layouts, so the
            // long form is written for it.
            out['flexGrow'] = flexNumber[1]!;
            out['flexShrink'] = '1';
            out['flexBasis'] = '0%';
            report.translated.push({ where, what: `flex: ${value}`, detail: 'expanded to flex-grow/flex-shrink/flex-basis — lynx mis-expands the shorthand' });
            continue;
        }
        if (value.includes('calc(') && value.includes('var(')) {
            report.dropped.push({
                where,
                what: `${prop}: ${value}`,
                detail: 'calc() over var() is unproven on lynx — dropped; supply a lynx replacement in the recipe target section',
            });
            continue;
        }
        if (hasUnsupportedColorFunction(value)) {
            if (value.includes('var(')) {
                report.dropped.push({
                    where,
                    what: `${prop}: ${value}`,
                    detail: 'a color function over theme variables cannot bake in theme-agnostic component CSS — dropped; supply a lynx replacement in the recipe target section',
                });
                continue;
            }
            out[prop] = bakeColorValue(value, {}, 'light', where);
            continue;
        }
        out[prop] = value;
    }
    return out;
}

/**
 * Emit one part's styles as flat class-compound rules. `extraClasses` carries
 * the axis/modifier compound for variant emissions — attached to the part
 * class itself per the push-down contract.
 */
function emitPartStyles(
    component: ManifestComponent,
    partName: string,
    styles: PartStyles,
    extraClasses: string,
    rules: string[],
    report: LynxCapabilityReport,
): void {
    const part = findPart(component, partName);
    const where = `lynx recipe for "${component.scope}"."${partName}"`;
    const base = `.${partClass(component.scope, partName)}${extraClasses}`;
    const rule = (selector: string, props: CssProps) => {
        const checked = checkedProps(props, where, report);
        if (Object.keys(checked).length === 0) return;
        rules.push(`${selector} {\n${declBlock(checked, '    ', where)}\n}`);
    };

    if (styles.base && Object.keys(styles.base).length > 0) {
        rule(base, styles.base);
    }
    for (const [state, props] of Object.entries(styles.states ?? {})) {
        if (Object.keys(props).length === 0) continue;
        const cls = stateClassFor(component, part, state);
        if (cls === null) {
            report.dropped.push({
                where,
                what: `states.${state}`,
                detail: 'no hover on a touch platform — dropped; press styling flows through the pressed flag instead',
            });
            continue;
        }
        rule(`${base}${cls}`, props);
    }
    for (const [nested, props] of Object.entries(styles.selectors ?? {})) {
        if (Object.keys(props).length === 0) continue;
        const contractAttr = CONTRACT_ATTR_PATTERN.exec(nested);
        if (contractAttr) {
            const cls = contractAttr[1] === 'orientation'
                ? orientationClass(contractAttr[2]!)
                : placementClass(contractAttr[2]!);
            rule(`${base}.${cls}`, props);
            continue;
        }
        report.dropped.push({
            where,
            what: `selectors["${nested}"]`,
            detail: 'not expressible in the class grammar — dropped; supply a lynx replacement in the recipe target section',
        });
    }
    for (const [key] of Object.entries(styles.at ?? {})) {
        report.dropped.push({
            where,
            what: `at["${key}"]`,
            detail: 'conditional rules (@media/@supports/breakpoints) are not emitted on this target — responsive styling is runtime JS on lynx',
        });
    }
}

/** Compile one recipe to lynx class-grammar CSS. */
export function compileLynxRecipeCss(
    recipe: RecipeInput,
    component: ManifestComponent,
    report: LynxCapabilityReport,
): string {
    if (recipe.component !== component.scope) {
        throw new Error(
            `[zero-kit] recipe component "${recipe.component}" does not match anatomy scope "${component.scope}"`,
        );
    }
    const rules: string[] = [];
    const scope = component.scope;

    if (recipe.tokens && Object.keys(recipe.tokens).length > 0) {
        const where = `lynx recipe for "${scope}" tokens`;
        const checked = checkedProps(recipe.tokens, where, report);
        if (Object.keys(checked).length > 0) {
            rules.push(`.${partClass(scope, carrierPart(component))} {\n${declBlock(checked, '    ', where)}\n}`);
        }
    }

    for (const [partName, styles] of Object.entries(recipe.parts)) {
        emitPartStyles(component, partName, styles, '', rules, report);
    }

    for (const [axis, values] of Object.entries(recipe.variants ?? {})) {
        assertAxisToken('axis', axis, scope);
        for (const [value, parts] of Object.entries(values)) {
            const compound = `.${axisClass(axis, assertAxisToken('value', value, scope))}`;
            for (const [partName, styles] of Object.entries(parts)) {
                // No `:not()` default twin: the runtime always stamps a
                // concrete axis class, explicit or default.
                emitPartStyles(component, partName, styles, compound, rules, report);
            }
        }
    }

    for (const [name, parts] of Object.entries(recipe.modifiers ?? {})) {
        const compound = `.${modClass(assertAxisToken('modifier', name, scope))}`;
        for (const [partName, styles] of Object.entries(parts)) {
            emitPartStyles(component, partName, styles, compound, rules, report);
        }
    }

    for (const compoundVariant of recipe.compoundVariants ?? []) {
        // A conjunction is just a longer compound. The web's defaulted-value
        // alternative (`:not([attr])`) has no counterpart here — the runtime
        // stamps the default's concrete class, so the explicit compound
        // already matches.
        const compound = Object.entries(compoundVariant.match)
            .map(([axis, value]) => value === true
                ? `.${modClass(assertAxisToken('modifier', axis, scope))}`
                : `.${axisClass(axis, assertAxisToken('value', value, scope))}`)
            .join('');
        for (const [partName, styles] of Object.entries(compoundVariant.parts)) {
            emitPartStyles(component, partName, styles, compound, rules, report);
        }
    }

    if (recipe.css?.trim()) {
        throw new Error(
            `[zero-kit] lynx recipe for "${scope}": the raw css escape hatch is web spelling by definition — move it into the recipe's web target section`,
        );
    }

    let css = rules.length > 0 ? `${rules.join('\n\n')}\n` : '';
    for (const [name, body] of Object.entries(recipe.keyframes ?? {})) {
        assertKeyframesName(name, scope);
        css += `@keyframes ${name} {\n    ${body.trim()}\n}\n`;
    }
    return css;
}
