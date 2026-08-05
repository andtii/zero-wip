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
 * purpose — docs/architecture.md, "The register artifact"). Merging does
 * not reopen it: merged components
 * carry their `package` provenance, and every downstream consumer that must
 * distinguish zero-origin from ecosystem scopes (the register artifact's
 * compile gate, the api emitters' import specifiers) reads it from there.
 */
import type { ManifestComponent, ZeroManifest } from './contract.js';
import {
    FLAG_VOCABULARY,
    PLACEMENT_VOCABULARY,
    STATE_NAMES,
    STATE_SYNONYMS,
    TOKEN_KEY_PATTERN,
} from './contract.js';

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

/**
 * The version of the fragment CONTRACT this kit understands. A fragment
 * declares the version it was built against; the merge hard-errors on a
 * missing or unknown one, because an unversioned fragment merges whatever
 * contract era it came from — a pre-`hiddenIn` fragment used to slide
 * straight through (#317 item 5).
 */
export const FRAGMENT_VERSION = 1;

export interface ManifestFragment {
    /**
     * The fragment contract version this fragment was built against —
     * `FRAGMENT_VERSION` at publish time. Required: see the constant.
     */
    version: number;
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
        if (fragment.version === undefined) {
            throw new Error(`[zero-kit] ${where} declares no "version" — a fragment states the contract version it was built against (currently ${FRAGMENT_VERSION}), so a stale one fails here instead of merging silently`);
        }
        if (fragment.version !== FRAGMENT_VERSION) {
            throw new Error(`[zero-kit] ${where} declares fragment version ${fragment.version}, but this kit understands version ${FRAGMENT_VERSION} — rebuild the fragment against a matching @sigx/zero-kit`);
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
            // The shared vocabularies, enforced on the ECOSYSTEM surface.
            // Zero's own anatomies are governed by zero's test suite and
            // `defineAnatomy` carries no runtime guard (it is on every
            // component's size budget) — so a published fragment's flags,
            // states, placements and part tree are checked HERE, where the
            // fragment joins the pipeline. The "no synonyms" rule finally
            // binds for third-party scopes.
            const flagSet = new Set<string>(FLAG_VOCABULARY);
            const placementSet = new Set<string>(PLACEMENT_VOCABULARY);
            const partNames = new Set(component.parts.map((p) => p.name));
            const at = (part: string) => `${where}: "${component.scope}"."${part}"`;
            for (const part of component.parts) {
                for (const flag of part.flags ?? []) {
                    if (!flagSet.has(flag)) {
                        throw new Error(`[zero-kit] ${at(part.name)} declares flag "${flag}", which is not in the shared flag vocabulary [${FLAG_VOCABULARY.join(', ')}] — components never invent synonyms`);
                    }
                }
                for (const state of part.states ?? []) {
                    if (!STATE_NAMES.has(state)) {
                        const synonym = STATE_SYNONYMS[state];
                        throw new Error(`[zero-kit] ${at(part.name)} declares state "${state}", which is not in the governed state vocabulary${synonym ? ` — use "${synonym}"` : ''}`);
                    }
                }
                for (const placement of part.placements ?? []) {
                    if (!placementSet.has(placement)) {
                        throw new Error(`[zero-kit] ${at(part.name)} declares placement "${placement}", which is not in the placement vocabulary [${PLACEMENT_VOCABULARY.join(', ')}]`);
                    }
                }
                for (const state of part.hiddenIn ?? []) {
                    if (!(part.states ?? []).includes(state)) {
                        throw new Error(`[zero-kit] ${at(part.name)} declares hiddenIn "${state}", which is not one of the part's own states`);
                    }
                }
                if (part.parent !== undefined) {
                    if (part.parent === part.name) {
                        throw new Error(`[zero-kit] ${at(part.name)} declares itself as its own parent`);
                    }
                    if (!partNames.has(part.parent)) {
                        throw new Error(`[zero-kit] ${at(part.name)} declares parent "${part.parent}", which is not a declared part`);
                    }
                }
            }
            // Acyclicity over the whole tree — bounded walk per part, so a
            // cycle fails by name instead of hanging the build.
            const byName = new Map(component.parts.map((p) => [p.name, p]));
            for (const part of component.parts) {
                let cursor = part.parent;
                let hops = 0;
                while (cursor !== undefined) {
                    if (++hops > component.parts.length) {
                        throw new Error(`[zero-kit] ${at(part.name)}: parent chain does not terminate (cycle)`);
                    }
                    cursor = byName.get(cursor)?.parent;
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
