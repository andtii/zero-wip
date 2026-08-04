// Compile the design system to CSS artifacts. Runs after tsgo has emitted
// dist/*.js (the design-system module) — see the package build script.
// The pipeline (validate → compile → report → writeArtifacts) lives in
// @sigx/zero-kit/build; this file is only the package's data.
import { fileURLToPath } from 'node:url';
import { anatomies } from '@sigx/zero/anatomy';
import { runStandardBuild } from '@sigx/zero-kit/build';
import { fragment, recipes as extRecipes } from '@sigx/zero-ext-example/fragment';
import { designSystem as base } from './dist/design-system.js';

// The ecosystem adoption (#304), and it lives HERE on purpose: this script is
// build tooling the `files` list never ships, so the private ext-example
// package stays out of the published module graph. Adoption is pure
// composition — spread the recipe pack (spread order is precedence), pass the
// fragment for the merge (merged, not replaced) — and the emitted
// register.d.ts excludes the ecosystem scope by name from its ZeroScope gate
// (see type-tests/ecosystem/).
await runStandardBuild({
    designSystem: { ...base, recipes: [...base.recipes, ...extRecipes] },
    manifest: { components: Object.values(anatomies).map((a) => a.toJSON()) },
    fragments: [fragment],
    // fileURLToPath (not .pathname): on Windows .pathname is `/C:/…`, which fs rejects.
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
});
