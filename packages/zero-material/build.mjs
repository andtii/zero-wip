// Compile the design system to CSS artifacts. Runs after tsgo has emitted
// dist/*.js (the design-system module) — see the package build script.
import { fileURLToPath } from 'node:url';
import { anatomies } from '@sigx/zero/anatomy';
import { compileDesignSystem, validateDesignSystem, writeArtifacts } from '@sigx/zero-kit';
import { designSystem } from './dist/design-system.js';

const manifest = { components: Object.values(anatomies).map((a) => a.toJSON()) };

const result = validateDesignSystem(designSystem, manifest);
for (const issue of [...result.errors, ...result.warnings]) {
    console[issue.level === 'error' ? 'error' : 'warn'](`[${issue.level}] ${issue.where}: ${issue.message}`);
}
if (!result.ok) process.exit(1);

const compiled = compileDesignSystem(designSystem, manifest);
// fileURLToPath (not .pathname): on Windows .pathname is `/C:/…`, which fs rejects.
const written = await writeArtifacts(compiled, fileURLToPath(new URL('./dist', import.meta.url)));
console.log(`[zero-material] built ${written.length} artifacts`);
