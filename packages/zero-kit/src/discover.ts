/**
 * Ecosystem-component discovery — the `"sigx-zero"` package.json field.
 *
 * A component package that zero doesn't ship (see
 * `docs/building-your-own-component.md`) publishes a data-only entry
 * exporting a manifest `fragment` and, usually, a `recipes` pack. Adopting it
 * used to mean hand-editing a design system's `build.mjs`. Here the design
 * system's own dependency graph is the declaration instead: a package says
 *
 * ```json
 * "sigx-zero": { "fragment": "./dist/fragment.js", "requires": ">=0.2.0" }
 * ```
 *
 * and every zero build finds it. The shape deliberately mirrors the
 * `"sigx-cli"` plugin field the sigx CLI already discovers this way.
 *
 * **Why `fragment` is a package-relative path and not an exports subpath.**
 * All three tidier-looking resolutions are dead ends. `require.resolve(
 * '<pkg>/package.json')` throws ERR_PACKAGE_PATH_NOT_EXPORTED, because an
 * ecosystem package's exports map declares `.` and `./fragment` and nothing
 * else. `require.resolve('<pkg>/fragment')` fails too: that subpath declares
 * only `types` and `import`, and the CJS resolver asks for `require`. And
 * `import.meta.resolve` resolves against *this* module, which under pnpm's
 * isolated store cannot see the consuming project's dependency graph at all.
 * So the field carries a path, and the loader joins it — exactly like
 * `"sigx-cli".plugin`, and with the same paranoia `mergeManifests` already
 * applies to fragment content applied to the path itself.
 *
 * Node-only. Nothing in a browser graph imports this.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ZeroManifest } from './contract.js';
import type { DesignSystemInput } from './design-system.js';
import type { ManifestFragment } from './manifest.js';
import { mergeManifests } from './manifest.js';
import type { RecipeInput } from './recipes.js';

const require = createRequire(import.meta.url);

/** The package.json field an ecosystem component package declares. */
export const ECOSYSTEM_FIELD = 'sigx-zero';

/**
 * Set `ZERO_ECOSYSTEM=0` to turn discovery off for one run — the escape hatch
 * when bisecting a build, without editing six build scripts.
 */
export const ECOSYSTEM_ENV = 'ZERO_ECOSYSTEM';

/** The logging surface discovery reports through (`console` satisfies it). */
export interface EcosystemLogger {
    log(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

/**
 * A dependency that declares the field, located and validated but not yet
 * loaded. The walk stops here so it can be tested against real directory
 * trees: `loadDesignSystem` already records that a dynamic `import()` of a
 * file written outside the project cannot run under vite's module runner, so
 * the filesystem half and the module half are separate functions rather than
 * one untestable block.
 */
export interface EcosystemDeclaration {
    /** The dependency name the field was found under. */
    package: string;
    /** Absolute path of the installed package. */
    dir: string;
    /** Absolute path of the fragment module to import. */
    source: string;
}

/** One discovered ecosystem component package. */
export interface EcosystemPack {
    /** The npm specifier that owns the fragment's scopes. */
    package: string;
    /** Absolute path of the fragment module that was loaded. */
    source: string;
    fragment: ManifestFragment;
    /**
     * The pack's default recipes, written against the recommended token
     * grammar. Loaded here; composed into the design system by the caller.
     */
    recipes: readonly RecipeInput[];
}

export interface EcosystemOptions {
    /**
     * The project whose dependencies are searched. Defaults to the package
     * that owns the build's `outDir` — never `process.cwd()`, which would
     * make `node packages/zero-basic/build.mjs` from a repo root discover the
     * root's dependencies instead of the design system's.
     */
    cwd?: string;
    /**
     * Adopt *only* these packages. This is a mode, not a filter: passing it
     * alongside `exclude` is an error rather than a composition, and a name
     * in either list that is not a dependency is an error too — a typo'd
     * exclusion that silently does nothing is how "we disabled that pack"
     * survives as a belief.
     */
    include?: readonly string[];
    /** Adopt everything except these. */
    exclude?: readonly string[];
    /**
     * Fail the build on a pack that cannot be loaded or merged, instead of
     * skipping it with an error-level log. Off by default: one stale
     * transitive dependency should not be able to stop a design system from
     * building the 51 components it owns.
     */
    strict?: boolean;
    /** Supply packs directly and skip the filesystem walk (tests, tooling). */
    packs?: readonly EcosystemPack[];
}

/** The `"sigx-zero"` field's shape. */
interface EcosystemField {
    fragment: string;
    requires?: string;
}

interface Version {
    major: number;
    minor: number;
    patch: number;
}

/**
 * Anchored on purpose, prerelease and build metadata included. An unanchored
 * match would read `">=0.2.0 || >=0.3.0"` as `>=0.2.0` and answer confidently
 * about a range it does not actually implement; anchoring drops every
 * unsupported spelling into the "unparseable, therefore satisfied" bucket,
 * which is the only safe default for a check that can only warn.
 */
function parseVersion(value: string): Version | null {
    const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.exec(value.trim());
    return m ? { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) } : null;
}

function compareVersions(a: Version, b: Version): number {
    return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/**
 * Minimal range check covering the forms this field actually carries —
 * `^x.y.z`, `>=x.y.z`, and exact — modelled on what the sigx CLI applies to
 * `"sigx-cli".requires`. A range it cannot parse is satisfied: a malformed
 * field must never block a build.
 *
 * The caret follows npm's real 0.x rule, where the compatibility boundary
 * moves down one level per leading zero: `^0.2.3` admits `0.2.x` but `^0.0.3`
 * admits only `0.0.3`. Treating `0.0.99` as compatible with `^0.0.3` would
 * suppress exactly the "built for a different kit" warning the field exists
 * to raise.
 */
export function satisfiesKitRange(version: string, range: string): boolean {
    const v = parseVersion(version);
    if (!v) return true;
    const r = range.trim();
    if (r.startsWith('^')) {
        const want = parseVersion(r.slice(1));
        if (!want) return true;
        if (compareVersions(v, want) < 0) return false;
        if (v.major !== want.major) return false;
        if (want.major === 0 && v.minor !== want.minor) return false;
        if (want.major === 0 && want.minor === 0 && v.patch !== want.patch) return false;
        return true;
    }
    if (r.startsWith('>=')) {
        const want = parseVersion(r.slice(2));
        return !want || compareVersions(v, want) >= 0;
    }
    const want = parseVersion(r);
    return !want || compareVersions(v, want) === 0;
}

/** This kit's own version — lockstep with the zero contract it speaks. */
function kitVersion(): string | undefined {
    try {
        return (require('../package.json') as { version?: string }).version;
    } catch {
        return undefined;
    }
}

function readJsonFile(path: string, what: string): Record<string, unknown> {
    let source: string;
    try {
        source = readFileSync(path, 'utf8');
    } catch {
        throw new Error(`[zero-kit] cannot read ${what} at ${path}`);
    }
    try {
        return JSON.parse(source) as Record<string, unknown>;
    } catch (err) {
        throw new Error(`[zero-kit] ${what} at ${path} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
}

/**
 * Locate an installed dependency by walking `node_modules` upward.
 *
 * pnpm symlinks a direct dependency into the depending package's own
 * `node_modules`, and `import()` of a file URL realpaths, so the pack's own
 * dependencies still resolve from its real location in the store. The upward
 * walk is what covers npm and yarn, where a workspace package's dependency is
 * hoisted to the workspace root instead.
 */
function findPackageDir(fromDir: string, name: string): string | undefined {
    let dir = resolve(fromDir);
    for (;;) {
        const candidate = join(dir, 'node_modules', ...name.split('/'));
        if (existsSync(join(candidate, 'package.json'))) return candidate;
        const parent = dirname(dir);
        if (parent === dir) return undefined;
        dir = parent;
    }
}

/** The nearest ancestor directory holding a package.json, `from` included. */
export function nearestPackageDir(from: string): string {
    let dir = resolve(from);
    for (;;) {
        if (existsSync(join(dir, 'package.json'))) return dir;
        const parent = dirname(dir);
        if (parent === dir) return resolve(from);
        dir = parent;
    }
}

function contains(dir: string, target: string): boolean {
    return target === dir || target.startsWith(dir + sep);
}

/** Resolve the declared fragment path, refusing anything outside the package. */
function fragmentPath(pkgDir: string, name: string, declared: string): string {
    if (isAbsolute(declared)) {
        throw new Error(
            `[zero-kit] ${name}'s "${ECOSYSTEM_FIELD}".fragment must be a package-relative path, but "${declared}" is absolute`,
        );
    }
    const target = resolve(pkgDir, declared);
    if (!contains(resolve(pkgDir), target)) {
        throw new Error(
            `[zero-kit] ${name}'s "${ECOSYSTEM_FIELD}".fragment "${declared}" escapes its own package directory`,
        );
    }
    return target;
}

/**
 * The containment check again, this time on real paths — a symlink inside the
 * package pointing out of it satisfies the lexical check.
 *
 * BOTH sides are resolved, not just the target: under pnpm the package
 * directory is itself a symlink into the store, so comparing a real target
 * against a symlinked directory would reject every pnpm install.
 */
function assertRealContainment(pkgDir: string, name: string, declared: string, source: string): void {
    if (!contains(realpathSync(pkgDir), realpathSync(source))) {
        throw new Error(
            `[zero-kit] ${name}'s "${ECOSYSTEM_FIELD}".fragment "${declared}" resolves outside its own package directory`,
        );
    }
}

function readField(pkg: Record<string, unknown>, name: string): EcosystemField | undefined {
    const raw = pkg[ECOSYSTEM_FIELD];
    if (raw === undefined) return undefined;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        throw new Error(`[zero-kit] ${name}'s "${ECOSYSTEM_FIELD}" field is not an object`);
    }
    const field = raw as Record<string, unknown>;
    const fragment = field['fragment'];
    if (typeof fragment !== 'string' || fragment.length === 0) {
        throw new Error(
            `[zero-kit] ${name}'s "${ECOSYSTEM_FIELD}" field declares no "fragment" path — expected { "fragment": "./dist/fragment.js" }`,
        );
    }
    const requires = field['requires'];
    if (requires !== undefined && typeof requires !== 'string') {
        throw new Error(`[zero-kit] ${name}'s "${ECOSYSTEM_FIELD}".requires is not a string`);
    }
    return { fragment, requires };
}

/**
 * Locate one dependency's declaration. Returns `undefined` when the package
 * declares no `"sigx-zero"` field or is not installed — neither is an error,
 * they are the overwhelmingly common case. Everything past the field's
 * presence throws: a package that says it ships a zero component and then
 * cannot deliver one is a problem the design system's author has to see.
 */
export function declarationFor(cwd: string, name: string, logger: EcosystemLogger): EcosystemDeclaration | undefined {
    const pkgDir = findPackageDir(cwd, name);
    if (!pkgDir) return undefined;

    const pkg = readJsonFile(join(pkgDir, 'package.json'), `${name}'s package.json`);
    const field = readField(pkg, name);
    if (!field) return undefined;

    // Checked BEFORE the import: a pack built against a contract this kit no
    // longer speaks should be reported as such, not explode somewhere inside
    // its own module body.
    const kit = kitVersion();
    if (field.requires && kit && !satisfiesKitRange(kit, field.requires)) {
        logger.warn(
            `[zero-kit] ${name} requires @sigx/zero-kit ${field.requires} but this build runs ${kit} — its component may not compile`,
        );
    }

    const source = fragmentPath(pkgDir, name, field.fragment);
    if (!existsSync(source)) {
        throw new Error(
            `[zero-kit] ${name} declares "${ECOSYSTEM_FIELD}".fragment "${field.fragment}", but ${source} does not exist`
            + ' — is the package built, and is that path inside its "files" list?',
        );
    }
    assertRealContainment(pkgDir, name, field.fragment, source);
    return { package: name, dir: pkgDir, source };
}

/**
 * Validate what a fragment module exported and turn it into a pack. Split out
 * from the import so the contract is testable without writing modules to disk.
 */
export function packFromModule(declaration: EcosystemDeclaration, mod: Record<string, unknown>): EcosystemPack {
    const { package: name, source } = declaration;
    const fragment = mod['fragment'];
    if (typeof fragment !== 'object' || fragment === null || Array.isArray(fragment)) {
        throw new Error(`[zero-kit] ${name}'s fragment entry ${source} exports no "fragment" object`);
    }
    const declared = (fragment as ManifestFragment).package;
    // Provenance is not decorative: it is stamped onto every merged component
    // and becomes an import specifier in the generated `./components` module.
    // A fragment claiming a name other than the package it shipped in would
    // emit imports that resolve to someone else, or to nothing.
    if (declared !== name) {
        throw new Error(
            `[zero-kit] ${name}'s fragment declares package "${String(declared)}" — a fragment must name the package it ships in`,
        );
    }

    // Only an absent export means "no recipes". An explicit null is a
    // malformed one, and gets the same error a malformed object would —
    // `?? []` would have quietly accepted it.
    const declaredRecipes = mod['recipes'];
    const recipes = declaredRecipes === undefined ? [] : declaredRecipes;
    if (!Array.isArray(recipes)) {
        throw new Error(`[zero-kit] ${name}'s fragment entry ${source} exports a "recipes" that is not an array`);
    }

    return { package: name, source, fragment: fragment as ManifestFragment, recipes: recipes as RecipeInput[] };
}

/** Whether this run has been switched off wholesale. */
function ecosystemDisabled(): boolean {
    return process.env[ECOSYSTEM_ENV] === '0';
}

/**
 * One dependency map's keys. A malformed map is named rather than left to
 * throw a bare `TypeError` out of an object spread: this walk reads other
 * people's package.json files, so every shape it depends on is checked.
 */
function dependencyNames(pkg: Record<string, unknown>, key: string, pkgPath: string): string[] {
    const map = pkg[key];
    if (map === undefined || map === null) return [];
    if (typeof map !== 'object' || Array.isArray(map)) {
        throw new Error(`[zero-kit] ${pkgPath} has a "${key}" that is not an object`);
    }
    return Object.keys(map);
}

/**
 * The dependency names discovery will look at, sorted so the emitted CSS,
 * manifest key order and report are stable across machines. Pure: no module
 * is imported, so the selection rules are testable on their own.
 */
export function selectDependencies(
    cwd: string,
    options: Pick<EcosystemOptions, 'include' | 'exclude'>,
    logger: EcosystemLogger,
): string[] {
    if (ecosystemDisabled()) {
        logger.log(`[zero-kit] ecosystem discovery disabled by ${ECOSYSTEM_ENV}=0`);
        return [];
    }

    const pkgPath = join(cwd, 'package.json');
    if (!existsSync(pkgPath)) {
        logger.warn(`[zero-kit] ecosystem discovery found no package.json at ${cwd} — nothing to discover`);
        return [];
    }
    const pkg = readJsonFile(pkgPath, 'package.json');
    const names = [...new Set([
        ...dependencyNames(pkg, 'dependencies', pkgPath),
        ...dependencyNames(pkg, 'devDependencies', pkgPath),
    ])].sort();

    if (options.include && options.exclude) {
        throw new Error(
            '[zero-kit] ecosystem: pass include or exclude, not both — include already means "only these"',
        );
    }
    // A name in either list that is not a dependency is a mistake, not a
    // no-op: a typo'd exclusion that silently does nothing is how "we
    // disabled that pack" survives as a belief for a year.
    const unknown = [...(options.include ?? []), ...(options.exclude ?? [])].filter((n) => !names.includes(n));
    if (unknown.length > 0) {
        throw new Error(
            `[zero-kit] ecosystem: ${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} not a dependency of ${cwd}`,
        );
    }
    return options.include
        ? names.filter((n) => options.include?.includes(n))
        : names.filter((n) => !options.exclude?.includes(n));
}

/**
 * Walk the project's dependencies and load every pack they declare.
 *
 * Deliberately unlike the CLI's plugin discovery, which ends in `catch {}`: a
 * dependency that declares the field and then fails is logged at error level
 * (or rethrown under `strict`), never skipped in silence. Silence here means a
 * design system ships without a component it believed it had covered.
 *
 * The `await import()` below is the one line no unit test reaches — vite's
 * module runner cannot load a file written outside the project, the same
 * limit `commands/audit.ts` is split around. Everything either side of it is
 * a separately exported pure function, and the real path is exercised by the
 * in-repo design-system builds.
 */
export async function discoverEcosystem(
    options: EcosystemOptions & { cwd: string; logger: EcosystemLogger },
): Promise<EcosystemPack[]> {
    const { cwd, logger } = options;
    const packs: EcosystemPack[] = [];
    for (const name of selectDependencies(cwd, options, logger)) {
        try {
            const declaration = declarationFor(cwd, name, logger);
            if (!declaration) continue;
            let mod: Record<string, unknown>;
            try {
                mod = (await import(pathToFileURL(declaration.source).href)) as Record<string, unknown>;
            } catch (err) {
                throw new Error(
                    `[zero-kit] ${name}'s fragment entry ${declaration.source} failed to load: ${err instanceof Error ? err.message : String(err)}`,
                );
            }
            packs.push(packFromModule(declaration, mod));
        } catch (err) {
            if (options.strict) throw err;
            logger.error(err instanceof Error ? err.message : String(err));
        }
    }
    return packs;
}

export interface ResolveEcosystemInput<M extends Pick<ZeroManifest, 'components'>> {
    manifest: M;
    designSystem: DesignSystemInput;
    /** `false`/absent disables discovery; `true` takes the defaults. */
    ecosystem?: boolean | EcosystemOptions;
    /** Discovery root when the options name none. */
    defaultCwd: string;
    logger: EcosystemLogger;
    /** Prefix for the adoption log lines — the design system's name. */
    label?: string;
}

export interface ResolvedEcosystem<M extends Pick<ZeroManifest, 'components'>> {
    manifest: M;
    designSystem: DesignSystemInput;
    /** The packs that were actually adopted, in package-name order. */
    packs: EcosystemPack[];
}

/**
 * Discover, then merge — the single path both entry points take.
 *
 * `zero:build` reaches a design system through `runStandardBuild` while
 * `zero:validate` and `zero:audit` reach it through `loadInputs`. Wiring
 * discovery into only one of them would make a build and a validate of the
 * same directory disagree about which components exist, which is exactly the
 * spurious-diff trap `resolve/report-diff.ts` documents — permanent, and
 * automatic, instead of occasional.
 */
export async function resolveEcosystem<M extends Pick<ZeroManifest, 'components'>>(
    input: ResolveEcosystemInput<M>,
): Promise<ResolvedEcosystem<M>> {
    const { manifest, designSystem, ecosystem, defaultCwd, logger } = input;
    if (!ecosystem) return { manifest, designSystem, packs: [] };
    // Checked here rather than only inside the walk: `packs` supplies packs
    // directly and never reaches it, and the switch is documented as turning
    // adoption off whatever the build asks for.
    if (ecosystemDisabled()) {
        logger.log(`[zero-kit] ecosystem discovery disabled by ${ECOSYSTEM_ENV}=0`);
        return { manifest, designSystem, packs: [] };
    }

    const options: EcosystemOptions = ecosystem === true ? {} : ecosystem;
    const label = input.label ?? designSystem.name;
    const packs = options.packs
        ? [...options.packs].sort((a, b) => a.package.localeCompare(b.package))
        : await discoverEcosystem({ ...options, cwd: options.cwd ?? nearestPackageDir(defaultCwd), logger });

    // Merged one at a time rather than in one variadic call: a single stale
    // pack must not take the whole design system's build with it, and the
    // error has to name which package failed.
    let merged = manifest;
    const adopted: EcosystemPack[] = [];
    for (const pack of packs) {
        try {
            merged = mergeManifests(merged, pack.fragment);
        } catch (err) {
            if (options.strict) throw err;
            logger.error(`[${label}] ecosystem: ${pack.package} not adopted — ${err instanceof Error ? err.message : String(err)}`);
            continue;
        }
        adopted.push(pack);
        const scopes = pack.fragment.components.length;
        logger.log(`[${label}] ecosystem: ${pack.package} — ${scopes} scope(s)`);
    }
    return { manifest: merged, designSystem, packs: adopted };
}
