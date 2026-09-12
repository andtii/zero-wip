/**
 * Composing a discovered pack's recipes into a design system.
 *
 * The load-bearing decision here is that **precedence is de-dup, not
 * ordering**. The obvious design — spread the pack's recipes first so the
 * design system's own recipe wins — cannot work: `compileDesignSystem` throws
 * on a second recipe for one scope in either order, so "I like the pack but
 * my stepper is square" would kill the build with a message naming neither
 * package. The first test below pins that throw, so the reason this code
 * exists cannot quietly stop being true.
 *
 * The other three: recipes are FITTED to whatever vocabulary the adopting
 * skin actually has (a pack written to the recommended grammar has to compile
 * under a design system with no colour axis); packs are APPENDED, because
 * recipe order is the key order of `compiled.components` and therefore of
 * manifest.json, register.d.ts and report.json; and a pack may only style the
 * scopes its own fragment declares.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileDesignSystem, resolveEcosystem, runStandardBuild } from '@sigx/zero-kit';
import { compileDesignSystemLynx, LynxRuntimePropertyError } from '../src/targets/lynx/index.js';
import type {
    DesignSystemInput,
    EcosystemPack,
    ManifestComponent,
    RecipeInput,
    TokensInput,
    ZeroManifest,
} from '@sigx/zero-kit';
import { anatomies, defineAnatomy } from '@sigx/zero/anatomy';

const dirs: string[] = [];
afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const outDir = () => {
    const dir = mkdtempSync(join(tmpdir(), 'zero-ecosystem-build-'));
    dirs.push(dir);
    return dir;
};

const logger = () => ({ log: vi.fn<(m: string) => void>(), warn: vi.fn<(m: string) => void>(), error: vi.fn<(m: string) => void>() });

const stepper = defineAnatomy('acme-stepper', {
    'root': { element: 'div' },
    'item': { element: 'button', parent: 'root', states: ['active', 'inactive'] },
});

/** Zero's own anatomies. The pack's fragment is what adds `acme-stepper`. */
const baseManifest = (): ZeroManifest => ({
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
} as ZeroManifest);

/** The merged result, for the tests that compile without going through resolve. */
const withStepper = (): ZeroManifest => ({
    components: [...baseManifest().components, stepper.toJSON()] as ManifestComponent[],
} as ZeroManifest);

/** No colour axis and no size ramp — the shape a fit actually has to survive. */
const bareTokens: TokensInput = {
    roles: {},
    sizes: [],
    themes: {
        day: {
            colorScheme: 'light',
            colors: { 'base-100': 'white', 'base-200': 'white', 'base-300': 'white', 'base-content': 'black' },
        },
    },
    defaultLight: 'day',
};

/** The same, but keeping the recommended colour roles the pack is written to. */
const recommendedTokens: TokensInput = {
    ...bareTokens,
    roles: { primary: {} },
    themes: {
        day: {
            colorScheme: 'light',
            colors: {
                'base-100': 'white', 'base-200': 'white', 'base-300': 'white', 'base-content': 'black',
                'primary': 'blue', 'primary-content': 'white',
            },
        },
    },
};

const ds = (tokens: TokensInput, recipes: RecipeInput[] = []): DesignSystemInput =>
    ({ name: 'fixture', tokens, recipes }) as DesignSystemInput;

/** A pack recipe in the recommended grammar: a colour axis over a declared role. */
const packRecipe: RecipeInput = {
    component: 'acme-stepper',
    parts: {
        root: { base: { display: 'flex' } },
        item: { base: { color: 'var(--color-base-content)' }, states: { active: { fontWeight: '700' }, inactive: {} } },
    },
    variants: { color: { primary: { item: { base: { color: 'var(--color-primary)' } } } } },
};

const packOf = (name: string, recipes: readonly RecipeInput[]): EcosystemPack => ({
    package: name,
    source: `/somewhere/${name}/dist/fragment.js`,
    fragment: { version: 1, package: name, components: [stepper.toJSON()] as ManifestComponent[] },
    recipes,
});

const resolve = (designSystem: DesignSystemInput, packs: EcosystemPack[], log = logger()) =>
    resolveEcosystem({
        manifest: baseManifest(),
        designSystem,
        ecosystem: { packs },
        defaultCwd: outDir(),
        logger: log,
    });

describe('recipe precedence', () => {
    it('the compiler throws on two recipes for one scope, whichever order', () => {
        // Why de-dup exists. If this ever stops throwing, "prepend so the
        // design system wins" becomes possible and this whole design is moot.
        const both = [packRecipe, { ...packRecipe, parts: { root: { base: { display: 'grid' } } } }];
        expect(() => compileDesignSystem(ds(recommendedTokens, both), withStepper()))
            .toThrow(/duplicate recipe for component "acme-stepper"/);
        expect(() => compileDesignSystem(ds(recommendedTokens, [...both].reverse()), withStepper()))
            .toThrow(/duplicate recipe for component "acme-stepper"/);
    });

    it("drops the pack's recipe for a scope the design system already styles, and says so", async () => {
        const mine: RecipeInput = { component: 'acme-stepper', parts: { root: { base: { display: 'grid' } } } };
        const log = logger();
        const out = await resolve(ds(recommendedTokens, [mine]), [packOf('@acme/stepper', [packRecipe])], log);

        expect(out.designSystem.recipes).toEqual([mine]);
        expect(log.log).toHaveBeenCalledWith(expect.stringContaining('recipe for "acme-stepper" skipped'));
        // And the composed design system compiles, which is the whole point.
        expect(() => compileDesignSystem(out.designSystem, out.manifest)).not.toThrow();
    });

    it('appends, so the pack lands last in every ordered artifact', async () => {
        const mine: RecipeInput = { component: 'button', parts: { root: { base: { appearance: 'none' } } } };
        const out = await resolve(ds(recommendedTokens, [mine]), [packOf('@acme/stepper', [packRecipe])]);

        expect(out.designSystem.recipes.map((r) => r.component)).toEqual(['button', 'acme-stepper']);
        const compiled = compileDesignSystem(out.designSystem, out.manifest);
        expect(Object.keys(compiled.components)).toEqual(['button', 'acme-stepper']);
    });

    it('refuses a pack that ships recipes for scopes it does not declare — entirely', async () => {
        // Otherwise an installed dependency could restyle the design system's
        // own button. Refused BEFORE the merge, so the pack contributes
        // nothing: dropping only its recipes would leave its scopes in the
        // manifest styled by nobody, which is a half-adoption of a package
        // that just tried to restyle its host.
        const log = logger();
        const foreign: RecipeInput = { component: 'button', parts: { root: { base: { appearance: 'none' } } } };
        const out = await resolve(ds(recommendedTokens), [packOf('@acme/stepper', [packRecipe, foreign])], log);

        expect(out.designSystem.recipes).toEqual([]);
        expect(out.packs).toEqual([]);
        expect(out.manifest.components.some((c) => c.scope === 'acme-stepper')).toBe(false);
        expect(log.error).toHaveBeenCalledWith(expect.stringMatching(/ships recipes for scopes it does not declare.*"button"/s));
    });
});

describe('the vocabulary fit', () => {
    it('fits a pack written to the recommended grammar onto a skin with no colour axis', async () => {
        const out = await resolve(ds(bareTokens), [packOf('@acme/stepper', [packRecipe])]);
        const css = compileDesignSystem(out.designSystem, out.manifest).componentCss['acme-stepper'] ?? '';

        // The colour axis is gone (the role is not declared), the recipe still
        // compiles, and the undeclared role reference was redrawn on the base
        // surfaces rather than left dangling.
        expect(css).not.toContain('data-color');
        expect(css).not.toContain('var(--color-primary)');
        expect(css).toContain('var(--color-base-content)');
    });

    it('reports what the fit cost, and stays quiet when it cost nothing', async () => {
        const noisy = logger();
        await resolve(ds(bareTokens), [packOf('@acme/stepper', [packRecipe])], noisy);
        expect(noisy.log).toHaveBeenCalledWith(expect.stringMatching(/fitted to fixture's vocabulary — .*colour value/));

        const quiet = logger();
        await resolve(ds(recommendedTokens), [packOf('@acme/stepper', [packRecipe])], quiet);
        expect(quiet.log).not.toHaveBeenCalledWith(expect.stringContaining('fitted to'));
    });
});

describe('the lynx target', () => {
    /** `var(--press-x)` is published by zero's own web press-feedback behavior. */
    const pressy: RecipeInput = {
        component: 'acme-stepper',
        parts: {
            root: { base: { display: 'flex' } },
            item: {
                base: { color: 'var(--color-base-content)', backgroundPosition: 'var(--press-x) var(--press-y)' },
                states: { active: { fontWeight: '700' }, inactive: {} },
            },
        },
    };

    it("drops a discovered pack's web-only scope instead of failing the build", async () => {
        // The design system's author neither wrote this recipe nor can fix it;
        // failing their build over it would be the wrong trade.
        const dir = outDir();
        const log = logger();
        const { result } = await runStandardBuild({
            designSystem: ds(bareTokens, [{
                component: 'button',
                // A focus ring, or the validator refuses the build before the
                // lynx target is ever reached.
                parts: { root: { base: { appearance: 'none' }, states: { 'focus-visible': { outline: '2px solid black' } } } },
            }]),
            manifest: baseManifest(),
            ecosystem: { packs: [packOf('@acme/stepper', [pressy])] },
            targets: ['web', 'lynx'],
            audit: false,
            outDir: dir,
            logger: log,
        });

        expect(result.ok).toBe(true);
        const report = JSON.parse(readFileSync(join(dir, 'report.json'), 'utf8')) as {
            lynx?: { webOnly?: { scope: string; package: string }[] };
        };
        expect(report.lynx?.webOnly).toEqual([
            expect.objectContaining({ scope: 'acme-stepper', package: '@acme/stepper' }),
        ]);
        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('is web-only'));
        // The web target still carries it — only lynx lost the scope.
        expect(readFileSync(join(dir, 'css/components/acme-stepper.css'), 'utf8')).toContain('--press-x');
        expect(readFileSync(join(dir, 'lynx/index.css'), 'utf8')).not.toContain('acme-stepper');
    });

    it('degrades on the runtime-property refusal specifically, by type', () => {
        // The degradation is gated on `instanceof LynxRuntimePropertyError`,
        // not on matching a message, so that it cannot silently widen to every
        // lynx failure the next time one is reworded. This pins the other half
        // of that contract: the emitter really does throw that class.
        //
        // There is no companion test driving a DIFFERENT lynx error through a
        // whole build, because one is not constructible today — validation and
        // the web compile reject everything else first, which is itself why
        // the narrow gate costs nothing.
        expect(() => compileDesignSystemLynx(ds(bareTokens, [pressy]), withStepper()))
            .toThrow(LynxRuntimePropertyError);
    });

    it('still fails when the AUTHORED recipe for a pack-declared scope is the web-only one', async () => {
        // The trap: the pack declares this scope, so attributing by fragment
        // would degrade the design system's OWN recipe on the pack's behalf.
        // De-dup kept the authored recipe, so it must fail the build like any
        // other first-party recipe — attribution follows what a pack actually
        // contributed, not what its fragment declares.
        await expect(runStandardBuild({
            designSystem: ds(bareTokens, [pressy]),
            manifest: baseManifest(),
            ecosystem: { packs: [packOf('@acme/stepper', [packRecipe])] },
            targets: ['web', 'lynx'],
            audit: false,
            outDir: outDir(),
            logger: logger(),
        })).rejects.toThrow(/--press-x/);
    });

    it('still fails the build for a first-party recipe in the same position', async () => {
        await expect(runStandardBuild({
            designSystem: ds(bareTokens, [pressy]),
            manifest: withStepper(),
            targets: ['web', 'lynx'],
            audit: false,
            outDir: outDir(),
            logger: logger(),
        })).rejects.toThrow(/--press-x/);
    });
});
