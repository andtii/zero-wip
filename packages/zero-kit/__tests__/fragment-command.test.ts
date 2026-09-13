/**
 * `sigx zero:fragment` — the authoring-side gate.
 *
 * Every check here exists because the same mistake, uncaught, surfaces in a
 * stranger's build instead of the author's: a stale `version` literal, a
 * fragment path outside `"files"` (present locally, missing for every
 * consumer), a recipe for a part the anatomy never declared, a missing root
 * export the api-mode emitter imports by name.
 *
 * `runFragment` itself is not reachable from here — it dynamic-imports the
 * package's built entries, and vite's module runner cannot load a file
 * written outside the project. So the command is split the way
 * `commands/audit.ts` is, and `checkFragment` — everything after the imports
 * — is what this exercises.
 */
import { describe, expect, it } from 'vitest';
import { anatomies, defineAnatomy } from '@sigx/zero/anatomy';
import { FRAGMENT_VERSION } from '@sigx/zero-kit';
import type { ManifestComponent, ManifestFragment, RecipeInput, ZeroManifest } from '@sigx/zero-kit';
import { checkFragment } from '../src/commands/fragment.js';
import type { FragmentCheckInput } from '../src/commands/fragment.js';

const stepper = defineAnatomy('acme-stepper', {
    'root': { element: 'div' },
    'item': { element: 'button', parent: 'root', states: ['active', 'inactive'] },
});

const manifest = (): ZeroManifest =>
    ({ components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[] }) as ZeroManifest;

const fragment = (over: Partial<ManifestFragment> = {}): ManifestFragment => ({
    version: FRAGMENT_VERSION,
    package: '@acme/zero-stepper',
    components: [stepper.toJSON()] as ManifestComponent[],
    ...over,
});

/** A pack in the recommended grammar, so the hostile probe has something to fit. */
const recipe: RecipeInput = {
    component: 'acme-stepper',
    parts: {
        root: { base: { display: 'flex' } },
        item: { base: { color: 'var(--color-base-content)' }, states: { active: { fontWeight: '700' }, inactive: {} } },
    },
    variants: { color: { primary: { item: { base: { color: 'var(--color-primary)' } } } } },
};

const input = (over: Partial<FragmentCheckInput> = {}): FragmentCheckInput => ({
    declaration: {
        package: '@acme/zero-stepper',
        dir: '/pkg',
        source: '/pkg/dist/fragment.js',
    },
    module: { fragment: fragment(), recipes: [recipe] },
    rootExports: ['AcmeStepper'],
    pkg: { name: '@acme/zero-stepper', files: ['dist'] },
    manifest: manifest(),
    ...over,
});

const errors = (result: { findings: { level: string; message: string }[] }): string[] =>
    result.findings.filter((f) => f.level === 'error').map((f) => f.message);
const warnings = (result: { findings: { level: string; message: string }[] }): string[] =>
    result.findings.filter((f) => f.level === 'warning').map((f) => f.message);

describe('checkFragment', () => {
    it('passes a well-formed package, and emits the JSON form', () => {
        const result = checkFragment(input());
        expect(result.findings).toEqual([]);
        expect(result.json).toMatchObject({
            $schema: expect.stringContaining('fragment.schema.json'),
            version: FRAGMENT_VERSION,
            package: '@acme/zero-stepper',
        });
    });

    it('catches a version literal that has fallen behind the kit', () => {
        // The literal is hand-written on purpose — importing FRAGMENT_VERSION
        // would drag the kit into the data entry's runtime graph. This check
        // is what makes that safe.
        const result = checkFragment(input({ module: { fragment: fragment({ version: 0 }), recipes: [] } }));
        expect(errors(result).join('\n')).toMatch(/declares version 0 but this kit speaks/);
    });

    it('catches a fragment entry that will be missing for consumers', () => {
        const result = checkFragment(input({ pkg: { name: '@acme/zero-stepper', files: ['src'] } }));
        expect(errors(result).join('\n')).toMatch(/not covered by "files"/);
    });

    it('accepts a package that declares no files at all', () => {
        // No `files` means npm ships everything not otherwise ignored.
        expect(errors(checkFragment(input({ pkg: { name: '@acme/zero-stepper' } })))).toEqual([]);
    });

    it('catches a missing root export, naming the one the api emitter wants', () => {
        const result = checkFragment(input({ rootExports: ['Stepper'] }));
        expect(errors(result).join('\n')).toMatch(/exports no "AcmeStepper"/);
    });

    it('catches a recipe for a part the anatomy does not declare', () => {
        const strayPart: RecipeInput = { component: 'acme-stepper', parts: { label: { base: { color: 'red' } } } };
        const result = checkFragment(input({ module: { fragment: fragment(), recipes: [strayPart] } }));
        expect(errors(result).join('\n')).toMatch(/styles "label", which its anatomy does not declare/);
    });

    it('catches a recipe for a scope the fragment does not declare', () => {
        const foreign: RecipeInput = { component: 'button', parts: { root: { base: { color: 'red' } } } };
        const result = checkFragment(input({ module: { fragment: fragment(), recipes: [foreign] } }));
        expect(errors(result).join('\n')).toMatch(/recipe for "button", which this fragment does not declare/);
    });

    it('catches a scope zero already ships', () => {
        const collides = defineAnatomy('button', { root: { element: 'div' } });
        const result = checkFragment(input({
            module: { fragment: fragment({ components: [collides.toJSON()] as ManifestComponent[] }), recipes: [] },
        }));
        expect(errors(result).join('\n')).toMatch(/scope|claim/i);
    });

    it('nudges an unprefixed scope without failing it', () => {
        // Not an error: "what is a vendor" is not checkable, and zero itself
        // promoted `steps` out of this very pattern. The collision it would
        // cause later IS an error, above.
        const bare = defineAnatomy('stepper', { root: { element: 'div' } });
        const result = checkFragment(input({
            module: { fragment: fragment({ components: [bare.toJSON()] as ManifestComponent[] }), recipes: [] },
            rootExports: ['Stepper'],
        }));
        expect(errors(result)).toEqual([]);
        expect(warnings(result).join('\n')).toMatch(/carries no vendor prefix/);
    });

    it('warns when a scope compiles to nothing under a minimal vocabulary', () => {
        // A pack that only draws through the colour axis renders as nothing on
        // a skin that declares no roles — which the author should learn now,
        // not from an adopter.
        const axisOnly: RecipeInput = {
            component: 'acme-stepper',
            parts: { root: {}, item: {} },
            variants: { color: { primary: { item: { base: { color: 'var(--color-primary)' } } } } },
        };
        const result = checkFragment(input({ module: { fragment: fragment(), recipes: [axisOnly] } }));
        expect(warnings(result).join('\n')).toMatch(/compiles to nothing under a vocabulary/);
    });

    it('counts a custom property as painting', () => {
        // A recipe whose only output is a component token still emits a
        // declaration, so the "compiles to nothing" warning must not fire.
        const tokenOnly: RecipeInput = {
            component: 'acme-stepper',
            tokens: { accent: 'red' },
            parts: { root: {}, item: {} },
        };
        const result = checkFragment(input({ module: { fragment: fragment(), recipes: [tokenOnly] } }));
        expect(warnings(result).join('\n')).not.toMatch(/compiles to nothing/);
    });

    it('warns that a web-runtime property costs adopters the lynx target', () => {
        const pressy: RecipeInput = {
            component: 'acme-stepper',
            parts: {
                root: { base: { display: 'flex' } },
                item: { base: { backgroundPosition: 'var(--press-x) var(--press-y)' }, states: { active: {}, inactive: {} } },
            },
        };
        const result = checkFragment(input({ module: { fragment: fragment(), recipes: [pressy] } }));
        expect(errors(result)).toEqual([]);
        expect(warnings(result).join('\n')).toMatch(/not lynx-clean/);
    });
});
