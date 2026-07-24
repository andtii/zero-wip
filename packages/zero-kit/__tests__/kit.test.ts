import { describe, it, expect } from 'vitest';
import {
    compileDesignSystem,
    compileRecipeCss,
    compileTokensCss,
    validateDesignSystem,
} from '@sigx/zero-kit';
import type { ManifestComponent, TokensInput, RecipeInput, DesignSystemInput } from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';
import { tokens as basicTokens } from '@sigx/zero-basic';
import { designSystem as basicDS } from '@sigx/zero-basic';
import { designSystem as daisyDS } from '@sigx/zero-daisyui';

const manifest = { components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[] };
const tabsComponent = manifest.components.find((c) => c.scope === 'tabs')!;

describe('compileTokensCss', () => {
    const css = compileTokensCss(basicTokens as TokensInput);

    it('emits the tokens layer with :root light-dark pairs', () => {
        expect(css).toContain('@layer zero.tokens');
        expect(css).toContain('color-scheme: light dark;');
        expect(css).toMatch(/--color-primary: light-dark\(/);
    });

    it('derives soft tints live via color-mix', () => {
        expect(css).toMatch(/--color-primary-soft: color-mix\(in oklab, var\(--color-primary\) \d+%, var\(--color-base-100\)\)/);
    });

    it('emits every theme behind :where([data-theme])', () => {
        expect(css).toContain(':where([data-theme="basic"])');
        expect(css).toContain(':where([data-theme="basic-dark"])');
    });
});

describe('compileRecipeCss', () => {
    it('resolves machine states, flags and interaction states', () => {
        const recipe: RecipeInput = {
            component: 'tabs',
            parts: {
                tab: {
                    base: { color: 'red' },
                    states: {
                        active: { fontWeight: '700' },
                        disabled: { opacity: '0.4' },
                        hover: { color: 'blue' },
                    },
                },
            },
        };
        const css = compileRecipeCss(recipe, tabsComponent);
        expect(css).toContain('[data-scope="tabs"][data-part="tab"] {');
        expect(css).toContain('[data-scope="tabs"][data-part="tab"][data-state="active"]');
        expect(css).toContain('[data-scope="tabs"][data-part="tab"][data-disabled]');
        expect(css).toContain('[data-scope="tabs"][data-part="tab"]:hover:not([data-disabled])');
        expect(css).toContain('font-weight: 700;');
    });

    it('rejects unknown parts and states', () => {
        expect(() => compileRecipeCss({ component: 'tabs', parts: { nope: { base: { color: 'red' } } } }, tabsComponent))
            .toThrow(/unknown part "nope"/);
        expect(() => compileRecipeCss(
            { component: 'tabs', parts: { tab: { states: { levitating: { color: 'red' } } } } },
            tabsComponent,
        )).toThrow(/unknown state "levitating"/);
    });

    it('variant values target the carrier part and descend to inner parts', () => {
        const switchComponent = manifest.components.find((c) => c.scope === 'switch')!;
        const recipe: RecipeInput = {
            component: 'switch',
            parts: {},
            variants: {
                color: { success: { control: { states: { checked: { background: 'green' } } } } },
            },
            defaultVariants: { color: 'success' },
        };
        const css = compileRecipeCss(recipe, switchComponent);
        expect(css).toContain('[data-scope="switch"][data-part="root"][data-color="success"] [data-scope="switch"][data-part="control"][data-state="checked"]');
        expect(css).toContain(':not([data-color])');
    });
});

describe('the shipped design systems', () => {
    it.each([
        ['basic', basicDS],
        ['daisyui', daisyDS],
    ] as const)('%s validates cleanly and compiles', (_name, ds) => {
        const result = validateDesignSystem(ds as DesignSystemInput, manifest);
        expect(result.errors).toEqual([]);
        const compiled = compileDesignSystem(ds as DesignSystemInput, manifest);
        expect(Object.keys(compiled.componentCss).sort()).toEqual([
            'accordion', 'checkbox', 'collapsible', 'dialog', 'field', 'menu', 'popover',
            'progress', 'radio-group', 'select', 'slider', 'switch', 'tabs', 'tooltip',
        ]);
        expect(compiled.indexCss).toContain('@layer zero.tokens');
        expect(compiled.themes.length).toBe(2);
    });

    it('validation catches missing tokens and bad contrast', () => {
        const broken: DesignSystemInput = {
            name: 'broken',
            tokens: {
                defaultLight: 'x',
                themes: {
                    x: {
                        colorScheme: 'light',
                        colors: {
                            // deliberately incomplete + low contrast
                            'base-100': 'white',
                            'base-content': 'oklch(95% 0 0)',
                            primary: '#888888',
                            'primary-content': '#999999',
                        } as never,
                    },
                },
            },
            recipes: [],
        };
        const result = validateDesignSystem(broken, manifest);
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.message.includes('missing core color token'))).toBe(true);
        expect(result.errors.some((e) => e.message.includes('contrast'))).toBe(true);
    });
});
