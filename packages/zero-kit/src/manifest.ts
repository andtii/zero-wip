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
import { TOKEN_KEY_PATTERN } from './contract.js';

/**
 * The shape of a bare or scoped npm specifier, optionally with subpath
 * segments. Deliberately conservative — the specifier is interpolated into
 * generated import statements and comments, so anything a quote, backslash or
 * whitespace could smuggle into emitted code must never get past the merge.
 */
const PACKAGE_SPECIFIER_PATTERN = /^(@[a-z0-9~][\w.~-]*\/)?[a-z0-9~][\w.~-]*(\/[\w.~-]+)*$/;

/**
 * What can never appear in a selector fragment a fragment ships: the
 * characters that close the current rule and start another. A fragment's
 * `selectors` values are spliced into compiled selectors verbatim (the same
 * surface `stateSelector` trusts for zero's own anatomies), so this is the
 * merge-time twin of the recipe compiler's breakout guard.
 */
const CSS_BREAKOUT = /[{};\n\r]/;

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
        if (!PACKAGE_SPECIFIER_PATTERN.test(fragment.package)) {
            throw new Error(`[zero-kit] ${where}: "${fragment.package}" is not a package specifier — it becomes an import specifier in generated artifacts`);
        }
        if (!Array.isArray(fragment.components) || fragment.components.length === 0) {
            throw new Error(`[zero-kit] ${where} has no "components" array — nothing to merge`);
        }
        for (const component of fragment.components) {
            if (typeof component?.scope !== 'string' || !Array.isArray(component.parts) || component.parts.length === 0) {
                throw new Error(`[zero-kit] ${where} has a component without a "scope" and "parts" — not an anatomy (defineAnatomy().toJSON() emits the expected shape)`);
            }
            // A fragment's scope becomes `[data-scope="…"]` in every compiled
            // selector AND the artifact filename `dist/css/components/
            // <scope>.css` — one grammar closes both the selector-injection
            // and the path-traversal reading of a hostile scope. Zero's own
            // registry is out of reach here by construction; this checks the
            // one door anatomies enter from outside.
            if (!TOKEN_KEY_PATTERN.test(component.scope)) {
                throw new Error(`[zero-kit] ${where}: scope "${component.scope}" is not a kebab-case identifier — it becomes [data-scope="…"] selectors and the css/components/<scope>.css filename`);
            }
            // Fail here, by name, rather than as a confusing downstream throw
            // in recipe compilation — this is the exported programmatic entry,
            // not only the schema-validated CLI path.
            for (const part of component.parts) {
                if (typeof part?.name !== 'string' || typeof part?.element !== 'string'
                    || typeof part?.selectors !== 'object' || part.selectors === null) {
                    throw new Error(`[zero-kit] ${where}: component "${component.scope}" has a part without "name", "element" and "selectors" — not an anatomy (defineAnatomy().toJSON() emits the expected shape)`);
                }
                if (!TOKEN_KEY_PATTERN.test(part.name)) {
                    throw new Error(`[zero-kit] ${where}: part "${part.name}" of "${component.scope}" is not a kebab-case identifier — it becomes [data-part="…"] selectors`);
                }
                for (const [state, fragmentSelector] of Object.entries(part.selectors)) {
                    if (CSS_BREAKOUT.test(fragmentSelector)) {
                        throw new Error(`[zero-kit] ${where}: selector for "${component.scope}"."${part.name}" state "${state}" cannot hold a brace, semicolon or newline — it is spliced into compiled selectors verbatim`);
                    }
                }
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
