/**
 * Manifest fragments — how an ecosystem component package joins the pipeline.
 *
 * An ecosystem package is a peer of `@sigx/zero`, not a plugin into it: it
 * ships its own anatomy (built with zero's public `defineAnatomy`) and
 * publishes it as a fragment — the `components` shape of zero's own manifest
 * plus the one fact zero's manifest never needs, WHO OWNS THE SCOPE. A design
 * system opts into covering the component by merging the fragment into the
 * manifest it compiles against; one that never merges it leaves the component
 * unstyled-but-accessible, which is the contract's baseline.
 *
 * Zero's own scope registry stays closed (`ZeroScope` is a literal union on
 * purpose — RFC 0002 §3.1). Merging does not reopen it: merged components
 * carry their `package` provenance, and every downstream consumer that must
 * distinguish zero-origin from ecosystem scopes (the register artifact's
 * compile gate, the api emitters' import specifiers) reads it from there.
 */
import type { ManifestComponent, ZeroManifest } from './contract.js';

export interface ManifestFragment {
    /**
     * The package that owns these scopes — provenance for diagnostics, the
     * import specifier for api-mode emitters, and required on purpose: an
     * unowned scope is exactly the anonymous drift the merge must not admit.
     */
    package: string;
    components: ManifestComponent[];
}

/**
 * Base manifest plus ecosystem fragments, as a new manifest — inputs are
 * never mutated. Each merged component is stamped with its fragment's
 * `package`; a scope collision is a hard error rather than a precedence rule,
 * because both spellings of that mistake (a fragment shadowing zero, two
 * fragments claiming one scope) mean two anatomies claim the same DOM.
 */
export function mergeManifests<M extends Pick<ZeroManifest, 'components'>>(
    base: M,
    ...fragments: ManifestFragment[]
): M {
    const owners = new Map<string, string>(
        base.components.map((c) => [c.scope, c.package ?? '@sigx/zero']),
    );
    const merged: ManifestComponent[] = [...base.components];

    for (const [index, fragment] of fragments.entries()) {
        const where = typeof fragment?.package === 'string' && fragment.package.length > 0
            ? `fragment "${fragment.package}"`
            : `fragment #${index + 1}`;
        if (typeof fragment?.package !== 'string' || fragment.package.length === 0) {
            throw new Error(`[zero-kit] ${where} declares no "package" — a manifest fragment must name the package that owns its scopes`);
        }
        if (!Array.isArray(fragment.components) || fragment.components.length === 0) {
            throw new Error(`[zero-kit] ${where} has no "components" array — nothing to merge`);
        }
        for (const component of fragment.components) {
            if (typeof component?.scope !== 'string' || !Array.isArray(component.parts)) {
                throw new Error(`[zero-kit] ${where} has a component without a "scope" and "parts" — not an anatomy (defineAnatomy().toJSON() emits the expected shape)`);
            }
            const owner = owners.get(component.scope);
            if (owner) {
                throw new Error(`[zero-kit] ${where} redeclares scope "${component.scope}", already owned by ${owner} — two anatomies cannot claim one scope`);
            }
            owners.set(component.scope, fragment.package);
            merged.push({ ...component, package: fragment.package });
        }
    }

    // The cast: spreading widens `components` to the base array type, which
    // is exactly what the merge produced — `M` only ever narrows other keys.
    return { ...base, components: merged } as M;
}
