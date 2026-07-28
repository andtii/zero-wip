/**
 * The register artifact — a generated `.d.ts` that augments `@sigx/zero`'s
 * empty `ZeroVocabulary` with the vocabulary this design system's compiled
 * CSS actually answers to (RFC 0002 §5).
 *
 * Web-target by construction: the augmented specifier (`@sigx/zero`) is
 * foundation-specific, so this lives beside `tokens-css.ts` and
 * `recipe-css.ts` rather than in the target-neutral core.
 *
 * Everything emitted is harvested from the COMPILED design system — the
 * `properties` list is read back off the emitted CSS, per-component axes come
 * from `CompiledDesignSystem.components` — so the types cannot drift from the
 * stylesheet backing them. Every value interpolated into a literal union has
 * already passed the validator's kebab-case attribute grammar, so plain
 * single-quoting is safe.
 */
import { TOKEN_CATEGORIES, systemNodeAt } from '../../contract.js';
import type { CompiledComponentAxes, CompiledDesignSystem } from '../../design-system.js';

const union = (values: readonly string[]): string =>
    values.length === 0 ? 'never' : values.map((v) => `'${v}'`).join(' | ');

/** The per-category token unions: recommended keys ∪ declared system/systemDark keys. */
function tokenUnions(compiled: CompiledDesignSystem): Array<[string, string]> {
    const tiers = [compiled.tokens.system, compiled.tokens.systemDark];
    const entries: Array<[string, string]> = [];
    for (const category of TOKEN_CATEGORIES) {
        if (category.shape === 'scalar') continue; // keyless — nothing to union
        const keys = new Set<string>(category.recommended);
        for (const tier of tiers) {
            const node = systemNodeAt(tier, category.path);
            if (typeof node !== 'object' || node === null) continue;
            for (const key of Object.keys(node)) keys.add(key);
        }
        entries.push([category.id, union([...keys])]);
    }
    return entries;
}

/**
 * Axes this design system has declared OUT OF EXISTENCE, as opposed to merely
 * left unwired.
 *
 * The distinction matters in the diagnostic: "no recipe wires it" tells an
 * author to go wire one, which is wrong advice when there is no axis to wire.
 *
 * Only `color` and `size` can be declared away, and only by an *explicitly
 * empty* declaration — `resolveRoles(undefined)` yields the recommended eight
 * and `resolveSizes(undefined)` the recommended ramp, so an empty result here
 * can only have come from `roles: {}` or `sizes: []`.
 *
 * `variant` is deliberately absent: omitting `tokens.variants` means "declared
 * nothing, check nothing", NOT "this design system has no variant axis", and
 * `compileDesignSystem` normalises the omission to `[]`. Treating that as
 * out-of-existence would mislabel every unwired `variant` in a design system
 * that simply never declared the vocabulary — the exact error this function
 * exists to avoid, pointed the other way.
 */
function undeclaredAxes(compiled: CompiledDesignSystem): ReadonlySet<string> {
    const out = new Set<string>();
    if (Object.keys(compiled.tokens.roles).length === 0) out.add('color');
    if (compiled.tokens.sizes.length === 0) out.add('size');
    return out;
}

function componentEntry(
    scope: string,
    axes: CompiledComponentAxes,
    dsName: string,
    undeclared: ReadonlySet<string>,
): string {
    const named = (['color', 'size', 'variant'] as const).filter((a) => axes[a].length > 0);
    const custom = Object.keys(axes.axes);
    const mods = [...axes.mods].sort();
    const wired = [...named, ...custom.map((a) => `axes.${a}`), ...mods.map((m) => `mods.${m}`)];
    const summary = wired.length > 0
        ? `${scope} — ${wired.join(', ')} wired.`
        : `${scope} — no axis wired by ${dsName}; every axis errors under this register module.`;

    const axisLine = (axis: 'color' | 'size' | 'variant'): string => {
        const values = axes[axis];
        if (values.length > 0) return `                ${axis}: ${union(values)};`;
        const why = undeclared.has(axis)
            ? `${dsName} declares no ${axis} axis at all`
            : `no ${dsName} recipe wires it`;
        return [
            `                /** Accepts \`${axis}\` at runtime, but ${why} — the attribute would match nothing. */`,
            `                ${axis}: never;`,
        ].join('\n');
    };
    // Empty axes MUST be Record<string, never>, not {} — `{}` is the top
    // object type and would silently permit any bag (RFC 0002 §5). Axis keys
    // are quoted for the same reason scope keys are: they are kebab-case.
    const axesLine = custom.length > 0
        ? `                axes: { ${custom.map((a) => `'${a}': ${union(axes.axes[a]!)}`).join('; ')} };`
        : '                axes: Record<string, never>;';
    // Modifiers are presence-only, so the value type is `boolean` and there is
    // no vocabulary to union — the NAMES are the vocabulary. `Record<string,
    // never>` for the empty case, same `{}`-is-the-top-type trap as `axes`.
    const modsLine = mods.length > 0
        ? `                mods: { ${mods.map((m) => `'${m}': boolean`).join('; ')} };`
        : '                mods: Record<string, never>;';

    return [
        `            /** ${summary} */`,
        // Quoted: scope names are kebab-case ('radio-group'), which is not a
        // valid bare property name — a syntax error the compile gate caught.
        `            '${scope}': {`,
        axisLine('color'),
        axisLine('size'),
        axisLine('variant'),
        axesLine,
        modsLine,
        '            };',
    ].join('\n');
}

export function compileRegisterDts(compiled: CompiledDesignSystem): string {
    const themes = compiled.themes.map((t) => t.name);
    const breakpoints = Object.keys(compiled.tokens.breakpoints);
    const scopes = Object.keys(compiled.components);
    const undeclared = undeclaredAxes(compiled);

    return [
        `// ${compiled.name} — generated by @sigx/zero-kit. Do not edit.`,
        '//',
        "// Augments @sigx/zero's ZeroVocabulary with this design system's compiled",
        "// vocabulary. Opt in with:  import '@sigx/<ds>/register';",
        "declare module '@sigx/zero' {",
        '    interface ZeroVocabulary {',
        `        theme: ${union(themes)};`,
        `        breakpoint: ${union(breakpoints)};`,
        `        property: ${union(compiled.tokens.properties)};`,
        '        tokens: {',
        ...tokenUnions(compiled).map(([id, u]) => `            ${id}: ${u};`),
        '        };',
        '        components: {',
        ...scopes.map((scope) => componentEntry(scope, compiled.components[scope]!, compiled.name, undeclared)),
        '        };',
        '    }',
        '}',
        '',
        '// Fails to compile if a scope above is not in zero\'s anatomy registry',
        '// (a typo or a version skew would otherwise silently take the open',
        '// fallback — RFC 0002 §3.1).',
        'type _MustBeTrue<T extends true> = T;',
        'type _ScopesValid = _MustBeTrue<',
        "    keyof import('@sigx/zero').ZeroVocabulary['components'] extends import('@sigx/zero').ZeroScope",
        '        ? true : false',
        '>;',
        'export {};',
        '',
    ].join('\n');
}

/** The runtime half of the `/register` subpath — resolvable, empty, side-effect-free. */
export function compileRegisterJs(compiled: CompiledDesignSystem): string {
    return [
        `// ${compiled.name} — generated by @sigx/zero-kit. Do not edit.`,
        '// The /register module is types-only; this file exists so the specifier',
        '// resolves at runtime. Nothing may ever hang behaviour off it.',
        'export {};',
        '',
    ].join('\n');
}
