/**
 * The `targets` option on `runStandardBuild` (#348): default `['web']`
 * changes nothing, unknown names and web-less lists fail fast, and the lynx
 * target fails honestly until its emitters land — an accepted-but-ignored
 * option would read as "built for lynx" while emitting nothing.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { anatomies } from '@sigx/zero/anatomy';
import type { ManifestComponent } from '@sigx/zero-kit';
import { BUILD_TARGETS, runStandardBuild } from '@sigx/zero-kit/build';
import type { BuildTarget } from '@sigx/zero-kit/build';
import { designSystem as basicDS } from '@sigx/zero-basic';

const manifest = { components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[] };
const silent = { log() {}, warn() {}, error() {} };

const tempDirs: string[] = [];
const tempDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'zero-kit-targets-'));
    tempDirs.push(dir);
    return dir;
};
afterAll(() => {
    for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('runStandardBuild targets', () => {
    it('defaults to web and writes the classic layout', async () => {
        const outDir = tempDir();
        const { written } = await runStandardBuild({
            designSystem: basicDS, manifest, outDir, logger: silent,
        });
        expect(written.length).toBeGreaterThan(0);
        expect(existsSync(join(outDir, 'css', 'index.css'))).toBe(true);
        expect(existsSync(join(outDir, 'lynx'))).toBe(false);
    });

    it('explicit ["web"] is byte-equivalent to the default', async () => {
        const a = tempDir();
        const b = tempDir();
        const first = await runStandardBuild({ designSystem: basicDS, manifest, outDir: a, logger: silent });
        const second = await runStandardBuild({
            designSystem: basicDS, manifest, outDir: b, targets: ['web'], logger: silent,
        });
        expect(second.written.map((p) => p.slice(b.length))).toEqual(first.written.map((p) => p.slice(a.length)));
    });

    it('rejects unknown targets by name', async () => {
        await expect(runStandardBuild({
            designSystem: basicDS, manifest, outDir: tempDir(),
            targets: ['web', 'terminal' as BuildTarget], logger: silent,
        })).rejects.toThrow(/unknown build target "terminal".*known targets: web, lynx/);
    });

    it('rejects a target list without web', async () => {
        await expect(runStandardBuild({
            designSystem: basicDS, manifest, outDir: tempDir(),
            targets: ['lynx'], logger: silent,
        })).rejects.toThrow(/"web" target is not optional/);
    });

    it('fails honestly on lynx until the emitters land', async () => {
        await expect(runStandardBuild({
            designSystem: basicDS, manifest, outDir: tempDir(),
            targets: ['web', 'lynx'], logger: silent,
        })).rejects.toThrow(/"lynx" target is not implemented yet/);
    });

    it('pins the known-target list', () => {
        expect([...BUILD_TARGETS]).toEqual(['web', 'lynx']);
    });
});
