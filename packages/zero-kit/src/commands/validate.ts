/** `sigx zero:validate` — check a design system against the anatomy manifest. */
import type { CommandEnv } from './shared.js';
import { loadInputs } from './shared.js';

export interface ValidateOptions {
    entry: string;
    manifest?: string;
    /** Treat warnings as failures. */
    strict: boolean;
}

export async function runValidate(env: CommandEnv, opts: ValidateOptions): Promise<void> {
    const { ds, result } = await loadInputs(env, opts.entry, opts.manifest);
    const counts = `${result.errors.length} errors, ${result.warnings.length} warnings`;

    if (!result.ok || (opts.strict && result.warnings.length > 0)) {
        throw new Error(`"${ds.name}" FAILED validation (${counts})`);
    }
    env.logger.log(`"${ds.name}" is valid (${result.warnings.length} warnings)`);
}
