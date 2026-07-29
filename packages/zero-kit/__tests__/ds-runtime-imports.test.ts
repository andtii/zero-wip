/**
 * A design system package may never import zero-kit at RUNTIME — only its
 * types (AGENTS.md: "devDependency of DS packages; never a runtime
 * dependency"). The kit is Node-only: `artifacts.ts` imports
 * `node:fs/promises` from the barrel, so one value import in a DS package's
 * runtime graph drags the Node built-ins into the browser and takes the
 * playground down with a module-externalized error — which is exactly how
 * this rule was learned (a `defineApi` value import in heroui's
 * `design-system.ts` hung the whole e2e suite).
 *
 * Static by design: the check reads the source, so it fails on the import
 * statement itself rather than on whichever downstream consumer loads the
 * graph in a browser first.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packagesDir = resolve(import.meta.dirname, '../..');
const dsPackages = readdirSync(packagesDir).filter((name) => name.startsWith('zero-') && name !== 'zero-kit');

/** Value imports from zero-kit: `import { x }` / `import x` — but not `import type`. */
const VALUE_IMPORT = /^import\s+(?!type\b)[^;]*from\s+['"]@sigx\/zero-kit['"]/m;

describe.each(dsPackages)('%s stays free of runtime zero-kit imports', (pkg) => {
    const srcDir = resolve(packagesDir, pkg, 'src');
    let files: string[];
    try {
        files = readdirSync(srcDir).filter((f) => f.endsWith('.ts'));
    } catch {
        files = [];
    }

    it.each(files)('src/%s imports zero-kit as types only', (file) => {
        const source = readFileSync(resolve(srcDir, file), 'utf8');
        const match = VALUE_IMPORT.exec(source);
        expect(
            match?.[0],
            `${pkg}/src/${file} imports @sigx/zero-kit at runtime — use \`import type\` (the kit is Node-only; a value import breaks every browser consumer of this package)`,
        ).toBeUndefined();
    });
});
