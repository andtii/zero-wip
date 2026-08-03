// Emit the manifest fragment as JSON beside its JS form, so the CLI path in
// docs/building-your-own-component.md is runnable verbatim: --extra-manifest
// takes a JSON file, and a design system without a build script of its own
// has no way to import the JS export.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fragment } from '../dist/fragment.js';

const out = fileURLToPath(new URL('../dist/fragment.json', import.meta.url));
await writeFile(out, `${JSON.stringify({
    $schema: 'https://signalxjs.github.io/zero/schemas/fragment.schema.json',
    ...fragment,
}, null, 4)}\n`);
const n = fragment.components.length;
console.log(`[zero-ext-example] wrote fragment.json (${n} component${n === 1 ? '' : 's'})`);
