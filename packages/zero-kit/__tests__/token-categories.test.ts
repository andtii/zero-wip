/**
 * The token-category model: DS-declared keys inside kit-curated categories,
 * and the three-tier resolution `system → systemDark → theme.system`.
 */
import { describe, it, expect } from 'vitest';
import {
    TOKEN_CATEGORIES,
    compileDesignSystem,
    compileTokensCss,
    defineTokens,
    systemNodeAt,
    tokenProperty,
    validateDesignSystem,
} from '@sigx/zero-kit';
import type { DesignSystemInput, ManifestComponent } from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';

/** Minimal complete palette — colors aren't what these tests are about. */
const colors = {
    'base-100': 'oklch(100% 0 0)',
    'base-200': 'oklch(96% 0 0)',
    'base-300': 'oklch(92% 0 0)',
    'base-content': 'oklch(20% 0 0)',
    primary: 'oklch(50% 0.2 260)',
    'primary-content': 'oklch(98% 0.01 260)',
} as const;

const roles = { primary: {} } as const;

/** Declarations inside a given selector block, for order-independent asserts. */
function blockOf(css: string, selector: string): string {
    const start = css.indexOf(`${selector} {`);
    expect(start, `selector ${selector} not found`).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf('\n    }', start));
}

describe('token categories', () => {
    it('emits DS-level system values on :root, not per theme', () => {
        const css = compileTokensCss(defineTokens({
            roles,
            system: { radius: { field: '0.5rem' }, border: '2px' },
            defaultLight: 'l',
            themes: { l: { colorScheme: 'light', colors } },
        }));
        expect(blockOf(css, ':where(:root)')).toContain('--radius-field: 0.5rem;');
        expect(blockOf(css, ':where(:root)')).toContain('--border: 2px;');
        // The theme resolves to the same values, so restating them in its own
        // block would be dead weight — it inherits from :root.
        expect(blockOf(css, '[data-theme="l"]')).not.toContain('--radius-field');
    });

    it('accepts keys outside the recommended set', () => {
        // The categories are closed; the keys inside them are not. This is
        // what lets a design system declare e.g. Material's level1..level5.
        const css = compileTokensCss(defineTokens({
            roles,
            system: { radius: { field: '0.5rem', hero: '3rem' } },
            defaultLight: 'l',
            themes: { l: { colorScheme: 'light', colors } },
        }));
        expect(css).toContain('--radius-hero: 3rem;');
    });

    it('lets a theme override only the keys it cares about', () => {
        const css = compileTokensCss(defineTokens({
            roles,
            system: { radius: { field: '0.5rem', box: '1rem' } },
            defaultLight: 'l',
            themes: {
                l: { colorScheme: 'light', colors },
                compact: { colorScheme: 'light', colors, system: { radius: { field: '0' } } },
            },
        }));
        const compact = blockOf(css, '[data-theme="compact"]');
        expect(compact).toContain('--radius-field: 0;');
        expect(compact).not.toContain('--radius-box');
    });

    describe('per-scheme non-color tokens', () => {
        // light-dark() is a <color> function, so a non-color token that differs
        // per scheme needs a prefers-color-scheme block. Before the category
        // model, :root took ALL structural values from the light theme and a
        // dark theme's differing values silently never applied under system
        // dark.
        const css = compileTokensCss(defineTokens({
            roles,
            system: { border: '1px' },
            systemDark: { border: '2px' },
            defaultLight: 'l',
            defaultDark: 'd',
            themes: {
                l: { colorScheme: 'light', colors, pair: 'd' },
                d: { colorScheme: 'dark', colors, pair: 'l' },
            },
        }));

        it('puts the light value on :root', () => {
            expect(blockOf(css, ':where(:root)')).toContain('--border: 1px;');
        });

        it('emits the dark value under prefers-color-scheme: dark', () => {
            expect(css).toContain('@media (prefers-color-scheme: dark)');
            const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
            expect(media).toContain('--border: 2px;');
        });

        it('the dark theme block carries the dark value', () => {
            expect(blockOf(css, '[data-theme="d"]')).toContain('--border: 2px;');
        });

        it('the light theme block restates the light value', () => {
            // Otherwise: OS in dark mode, user explicitly picks the light
            // theme, and the media block's 2px keeps winning because nothing
            // resets it. Restating scheme-divergent props is what makes an
            // explicit choice actually override the system preference.
            expect(blockOf(css, '[data-theme="l"]')).toContain('--border: 1px;');
        });
    });

    it('theme.system beats systemDark, which beats system', () => {
        const css = compileTokensCss(defineTokens({
            roles,
            system: { border: '1px' },
            systemDark: { border: '2px' },
            defaultLight: 'l',
            defaultDark: 'd',
            themes: {
                l: { colorScheme: 'light', colors },
                d: { colorScheme: 'dark', colors },
                loud: { colorScheme: 'dark', colors, system: { border: '9px' } },
            },
        }));
        expect(blockOf(css, '[data-theme="d"]')).toContain('--border: 2px;');
        expect(blockOf(css, '[data-theme="loud"]')).toContain('--border: 9px;');
    });

    it('a dark-only value never reaches the media block', () => {
        // It would be unresettable: no light counterpart exists for a theme
        // block to restate, so explicitly picking a light theme under system
        // dark could not override it. `validateDesignSystem` errors on this;
        // the emission must not be able to produce the trap either.
        const css = compileTokensCss(defineTokens({
            roles,
            systemDark: { border: '2px' },
            defaultLight: 'l',
            defaultDark: 'd',
            themes: {
                l: { colorScheme: 'light', colors },
                d: { colorScheme: 'dark', colors },
            },
        }));
        expect(css).not.toContain('@media (prefers-color-scheme: dark)');
        // The dark theme still applies it when explicitly selected.
        expect(blockOf(css, '[data-theme="d"]')).toContain('--border: 2px;');
    });

    it('omitting a category entirely emits nothing for it', () => {
        // Absence is never an error — base.css carries the fallbacks.
        const css = compileTokensCss(defineTokens({
            roles,
            defaultLight: 'l',
            themes: { l: { colorScheme: 'light', colors } },
        }));
        expect(css).not.toContain('--radius-');
        expect(css).not.toContain('--disabled-opacity');
    });
});

const manifest = {
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
};

/** A minimal valid design system, with `tokens` overridable per case. */
const ds = (tokens: Partial<DesignSystemInput['tokens']>): DesignSystemInput => ({
    name: 'probe',
    recipes: [],
    tokens: {
        roles,
        defaultLight: 'l',
        themes: { l: { colorScheme: 'light', colors } },
        ...tokens,
    } as DesignSystemInput['tokens'],
});

const messages = (input: DesignSystemInput) =>
    validateDesignSystem(input, manifest).errors.map((e) => `${e.where}: ${e.message}`);

describe('token-category validation', () => {
    it('rejects a declared key that cannot be spelled as a custom property', () => {
        const errors = messages(ds({ system: { radius: { '2XL': '1rem' } } }));
        expect(errors.some((m) => m.includes('"2XL"') && m.includes('--radius-2XL'))).toBe(true);
        // …but a leading digit is fine, unlike a color role name.
        expect(messages(ds({ system: { radius: { '2xl': '1rem' } } }))).toEqual([]);
    });

    it('rejects a systemDark override of an undeclared key', () => {
        expect(messages(ds({ system: { radius: { field: '1rem' } }, systemDark: { radius: { box: '2rem' } } })))
            .toContainEqual(expect.stringContaining('overrides "box"'));
        // Scalar categories are covered too — this is what keeps a
        // scheme-divergent value resettable by an explicit light theme.
        expect(messages(ds({ systemDark: { border: '2px' } })))
            .toContainEqual(expect.stringContaining('overrides "border"'));
    });

    it('rejects a per-theme override of an undeclared key', () => {
        const input = ds({
            system: { radius: { field: '1rem' } },
            themes: {
                l: { colorScheme: 'light', colors },
                other: { colorScheme: 'light', colors, system: { radius: { nope: '0' } } },
            },
        });
        expect(messages(input)).toContainEqual(
            expect.stringContaining('themes.other.system.radius: overrides "nope"'),
        );
    });

    it('rejects a custom token inside any category namespace', () => {
        const errors = messages(ds({
            custom: { 'radius-hero': { description: 'x' } },
            themes: { l: { colorScheme: 'light', colors, custom: { 'radius-hero': '2rem' } } },
        }));
        expect(errors).toContainEqual(expect.stringContaining('--radius-* namespace'));
    });

    it('accepts a design system that declares no categories at all', () => {
        expect(messages(ds({}))).toEqual([]);
    });
});

describe('tokenProperty', () => {
    it('throws rather than spelling --radius-undefined', () => {
        const radius = TOKEN_CATEGORIES.find((c) => c.id === 'radius')!;
        expect(() => tokenProperty(radius)).toThrow(/is a scale/);
        expect(tokenProperty(radius, 'field')).toBe('--radius-field');
    });

    it('ignores a key for scalar categories', () => {
        const border = TOKEN_CATEGORIES.find((c) => c.id === 'border')!;
        expect(tokenProperty(border)).toBe('--border');
    });
});

describe('compiled manifest properties', () => {
    const compiled = compileDesignSystem(
        ds({ system: { radius: { field: '0.5rem' }, border: '1px' } }),
        manifest,
    );

    it('lists every emitted custom property, sorted and deduped', () => {
        const { properties } = compiled.tokens;
        expect(properties).toEqual([...new Set(properties)].sort());
        expect(properties).toContain('--radius-field');
        expect(properties).toContain('--border');
    });

    it('includes derived properties no declaration lists', () => {
        // `--color-<role>-soft` is computed by the compiler, so a list derived
        // from the declaration alone would miss it — which is why this is read
        // back off the emitted CSS.
        expect(compiled.tokens.properties).toContain('--color-primary-soft');
    });

    it('publishes the declared system values', () => {
        expect(compiled.tokens.system).toEqual({ radius: { field: '0.5rem' }, border: '1px' });
    });
});

describe('category node traversal', () => {
    it('rejects a scale category given a non-object', () => {
        // Emission would otherwise spread the string into --radius-0,
        // --radius-1, … `system: { radius: '1rem' }` is a plausible mistake.
        const errors = messages(ds({ system: { radius: '1rem' } as never }));
        expect(errors).toContainEqual(expect.stringContaining('must be an object of key → value'));
    });

    it('reads a category node through its full path', () => {
        // Every category is single-segment today, but the next ones nest
        // (typography.sizes). Shortcutting to path[0] would silently resolve
        // the wrong object, so the helper is exercised against a nested path
        // directly rather than waiting for that to bite.
        expect(systemNodeAt({ typography: { sizes: { md: '1rem' } } }, ['typography', 'sizes']))
            .toEqual({ md: '1rem' });
        expect(systemNodeAt({ typography: {} }, ['typography', 'sizes'])).toBeUndefined();
        expect(systemNodeAt({ typography: 'oops' }, ['typography', 'sizes'])).toBeUndefined();
        expect(systemNodeAt(undefined, ['radius'])).toBeUndefined();
    });
});

describe('per-scheme values apply to every token kind, not just colors', () => {
    // light-dark() rescues colors only. Everything else — categories, declared
    // custom tokens, the `extra` escape hatch and component overrides — needs
    // the prefers-color-scheme block, and used to silently take the light
    // theme's value under system dark.
    const css = compileTokensCss(defineTokens({
        roles,
        custom: { 'glass-blur': { description: 'backdrop blur' } },
        system: { border: '1px' },
        systemDark: { border: '3px' },
        defaultLight: 'l',
        defaultDark: 'd',
        themes: {
            l: {
                colorScheme: 'light',
                colors,
                custom: { 'glass-blur': '12px' },
                extra: { '--scrim': 'oklch(0% 0 0 / 0.3)' },
                components: { dialog: { '--dialog-shadow': '0 1px 2px' } },
            },
            d: {
                colorScheme: 'dark',
                colors,
                custom: { 'glass-blur': '28px' },
                extra: { '--scrim': 'oklch(0% 0 0 / 0.7)' },
                components: { dialog: { '--dialog-shadow': '0 8px 24px' } },
            },
        },
    }));

    const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));

    it.each([
        ['a token category', '--border', '1px', '3px'],
        ['a declared custom token', '--glass-blur', '12px', '28px'],
        ['an extra token', '--scrim', 'oklch(0% 0 0 / 0.3)', 'oklch(0% 0 0 / 0.7)'],
        ['a component override', '--dialog-shadow', '0 1px 2px', '0 8px 24px'],
    ])('%s follows the system scheme', (_kind, prop, lightValue, darkValue) => {
        // OS light, no explicit theme.
        expect(blockOf(css, ':where(:root)')).toContain(`${prop}: ${lightValue};`);
        // OS dark, no explicit theme.
        expect(media).toContain(`${prop}: ${darkValue};`);
        // Explicit dark theme, any OS setting.
        expect(blockOf(css, '[data-theme="d"]')).toContain(`${prop}: ${darkValue};`);
        // Explicit light theme. This restatement is what makes an explicit
        // choice beat the media block, and what stops a `<div data-theme="l">`
        // nested under a system-dark root from inheriting the dark value.
        expect(blockOf(css, '[data-theme="l"]')).toContain(`${prop}: ${lightValue};`);
    });
});
