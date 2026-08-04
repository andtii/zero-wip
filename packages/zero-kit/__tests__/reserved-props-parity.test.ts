/**
 * The parity guard for `RESERVED_PROPS_BY_SCOPE` (#318).
 *
 * The table is a hand-maintained mirror of zero's component sources: the
 * component-specific props on each scope's ROOT component, which a DS-WIDE
 * api rename may not shadow. A hand-maintained mirror is only safe if
 * something fails when it drifts — this file re-derives the table from the
 * `*RootProps` declarations in `packages/zero/src/components` and compares.
 *
 * The derivation is textual on purpose: the props are spelled as
 * `Define.Prop<'name', …>` intersections, so scraping the declaration is the
 * same fidelity a type-level walk would give, without needing the compiler.
 * `Define.Model` contributes `value`; events and slots are not props the
 * adapter's view could shadow, so they are excluded.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { anatomies } from '@sigx/zero/anatomy';
import { RESERVED_PROPS_BY_SCOPE } from '@sigx/zero-kit';

const componentsDir = resolve(import.meta.dirname, '../../zero/src/components');

/** The scraped component-specific root props for one scope. */
function rootPropsOf(scope: string): string[] {
    const dir = resolve(componentsDir, scope);
    const source = readdirSync(dir)
        .filter((f) => f.endsWith('.tsx'))
        .sort()
        .map((f) => readFileSync(resolve(dir, f), 'utf8'))
        .join('\n');
    const block = /export type \w+RootProps =([\s\S]*?)\n(?:const|export const|function)/.exec(source)?.[1]
        ?? /export type \w+Props =([\s\S]*?)\n(?:const|export const|function)/.exec(source)?.[1]
        ?? '';
    const props = new Set<string>();
    for (const match of block.matchAll(/Define\.Prop<'([^']+)'/g)) props.add(match[1]!);
    if (block.includes('Define.Model')) props.add('value');
    return [...props].sort();
}

describe('RESERVED_PROPS_BY_SCOPE mirrors the component sources', () => {
    it('covers exactly the scopes of the anatomy registry', () => {
        expect(Object.keys(RESERVED_PROPS_BY_SCOPE).sort()).toEqual(Object.keys(anatomies).sort());
    });

    it.each(Object.keys(anatomies))('%s lists its root props', (scope) => {
        expect(
            [...RESERVED_PROPS_BY_SCOPE[scope]!].sort(),
            `RESERVED_PROPS_BY_SCOPE.${scope} drifted from ${scope}'s RootProps declaration — update the table in packages/zero-kit/src/api.ts`,
        ).toEqual(rootPropsOf(scope));
    });
});
