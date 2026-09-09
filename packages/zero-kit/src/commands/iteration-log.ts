/**
 * The iteration log — the Node half (issue #426): where the file goes, and
 * the append/read round trip. The pure half (what an entry is and how a
 * sequence reads back) is `resolve/iteration.ts`.
 *
 * Opt-in, local, append-only. Nothing here talks to a network, and nothing
 * runs unless `--log <path>` or `ZERO_ITERATION_LOG` names a file.
 */
import { appendFile, mkdir, open, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { IterationEntry } from '../resolve/iteration.js';
import { isIterationEntry } from '../resolve/iteration.js';

/** The environment variable that turns the log on for every run. */
export const ITERATION_LOG_ENV = 'ZERO_ITERATION_LOG';

/**
 * Where the log goes, or `undefined` when it is off. The flag wins over the
 * environment; both resolve against the command's cwd. There is no bare
 * `--log` (a value flag has no optional form in @sigx/args, #177) — the
 * environment variable is the "set once, log every run" spelling, which is
 * what the skill uses.
 */
export function resolveIterationLogPath(
    cwd: string,
    flag: string | undefined,
    env: Record<string, string | undefined>,
): string | undefined {
    const spec = flag || env[ITERATION_LOG_ENV];
    return spec ? resolve(cwd, spec) : undefined;
}

/** True when the file exists and its last byte is not a newline. */
async function needsLeadingNewline(path: string): Promise<boolean> {
    let handle;
    try {
        handle = await open(path, 'r');
    } catch {
        return false; // absent — the first line starts the file
    }
    try {
        const { size } = await handle.stat();
        if (size === 0) return false;
        const last = Buffer.alloc(1);
        await handle.read(last, 0, 1, size - 1);
        return last[0] !== 0x0a;
    } finally {
        await handle.close();
    }
}

/**
 * Append one run as one JSON line. Parents are created (the path is usually
 * a dotfile in a package that has not thought about it yet), and a file
 * whose last line was cut short — a run killed mid-write — gets a newline
 * first, so the debris stays one unreadable line rather than swallowing
 * this one too.
 */
export async function appendIteration(path: string, entry: IterationEntry): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const prefix = (await needsLeadingNewline(path)) ? '\n' : '';
    await appendFile(path, `${prefix}${JSON.stringify(entry)}\n`);
}

/**
 * Every entry in the log, in order. An absent file is an empty log; a line
 * that does not parse, or parses to something that is not an entry, is
 * skipped rather than fatal — the log exists to help the loop, and refusing
 * to run because a previous run was interrupted would do the opposite.
 */
export async function readIterationLog(path: string): Promise<IterationEntry[]> {
    let text: string;
    try {
        text = await readFile(path, 'utf8');
    } catch {
        return [];
    }
    const entries: IterationEntry[] = [];
    for (const line of text.split('\n')) {
        if (line.trim() === '') continue;
        let parsed: unknown;
        try {
            parsed = JSON.parse(line);
        } catch {
            continue;
        }
        if (isIterationEntry(parsed)) entries.push(parsed);
    }
    return entries;
}
