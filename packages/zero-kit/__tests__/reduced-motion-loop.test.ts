/**
 * `reduced-motion/loop` — the static half of `e2e/reduced-motion.spec.ts`.
 *
 * The browser spec asserts, for the two components whose resting state is a
 * loop, that `animation-name` runs under chromium AND is `none` under the
 * reduced-motion project. This rule can only see the second half — that a
 * declared loop has a cancel under `prefers-reduced-motion: reduce` on the
 * same selector — so the six-skin assertion here is paired with a pin that
 * the loops really are declared (`declaresLoop` finds them), or a skin that
 * never animated would pass for the wrong reason, which is the spec's own
 * argument for asserting both directions.
 *
 * Red-first (#403): with `run` stubbed to `[]` the `spinner.root` fixture
 * went green, which is the failure this file exists to catch.
 */
import { describe, it, expect } from 'vitest';
import { auditDesignSystem, compileDesignSystem, parseRules } from '@sigx/zero-kit';
import type { DesignSystemInput, ManifestComponent, PartStyles, TokensInput } from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';
import { designSystem as basicDS } from '@sigx/zero-basic';
import { designSystem as daisyDS } from '@sigx/zero-daisyui';
import { designSystem as materialDS } from '@sigx/zero-material';
import { designSystem as brutalistDS } from '@sigx/zero-brutalist';
import { designSystem as herouiDS } from '@sigx/zero-heroui';
import { designSystem as carbonDS } from '@sigx/zero-carbon';
import { declaresLoop } from '../src/audit/index.js';

const manifest = {
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
};

const SYSTEMS: ReadonlyArray<[string, DesignSystemInput]> = [
    ['basic', basicDS as DesignSystemInput],
    ['daisyui', daisyDS as DesignSystemInput],
    ['material', materialDS as DesignSystemInput],
    ['brutalist', brutalistDS as DesignSystemInput],
    ['heroui', herouiDS as DesignSystemInput],
    ['carbon', carbonDS as DesignSystemInput],
];

const tokens: TokensInput = {
    roles: { primary: {} },
    sizes: [],
    themes: {
        day: {
            colorScheme: 'light',
            colors: {
                'base-100': 'white', 'base-200': 'white', 'base-300': 'white',
                'base-content': 'black', primary: 'blue', 'primary-content': 'white',
            },
        },
    },
    defaultLight: 'day',
};

const looping = (component: 'spinner' | 'skeleton', root: PartStyles): DesignSystemInput => ({
    name: 'fixture',
    tokens,
    recipes: [{ component, parts: { root }, keyframes: { spin: 'to { rotate: 360deg }' } }],
});
const spinner = (root: PartStyles): DesignSystemInput => looping('spinner', root);
/** Skeleton is the one whose loop is state-scoped (`loading`). */
const skeleton = (root: PartStyles): DesignSystemInput => looping('skeleton', root);

const loops = (ds: DesignSystemInput): string[] =>
    auditDesignSystem(ds, manifest, { rules: ['reduced-motion/loop'] }).findings.map((f) => f.where);

describe('reduced-motion/loop', () => {
    it.each(SYSTEMS.map(([name]) => name))('%s: every loop stops under reduced motion', (name) => {
        const ds = SYSTEMS.find(([n]) => n === name)![1];
        expect(loops(ds)).toEqual([]);
    });

    it('…and the skins really do declare loops, so the pass is for the right reason', () => {
        for (const [name, ds] of SYSTEMS) {
            const compiled = compileDesignSystem(ds, manifest);
            for (const scope of ['spinner', 'skeleton']) {
                const rules = parseRules(compiled.componentCss[scope] ?? '');
                expect(rules.some(declaresLoop), `${name}/${scope} declares no infinite animation`).toBe(true);
            }
        }
    });

    it('reports a loop nothing stops', () => {
        const ds = spinner({ base: { animation: 'spin 1s linear infinite' } });
        const [finding] = auditDesignSystem(ds, manifest, { rules: ['reduced-motion/loop'] }).findings;
        expect(finding?.where).toBe('spinner.root');
        expect(finding?.severity).toBe('error');
        expect(finding?.message).toContain('reduced-motion');
    });

    it('reports the longhand too', () => {
        const ds = spinner({ base: { animationName: 'spin', animationDuration: '1s', animationIterationCount: 'infinite' } });
        expect(loops(ds)).toEqual(['spinner.root']);
    });

    it('accepts animation: none under reduced motion, and animation-name: none', () => {
        expect(loops(spinner({
            base: { animation: 'spin 1s linear infinite' },
            at: { 'reduced-motion': { base: { animation: 'none' } } },
        }))).toEqual([]);
        expect(loops(spinner({
            base: { animation: 'spin 1s linear infinite' },
            at: { 'reduced-motion': { base: { animationName: 'none' } } },
        }))).toEqual([]);
    });

    it('does not accept a cancel on a broader selector than the loop\'s', () => {
        // The loop is state-scoped, the cancel is not: `@media` adds no
        // specificity, so `[data-state="loading"]` keeps winning and the loop
        // keeps running. A reader that matched on the part alone would pass
        // this.
        const ds = skeleton({
            base: {},
            states: { loading: { animation: 'spin 1s linear infinite' }, loaded: {} },
            at: { 'reduced-motion': { base: { animation: 'none' } } },
        });
        expect(loops(ds)).toEqual(['skeleton.root']);
        // Cancelled on the same state, it is fine.
        expect(loops(skeleton({
            base: {},
            states: { loading: { animation: 'spin 1s linear infinite' }, loaded: {} },
            at: { 'reduced-motion': { states: { loading: { animation: 'none' } } } },
        }))).toEqual([]);
    });

    it('does not accept a pause — the loop is still declared', () => {
        expect(loops(spinner({
            base: { animation: 'spin 1s linear infinite' },
            at: { 'reduced-motion': { base: { animationPlayState: 'paused' } } },
        }))).toEqual(['spinner.root']);
    });

    it('ignores a loop that only exists when motion is welcome', () => {
        expect(loops(spinner({
            base: {},
            at: { '@media (prefers-reduced-motion: no-preference)': { base: { animation: 'spin 1s linear infinite' } } },
        }))).toEqual([]);
    });

    it('ignores a finite animation', () => {
        expect(loops(spinner({ base: { animation: 'spin 0.3s ease-out' } }))).toEqual([]);
    });
});
