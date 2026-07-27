#!/usr/bin/env node
/**
 * zero-kit CLI.
 *
 * ```
 * zero-kit build    [entry] [--manifest <path>] [--out <dir>]
 * zero-kit validate [entry] [--manifest <path>] [--strict]
 * ```
 *
 * `entry` is a compiled ES module (default `./dist/design-system.js`)
 * exporting the design system as `designSystem` (or default). The manifest
 * defaults to the installed `@sigx/zero`'s generated `dist/manifest.json`.
 */
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import process from 'node:process';
import type { ZeroManifest } from './contract.js';
import type { DesignSystemInput } from './design-system.js';
import { compileDesignSystem } from './design-system.js';
import { validateDesignSystem } from './resolve/validate.js';
import { writeArtifacts } from './artifacts.js';

interface Args {
    command: string;
    entry: string;
    manifest?: string;
    out: string;
    strict: boolean;
}

function parseArgs(argv: string[]): Args {
    const [command = 'help', ...rest] = argv;
    const args: Args = { command, entry: './dist/design-system.js', out: './dist', strict: false };
    for (let i = 0; i < rest.length; i++) {
        const a = rest[i]!;
        if (a === '--manifest') args.manifest = rest[++i];
        else if (a === '--out') args.out = rest[++i] ?? args.out;
        else if (a === '--strict') args.strict = true;
        else if (!a.startsWith('--')) args.entry = a;
    }
    return args;
}

async function loadManifest(explicit?: string): Promise<ZeroManifest> {
    let path = explicit;
    if (!path) {
        const require = createRequire(resolve(process.cwd(), 'package.json'));
        path = require.resolve('@sigx/zero/manifest.json');
    }
    return JSON.parse(await readFile(path, 'utf8')) as ZeroManifest;
}

async function loadDesignSystem(entry: string): Promise<DesignSystemInput> {
    const mod = await import(pathToFileURL(resolve(process.cwd(), entry)).href);
    const ds = (mod.designSystem ?? mod.default) as DesignSystemInput | undefined;
    if (!ds || !ds.name || !ds.tokens) {
        throw new Error(`[zero-kit] ${entry} does not export a design system (named "designSystem" or default)`);
    }
    return ds;
}

async function main(): Promise<number> {
    const args = parseArgs(process.argv.slice(2));

    if (args.command === 'build') {
        const [ds, manifest] = await Promise.all([loadDesignSystem(args.entry), loadManifest(args.manifest)]);
        const result = validateDesignSystem(ds, manifest);
        for (const issue of [...result.errors, ...result.warnings]) {
            console[issue.level === 'error' ? 'error' : 'warn'](`[${issue.level}] ${issue.where}: ${issue.message}`);
        }
        if (!result.ok) return 1;
        const compiled = compileDesignSystem(ds, manifest);
        const written = await writeArtifacts(compiled, resolve(process.cwd(), args.out));
        console.log(`[zero-kit] built "${ds.name}": ${written.length} files → ${args.out}`);
        return 0;
    }

    if (args.command === 'validate') {
        const [ds, manifest] = await Promise.all([loadDesignSystem(args.entry), loadManifest(args.manifest)]);
        const result = validateDesignSystem(ds, manifest);
        for (const issue of [...result.errors, ...result.warnings]) {
            console[issue.level === 'error' ? 'error' : 'warn'](`[${issue.level}] ${issue.where}: ${issue.message}`);
        }
        const failed = !result.ok || (args.strict && result.warnings.length > 0);
        console.log(
            failed
                ? `[zero-kit] "${ds.name}" FAILED validation (${result.errors.length} errors, ${result.warnings.length} warnings)`
                : `[zero-kit] "${ds.name}" is valid (${result.warnings.length} warnings)`,
        );
        return failed ? 1 : 0;
    }

    console.log(`zero-kit — design-system authoring for SignalX Zero

Usage:
  zero-kit build    [entry] [--manifest <path>] [--out <dir>]
  zero-kit validate [entry] [--manifest <path>] [--strict]

entry defaults to ./dist/design-system.js (a compiled ES module exporting
\`designSystem\`). The manifest defaults to the installed @sigx/zero's
dist/manifest.json.`);
    return args.command === 'help' ? 0 : 1;
}

main().then(
    (code) => process.exit(code),
    (err) => {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
    },
);
