/**
 * The sigx CLI plugin surface.
 *
 * The old hand-rolled CLI had no tests — its single-pass `parseArgs` and its
 * `if (command === …)` chain were only ever exercised by hand. Standing on
 * `@sigx/args` makes both halves testable without spawning a process:
 * `parseArgs` throws a structured `ParseError` instead of printing and
 * exiting, and `detect` is a plain predicate.
 *
 * What's asserted here is the *contract with the CLI host* — the command
 * names and aliases the sigx CLI registers, the flag grammar each command
 * accepts, and which directories the plugin claims. The compile/validate
 * behaviour behind them is covered by the rest of this suite.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs, ParseError } from '@sigx/args';
import type { ArgsShape } from '@sigx/args';
import plugin from '../src/plugin.js';
import { loadManifest } from '../src/commands/shared.js';

/** A throwaway project directory; `detect` only ever reads from disk. */
function projectDir(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'zero-kit-plugin-'));
    for (const [rel, contents] of Object.entries(files)) {
        const path = join(dir, rel);
        mkdirSync(join(path, '..'), { recursive: true });
        writeFileSync(path, contents);
    }
    return dir;
}

const pkg = (deps: Record<string, unknown>) => JSON.stringify({ name: 'x', ...deps });

/** The args shape the CLI host would hand to `parseArgs` for a command. */
const shapeOf = (name: string): ArgsShape => plugin.commands[name]!.args as ArgsShape;

describe('plugin registration', () => {
    it('registers namespaced commands with bare aliases', () => {
        // Namespaced so a project that is also a Lynx app doesn't get whichever
        // `build` loaded last; the bare alias still resolves when unclaimed.
        expect(Object.keys(plugin.commands).sort()).toEqual(['zero:build', 'zero:validate']);
        expect(plugin.commands['zero:build']!.aliases).toEqual(['build']);
        expect(plugin.commands['zero:validate']!.aliases).toEqual(['validate']);
    });

    it('describes every command and flag', () => {
        // The description text IS the generated help — an empty one ships a
        // blank column in `sigx --help`.
        for (const [name, cmd] of Object.entries(plugin.commands)) {
            expect(cmd.description, name).toBeTruthy();
        }
    });
});

describe('detect', () => {
    it('claims a package that depends on the kit', () => {
        expect(plugin.detect(projectDir({ 'package.json': pkg({ devDependencies: { '@sigx/zero-kit': '^0.1.0' } }) }))).toBe(true);
        expect(plugin.detect(projectDir({ 'package.json': pkg({ dependencies: { '@sigx/zero-kit': '^0.1.0' } }) }))).toBe(true);
    });

    it('claims a package with the conventional source entry', () => {
        // A generated design system before anything is installed.
        expect(plugin.detect(projectDir({ 'src/design-system.ts': 'export const designSystem = {};' }))).toBe(true);
    });

    it('ignores unrelated projects', () => {
        expect(plugin.detect(projectDir({ 'package.json': pkg({ dependencies: { vite: '^8.0.0' } }) }))).toBe(false);
        expect(plugin.detect(projectDir({}))).toBe(false);
    });

    it('survives an unparseable package.json', () => {
        // A broken manifest must not crash discovery for every other plugin.
        expect(plugin.detect(projectDir({ 'package.json': '{ not json' }))).toBe(false);
        expect(plugin.detect(projectDir({ 'package.json': '{ not json', 'src/design-system.ts': '' }))).toBe(true);
    });
});

describe('zero:build args', () => {
    const shape = shapeOf('zero:build');

    it('applies defaults', () => {
        const { args } = parseArgs([], shape);
        expect(args.entry).toBe('./dist/design-system.js');
        expect(args.out).toBe('./dist');
        expect(args.manifest).toBeUndefined();
    });

    it('takes the entry as a positional', () => {
        expect(parseArgs(['./build/ds.js'], shape).args.entry).toBe('./build/ds.js');
    });

    it('accepts --out x and --out=x identically', () => {
        expect(parseArgs(['--out', 'css'], shape).args.out).toBe('css');
        expect(parseArgs(['--out=css'], shape).args.out).toBe('css');
    });

    it('rejects an unknown flag with a machine-readable code', () => {
        // The old CLI silently ignored anything starting with `--`.
        try {
            parseArgs(['--nope'], shape);
            expect.unreachable('should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(ParseError);
            expect((err as ParseError).code).toBe('UNKNOWN_FLAG');
        }
    });

    it('rejects a value flag with no value', () => {
        expect(() => parseArgs(['--out'], shape)).toThrow(ParseError);
    });
});

describe('loadManifest diagnostics', () => {
    // Every one of these surfaces as `error: <message>` and a non-zero exit.
    // Raw MODULE_NOT_FOUND / "components.map is not a function" read as
    // internal failures, so each names the cause and what to do about it.
    // The default-resolution branch (no --manifest, `@sigx/zero` missing from
    // the project) is deliberately not covered here: this suite runs under the
    // vitest config's `@sigx/zero` alias, which satisfies `require.resolve`
    // from any directory, so the failure can't be reproduced in-process.

    it('reports an unreadable explicit manifest', async () => {
        const dir = projectDir({ 'package.json': pkg({}) });
        await expect(loadManifest(dir, './missing.json')).rejects.toThrow(/cannot read the anatomy manifest/);
    });

    it('reports invalid JSON', async () => {
        const dir = projectDir({ 'm.json': '{ not json' });
        await expect(loadManifest(dir, './m.json')).rejects.toThrow(/is not valid JSON/);
    });

    it('rejects a well-formed file that is not an anatomy manifest', async () => {
        // A design system emits its own dist/manifest.json — same filename,
        // different shape, and an easy thing to point --manifest at.
        const dir = projectDir({ 'm.json': JSON.stringify({ name: 'basic', tokens: {} }) });
        await expect(loadManifest(dir, './m.json')).rejects.toThrow(/is not a zero anatomy manifest/);
    });

    it('accepts a real manifest', async () => {
        const dir = projectDir({ 'm.json': JSON.stringify({ components: [] }) });
        await expect(loadManifest(dir, './m.json')).resolves.toEqual({ components: [] });
    });
});

describe('zero:validate args', () => {
    const shape = shapeOf('zero:validate');

    it('defaults --strict off', () => {
        expect(parseArgs([], shape).args.strict).toBe(false);
        expect(parseArgs(['--strict'], shape).args.strict).toBe(true);
    });

    it('does not let the --strict boolean swallow the next token', () => {
        // The hand-rolled parser read the next argv slot for every flag; a
        // boolean that eats its successor turns `--strict --manifest x` into
        // a silently manifest-less run.
        const { args } = parseArgs(['--strict', '--manifest', 'm.json'], shape);
        expect(args.strict).toBe(true);
        expect(args.manifest).toBe('m.json');
    });

    it('has no --out flag', () => {
        // Validation writes nothing; offering --out would be a lie.
        expect(() => parseArgs(['--out', 'x'], shape)).toThrow(ParseError);
    });
});
