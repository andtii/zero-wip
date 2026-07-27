import { describe, it, expect } from 'vitest';
import {
    compileDesignSystem,
    compileRecipeCss,
    compileTokensCss,
    defineTokens,
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
    const css = compileTokensCss(basicTokens);

    it('refuses a theme name that would break out of its selector', () => {
        // `[data-theme="<name>"]` is an injection surface exactly like the
        // axis values: a quote in the name closes the attribute and the rest
        // is read as CSS.
        expect(() => compileTokensCss({
            ...basicTokens,
            themes: {
                ...basicTokens.themes,
                'x"] [data-part="popup': { colorScheme: 'light', colors: { ...Object.values(basicTokens.themes)[0]!.colors } },
            },
        })).toThrow(/kebab-case identifier/);
    });

    it('emits the tokens layer with :root light-dark pairs', () => {
        expect(css).toContain('@layer zero.tokens');
        expect(css).toContain('color-scheme: light dark;');
        expect(css).toMatch(/--color-primary: light-dark\(/);
    });

    it('derives soft tints live via color-mix', () => {
        expect(css).toMatch(/--color-primary-soft: color-mix\(in oklab, var\(--color-primary\) \d+%, var\(--color-base-100\)\)/);
    });

    it('emits defaults at zero specificity and themes above them', () => {
        // Defaults are :where(:root) (specificity 0); an explicit theme
        // ([data-theme] = 0,1,0) must beat them so toggling actually applies.
        expect(css).toContain(':where(:root)');
        expect(css).toContain('[data-theme="basic"]');
        expect(css).toContain('[data-theme="basic-dark"]');
        expect(css).not.toContain(':where([data-theme');
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

    it('refuses a variant name or value that would break out of its selector', () => {
        // Axis vocabularies are open, so "open" has to stop at what survives
        // being written into `[data-<axis>="<value>"]`. Unguarded, this value
        // closed the attribute early and emitted a SECOND selector —
        // `[data-part="panel"] [data-scope="tabs"][data-part="tab"]` — styling
        // every tab inside any panel. `validateRecipes` reports it as a
        // collected error; compileRecipeCss is public API and can be called
        // without validating, so it refuses outright.
        const injected = 'x"], [data-part="panel';
        expect(() => compileRecipeCss({
            component: 'tabs',
            parts: { tab: { base: { padding: '1rem' } } },
            variants: { size: { [injected]: { tab: { base: { color: 'red' } } } } },
        }, tabsComponent)).toThrow(/not a kebab-case identifier/);

        expect(() => compileRecipeCss({
            component: 'tabs',
            parts: { tab: { base: { padding: '1rem' } } },
            variants: { [injected]: { a: { tab: { base: { color: 'red' } } } } },
        }, tabsComponent)).toThrow(/not a kebab-case identifier/);

        expect(() => compileRecipeCss({
            component: 'tabs',
            parts: { tab: { base: { padding: '1rem' } } },
            compoundVariants: [{ match: { size: injected }, parts: { tab: { base: { color: 'red' } } } }],
        }, tabsComponent)).toThrow(/not a kebab-case identifier/);
    });

    it('still accepts every spelling the shipped design systems use', () => {
        // The guard must not be stricter than real vocabulary: `2xl` starts
        // with a digit and `base-100` is hyphenated-numeric, and both are
        // legitimate axis values.
        const css = compileRecipeCss({
            component: 'tabs',
            parts: { tab: { base: { padding: '1rem' } } },
            variants: {
                size: { '2xl': { tab: { base: { padding: '2rem' } } } },
                color: { 'base-100': { tab: { base: { color: 'red' } } } },
            },
        }, tabsComponent);
        expect(css).toContain('[data-size="2xl"]');
        expect(css).toContain('[data-color="base-100"]');
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
        const result = validateDesignSystem(ds, manifest);
        expect(result.errors).toEqual([]);
        const compiled = compileDesignSystem(ds, manifest);
        expect(Object.keys(compiled.componentCss).sort()).toEqual([
            'accordion', 'avatar', 'button', 'checkbox', 'collapsible', 'dialog', 'field', 'menu',
            'popover', 'progress', 'radio-group', 'select', 'slider', 'switch', 'tabs',
            'toast', 'tooltip',
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
        expect(result.errors.some((e) => e.message.includes('missing color token'))).toBe(true);
        expect(result.errors.some((e) => e.message.includes('contrast'))).toBe(true);
    });
});

describe('extensible color roles', () => {
    const brandTokens = defineTokens({
        roles: {
            brand: { description: 'the product color' },
            danger: {},
            surface: { content: false, soft: false },
        },
        custom: { 'glass-blur': { description: 'backdrop blur radius', syntax: '<length>' } },
        breakpoints: { sm: '640px', md: '768px' },
        themes: {
            day: {
                colorScheme: 'light',
                colors: {
                    'base-100': 'oklch(100% 0 0)',
                    'base-200': 'oklch(96% 0 0)',
                    'base-300': 'oklch(92% 0 0)',
                    'base-content': 'oklch(22% 0.01 285)',
                    brand: 'oklch(45% 0.2 300)',
                    'brand-content': 'oklch(97% 0.01 300)',
                    danger: 'oklch(50% 0.19 27)',
                    'danger-content': 'oklch(97% 0.012 27)',
                    surface: 'oklch(98% 0.002 285)',
                },
                custom: { 'glass-blur': '12px' },
            },
        },
        defaultLight: 'day',
    });
    const brandDS: DesignSystemInput<NonNullable<typeof brandTokens.roles>> = {
        name: 'brand',
        tokens: brandTokens,
        recipes: [],
    };

    it('emits declared roles, respecting content/soft opt-outs', () => {
        const css = compileTokensCss(brandTokens);
        expect(css).toContain('--color-brand: oklch(45% 0.2 300);');
        expect(css).toContain('--color-brand-content:');
        expect(css).toMatch(/--color-brand-soft: color-mix\(in oklab, var\(--color-brand\)/);
        expect(css).toContain('--color-surface: oklch(98% 0.002 285);');
        expect(css).not.toContain('--color-surface-content');
        expect(css).not.toContain('--color-surface-soft');
    });

    it('registers declared roles and typed custom tokens via @property', () => {
        const css = compileTokensCss(brandTokens);
        expect(css).toContain("@property --color-brand { syntax: '<color>'; inherits: true; initial-value: oklch(45% 0.2 300); }");
        expect(css).toContain("@property --glass-blur { syntax: '<length>'; inherits: true; initial-value: 12px; }");
    });

    it('emits declared custom token values per theme', () => {
        const css = compileTokensCss(brandTokens);
        expect(css).toContain('--glass-blur: 12px;');
    });

    it('validates cleanly and derives swatch/manifest metadata from the declaration', () => {
        const result = validateDesignSystem(brandDS, manifest);
        expect(result.errors).toEqual([]);
        const compiled = compileDesignSystem(brandDS, manifest);
        expect(Object.keys(compiled.tokens.roles)).toEqual(['brand', 'danger', 'surface']);
        expect(compiled.tokens.breakpoints).toEqual({ sm: '640px', md: '768px' });
        expect(compiled.tokens.custom['glass-blur']?.syntax).toBe('<length>');
        expect(Object.keys(compiled.themes[0]!.swatch)).toEqual(['brand', 'danger', 'surface', 'base-100', 'base-content']);
    });

    it('errors when a theme omits a declared role or defines an undeclared one', () => {
        const missing = structuredClone(brandTokens);
        delete (missing.themes.day!.colors as unknown as Record<string, string>)['danger'];
        (missing.themes.day!.colors as unknown as Record<string, string>)['mystery'] = '#123456';
        const result = validateDesignSystem({ name: 'x', tokens: missing, recipes: [] }, manifest);
        expect(result.errors.some((e) => e.message.includes('missing color token "danger"'))).toBe(true);
        expect(result.errors.some((e) => e.message.includes('"mystery" is not in the declared vocabulary'))).toBe(true);
    });

    it('matches custom-token spellings with and without the -- prefix', () => {
        const mixed = defineTokens({
            roles: { brand: {} },
            custom: { '--glass-blur': { syntax: '<length>' } },
            themes: {
                day: {
                    colorScheme: 'light',
                    colors: {
                        'base-100': 'white', 'base-200': 'white', 'base-300': 'white', 'base-content': 'black',
                        brand: 'black', 'brand-content': 'white',
                    },
                    custom: { 'glass-blur': '8px' },
                },
            },
            defaultLight: 'day',
        });
        const result = validateDesignSystem({ name: 'x', tokens: mixed, recipes: [] }, manifest);
        expect(result.errors).toEqual([]);
        expect(compileTokensCss(mixed)).toContain("@property --glass-blur { syntax: '<length>'; inherits: true; initial-value: 8px; }");
    });

    it('rejects role names that collide with CSS keywords or base surfaces', () => {
        const bad = defineTokens({
            roles: { transparent: {}, 'base-500': {} },
            themes: {
                day: {
                    colorScheme: 'light',
                    colors: {
                        'base-100': 'white', 'base-200': 'white', 'base-300': 'white', 'base-content': 'black',
                        transparent: 'white', 'transparent-content': 'black',
                        'base-500': 'white', 'base-500-content': 'black',
                    },
                },
            },
            defaultLight: 'day',
        });
        const result = validateDesignSystem({ name: 'x', tokens: bad, recipes: [] }, manifest);
        expect(result.errors.some((e) => e.message.includes('"transparent" is a CSS keyword'))).toBe(true);
        expect(result.errors.some((e) => e.message.includes('"base-500" uses the reserved base-* namespace'))).toBe(true);
    });

    it('errors when a declared custom token has no theme value', () => {
        const missing = structuredClone(brandTokens);
        delete missing.themes.day!.custom!['glass-blur'];
        const result = validateDesignSystem({ name: 'x', tokens: missing, recipes: [] }, manifest);
        expect(result.errors.some((e) => e.message.includes('missing value for declared custom token "glass-blur"'))).toBe(true);
    });
});
