/**
 * The standard design-system build — `@sigx/zero-kit/build`.
 *
 * Every shipped design system runs the same pipeline: merge any ecosystem
 * fragments, validate, refuse to emit from an invalid source, compile, build
 * the coverage report, write the artifacts. Six build.mjs files carried that
 * pipeline byte-identically (five of them literally so); it lives once here,
 * and the `sigx zero:build` command calls the same function — one derivation
 * of "what a build is", however it is invoked.
 *
 * Node-only (writes to disk). The authoring surface a browser-graph module
 * may import lives at `@sigx/zero-kit/define`.
 */
import type { ZeroManifest } from './contract.js';
import type { DesignSystemInput } from './design-system.js';
import { compileDesignSystem } from './design-system.js';
import type { ManifestFragment } from './manifest.js';
import { mergeManifests } from './manifest.js';
import type { ValidationResult } from './resolve/validate.js';
import { validateDesignSystem } from './resolve/validate.js';
import { buildReport } from './resolve/report.js';
import { writeArtifacts } from './artifacts.js';

/** The logging surface the build reports through — `console` by default. */
export interface StandardBuildLogger {
    log(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export interface StandardBuildOptions {
    designSystem: DesignSystemInput;
    /**
     * The anatomy manifest to build against. The caller supplies it (usually
     * `{ components: Object.values(anatomies).map((a) => a.toJSON()) }` from
     * `@sigx/zero/anatomy`) — the kit deliberately has no runtime dependency
     * on zero, so it cannot default this.
     */
    manifest: Pick<ZeroManifest, 'components'>;
    /**
     * Ecosystem manifest fragments to merge in (merged, never replacing).
     * zero-basic passes `@sigx/zero-ext-example/fragment` here; the recipe
     * pack that goes with a fragment is composed into
     * `designSystem.recipes` by the caller — spread order is precedence.
     */
    fragments?: readonly ManifestFragment[];
    /** Absolute output directory (the package's `dist`). */
    outDir: string;
    logger?: StandardBuildLogger;
}

export interface StandardBuildResult {
    result: ValidationResult;
    /** Every artifact path written. */
    written: string[];
}

/**
 * validate → compile → buildReport → writeArtifacts, with uniform issue
 * printing. Throws — after printing every issue — when validation fails:
 * nothing is ever emitted from an invalid source, and a rejected promise is
 * what fails a build script and the CLI alike.
 */
export async function runStandardBuild(options: StandardBuildOptions): Promise<StandardBuildResult> {
    const { designSystem: ds, fragments = [], outDir } = options;
    const logger = options.logger ?? console;
    const manifest = fragments.length > 0
        ? mergeManifests(options.manifest, ...fragments)
        : options.manifest;

    const result = validateDesignSystem(ds, manifest);
    for (const issue of [...result.errors, ...result.warnings]) {
        logger[issue.level === 'error' ? 'error' : 'warn'](`[${issue.level}] ${issue.where}: ${issue.message}`);
    }
    if (!result.ok) {
        throw new Error(`[zero-kit] "${ds.name}" failed validation (${result.errors.length} errors) — nothing written`);
    }

    const compiled = compileDesignSystem(ds, manifest);
    // The coverage report is built here rather than inside writeArtifacts: it
    // needs the authoring input and the anatomy manifest, neither of which
    // survives into CompiledDesignSystem.
    const report = buildReport(compiled, ds, manifest, result);
    const written = await writeArtifacts(compiled, outDir, report);
    logger.log(`[${ds.name}] built ${written.length} artifacts`);
    return { result, written };
}
