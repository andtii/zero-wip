/** `sigx zero:build` — validate a design system, then compile it to CSS artifacts. */
import { resolve } from 'node:path';
import { compileDesignSystem } from '../design-system.js';
import { buildReport } from '../resolve/report.js';
import { writeArtifacts } from '../artifacts.js';
import type { CommandEnv } from './shared.js';
import { loadInputs } from './shared.js';

export interface BuildOptions {
    entry: string;
    manifest?: string;
    /** Ecosystem manifest fragments to merge into the base manifest. */
    extraManifest?: string[];
    out: string;
}

export async function runBuild(env: CommandEnv, opts: BuildOptions): Promise<void> {
    const { ds, manifest, result } = await loadInputs(env, opts.entry, opts.manifest, opts.extraManifest ?? []);
    // Never emit from an invalid source — the anatomy manifest is the contract.
    if (!result.ok) {
        throw new Error(`"${ds.name}" failed validation (${result.errors.length} errors) — nothing written`);
    }

    const compiled = compileDesignSystem(ds, manifest);
    // Every build emits the coverage report, so `dist/report.json` is a fact
    // about a built design system rather than something only the in-repo
    // build scripts happen to produce.
    const report = buildReport(compiled, ds, manifest, result);
    const written = await writeArtifacts(compiled, resolve(env.cwd, opts.out), report);
    env.logger.log(`built "${ds.name}": ${written.length} files → ${opts.out}`);
}
