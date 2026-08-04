/**
 * Write a compiled design system to disk — the artifact layout every DS
 * package ships:
 *
 * ```
 * dist/css/tokens.css
 * dist/css/components/<scope>.css
 * dist/css/index.css
 * dist/manifest.json        (DS-level: name, themes, declared tokens, per-component wired axes)
 * dist/register.d.ts        (GENERATED ZeroVocabulary augmentation — RFC 0002 §5)
 * dist/register.js          (empty module so the /register subpath resolves)
 * dist/report.json          (coverage report — RFC 0003 §7.4; only when given one)
 * dist/components.d.ts      (vendor-named component types — issue #179; only when the design system declares an `api`)
 * dist/components.js        (data-only adapt() wiring for the same — issue #179; only with an `api`)
 * ```
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TOKEN_KEY_PATTERN } from './contract.js';
import type { CompiledDesignSystem } from './design-system.js';
import type { DesignSystemReport } from './resolve/report.js';
import { compileRegisterDts, compileRegisterJs } from './targets/web/register-dts.js';
import { compileComponentsDts, compileComponentsJs } from './targets/web/components-dts.js';

/**
 * `report` is a parameter rather than something built here because
 * `buildReport` needs the authoring input and the anatomy manifest, neither of
 * which survives into `CompiledDesignSystem`. Optional, so a caller that wants
 * no coverage report keeps working unchanged; every other artifact is written
 * either way.
 */
export async function writeArtifacts(
    compiled: CompiledDesignSystem,
    outDir: string,
    report?: DesignSystemReport,
): Promise<string[]> {
    const cssDir = join(outDir, 'css');
    const componentsDir = join(cssDir, 'components');
    await mkdir(componentsDir, { recursive: true });

    const written: string[] = [];
    const write = async (path: string, content: string) => {
        await writeFile(path, content.endsWith('\n') ? content : content + '\n');
        written.push(path);
    };

    await write(join(cssDir, 'tokens.css'), compiled.tokensCss);
    for (const [scope, css] of Object.entries(compiled.componentCss)) {
        // Backstop for direct callers: every pipeline entry (zero's registry,
        // `mergeManifests`) already enforces this grammar, but `writeArtifacts`
        // is public API and `join(dir, '../../escape.css')` walks wherever it
        // is pointed. The scope IS the filename, so the grammar is the guard.
        if (!TOKEN_KEY_PATTERN.test(scope)) {
            throw new Error(
                `[zero-kit] compiled scope "${scope}" is not a kebab-case identifier — it becomes the css/components/<scope>.css filename, so anything else could escape the output directory`,
            );
        }
        await write(join(componentsDir, `${scope}.css`), css);
    }
    await write(join(cssDir, 'index.css'), compiled.indexCss);
    await write(
        join(outDir, 'manifest.json'),
        JSON.stringify(
            {
                name: compiled.name,
                themes: compiled.themes,
                tokens: compiled.tokens,
                // Scope → wired axes (was a bare scope-name array; the scope
                // names remain reachable as this record's keys).
                components: compiled.components,
                // Scope → the vendor-named API surface, for tooling and the
                // conformance matrix's generated rows (issue #179).
                ...(compiled.componentApi ? { api: compiled.componentApi } : {}),
            },
            null,
            2,
        ),
    );
    await write(join(outDir, 'register.d.ts'), compileRegisterDts(compiled));
    await write(join(outDir, 'register.js'), compileRegisterJs(compiled));
    if (compiled.componentApi) {
        await write(join(outDir, 'components.d.ts'), compileComponentsDts(compiled));
        await write(join(outDir, 'components.js'), compileComponentsJs(compiled));
    }
    if (report) await write(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    return written;
}
