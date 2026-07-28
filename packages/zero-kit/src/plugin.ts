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
 * A design-system package: one that pulls in the kit, or that has the
 * conventional source entry. The dependency check is first because it is what
 * a generated package looks like before anything is written.
 */
function isDesignSystemProject(cwd: string): boolean {
    const pkgPath = join(cwd, 'package.json');
    if (existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
                dependencies?: Record<string, string>;
                devDependencies?: Record<string, string>;
            };
            if (pkg.dependencies?.['@sigx/zero-kit'] || pkg.devDependencies?.['@sigx/zero-kit']) return true;
        } catch {
            // Unparseable package.json — fall through to the source-entry check.
        }
    }
    return existsSync(join(cwd, 'src', 'design-system.ts'));
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
