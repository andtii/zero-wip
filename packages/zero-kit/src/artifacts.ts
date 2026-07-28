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
 * ```
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CompiledDesignSystem } from './design-system.js';
import { compileRegisterDts, compileRegisterJs } from './targets/web/register-dts.js';

export async function writeArtifacts(compiled: CompiledDesignSystem, outDir: string): Promise<string[]> {
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
            },
            null,
            2,
        ),
    );
    await write(join(outDir, 'register.d.ts'), compileRegisterDts(compiled));
    await write(join(outDir, 'register.js'), compileRegisterJs(compiled));
    return written;
}
