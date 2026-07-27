/**
 * The published JSON Schemas, checked against reality.
 *
 * The schemas in `packages/zero-kit/schemas/` are hand-authored, so nothing
 * ties them to the TypeScript types they mirror — this suite is that tie.
 * Every shipped design system's tokens and every one of its recipes must
 * validate (JSON-roundtripped first, so a non-JSON value fails loudly rather
 * than sliding through as an object ajv shrugs at), and the zero manifest —
 * built here the same way `gen-manifest.mjs` builds it — must validate too.
 *
 * The negative half matters just as much: a schema that accepts everything
 * would pass all of the above while being worthless to the authoring loop
 * (an AI emits tokens/recipes as JSON, this schema rejects the malformed
 * attempt before `zero-kit validate` does the semantic checks). Each schema
 * gets malformed samples that must FAIL for the reason stated.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv/dist/2020.js';
import { anatomies } from '@sigx/zero/anatomy';
import {
    RECOMMENDED_ROLE_LIST,
    BASE_SURFACE_TOKEN_LIST,
    TOKEN_CATEGORIES,
    SIZE_SCALE_LIST,
    FLAG_VOCABULARY,
} from '@sigx/zero/contract';
import { designSystem as basicDS } from '@sigx/zero-basic';
import { designSystem as daisyDS } from '@sigx/zero-daisyui';
import { designSystem as materialDS } from '@sigx/zero-material';
import { designSystem as brutalistDS } from '@sigx/zero-brutalist';

// Paths resolve from the repo root (vitest's cwd), matching briefs.test.ts —
// `import.meta.url` is rewritten by the test server and doesn't hit disk.
const loadSchema = (name: string): Record<string, unknown> =>
    JSON.parse(readFileSync(resolve(process.cwd(), `packages/zero-kit/schemas/${name}.schema.json`), 'utf8'));

// One ajv instance for all three: `$id`s are distinct, and sharing catches an
// accidental `$id` collision between the schema files as a compile error.
// Strict mode stays on (it catches schema-authoring typos like an ignored
// keyword); `allowUnionTypes` only permits the deliberate string|number
// union that CSS values need.
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const validateManifest = ajv.compile(loadSchema('manifest'));
const validateTokens = ajv.compile(loadSchema('tokens'));
const validateRecipe = ajv.compile(loadSchema('recipe'));

/**
 * JSON roundtrip before validating. The design systems are authored as TS
 * modules, so a value that doesn't survive JSON (a function, `undefined`, a
 * class instance) would otherwise reach ajv as something the schema was never
 * written for — roundtripping makes such a value fail HERE, loudly.
 */
const asJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const expectValid = (validate: ValidateFunction, data: unknown, label: string): void => {
    const ok = validate(data);
    expect(ok, `${label}: ${ajv.errorsText(validate.errors, { separator: '\n' })}`).toBe(true);
};

const SYSTEMS = [
    ['basic', basicDS],
    ['daisyui', daisyDS],
    ['material', materialDS],
    ['brutalist', brutalistDS],
] as const;

// ── manifest.schema.json ─────────────────────────────────────────────────

/**
 * The manifest as `packages/zero/scripts/gen-manifest.mjs` emits it — same
 * wrapper shape, same literal `$schema` URL, components from the same
 * `anatomies` registry. Rebuilt here (rather than read from dist/) so the
 * test needs no prior build; prose fields differ only in wording the schema
 * deliberately doesn't pin.
 */
const manifest = {
    $schema: 'https://signalxjs.github.io/zero/schemas/manifest.schema.json',
    zeroVersion: (JSON.parse(
        readFileSync(resolve(process.cwd(), 'packages/zero/package.json'), 'utf8'),
    ) as { version: string }).version,
    attributeSpec: {
        scope: 'data-scope',
        part: 'data-part',
        state: 'data-state',
        flagForm: 'presence (data-<flag>=""), never "false"',
        flagVocabulary: [...FLAG_VOCABULARY],
        variantAxes: {
            color: 'data-color',
            size: 'data-size',
            variant: 'data-variant',
        },
        extraAxisForm:
            'data-<axis>, set via the `axes` prop; <axis> is kebab-case and may not '
            + 'collide with the attributes above or with flagVocabulary',
    },
    tokens: {
        colors: {
            convention: { prefix: '--color-', contentSuffix: '-content', softSuffix: '-soft' },
            required: BASE_SURFACE_TOKEN_LIST.map((t) => `--color-${t}`),
            recommendedRoles: [...RECOMMENDED_ROLE_LIST],
        },
        categories: TOKEN_CATEGORIES.map((c) => ({ ...c, path: [...c.path], recommended: [...c.recommended] })),
        recommendedSizes: [...SIZE_SCALE_LIST],
    },
    components: Object.values(anatomies).map((a) => a.toJSON()),
};

describe('manifest.schema.json', () => {
    it('accepts the manifest gen-manifest.mjs emits', () => {
        expectValid(validateManifest, asJson(manifest), 'zero manifest');
    });

    it('rejects an unknown top-level key (the emitter is closed)', () => {
        expect(validateManifest(asJson({ ...manifest, vendor: 'acme' }))).toBe(false);
    });

    it('rejects a part missing its element', () => {
        const bad = asJson(manifest) as typeof manifest;
        delete (bad.components[0]!.parts[0] as Partial<{ element: string }>).element;
        expect(validateManifest(bad)).toBe(false);
    });

    it('rejects a token category with an unknown shape', () => {
        const bad = asJson(manifest) as typeof manifest;
        (bad.tokens.categories[0] as { shape: string }).shape = 'ramp';
        expect(validateManifest(bad)).toBe(false);
    });

    it('rejects a non-kebab flag name', () => {
        const bad = asJson(manifest) as typeof manifest;
        (bad.attributeSpec.flagVocabulary as string[]).push('Focus_Visible');
        expect(validateManifest(bad)).toBe(false);
    });
});

// ── tokens.schema.json ───────────────────────────────────────────────────

describe('tokens.schema.json', () => {
    it.each(SYSTEMS)('accepts %s tokens', (name, ds) => {
        expectValid(validateTokens, asJson(ds.tokens), `${name} tokens`);
    });

    it('rejects an unknown top-level key', () => {
        const bad = asJson(basicDS.tokens) as Record<string, unknown>;
        bad['palette'] = {};
        expect(validateTokens(bad)).toBe(false);
    });

    it('rejects a role name that is not a bare kebab-case identifier', () => {
        expect(validateTokens(asJson({
            ...basicDS.tokens,
            roles: { 'Brand Primary': {} },
        }))).toBe(false);
    });

    it('rejects a variant value that is not a kebab-case identifier', () => {
        expect(validateTokens(asJson({
            ...basicDS.tokens,
            variants: ['solid', 'Not Kebab'],
        }))).toBe(false);
    });

    it('rejects a custom axis whose name is not kebab-case', () => {
        expect(validateTokens(asJson({
            ...basicDS.tokens,
            axes: { 'Not Kebab': ['tight'] },
        }))).toBe(false);
    });

    it('rejects an unknown category under system (the category set is closed)', () => {
        expect(validateTokens(asJson({
            ...basicDS.tokens,
            system: { elevation: { low: '0 1px 2px #0002' } },
        }))).toBe(false);
    });

    it('rejects a theme with the wrong colorScheme value', () => {
        expect(validateTokens(asJson({
            themes: { t: { colorScheme: 'blue', colors: { 'base-100': '#fff' } } },
            defaultLight: 't',
        }))).toBe(false);
    });

    it('rejects a theme missing colors', () => {
        expect(validateTokens(asJson({
            themes: { t: { colorScheme: 'light' } },
            defaultLight: 't',
        }))).toBe(false);
    });

    it('rejects softMix outside 0–1', () => {
        expect(validateTokens(asJson({
            themes: { t: { colorScheme: 'light', softMix: 12, colors: { 'base-100': '#fff' } } },
            defaultLight: 't',
        }))).toBe(false);
    });

    it('rejects a theme name that would break out of [data-theme="…"]', () => {
        // Mirrors the compiler's throw and the validator's error: the name is
        // interpolated into a selector, so the schema closes the same door
        // at the JSON layer.
        expect(validateTokens(asJson({
            themes: { 'x"] *': { colorScheme: 'light', colors: { 'base-100': '#fff' } } },
            defaultLight: 'x"] *',
        }))).toBe(false);
    });

    it('rejects a typography scale in an override tier (declarations live in system)', () => {
        expect(validateTokens(asJson({
            ...basicDS.tokens,
            systemDark: { typography: { scale: { base: '1rem', ratio: 1.2 } } },
        }))).toBe(false);
    });
});

// ── recipe.schema.json ───────────────────────────────────────────────────

describe('recipe.schema.json', () => {
    it.each(SYSTEMS)('accepts every %s recipe', (name, ds) => {
        for (const recipe of ds.recipes) {
            expectValid(validateRecipe, asJson(recipe), `${name}/${recipe.component}`);
        }
    });

    it('rejects a recipe without a component', () => {
        expect(validateRecipe(asJson({ parts: { root: { base: { color: 'red' } } } }))).toBe(false);
    });

    it('rejects an unknown key inside PartStyles (the shape is closed, so typos fail)', () => {
        expect(validateRecipe(asJson({
            component: 'tabs',
            parts: { tab: { stales: { active: { color: 'red' } } } },
        }))).toBe(false);
    });

    it('rejects a variant axis name that is not kebab-case (it becomes a [data-…] selector)', () => {
        expect(validateRecipe(asJson({
            component: 'tabs',
            parts: { root: {} },
            variants: { 'My Axis': { compact: { root: { base: { padding: 0 } } } } },
        }))).toBe(false);
    });

    it('rejects a compound variant whose match value would break out of the selector', () => {
        expect(validateRecipe(asJson({
            component: 'tabs',
            parts: { root: {} },
            compoundVariants: [{
                match: { size: 'x"], [data-part="panel' },
                parts: { root: { base: { color: 'red' } } },
            }],
        }))).toBe(false);
    });

    it('rejects an at-condition key that is neither kebab nor a raw @ prelude', () => {
        expect(validateRecipe(asJson({
            component: 'button',
            parts: { root: { at: { 'Not Kebab': { base: { color: 'red' } } } } },
        }))).toBe(false);
    });

    it('rejects a CSS value that is neither string nor number', () => {
        expect(validateRecipe(asJson({
            component: 'tabs',
            parts: { root: { base: { padding: { top: 4 } } } },
        }))).toBe(false);
    });
});
