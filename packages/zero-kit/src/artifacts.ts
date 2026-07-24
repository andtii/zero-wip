/**
 * Write a compiled design system to disk — the artifact layout every DS
 * package ships:
 *
 * ```
 * dist/css/tokens.css
 * dist/css/components/<scope>.css
 * dist/css/index.css
 * dist/manifest.json        (DS-level: name, themes, styled components)
 * ```
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CompiledDesignSystem } from './design-system.js';

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
                components: Object.keys(compiled.componentCss),
            },
            null,
            2,
        ),
    );
    return written;
}
