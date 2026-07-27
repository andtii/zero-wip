/**
 * Machine-readable component anatomy.
 *
 * Every zero component ships an `Anatomy`: the closed set of parts it
 * renders, the `data-state` values and boolean flags each part can carry,
 * and hints about which contract token groups apply. The anatomy is the
 * SOURCE OF TRUTH — the component imports part names from it, tests assert
 * against it, and the build emits the whole registry as `manifest.json` so
 * tooling (and AI generating a design system) can enumerate every styleable
 * selector without reading component code.
 */

/** Which contract token groups apply to a part — a styling hint for tooling. */
export type TokenHint =
    | 'color'
    | 'radius-selector'
    | 'radius-field'
    | 'radius-box'
    | 'size'
    | 'text';

/**
 * Web projection of a part that renders no element of its own: it hangs off
 * a pseudo-element of another part. `selector()` and the recipe compiler
 * compose `[data-part="<of>"]<state/flag fragments><selector>` — the
 * pseudo-element always last, so states narrow the HOST, which is the only
 * thing an attribute can narrow.
 *
 * The part itself stays real in the anatomy: platforms without the
 * pseudo-element (a Lynx dialog backdrop is a rendered view) project it like
 * any other part. Only the web selector shape is special.
 */
export interface PartPseudo {
    /** The rendered part the pseudo-element belongs to. */
    of: string;
    /** The pseudo-element, including the `::` (e.g. `'::backdrop'`). */
    selector: string;
}

export interface PartSpec {
    /**
     * Default rendered element, e.g. 'button', 'dialog', 'input'. For a
     * `pseudo` part, the element of the part it projects from.
     */
    element: string;
    /** Closed set of `data-state` values this part can carry, if any. */
    states?: readonly string[];
    /** Boolean `data-*` flags this part can carry (from the flag vocabulary). */
    flags?: readonly string[];
    /** Contract token groups that typically style this part. */
    tokens?: readonly TokenHint[];
    /** True when the part supports `asChild`. */
    asChild?: boolean;
    /** Present when the part projects onto a pseudo-element on the web. */
    pseudo?: PartPseudo;
}

export interface PartJSON extends PartSpec {
    name: string;
    /**
     * Ready-made CSS selector fragments per state/flag — what the recipe
     * compiler and raw-CSS validators consume. `states` values map to
     * `[data-state="x"]`, flags to `[data-x]`.
     */
    selectors: Record<string, string>;
}

export interface AnatomyJSON {
    scope: string;
    orientation?: boolean;
    parts: PartJSON[];
}

export interface Anatomy<S extends string = string, P extends string = string> {
    scope: S;
    parts: Record<P, PartSpec>;
    orientation?: boolean;
    /** All part names, in declaration order. */
    partNames(): P[];
    /**
     * CSS selector builder:
     * `dialogAnatomy.selector('trigger')` →
     * `[data-scope="dialog"][data-part="trigger"]`, optionally narrowed by a
     * state and/or flags.
     */
    selector(part: P, opts?: { state?: string; flags?: readonly string[] }): string;
    /** JSON-safe snapshot for tooling/AI — includes per-state selectors. */
    toJSON(): AnatomyJSON;
}

export function defineAnatomy<S extends string, P extends string>(
    scope: S,
    parts: Record<P, PartSpec>,
    opts?: { orientation?: boolean },
): Anatomy<S, P> {
    // No runtime guard that `pseudo.of` names a real part — defineAnatomy is
    // on every component's size budget, and zero's own anatomies (the only
    // web callers) are checked by the anatomy test suite instead.
    const selector = (part: P, o?: { state?: string; flags?: readonly string[] }): string => {
        const pseudo = parts[part].pseudo;
        let sel = `[data-scope="${scope}"][data-part="${pseudo?.of ?? part}"]`;
        if (o?.state) sel += `[data-state="${o.state}"]`;
        for (const flag of o?.flags ?? []) sel += `[data-${flag}]`;
        return pseudo ? sel + pseudo.selector : sel;
    };

    return {
        scope,
        parts,
        orientation: opts?.orientation,
        partNames: () => Object.keys(parts) as P[],
        selector,
        toJSON: (): AnatomyJSON => ({
            scope,
            ...(opts?.orientation ? { orientation: true } : {}),
            parts: (Object.keys(parts) as P[]).map((name) => {
                const spec = parts[name];
                const selectors: Record<string, string> = {};
                for (const state of spec.states ?? []) {
                    selectors[state] = `[data-state="${state}"]`;
                }
                for (const flag of spec.flags ?? []) {
                    selectors[flag] = `[data-${flag}]`;
                }
                return { name, ...spec, selectors };
            }),
        }),
    };
}
