// Copies schemas/*.json into dist/schemas/ as part of the package build.
//
// The schemas are hand-authored source (validated against real data by
// __tests__/schemas.test.ts), but `files` publishes `dist`, so they have to
// travel with the compiled output to reach npm — and from there the docs
// site, which serves them at https://signalxjs.github.io/zero/schemas/.
// A Node script rather than `cp` so the build works on every platform.
import { copyFile, mkdir, readdir } from 'node:fs/promises';

const src = new URL('../schemas/', import.meta.url);
const out = new URL('../dist/schemas/', import.meta.url);

await mkdir(out, { recursive: true });
const names = (await readdir(src)).filter((name) => name.endsWith('.json'));
if (names.length === 0) {
    // An empty copy would silently publish a package with no schemas — the
    // exact drift this script exists to prevent — so it fails instead.
    throw new Error('[zero-kit] schemas/ contains no .json files — nothing to copy');
}
for (const name of names) {
    await copyFile(new URL(name, src), new URL(name, out));
}
console.log(`[zero-kit] copied ${names.length} schema(s) to dist/schemas/`);
