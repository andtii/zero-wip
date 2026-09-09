/**
 * The Node half of the iteration log (issue #426): where the file goes, and
 * the append/read round trip.
 *
 * `runValidate` itself is not reachable from this suite — `loadDesignSystem`
 * dynamic-imports the entry through vite's module runner, which cannot load a
 * file written outside the project (the same limit `report.test.ts` records).
 * So the command's two decisions are tested at the seam it makes them through:
 * `resolveIterationLogPath` (flag beats environment beats nothing) and
 * `appendIteration`/`readIterationLog`.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { IterationEntry } from '@sigx/zero-kit';
import { appendIteration, readIterationLog, resolveIterationLogPath } from '../src/commands/iteration-log.js';

const dirs: string[] = [];
const tempDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'zero-kit-iteration-'));
    dirs.push(dir);
    return dir;
};
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

const entry = (n: number): IterationEntry => ({
    ts: `2026-09-08T00:00:0${n}.000Z`, name: 'x', errors: n, warnings: 0, top: [], ms: 1,
});

describe('resolveIterationLogPath', () => {
    it('is off unless asked: no flag and no environment means no log', () => {
        expect(resolveIterationLogPath('/cwd', undefined, {})).toBeUndefined();
        expect(resolveIterationLogPath('/cwd', undefined, { ZERO_ITERATION_LOG: '' })).toBeUndefined();
    });

    it('honours ZERO_ITERATION_LOG, resolved against the command cwd', () => {
        expect(resolveIterationLogPath('/cwd', undefined, { ZERO_ITERATION_LOG: '.zero-iterations.jsonl' }))
            .toBe(resolve('/cwd', '.zero-iterations.jsonl'));
    });

    it('lets --log win over the environment', () => {
        expect(resolveIterationLogPath('/cwd', 'flag.jsonl', { ZERO_ITERATION_LOG: 'env.jsonl' }))
            .toBe(resolve('/cwd', 'flag.jsonl'));
    });
});

describe('appendIteration / readIterationLog', () => {
    it('creates the file and its parents, one JSON line per run', async () => {
        const path = join(tempDir(), 'nested', 'deeper', 'it.jsonl');
        await appendIteration(path, entry(1));
        await appendIteration(path, entry(2));
        const raw = readFileSync(path, 'utf8');
        const lines = raw.split('\n');
        expect(lines.at(-1)).toBe(''); // newline-terminated, so the next append starts a fresh line
        expect(lines.slice(0, -1)).toHaveLength(2);
        for (const line of lines.slice(0, -1)) expect(() => JSON.parse(line)).not.toThrow();
        expect(await readIterationLog(path)).toEqual([entry(1), entry(2)]);
    });

    it('reads an absent log as empty rather than throwing', async () => {
        const path = join(tempDir(), 'never-written.jsonl');
        expect(existsSync(path)).toBe(false);
        expect(await readIterationLog(path)).toEqual([]);
    });

    it('skips a trailing partial line — a run killed mid-write must not poison the next one', async () => {
        const path = join(tempDir(), 'it.jsonl');
        await appendIteration(path, entry(1));
        writeFileSync(path, `${readFileSync(path, 'utf8')}{"ts":"2026-09-08T00:00:02.000Z","name":"x","err`);
        expect(await readIterationLog(path)).toEqual([entry(1)]);
        // …and the next append lands on its own line, after the debris.
        await appendIteration(path, entry(3));
        expect(await readIterationLog(path)).toEqual([entry(1), entry(3)]);
    });

    it('skips a line that parses but is not an entry', async () => {
        const path = join(tempDir(), 'it.jsonl');
        writeFileSync(path, '{"not":"an entry"}\n[1,2]\n');
        await appendIteration(path, entry(1));
        expect(await readIterationLog(path)).toEqual([entry(1)]);
    });
});
