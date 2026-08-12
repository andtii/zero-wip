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
import { buildDsManifest, writeArtifacts } from './artifacts.js';
import type { CompiledLynxTarget } from './targets/lynx/compile.js';
import { compileDesignSystemLynx, writeLynxArtifacts } from './targets/lynx/compile.js';

/** The logging surface the build reports through — `console` by default. */
export interface StandardBuildLogger {
    log(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

/**
 * The emit targets a design-system build can produce. `web` is the CSS every
 * DS has always shipped; `lynx` is the class-grammar target for platforms
 * without attribute selectors (compiled into `dist/lynx/`, landing across the
 * #348 campaign).
 */
export const BUILD_TARGETS = ['web', 'lynx'] as const;
export type BuildTarget = typeof BUILD_TARGETS[number];

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
    /**
     * Which targets to emit. Defaults to `['web']` — every existing build.mjs
     * keeps producing exactly what it always has. A skin opts into the lynx
     * target with `targets: ['web', 'lynx']` once the lynx emitters land.
     */
    targets?: readonly BuildTarget[];
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
    const { designSystem: ds, fragments = [], outDir, targets = ['web'] } = options;
    const logger = options.logger ?? console;

    // Unknown names are misconfiguration, not future-proofing — fail before
    // validating anything else so the message is unmissable.
    for (const target of targets) {
        if (!BUILD_TARGETS.includes(target)) {
            throw new Error(
                `[zero-kit] unknown build target "${target as string}" — known targets: ${BUILD_TARGETS.join(', ')}`,
            );
        }
    }
    if (!targets.includes('web')) {
        // Every non-web target is emitted BESIDE the web artifacts (register
        // d.ts, manifest and report all describe the one compiled DS), not
        // instead of them.
        throw new Error('[zero-kit] the "web" target is not optional — pass targets: [\'web\', …]');
    }
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

    // The lynx target compiles BEFORE the web artifacts are written: its
    // capability findings belong in the same report.json, and a lynx reject
    // (a recipe depending on a web-runtime mechanism) must fail the build
    // before anything lands on disk — same all-or-nothing rule validation has.
    let lynx: CompiledLynxTarget | undefined;
    if (targets.includes('lynx')) {
        lynx = compileDesignSystemLynx(ds, manifest);
        report.lynx = { translated: lynx.report.translated, dropped: lynx.report.dropped };
        if (lynx.report.dropped.length > 0) {
            logger.warn(
                `[${ds.name}] lynx target: ${lynx.report.dropped.length} declaration(s) dropped `
                + `(see report.json under "lynx" for the list and per-entry guidance)`,
            );
        }
    }

    const written = await writeArtifacts(compiled, outDir, report);
    if (lynx) {
        written.push(...await writeLynxArtifacts(compiled, lynx, buildDsManifest(compiled), outDir));
    }
    logger.log(`[${ds.name}] built ${written.length} artifacts`);
    return { result, written };
}
