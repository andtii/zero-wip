// Compile the design system to CSS artifacts. Runs after tsgo has emitted
// dist/*.js (the design-system module) — see the package build script.
import { fileURLToPath } from 'node:url';
import { anatomies } from '@sigx/zero/anatomy';
import { buildReport, compileDesignSystem, mergeManifests, validateDesignSystem, writeArtifacts } from '@sigx/zero-kit';
import { fragment } from '@sigx/zero-ext-example/fragment';
import { adopted as designSystem } from './dist/design-system.js';

// Merged, not replaced: the ecosystem fragment joins zero's manifest so the
// adopted ext-stepper recipe validates and compiles like any other scope,
// with provenance — the emitted register.d.ts excludes the scope by name
// from its ZeroScope gate (see type-tests/ecosystem/).
const manifest = mergeManifests(
    { components: Object.values(anatomies).map((a) => a.toJSON()) },
    fragment,
);

const result = validateDesignSystem(designSystem, manifest);
for (const issue of [...result.errors, ...result.warnings]) {
    console[issue.level === 'error' ? 'error' : 'warn'](`[${issue.level}] ${issue.where}: ${issue.message}`);
}
if (!result.ok) process.exit(1);

const compiled = compileDesignSystem(designSystem, manifest);
// The coverage report is built here rather than inside writeArtifacts:
// it needs the authoring input and the anatomy manifest, neither of which
// survives into CompiledDesignSystem.
const report = buildReport(compiled, designSystem, manifest, result);
// fileURLToPath (not .pathname): on Windows .pathname is `/C:/…`, which fs rejects.
const written = await writeArtifacts(compiled, fileURLToPath(new URL('./dist', import.meta.url)), report);
console.log(`[zero-basic] built ${written.length} artifacts`);
