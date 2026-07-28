/** `sigx zero:build` — validate a design system, then compile it to CSS artifacts. */
import { resolve } from 'node:path';
import { compileDesignSystem } from '../design-system.js';
import { writeArtifacts } from '../artifacts.js';
import type { CommandEnv } from './shared.js';
import { loadInputs } from './shared.js';

export interface BuildOptions {
    entry: string;
    manifest?: string;
    out: string;
}

export async function runBuild(env: CommandEnv, opts: BuildOptions): Promise<void> {
    const { ds, manifest, result } = await loadInputs(env, opts.entry, opts.manifest);
    // Never emit from an invalid source — the anatomy manifest is the contract.
    if (!result.ok) {
        throw new Error(`"${ds.name}" failed validation (${result.errors.length} errors) — nothing written`);
    }

    const compiled = compileDesignSystem(ds, manifest);
    const written = await writeArtifacts(compiled, resolve(env.cwd, opts.out));
    env.logger.log(`built "${ds.name}": ${written.length} files → ${opts.out}`);
}
