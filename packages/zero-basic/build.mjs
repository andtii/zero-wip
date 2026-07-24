// Compile the design system to CSS artifacts. Runs after tsgo has emitted
// dist/*.js (the design-system module) — see the package build script.
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
const written = await writeArtifacts(compiled, new URL('./dist', import.meta.url).pathname);
console.log(`[zero-basic] built ${written.length} artifacts`);
