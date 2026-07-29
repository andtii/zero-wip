/** `sigx zero:validate` — check a design system against the anatomy manifest. */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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
    /** Treat warnings as failures. */
    strict: boolean;
    /** Print the human-readable coverage report. */
    report?: boolean;
    /** Write the machine-readable report here; `-` means stdout. */
    reportJson?: string;
}

/** The report, or `undefined` when the design system does not compile. */
function tryBuildReport(
    ds: DesignSystemInput,
    manifest: ZeroManifest,
    result: ValidationResult,
): DesignSystemReport | undefined {
    try {
        return buildReport(compileDesignSystem(ds, manifest), ds, manifest, result);
    } catch {
        return undefined;
    }
}

export async function runValidate(env: CommandEnv, opts: ValidateOptions): Promise<void> {
    const { ds, manifest, result } = await loadInputs(env, opts.entry, opts.manifest);

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
        // nothing measurable.
        //
        // Caught for the same reason the validator catches it: a design system
        // that cannot compile is already an error in `result`, reported through
        // `loadInputs`. Letting the throw escape here would make
        // `--report` fail differently from plain `zero:validate` on the same
        // input — a raw compiler stack instead of the FAILED validation
        // message — for the one input where the report has nothing to say.
        const report = tryBuildReport(ds, manifest, result);
        if (report) {
            if (opts.report && !stdoutIsJson) for (const line of formatReport(report)) env.logger.log(line);
            if (opts.reportJson) {
                // Never through the logger: it prefixes every line with
                // `[sigx] `, which would leave the JSON unparseable.
                const json = JSON.stringify(report, null, 2);
                if (stdoutIsJson) process.stdout.write(`${json}\n`);
                else await writeFile(resolve(env.cwd, opts.reportJson), `${json}\n`);
            }
        }
    }

    const counts = `${result.errors.length} errors, ${result.warnings.length} warnings`;
    if (!result.ok || (opts.strict && result.warnings.length > 0)) {
        throw new Error(`"${ds.name}" FAILED validation (${counts})`);
    }
    if (!stdoutIsJson) env.logger.log(`"${ds.name}" is valid (${result.warnings.length} warnings)`);
}
