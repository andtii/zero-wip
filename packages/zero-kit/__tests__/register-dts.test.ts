/**
 * The register artifact (RFC 0002 §5): per-design-system goldens plus the
 * shape rules that make the generated types safe.
 *
 * Material's golden is written into `packages/zero/type-tests/generated/`,
 * where `pnpm test:types` compiles it against zero's REAL source together
 * with a probe asserting the narrowing — so the emitted file is not just
 * snapshot-compared, it is type-checked end to end. (The probe re-states the
 * file's scope-validity assertion in a `.ts`, which `skipLibCheck` cannot
 * skip.) The other three goldens live under `__goldens__/register/` — NOT
 * under `__tests__`, whose files the root tsconfig compiles: a register
 * `.d.ts` inside that program would augment `ZeroVocabulary` repo-wide and
 * narrow every component's props (the leak the button axes tests canary).
 */
import { describe, it, expect } from 'vitest';
import { compileDesignSystem, compileRegisterDts, compileRegisterJs } from '@sigx/zero-kit';
import type { DesignSystemInput, ManifestComponent, RecipeInput } from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';
import { designSystem as basicDS } from '@sigx/zero-basic';
import { designSystem as daisyDS } from '@sigx/zero-daisyui';
import { designSystem as materialDS } from '@sigx/zero-material';
import { designSystem as brutalistDS } from '@sigx/zero-brutalist';

const manifest = {
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
};

describe('register.d.ts goldens', () => {
    it.each<[string, DesignSystemInput, string]>([
        ['basic', basicDS as DesignSystemInput, '../__goldens__/register/basic.register.d.ts'],
        ['daisyui', daisyDS as DesignSystemInput, '../__goldens__/register/daisyui.register.d.ts'],
        ['material', materialDS as DesignSystemInput, '../../zero/type-tests/generated/material.register.d.ts'],
        ['brutalist', brutalistDS as DesignSystemInput, '../__goldens__/register/brutalist.register.d.ts'],
    ])('%s matches its golden', async (_name, ds, golden) => {
        const compiled = compileDesignSystem(ds, manifest);
        await expect(compileRegisterDts(compiled)).toMatchFileSnapshot(golden);
    });
});

describe('the generated shapes', () => {
    const colors = {
        'base-100': 'oklch(100% 0 0)', 'base-200': 'oklch(96% 0 0)', 'base-300': 'oklch(92% 0 0)',
        'base-content': 'oklch(20% 0 0)',
        primary: 'oklch(50% 0.2 260)', 'primary-content': 'oklch(98% 0.01 260)',
    };
    const dsWith = (...recipes: RecipeInput[]): DesignSystemInput => ({
        name: 'probe',
        recipes,
        tokens: {
            roles: { primary: {} },
            defaultLight: 'l',
            themes: { l: { colorScheme: 'light', colors } },
        } as DesignSystemInput['tokens'],
    });
    const compile = (...recipes: RecipeInput[]) => compileDesignSystem(dsWith(...recipes), manifest);

    it('harvests variants keys and unions compoundVariants matches', () => {
        const compiled = compile({
            component: 'button',
            parts: { root: { base: { padding: '0' } } },
            variants: { color: { primary: { root: { base: { color: 'var(--color-primary)' } } } } },
            compoundVariants: [{
                match: { color: 'primary', size: 'lg' },
                parts: { root: { base: { padding: '1rem' } } },
            }],
        });
        expect(compiled.components['button']).toEqual({
            color: ['primary'],
            size: ['lg'],          // reaches the type through the compound match alone
            variant: [],
            axes: {},
        });
    });

    it('emits never for unwired axes and Record<string, never> for empty axes', () => {
        const dts = compileRegisterDts(compile({
            component: 'button',
            parts: { root: { base: { padding: '0' } } },
            variants: { color: { primary: { root: { base: { color: 'var(--color-primary)' } } } } },
        }));
        expect(dts).toContain("color: 'primary';");
        expect(dts).toContain('size: never;');
        expect(dts).toContain('variant: never;');
        expect(dts).toContain('axes: Record<string, never>;');
        // `{}` would be the top object type — the failure class this exists to remove.
        expect(dts).not.toMatch(/axes: \{\};/);
    });

    it('emits custom axes as a per-axis map', () => {
        const dts = compileRegisterDts(compile({
            component: 'tabs',
            parts: { tab: { states: { 'focus-visible': { outline: '1px solid' } } } },
            variants: { density: { compact: { tab: { base: { padding: '0' } } }, comfortable: { tab: { base: { padding: '1rem' } } } } },
        }));
        expect(dts).toContain("axes: { density: 'compact' | 'comfortable' };");
    });

    it('records defaultVariants in the manifest harvest without widening any union', () => {
        const compiled = compile({
            component: 'button',
            parts: { root: { base: { padding: '0' } } },
            variants: { color: { primary: { root: { base: { color: 'var(--color-primary)' } } } } },
            defaultVariants: { color: 'primary' },
        });
        expect(compiled.components['button']!.defaults).toEqual({ color: 'primary' });
        expect(compiled.components['button']!.color).toEqual(['primary']);
    });

    it('every emitted scope is a real anatomy scope, and the file carries the compile-time assertion', () => {
        const compiled = compileDesignSystem(basicDS as DesignSystemInput, manifest);
        const registryScopes = new Set(Object.keys(anatomies));
        for (const scope of Object.keys(compiled.components)) {
            expect(registryScopes.has(scope), scope).toBe(true);
        }
        const dts = compileRegisterDts(compiled);
        expect(dts).toContain("extends import('@sigx/zero').ZeroScope");
    });

    it('an empty breakpoints declaration emits never, not an empty union', () => {
        const dts = compileRegisterDts(compile({
            component: 'button',
            parts: { root: { base: { padding: '0' } } },
        }));
        expect(dts).toContain('breakpoint: never;');
    });

    it('the register.js stub is exactly an empty module', () => {
        const js = compileRegisterJs(compile({
            component: 'button',
            parts: { root: { base: { padding: '0' } } },
        }));
        expect(js).toContain('export {};');
        expect(js).not.toMatch(/import|function|const |let /);
    });

    it('the manifest carries the axes map keyed by scope', () => {
        const compiled = compileDesignSystem(daisyDS as DesignSystemInput, manifest);
        expect(Object.keys(compiled.components)).toEqual(Object.keys(compiled.componentCss));
        expect(compiled.components['button']!.variant).toEqual(['solid', 'outline', 'soft', 'ghost']);
    });
});
