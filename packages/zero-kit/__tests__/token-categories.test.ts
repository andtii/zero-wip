/**
 * The token-category model: DS-declared keys inside kit-curated categories,
 * and the three-tier resolution `system → systemDark → theme.system`.
 */
import { describe, it, expect } from 'vitest';
import { compileTokensCss, defineTokens } from '@sigx/zero-kit';

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
