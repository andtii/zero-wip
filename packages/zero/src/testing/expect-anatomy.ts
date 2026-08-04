import type { Anatomy } from '../contract/anatomy.js';
import { MOD_ATTR_PREFIX, RESERVED_AXES, VARIANT_AXES } from '../contract/props.js';
import { TOKEN_KEY_PATTERN as AXIS_NAME_PATTERN } from '../contract/tokens.js';

/**
 * Options for `expectAnatomy`. A component that renders custom `axes`
 * (`data-<axis>` via `variantAttrs`) must name them here — the assertion
 * cannot tell an undeclared flag from an axis it has never heard of.
 */
export interface ExpectAnatomyOptions {
    axes?: readonly string[];
}

/**
 * Attributes the anatomy contract itself owns. `data-placement` is NOT here:
 * it is declared contract data (`PartSpec.placements`), checked per part like
 * `data-state` — the blanket exemption it used to have let any part carry any
 * placement unchecked.
 */
const CONTRACT_ATTRS = new Set([
    'data-scope', 'data-part', 'data-state', 'data-orientation',
    'data-color', 'data-size', 'data-variant',
]);

function fail(anatomy: Anatomy, message: string): never {
    throw new Error(`[zero] expectAnatomy(${anatomy.scope}): ${message}`);
}

/**
 * The anatomy doubles as a test oracle: walk every rendered part of a scope
 * and check it against the declaration — known part, `data-state` from the
 * closed set, flags from the declared set, presence-only flag values, and the
 * `hidden` attribute exactly where `hiddenIn` says it goes.
 *
 * Framework-agnostic on purpose — it throws a plain `Error` rather than using
 * any test runner's assertion API, so an ecosystem component package can hold
 * its parts to the same contract zero's own components are held to, under
 * whatever runner it uses.
 */
export function expectAnatomy(container: ParentNode, anatomy: Anatomy, options: ExpectAnatomyOptions = {}): void {
    // The same guards `variantAttrs` enforces at render time: an axis the
    // contract owns could never legitimately render, so declaring one here
    // would silently exempt a real attribute from the walk.
    for (const axis of options.axes ?? []) {
        if (RESERVED_AXES.has(axis) || Object.prototype.hasOwnProperty.call(VARIANT_AXES, axis)) {
            fail(anatomy, `axes: "${axis}" is part of the anatomy contract — data-${axis} already means something and cannot be exempted`);
        }
        // HTML lowercases attribute names, so a camelCase entry would build an
        // exemption no attribute can ever match — the misconfiguration surfaces
        // as a baffling "undeclared flag" failure unless caught here.
        if (!AXIS_NAME_PATTERN.test(axis)) {
            fail(anatomy, `axes: "${axis}" is not a kebab-case identifier — it becomes the attribute name data-${axis}`);
        }
        // A "mod-…" axis would land its exemption inside the modifier
        // namespace and skip the presence-only check that walk enforces.
        if (`data-${axis}`.startsWith(MOD_ATTR_PREFIX)) {
            fail(anatomy, `axes: "${axis}" is inside the modifier namespace (${MOD_ATTR_PREFIX}*) — declare it through mods, not axes`);
        }
    }
    const axisAttrs = new Set((options.axes ?? []).map((axis) => `data-${axis}`));
    const selector = `[data-scope="${anatomy.scope}"]`;
    // querySelectorAll only sees descendants, and the container is often the
    // component's own root part — which must not escape the walk. Duck-typed
    // rather than `instanceof Element`: a Document or DocumentFragment has no
    // `matches`, and cross-realm elements fail instanceof.
    const rendered = [
        ...('matches' in container && (container as Element).matches(selector) ? [container as Element] : []),
        ...container.querySelectorAll(selector),
    ];
    if (rendered.length === 0) fail(anatomy, 'no parts rendered for this scope');

    for (const el of rendered) {
        const partName = el.getAttribute('data-part');
        if (!partName) fail(anatomy, 'every scoped element declares data-part');
        const spec = anatomy.parts[partName];
        if (!spec) fail(anatomy, `part "${partName}" is not declared in the anatomy`);

        const state = el.getAttribute('data-state');
        if (state !== null && !(spec.states ?? []).includes(state)) {
            fail(anatomy, `part "${partName}" renders data-state="${state}", which is not in its declared set [${(spec.states ?? []).join(', ')}]`);
        }

        // `data-placement` is declared contract data, exactly like states: a
        // part that can carry it names its subset, and one that declares
        // nothing must render nothing.
        const placement = el.getAttribute('data-placement');
        if (placement !== null) {
            if (!spec.placements) {
                fail(anatomy, `part "${partName}" renders data-placement="${placement}" but declares no placements`);
            }
            if (!spec.placements.includes(placement)) {
                fail(anatomy, `part "${partName}" renders data-placement="${placement}", which is not in its declared set [${spec.placements.join(', ')}]`);
            }
        }

        // `hiddenIn` is a promise about the DOM, and design systems style
        // against it (a state that never paints needs no rule), so it is
        // checked in BOTH directions: hidden in every state it names, visible
        // in every state it doesn't. An undeclared `hidden` is the failure
        // that matters — it makes a real state invisible to the reader while
        // the contract says it paints.
        const hiddenIn = spec.hiddenIn ?? [];
        const isHidden = el.hasAttribute('hidden');
        if (isHidden || hiddenIn.length) {
            const shouldHide = state !== null && hiddenIn.includes(state);
            if (isHidden !== shouldHide) {
                fail(anatomy, `part "${partName}" in state "${state}" is ${isHidden ? 'hidden' : 'visible'} but the anatomy says otherwise (hiddenIn: [${hiddenIn.join(', ')}])`);
            }
        }

        // The declared part tree, checked against the real DOM: a part with a
        // `parent` must render somewhere INSIDE that part. Ancestors rather
        // than the immediate parent element, because other parts and consumer
        // markup legally sit in between (a menu item inside a group is still
        // inside the popup). A part with no declared parent claims nothing —
        // which is what keeps nested INSTANCES legal (a card in a card puts
        // the inner root under the outer body, and that is not misnesting).
        if (spec.parent) {
            let ancestor = el.parentElement;
            let found = false;
            while (ancestor) {
                if (ancestor.getAttribute('data-scope') === anatomy.scope
                    && ancestor.getAttribute('data-part') === spec.parent) {
                    found = true;
                    break;
                }
                ancestor = ancestor.parentElement;
            }
            if (!found) {
                fail(anatomy, `part "${partName}" renders outside its declared parent "${spec.parent}" — no ancestor carries data-part="${spec.parent}"`);
            }
        }

        for (const attr of el.getAttributeNames()) {
            if (!attr.startsWith('data-') || CONTRACT_ATTRS.has(attr) || axisAttrs.has(attr)) continue;
            // Checked against the part's declared subset above — here it must
            // only not fall through into the flag walk.
            if (attr === 'data-placement') continue;
            // Modifiers are declared design-system vocabulary rendered through
            // `mods`, namespaced so they can never collide with flags — exempt
            // from declaration, but presence-only like every boolean attribute.
            if (attr.startsWith(MOD_ATTR_PREFIX)) {
                if (el.getAttribute(attr) !== '') {
                    fail(anatomy, `modifier ${attr} on part "${partName}" must be presence-only, got "${el.getAttribute(attr)}"`);
                }
                continue;
            }
            const flag = attr.slice(5);
            if (!(spec.flags ?? []).includes(flag)) {
                fail(anatomy, `part "${partName}" renders undeclared flag "${flag}"`);
            }
            if (el.getAttribute(attr) !== '') {
                fail(anatomy, `flag ${attr} on part "${partName}" must be presence-only, got "${el.getAttribute(attr)}"`);
            }
        }
    }
}
