// Generates dist/manifest.json from the built anatomy registry.
//
// The manifest is the machine-readable face of @sigx/zero: every component's
// parts, states (as ready-made selector fragments), flags and token hints,
// plus the contract vocabulary — everything an AI or build tool needs to
// generate a complete design system without reading component code.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const distAnatomy = new URL('../dist/anatomy.js', import.meta.url).href;
const distContract = new URL('../dist/contract/index.js', import.meta.url).href;

const { anatomies } = await import(distAnatomy);
const {
    RECOMMENDED_ROLE_LIST, BASE_SURFACE_TOKEN_LIST,
    TOKEN_CATEGORIES, SIZE_SCALE_LIST, FLAG_VOCABULARY,
} = await import(distContract);

const manifest = {
    $schema: 'https://signalxjs.github.io/zero/schemas/manifest.schema.json',
    zeroVersion: pkg.version,
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
    },
    tokens: {
        // Both halves of the token contract are grammars, not vocabularies:
        // design systems declare their own color roles and their own keys
        // within each category. Only the base surfaces are fixed.
        colors: {
            convention: { prefix: '--color-', contentSuffix: '-content', softSuffix: '-soft' },
            required: BASE_SURFACE_TOKEN_LIST.map((t) => `--color-${t}`),
            recommendedRoles: [...RECOMMENDED_ROLE_LIST],
        },
        // `recommended` are the keys @sigx/zero ships fallbacks for; a design
        // system may declare any others, and they appear in ITS manifest.
        categories: TOKEN_CATEGORIES.map((c) => ({ ...c, path: [...c.path], recommended: [...c.recommended] })),
        // The DEFAULT size ramp, not a closed set — a design system declares
        // its own via `tokens.sizes` and it appears in ITS manifest.
        recommendedSizes: [...SIZE_SCALE_LIST],
    },
    components: Object.values(anatomies).map((a) => a.toJSON()),
};

const out = fileURLToPath(new URL('../dist/manifest.json', import.meta.url));
await writeFile(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[zero] wrote manifest.json (${manifest.components.length} components)`);
