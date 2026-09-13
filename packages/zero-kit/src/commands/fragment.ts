/**
 * `sigx zero:fragment` — the authoring-side gate for an ecosystem component
 * package.
 *
 * Everything else in this kit is the *adopting* side: a design system finds a
 * pack, fits it, composes it, attributes its diagnostics. The authoring side
 * had no gate at all, so every way a fragment can be wrong was discovered in
 * a stranger's build: a stale `version` literal, a fragment path outside
 * `"files"` (present locally, missing for every consumer), a recipe for a part
 * the anatomy never declared, a missing root export the api-mode emitter
 * imports by name — a convention `docs/architecture.md` records as having
 * "broken once, unnoticed".
 *
 * Split the way `zero:audit` is, and for the same reason: `runFragment` does
 * the two dynamic imports (vite's module runner cannot load a file written
 * outside the project, so a test cannot reach them), and `checkFragment` does
 * everything else in one pure pass.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv/dist/2020.js';
import { createRequire } from 'node:module';
import type { ZeroManifest } from '../contract.js';
import type { EcosystemDeclaration, EcosystemPack } from '../discover.js';
import { packFromModule, selfDeclaration } from '../discover.js';
import { FRAGMENT_VERSION, mergeManifests } from '../manifest.js';
import { fitRecipes } from '../fit.js';
import { compileDesignSystem } from '../design-system.js';
import { compileDesignSystemLynx } from '../targets/lynx/compile.js';
import { componentExportName } from '../targets/web/components-dts.js';
import type { DesignSystemInput } from '../design-system.js';
import type { TokensInput } from '../tokens.js';
import type { CommandEnv } from './shared.js';
import { loadManifest } from './shared.js';

const require = createRequire(import.meta.url);

export interface FragmentCommandOptions {
    /** Anatomy manifest to check against (default `@sigx/zero/manifest.json`). */
    manifest?: string;
    /** Write the JSON form beside the module. On by default. */
    emit?: boolean;
    /** Treat warnings as failures. */
    strict?: boolean;
}

export interface FragmentFinding {
    level: 'error' | 'warning';
    message: string;
}

/** The schema URL the emitted JSON points at, as the ext-example does. */
export const FRAGMENT_SCHEMA_URL = 'https://signalxjs.github.io/zero/schemas/fragment.schema.json';

/**
 * `require.resolve` rather than `new URL(import.meta.url)`: under a test
 * transform `import.meta.url` is not a file: URL — the same reason
 * `artifacts.ts` resolves its schemas this way. `./schemas` in the published
 * package, `../schemas` when running from source.
 */
function schemaFile(name: string): Record<string, unknown> {
    // `./schemas` in the published package (the build copies them beside the
    // compiled output), `../../schemas` when running from source — this module
    // sits one directory deeper than `artifacts.ts`, which is why its own
    // two-candidate version of this is not enough here.
    for (const base of ['./schemas', '../schemas', '../../schemas']) {
        try {
            return JSON.parse(readFileSync(require.resolve(`${base}/${name}.schema.json`), 'utf8')) as Record<string, unknown>;
        } catch {
            continue;
        }
    }
    throw new Error(`[zero-kit] cannot find ${name}.schema.json beside this build`);
}

let validateFragment: ValidateFunction | null = null;
function fragmentValidator(): ValidateFunction {
    if (validateFragment) return validateFragment;
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    // The fragment schema's `components` items `$ref` the anatomy manifest's
    // component shape — a fragment IS zero's own component shape plus
    // provenance — so that schema has to be registered alongside it.
    ajv.addSchema(schemaFile('manifest'));
    return (validateFragment = ajv.compile(schemaFile('fragment')));
}

/**
 * The vocabulary a pack must survive: base surfaces, no colour roles, no size
 * ramp. What an adopting skin like zero-heroui actually offers — and the
 * shape a pack written to the recommended grammar has to be *fitted* onto
 * rather than assume.
 */
const HOSTILE_TOKENS: TokensInput = {
    roles: {},
    sizes: [],
    themes: {
        probe: {
            colorScheme: 'light',
            colors: { 'base-100': 'white', 'base-200': 'white', 'base-300': 'white', 'base-content': 'black' },
        },
    },
    defaultLight: 'probe',
} as TokensInput;

/**
 * Whether compiled CSS carries a single declaration.
 *
 * Not `trim()`: a recipe whose every rule was fitted away still emits its
 * `@layer zero.recipes { }` wrapper, which is not empty and paints nothing.
 *
 * A custom property counts: a recipe that emits only component tokens has
 * still emitted something. The pattern says so explicitly — an earlier one
 * happened to admit `--text-2xl` only by matching the `xl` before the colon,
 * and rejected `--2` outright. Both are pinned by tests.
 */
const DECLARATION = /(?:^|[{;])\s*(?:--)?[a-z0-9][a-z0-9-]*\s*:[^;{}]+;/i;
function paints(css: string | undefined): boolean {
    return css !== undefined && DECLARATION.test(css);
}

/** Whether `"files"` (if declared) ships the path. */
function shippedIn(files: unknown, dir: string, source: string): boolean {
    // No `files` field means npm ships everything not otherwise ignored.
    if (!Array.isArray(files)) return true;
    const rel = relative(dir, source).split(sep).join('/');
    return files.some((entry) => {
        if (typeof entry !== 'string') return false;
        const clean = entry.replace(/^\.\//, '').replace(/\/$/, '');
        // Entries are patterns; the honest, checkable cases are an exact file
        // and a directory prefix. A glob we cannot evaluate is not called a
        // failure — this check exists to catch the forgotten `dist`, not to
        // reimplement npm's packer.
        if (clean.includes('*')) return true;
        return rel === clean || rel.startsWith(`${clean}/`);
    });
}

export interface FragmentCheckInput {
    declaration: EcosystemDeclaration;
    /** The fragment module's exports. */
    module: Record<string, unknown>;
    /** The package root's export names, for the api-mode convention. */
    rootExports: readonly string[];
    /** The package.json of the package being checked. */
    pkg: Record<string, unknown>;
    manifest: ZeroManifest;
}

export interface FragmentCheckResult {
    pack: EcosystemPack;
    findings: FragmentFinding[];
    /** The JSON form, ready to write. */
    json: Record<string, unknown>;
}

/** Every check that does not need to import anything. */
export function checkFragment(input: FragmentCheckInput): FragmentCheckResult {
    const { declaration, module, rootExports, pkg, manifest } = input;
    const findings: FragmentFinding[] = [];
    const error = (message: string) => findings.push({ level: 'error', message });
    const warn = (message: string) => findings.push({ level: 'warning', message });

    // Shape first: everything below reads the pack.
    const pack = packFromModule(declaration, module);
    const scopes = pack.fragment.components.map((c) => c.scope);

    // The version literal is hand-written on purpose — importing
    // FRAGMENT_VERSION would drag the kit into the data entry's runtime graph
    // (see docs/building-your-own-component.md §4). This is what makes that
    // safe: the literal is checked here instead of in a consumer's build.
    if (pack.fragment.version !== FRAGMENT_VERSION) {
        error(
            `fragment declares version ${String(pack.fragment.version)} but this kit speaks ${FRAGMENT_VERSION}`
            + ' — rebuild the fragment against a matching @sigx/zero-kit',
        );
    }

    const json = {
        $schema: FRAGMENT_SCHEMA_URL,
        version: pack.fragment.version,
        package: pack.fragment.package,
        components: pack.fragment.components,
    } as Record<string, unknown>;
    const validate = fragmentValidator();
    if (!validate(JSON.parse(JSON.stringify(json)))) {
        for (const err of validate.errors ?? []) {
            error(`fragment.json ${err.instancePath || '(root)'} ${err.message ?? 'is invalid'}`);
        }
    }

    // The merge is the real contract: flags, governed states, placements,
    // hiddenIn, the part tree, and a scope nobody else claims.
    let merged: ZeroManifest | undefined;
    try {
        merged = mergeManifests(manifest, pack.fragment);
    } catch (err) {
        error(err instanceof Error ? err.message : String(err));
    }

    // Present locally and missing for every consumer is the failure mode a
    // package author cannot see from their own checkout.
    if (!shippedIn(pkg['files'], declaration.dir, declaration.source)) {
        error(
            `${relative(declaration.dir, declaration.source)} is not covered by "files", so consumers install a package`
            + ' whose declared fragment entry does not exist',
        );
    }

    // The api-mode convention: an api-declaring adopter's generated
    // ./components module imports exactly this name from exactly this package.
    for (const scope of scopes) {
        const expected = componentExportName(scope);
        if (!rootExports.includes(expected)) {
            error(
                `the package root exports no "${expected}" — an api-declaring design system's generated`
                + ` ./components module imports that name for scope "${scope}"`,
            );
        }
    }

    // Vendor prefixing is a SHOULD and not checkable ("what is a vendor"),
    // but a bare noun is worth a nudge: zero itself promoted `steps` out of
    // this very pattern, and the collision it would now cause is an error
    // above, not here.
    for (const scope of scopes) {
        if (!scope.includes('-')) {
            warn(`scope "${scope}" carries no vendor prefix — a bare noun is the one most likely to collide later`);
        }
    }

    if (merged) {
        const byScope = new Map(merged.components.map((c) => [c.scope, c]));
        // Against the pack's OWN scopes, not the merged manifest: a recipe for
        // `button` would resolve there and pass, and a pack that styles its
        // host's components is the thing adoption refuses outright.
        const owned = new Set(scopes);
        for (const recipe of pack.recipes) {
            const component = byScope.get(recipe.component);
            if (!component || !owned.has(recipe.component)) {
                error(`recipe for "${recipe.component}", which this fragment does not declare`);
                continue;
            }
            const parts = new Set(component.parts.map((p) => p.name));
            for (const part of Object.keys(recipe.parts ?? {})) {
                if (!parts.has(part)) {
                    error(`recipe for "${recipe.component}" styles "${part}", which its anatomy does not declare`);
                }
            }
        }

        // The probe: what an adopting skin with none of the recommended
        // vocabulary would actually get. A pack that only compiles against
        // its own assumptions is a pack that renders as nothing elsewhere.
        if (pack.recipes.length > 0) {
            const { recipes } = fitRecipes(pack.recipes, HOSTILE_TOKENS);
            const probe = { name: 'probe', tokens: HOSTILE_TOKENS, recipes } as DesignSystemInput;
            try {
                const compiled = compileDesignSystem(probe, merged);
                for (const scope of scopes) {
                    if (!paints(compiled.componentCss[scope])) {
                        warn(`"${scope}" compiles to nothing under a vocabulary with no colour roles or size ramp`);
                    }
                }
            } catch (err) {
                error(`fitted to a minimal vocabulary, the pack does not compile: ${err instanceof Error ? err.message : String(err)}`);
            }
            try {
                compileDesignSystemLynx(probe, merged);
            } catch (err) {
                warn(`the pack is not lynx-clean, so adopters lose these scopes on that target: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    }

    return { pack, findings, json };
}

/** Load what the checks need, run them, report, and emit the JSON form. */
export async function runFragment(env: CommandEnv, opts: FragmentCommandOptions): Promise<void> {
    const dir = resolve(env.cwd);
    const declaration = selfDeclaration(dir, env.logger);
    if (!declaration) {
        throw new Error(
            `${join(dir, 'package.json')} declares no "sigx-zero" field —`
            + ' an ecosystem component package points at its data entry with'
            + ' { "fragment": "./dist/fragment.js" }. See docs/building-your-own-component.md',
        );
    }

    const module = (await import(pathToFileURL(declaration.source).href)) as Record<string, unknown>;
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Record<string, unknown>;
    const manifest = await loadManifest(env.cwd, opts.manifest);

    // The root entry, for the export-name convention. A package whose root
    // cannot be imported is reported as that, not as a missing export.
    let rootExports: string[] = [];
    const main = typeof pkg['main'] === 'string' ? pkg['main'] : './dist/index.js';
    const rootPath = resolve(dir, main);
    if (existsSync(rootPath)) {
        try {
            rootExports = Object.keys((await import(pathToFileURL(rootPath).href)) as object);
        } catch (err) {
            env.logger.error(`[zero-kit] the package root ${rootPath} failed to load: ${err instanceof Error ? err.message : String(err)}`);
        }
    } else {
        env.logger.error(`[zero-kit] the package root ${rootPath} does not exist — build the package first`);
    }

    const { pack, findings, json } = checkFragment({ declaration, module, rootExports, pkg, manifest });

    for (const finding of findings) {
        env.logger[finding.level === 'error' ? 'error' : 'warn'](`[${finding.level}] ${finding.message}`);
    }
    const errors = findings.filter((f) => f.level === 'error').length;
    const warnings = findings.length - errors;

    if (opts.emit !== false && errors === 0) {
        const out = join(dirname(declaration.source), 'fragment.json');
        await mkdir(dirname(out), { recursive: true });
        await writeFile(out, `${JSON.stringify(json, null, 4)}\n`, 'utf8');
        env.logger.log(`[${pack.package}] wrote ${out}`);
    }

    env.logger.log(
        `[${pack.package}] ${pack.fragment.components.length} scope(s), ${pack.recipes.length} recipe(s)`
        + ` — ${errors} error(s), ${warnings} warning(s)`,
    );
    if (errors > 0 || (opts.strict && warnings > 0)) {
        throw new Error(`"${pack.package}" FAILED the fragment check (${errors} errors, ${warnings} warnings)`);
    }
}
