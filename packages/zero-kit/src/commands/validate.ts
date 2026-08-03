/** `sigx zero:validate` — check a design system against the anatomy manifest. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { ZeroManifest } from '../contract.js';
import type { DesignSystemInput } from '../design-system.js';
import { compileDesignSystem } from '../design-system.js';
import type { DesignSystemReport } from '../resolve/report.js';
import { buildReport, formatReport } from '../resolve/report.js';
import type { ValidationResult } from '../resolve/validate.js';
import type { CommandEnv } from './shared.js';
import { loadInputs } from './shared.js';

export interface ValidateOptions {
    entry: string;
    manifest?: string;
    /** Ecosystem manifest fragments to merge into the base manifest. */
    extraManifest?: string[];
    /** Treat warnings as failures. */
    strict: boolean;
    /** Print the human-readable coverage report. */
    report?: boolean;
    /** Write the machine-readable report here; `-` means stdout. */
    reportJson?: string;
}

/**
 * The report, or `undefined` when the design system does not compile.
 *
 * Only the COMPILE is guarded, and only when validation already failed. Those
 * are the two halves of the one case worth swallowing: `validateDesignSystem`
 * compiles inside its own try/catch and records the throw as an error on
 * `recipes`, so re-throwing it here would make `--report` fail differently
 * from plain `zero:validate` on the same input.
 *
 * Everything else propagates. A compile that throws while `result.ok` is true
 * contradicts the validator and is a bug in one of them; and `buildReport`
 * itself sits outside the `try` entirely, so a bug there always surfaces —
 * including for a design system that fails validation, which is exactly when
 * its report matters most.
 */
function tryBuildReport(
    ds: DesignSystemInput,
    manifest: ZeroManifest,
    result: ValidationResult,
): DesignSystemReport | undefined {
    let compiled;
    try {
        compiled = compileDesignSystem(ds, manifest);
    } catch (err) {
        if (result.ok) throw err;
        return undefined;
    }
    return buildReport(compiled, ds, manifest, result);
}

export async function runValidate(env: CommandEnv, opts: ValidateOptions): Promise<void> {
    const { ds, manifest, result } = await loadInputs(env, opts.entry, opts.manifest, opts.extraManifest ?? []);

    // `--report-json -` makes stdout the JSON and nothing else, so it can be
    // piped straight into a tool. The CLI logger's `log` goes to stdout (its
    // `warn`/`error` go to stderr, so diagnostics are unaffected), which means
    // every other `log` in this command has to fall silent — the exit code is
    // what carries pass/fail to a pipeline anyway.
    const stdoutIsJson = opts.reportJson === '-';

    // Emitted BEFORE the pass/fail decision, deliberately: a design system that
    // fails validation is exactly the one whose coverage is worth reading, and
    // that loop — generate, validate, see what is still uncovered, fix — is what
    // the report exists for (RFC 0002 §8).
    if (opts.report || opts.reportJson) {
        // `validateDesignSystem` compiles too, but discards the result behind
        // its own try/catch. Compiling again keeps that seam untouched and costs
        // nothing measurable. `undefined` here means only one thing — the design
        // system does not compile, which `result` already says.
        const report = tryBuildReport(ds, manifest, result);
        if (report) {
            if (opts.report && !stdoutIsJson) for (const line of formatReport(report)) env.logger.log(line);
            if (opts.reportJson) {
                // Never through the logger: it prefixes every line with
                // `[sigx] `, which would leave the JSON unparseable.
                const json = JSON.stringify(report, null, 2);
                if (stdoutIsJson) {
                    process.stdout.write(`${json}\n`);
                } else {
                    // Parents created, like `zero:build --out` does: a report
                    // path is usually somewhere that doesn't exist yet
                    // (`--report-json reports/basic.json`), and failing on that
                    // would be a worse answer than making the directory.
                    const path = resolve(env.cwd, opts.reportJson);
                    await mkdir(dirname(path), { recursive: true });
                    await writeFile(path, `${json}\n`);
                }
            }
        }
    }

    const counts = `${result.errors.length} errors, ${result.warnings.length} warnings`;
    if (!result.ok || (opts.strict && result.warnings.length > 0)) {
        throw new Error(`"${ds.name}" FAILED validation (${counts})`);
    }
    if (!stdoutIsJson) env.logger.log(`"${ds.name}" is valid (${result.warnings.length} warnings)`);
}
