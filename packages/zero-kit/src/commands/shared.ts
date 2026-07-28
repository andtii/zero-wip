/**
 * Shared plumbing for the zero-kit commands.
 *
 * Both commands need the same two inputs — the compiled design-system module
 * and the anatomy manifest to check it against — and both report the resulting
 * diagnostics identically. That preamble was duplicated in the old hand-rolled
 * CLI; it lives once here.
 *
 * Paths resolve against `ctx.cwd` (what the sigx CLI hands the command), not
 * `process.cwd()`, so a hosted shell can run a command for another directory.
 */
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { Logger } from '@sigx/cli/plugin';
import type { ZeroManifest } from '../contract.js';
import type { DesignSystemInput } from '../design-system.js';
import type { ValidationResult } from '../resolve/validate.js';
import { validateDesignSystem } from '../resolve/validate.js';

/** The slice of the plugin command context these helpers need. */
export interface CommandEnv {
    cwd: string;
    logger: Logger;
}

/**
 * The anatomy manifest to validate against. Defaults to the manifest generated
 * by whichever `@sigx/zero` the project has installed — resolved from `cwd`,
 * not from this package, so the contract checked is the one the project ships.
 */
export async function loadManifest(cwd: string, explicit?: string): Promise<ZeroManifest> {
    let path = explicit;
    if (!path) {
        // Bare MODULE_NOT_FOUND here reads as an internal failure — it means
        // the project has no @sigx/zero, or the command ran somewhere without
        // one. Name both the cause and the escape hatch.
        try {
            const require = createRequire(resolve(cwd, 'package.json'));
            path = require.resolve('@sigx/zero/manifest.json');
        } catch {
            throw new Error(
                `cannot resolve @sigx/zero/manifest.json from ${cwd} — install @sigx/zero there, or pass --manifest <path>`,
            );
        }
    }

    const resolved = resolve(cwd, path);
    let source: string;
    try {
        source = await readFile(resolved, 'utf8');
    } catch {
        throw new Error(`cannot read the anatomy manifest at ${resolved}`);
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(source);
    } catch (err) {
        throw new Error(`${resolved} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    // A design system emits its own dist/manifest.json, so pointing --manifest
    // at the wrong one of two identically named files is an easy mistake — and
    // without this it surfaces as "components.map is not a function".
    if (!Array.isArray((parsed as ZeroManifest | null)?.components)) {
        throw new Error(
            `${resolved} has no "components" array, so it is not the zero anatomy manifest — expected @sigx/zero/manifest.json, not a design system's own dist/manifest.json`,
        );
    }
    return parsed as ZeroManifest;
}

export async function loadDesignSystem(cwd: string, entry: string): Promise<DesignSystemInput> {
    const mod = await import(pathToFileURL(resolve(cwd, entry)).href);
    const ds = (mod.designSystem ?? mod.default) as DesignSystemInput | undefined;
    if (!ds || !ds.name || !ds.tokens) {
        throw new Error(`${entry} does not export a design system (named "designSystem" or default)`);
    }
    return ds;
}

export interface LoadedInputs {
    ds: DesignSystemInput;
    manifest: ZeroManifest;
    result: ValidationResult;
}

/**
 * Load both inputs, validate, and report every issue through the CLI logger.
 * Returns the validation result rather than throwing on failure — `build` and
 * `validate` treat a failing result differently (`--strict` also fails on
 * warnings), so the decision stays with the caller.
 */
export async function loadInputs(env: CommandEnv, entry: string, manifest?: string): Promise<LoadedInputs> {
    const [ds, loadedManifest] = await Promise.all([
        loadDesignSystem(env.cwd, entry),
        loadManifest(env.cwd, manifest),
    ]);
    const result = validateDesignSystem(ds, loadedManifest);
    for (const issue of [...result.errors, ...result.warnings]) {
        env.logger[issue.level === 'error' ? 'error' : 'warn'](`${issue.where}: ${issue.message}`);
    }
    return { ds, manifest: loadedManifest, result };
}
