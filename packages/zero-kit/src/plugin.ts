/**
 * @sigx/zero-kit plugin
 *
 * Registers the design-system build and validate commands with the sigx CLI.
 * Auto-discovered in any package that has `@sigx/zero-kit` installed — see the
 * `"sigx-cli"` field in this package's package.json.
 *
 * Commands are namespaced (`zero:build`) rather than bare (`build`), because
 * the sigx CLI resolves command-name collisions last-plugin-wins: a project
 * that is both a Lynx app and a design-system package would otherwise get
 * whichever `build` loaded last. The bare names are registered as aliases, so
 * `sigx build` still works when nothing else claims it — a colliding alias is
 * dropped with a warning rather than silently taking over.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { a, definePlugin } from '@sigx/cli/plugin';

/** Shared flag declarations — identical across both commands. */
const entryArg = a
    .positional()
    .default('./dist/design-system.js')
    .describe('Compiled ES module exporting `designSystem` (or default)');

const manifestArg = a
    .string()
    .valueHint('path')
    .describe('Anatomy manifest path (default: @sigx/zero/manifest.json, resolved from this directory)');

/**
 * A design-system package is one that pulls in the kit.
 *
 * Nothing looser would earn its keep: the CLI only loads this plugin after
 * finding `@sigx/zero-kit` among the project's own dependencies, so by the
 * time `detect` runs that much is already established. A source-shape
 * heuristic on top of it could only ever produce false positives — the kit's
 * own `src/design-system.ts` is library code, not a design system.
 */
function isDesignSystemProject(cwd: string): boolean {
    const pkgPath = join(cwd, 'package.json');
    if (!existsSync(pkgPath)) return false;
    try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
            name?: string;
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
        };
        if (pkg.name === '@sigx/zero-kit') return false; // the kit itself, not a consumer
        return Boolean(pkg.dependencies?.['@sigx/zero-kit'] || pkg.devDependencies?.['@sigx/zero-kit']);
    } catch {
        return false; // unparseable manifest — claim nothing
    }
}

export default definePlugin({
    name: 'zero',
    detect: isDesignSystemProject,
    commands: {
        'zero:build': {
            description: 'Compile a design system to CSS artifacts',
            aliases: ['build'],
            args: {
                entry: entryArg,
                manifest: manifestArg,
                out: a.string().valueHint('dir').default('./dist').describe('Output directory'),
            },
            async run(ctx) {
                const { runBuild } = await import('./commands/build.js');
                await runBuild(ctx, { entry: ctx.args.entry, manifest: ctx.args.manifest, out: ctx.args.out });
            },
        },
        'zero:validate': {
            description: 'Check a design system against the anatomy manifest',
            aliases: ['validate'],
            args: {
                entry: entryArg,
                manifest: manifestArg,
                strict: a.boolean().default(false).describe('Fail on warnings, not just errors'),
            },
            async run(ctx) {
                const { runValidate } = await import('./commands/validate.js');
                await runValidate(ctx, {
                    entry: ctx.args.entry,
                    manifest: ctx.args.manifest,
                    strict: ctx.args.strict,
                });
            },
        },
    },
});
