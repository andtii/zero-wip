/**
 * Ecosystem discovery — the `"sigx-zero"` package.json field.
 *
 * A design system used to adopt a third-party component by hand-editing its
 * `build.mjs`; here its own dependency graph is the declaration. The rules
 * that matter are the unglamorous ones, so they are pinned against real
 * directory trees rather than mocks: where a dependency is found (pnpm
 * symlinks it into the depending package, npm and yarn hoist it to the
 * workspace root), what a malformed field does, and — the one this suite
 * exists for — that a package which *says* it ships a zero component and then
 * cannot deliver one is never skipped in silence.
 *
 * `discoverEcosystem`'s own `await import()` is the single line no unit test
 * reaches: vite's module runner cannot load a file written outside the
 * project (the same limit `commands/audit.ts` is split around). So the walk
 * (`selectDependencies`, `declarationFor`), the module contract
 * (`packFromModule`) and the merge policy (`resolveEcosystem`) are three
 * separately exported functions, and each is tested here directly.
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    ECOSYSTEM_ENV,
    declarationFor,
    mergeManifests,
    nearestPackageDir,
    packFromModule,
    resolveEcosystem,
    selectDependencies,
} from '@sigx/zero-kit';
import type { DesignSystemInput, EcosystemDeclaration, EcosystemPack, ManifestComponent, ManifestFragment } from '@sigx/zero-kit';
import { anatomies, defineAnatomy } from '@sigx/zero/anatomy';

const dirs: string[] = [];
afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
    delete process.env[ECOSYSTEM_ENV];
});

const logger = () => ({ log: vi.fn<(m: string) => void>(), warn: vi.fn<(m: string) => void>(), error: vi.fn<(m: string) => void>() });

function tree(): string {
    const dir = mkdtempSync(join(tmpdir(), 'zero-discover-'));
    dirs.push(dir);
    return dir;
}

function writeJson(path: string, value: unknown): void {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, JSON.stringify(value, null, 2));
}

/** A project with the given deps, and one installed package per entry. */
function project(root: string, deps: Record<string, string>, dev: Record<string, string> = {}): void {
    writeJson(join(root, 'package.json'), { name: 'a-design-system', dependencies: deps, devDependencies: dev });
}

/** Install a package into `<at>/node_modules/<name>`, optionally declaring the field. */
function install(at: string, name: string, opts: { field?: unknown; fragmentFile?: string | false } = {}): string {
    const dir = join(at, 'node_modules', ...name.split('/'));
    mkdirSync(dir, { recursive: true });
    writeJson(join(dir, 'package.json'), {
        name,
        version: '1.0.0',
        ...(opts.field === undefined ? {} : { 'sigx-zero': opts.field }),
    });
    if (opts.fragmentFile !== false) {
        const file = join(dir, opts.fragmentFile ?? 'dist/fragment.js');
        mkdirSync(join(file, '..'), { recursive: true });
        writeFileSync(file, 'export const fragment = { version: 1, package: "x", components: [] };\n');
    }
    return dir;
}

const FIELD = { fragment: './dist/fragment.js' };

// ---------------------------------------------------------------- selection

describe('selectDependencies', () => {
    it('reads dependencies and devDependencies, sorted for a stable emit order', () => {
        const root = tree();
        project(root, { zeta: '1', alpha: '1' }, { mid: '1' });
        expect(selectDependencies(root, {}, logger())).toEqual(['alpha', 'mid', 'zeta']);
    });

    it('returns nothing, loudly, when there is no package.json to read', () => {
        const root = tree();
        const log = logger();
        expect(selectDependencies(root, {}, log)).toEqual([]);
        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('no package.json'));
    });

    it(`${ECOSYSTEM_ENV}=0 turns discovery off for the run`, () => {
        const root = tree();
        project(root, { alpha: '1' });
        process.env[ECOSYSTEM_ENV] = '0';
        const log = logger();
        expect(selectDependencies(root, {}, log)).toEqual([]);
        expect(log.log).toHaveBeenCalledWith(expect.stringContaining(`${ECOSYSTEM_ENV}=0`));
    });

    it('names a malformed dependency map instead of throwing a bare TypeError', () => {
        // This walk reads other people's package.json files, so every shape it
        // depends on is checked — an object spread over `null` would surface as
        // "Cannot convert undefined or null to object".
        const root = tree();
        writeJson(join(root, 'package.json'), { name: 'ds', dependencies: ['alpha'] });
        expect(() => selectDependencies(root, {}, logger()))
            .toThrow(/has a "dependencies" that is not an object/);
    });

    it('tolerates a null dependency map', () => {
        const root = tree();
        writeJson(join(root, 'package.json'), { name: 'ds', dependencies: null, devDependencies: { alpha: '1' } });
        expect(selectDependencies(root, {}, logger())).toEqual(['alpha']);
    });

    it('include means "only these", and exclude removes', () => {
        const root = tree();
        project(root, { alpha: '1', beta: '1', gamma: '1' });
        expect(selectDependencies(root, { include: ['gamma'] }, logger())).toEqual(['gamma']);
        expect(selectDependencies(root, { exclude: ['gamma'] }, logger())).toEqual(['alpha', 'beta']);
    });

    it('refuses include together with exclude — include is a mode, not a filter', () => {
        const root = tree();
        project(root, { alpha: '1' });
        expect(() => selectDependencies(root, { include: ['alpha'], exclude: ['alpha'] }, logger()))
            .toThrow(/include or exclude, not both/);
    });

    it('refuses a name that is not a dependency, so a typo cannot silently do nothing', () => {
        const root = tree();
        project(root, { alpha: '1' });
        expect(() => selectDependencies(root, { exclude: ['aplha'] }, logger())).toThrow(/aplha is not a dependency/);
    });
});

// ------------------------------------------------------------------- lookup

describe('declarationFor', () => {
    it('finds a dependency installed beside the project, as pnpm links it', () => {
        const root = tree();
        project(root, { '@acme/stepper': '1' });
        install(root, '@acme/stepper', { field: FIELD });

        const found = declarationFor(root, '@acme/stepper', logger());
        expect(found?.package).toBe('@acme/stepper');
        expect(found?.source).toBe(join(root, 'node_modules/@acme/stepper/dist/fragment.js'));
    });

    it('follows a pnpm-style symlink into the store', () => {
        const root = tree();
        const store = tree();
        project(root, { '@acme/stepper': '1' });
        const real = install(store, '@acme/stepper', { field: FIELD });
        mkdirSync(join(root, 'node_modules/@acme'), { recursive: true });
        symlinkSync(real, join(root, 'node_modules/@acme/stepper'), 'dir');

        expect(declarationFor(root, '@acme/stepper', logger())?.source)
            .toBe(join(root, 'node_modules/@acme/stepper/dist/fragment.js'));
    });

    it('walks up to a hoisted install, as npm and yarn produce', () => {
        const root = tree();
        const pkg = join(root, 'packages/ds');
        project(pkg, { '@acme/stepper': '1' });
        install(root, '@acme/stepper', { field: FIELD });

        expect(declarationFor(pkg, '@acme/stepper', logger())?.dir)
            .toBe(join(root, 'node_modules/@acme/stepper'));
    });

    it('ignores a dependency that declares nothing, and one that is not installed', () => {
        const root = tree();
        project(root, { plain: '1' });
        install(root, 'plain');
        expect(declarationFor(root, 'plain', logger())).toBeUndefined();
        expect(declarationFor(root, 'never-installed', logger())).toBeUndefined();
    });

    it('refuses an absolute fragment path', () => {
        const root = tree();
        install(root, 'bad', { field: { fragment: '/etc/passwd' } });
        expect(() => declarationFor(root, 'bad', logger())).toThrow(/must be a package-relative path/);
    });

    it('refuses a fragment path that escapes the package', () => {
        const root = tree();
        install(root, 'bad', { field: { fragment: '../../elsewhere/fragment.js' } });
        expect(() => declarationFor(root, 'bad', logger())).toThrow(/escapes its own package directory/);
    });

    it('refuses a field that declares no fragment', () => {
        const root = tree();
        install(root, 'bad', { field: { requires: '>=0.1.0' } });
        expect(() => declarationFor(root, 'bad', logger())).toThrow(/declares no "fragment" path/);
    });

    it('names the package when the declared file is missing, and points at "files"', () => {
        const root = tree();
        install(root, '@acme/stepper', { field: FIELD, fragmentFile: false });
        expect(() => declarationFor(root, '@acme/stepper', logger()))
            .toThrow(/@acme\/stepper declares .*but .* does not exist.*"files" list/s);
    });

    it('reports an unparseable package.json rather than claiming nothing', () => {
        const root = tree();
        const dir = join(root, 'node_modules/broken');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'package.json'), '{ not json');
        expect(() => declarationFor(root, 'broken', logger())).toThrow(/is not valid JSON/);
    });

    it('warns, but still loads, when the pack wants a newer kit', () => {
        const root = tree();
        install(root, '@acme/stepper', { field: { ...FIELD, requires: '>=99.0.0' } });
        const log = logger();
        expect(declarationFor(root, '@acme/stepper', log)).toBeDefined();
        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('requires @sigx/zero-kit >=99.0.0'));
    });
});

// ---------------------------------------------------------- module contract

describe('packFromModule', () => {
    const declaration: EcosystemDeclaration = {
        package: '@acme/stepper',
        dir: '/somewhere/@acme/stepper',
        source: '/somewhere/@acme/stepper/dist/fragment.js',
    };
    const fragment: ManifestFragment = { version: 1, package: '@acme/stepper', components: [] };

    it('accepts a fragment with no recipes', () => {
        const pack = packFromModule(declaration, { fragment });
        expect(pack.package).toBe('@acme/stepper');
        expect(pack.recipes).toEqual([]);
    });

    it('carries the recipe pack through', () => {
        const recipes = [{ component: 'acme-stepper', parts: {} }];
        expect(packFromModule(declaration, { fragment, recipes }).recipes).toEqual(recipes);
    });

    it('refuses a module that exports no fragment', () => {
        expect(() => packFromModule(declaration, { recipes: [] })).toThrow(/exports no "fragment" object/);
    });

    it('refuses a fragment naming a package other than the one it shipped in', () => {
        // Provenance becomes an import specifier in a generated ./components
        // module — a wrong name emits an import that resolves to nothing.
        const impostor = { ...fragment, package: '@other/pack' };
        expect(() => packFromModule(declaration, { fragment: impostor }))
            .toThrow(/declares package "@other\/pack"/);
    });

    it('refuses a recipes export that is not an array', () => {
        expect(() => packFromModule(declaration, { fragment, recipes: { component: 'x' } }))
            .toThrow(/"recipes" that is not an array/);
    });
});

// -------------------------------------------------------------- merge policy

const stepper = defineAnatomy('acme-stepper', {
    'root': { element: 'div', states: ['active', 'inactive'] },
});

const pack = (name: string, scope = 'acme-stepper'): EcosystemPack => ({
    package: name,
    source: `/somewhere/${name}/dist/fragment.js`,
    fragment: {
        version: 1,
        package: name,
        components: [{ ...stepper.toJSON(), scope }] as ManifestComponent[],
    },
    recipes: [],
});

const ds = { name: 'fixture', tokens: {}, recipes: [] } as unknown as DesignSystemInput;
const baseManifest = () => ({ components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[] });

describe('resolveEcosystem', () => {
    it('does nothing at all when discovery is off', async () => {
        const log = logger();
        const out = await resolveEcosystem({
            manifest: baseManifest(), designSystem: ds, ecosystem: false, defaultCwd: tree(), logger: log,
        });
        expect(out.packs).toEqual([]);
        expect(log.log).not.toHaveBeenCalled();
    });

    it('merges a supplied pack and reports the adoption', async () => {
        const log = logger();
        const out = await resolveEcosystem({
            manifest: baseManifest(),
            designSystem: ds,
            ecosystem: { packs: [pack('@acme/stepper')] },
            defaultCwd: tree(),
            logger: log,
        });
        expect(out.manifest.components.find((c) => c.scope === 'acme-stepper')?.package).toBe('@acme/stepper');
        expect(out.packs.map((p) => p.package)).toEqual(['@acme/stepper']);
        expect(log.log).toHaveBeenCalledWith(expect.stringContaining('@acme/stepper — 1 scope(s)'));
    });

    it('sorts supplied packs by name, so the emitted order does not depend on the caller', async () => {
        const out = await resolveEcosystem({
            manifest: baseManifest(),
            designSystem: ds,
            ecosystem: { packs: [pack('@z/last', 'z-thing'), pack('@a/first')] },
            defaultCwd: tree(),
            logger: logger(),
        });
        expect(out.packs.map((p) => p.package)).toEqual(['@a/first', '@z/last']);
    });

    it('skips a pack that cannot merge, names it, and keeps the rest', async () => {
        // Two packs claiming one scope: the merge hard-errors on collision.
        // One stale transitive dependency must not take the build with it.
        const log = logger();
        const out = await resolveEcosystem({
            manifest: baseManifest(),
            designSystem: ds,
            ecosystem: { packs: [pack('@a/first'), pack('@b/second')] },
            defaultCwd: tree(),
            logger: log,
        });
        expect(out.packs.map((p) => p.package)).toEqual(['@a/first']);
        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('@b/second not adopted'));
    });

    it('strict turns that skip back into a failure', async () => {
        await expect(resolveEcosystem({
            manifest: baseManifest(),
            designSystem: ds,
            ecosystem: { packs: [pack('@a/first'), pack('@b/second')], strict: true },
            defaultCwd: tree(),
            logger: logger(),
        })).rejects.toThrow(/two anatomies cannot claim one scope|already/i);
    });

    it('leaves an explicitly merged fragment in place — a hand-passed one wins', async () => {
        // What runStandardBuild does: `fragments:` merge first, discovery after.
        const explicit = mergeManifests(baseManifest(), pack('@hand/wired').fragment);
        const log = logger();
        const out = await resolveEcosystem({
            manifest: explicit,
            designSystem: ds,
            ecosystem: { packs: [pack('@auto/discovered')] },
            defaultCwd: tree(),
            logger: log,
        });
        expect(out.manifest.components.find((c) => c.scope === 'acme-stepper')?.package).toBe('@hand/wired');
        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('@auto/discovered not adopted'));
    });
});

describe('nearestPackageDir', () => {
    it('climbs to the package that owns an outDir that does not exist yet', () => {
        const root = tree();
        project(root, {});
        expect(nearestPackageDir(join(root, 'dist'))).toBe(root);
    });
});
