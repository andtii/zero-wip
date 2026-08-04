/**
 * Token-layer validation added by issue #318: name grammar on the two
 * previously unchecked declaration surfaces (`tokens.custom`, `theme.extra`),
 * then var-reference resolution and cycle detection over token VALUES —
 * the checks the recipe layer has had all along, mirrored where the tokens
 * themselves are declared.
 *
 * Written red-first: every rejected input below compiled and validated clean
 * before the checks existed (`--My Token: …` was emitted verbatim and
 * silently dropped by the browser; `var(--color-brnad)` in tokens.system
 * resolved to nothing at runtime).
 */
import { describe, expect, it } from 'vitest';
import { anatomies } from '@sigx/zero/anatomy';
import type { DesignSystemInput, ManifestComponent, TokensInput } from '@sigx/zero-kit';
import { validateDesignSystem } from '@sigx/zero-kit';

const manifest = { components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[] };

const colors = {
    'base-100': 'oklch(100% 0 0)', 'base-200': 'oklch(96% 0 0)', 'base-300': 'oklch(92% 0 0)',
    'base-content': 'oklch(22% 0.01 285)',
    primary: 'oklch(45% 0.2 300)', 'primary-content': 'oklch(97% 0.01 300)',
};

/** A minimal valid design system the cases below break one piece of. */
const ds = (mutate: (tokens: TokensInput) => void): DesignSystemInput => {
    const tokens: TokensInput = {
        roles: { primary: {} },
        themes: { day: { colorScheme: 'light', colors: { ...colors } } },
        defaultLight: 'day',
    } as TokensInput;
    mutate(tokens);
    return { name: 'probe', tokens, recipes: [] };
};

const errors = (input: DesignSystemInput) =>
    validateDesignSystem(input, manifest).errors.map((e) => `${e.where}: ${e.message}`).join('\n');
const warnings = (input: DesignSystemInput) =>
    validateDesignSystem(input, manifest).warnings.map((w) => `${w.where}: ${w.message}`).join('\n');

describe('declared token names', () => {
    it('rejects a tokens.custom name that is not a kebab-case identifier', () => {
        // `--My Token: 12px` is emitted verbatim and the browser drops the
        // whole declaration silently — the incident input from the review.
        const result = errors(ds((t) => {
            t.custom = { 'My Token': {} };
            t.themes['day']!.custom = { 'My Token': '12px' };
        }));
        expect(result).toContain('"My Token" is not a kebab-case identifier');
    });

    it('rejects a theme.extra name that is not a kebab-case identifier', () => {
        const result = errors(ds((t) => {
            t.themes['day']!.extra = { 'Focus Ring': '2px' };
        }));
        expect(result).toContain('"Focus Ring" is not a kebab-case identifier');
    });

    it('accepts kebab names spelled with or without the -- prefix', () => {
        const result = errors(ds((t) => {
            t.custom = { 'glass-blur': {}, '--focus-ring': {} };
            t.themes['day']!.custom = { 'glass-blur': '12px', 'focus-ring': '2px' };
        }));
        expect(result).toBe('');
    });
});

describe('token-value var() references', () => {
    it('errors on an undeclared reference in tokens.system, with a nearest hint', () => {
        // The incident input: `var(--color-brnad)` compiled clean and shipped
        // a shadow that resolves to nothing.
        const result = errors(ds((t) => {
            t.system = { shadow: { md: '0 0 8px var(--color-primry)' } };
        }));
        expect(result).toContain('references "--color-primry"');
        expect(result).toContain('did you mean "--color-primary"');
    });

    it('downgrades to a warning when the reference has a fallback', () => {
        const input = ds((t) => {
            t.system = { shadow: { md: '0 0 8px var(--color-primry, black)' } };
        });
        expect(errors(input)).toBe('');
        expect(warnings(input)).toContain('undeclared token "--color-primry"');
    });

    it('errors on undeclared references in systemDark, theme.system, theme.custom and theme.extra', () => {
        const result = errors(ds((t) => {
            t.systemDark = { shadow: { md: '0 0 8px var(--color-primry)' } };
            t.custom = { 'focus-ring': {} };
            t.themes['day']!.system = { motion: { durations: { fast: 'var(--duration-fastt)' } } };
            t.themes['day']!.custom = { 'focus-ring': '0 0 0 2px var(--color-primry)' };
            t.themes['day']!.extra = { halo: 'var(--color-primry)' };
        }));
        expect(result).toContain('tokens.systemDark');
        expect(result).toContain('themes.day.system');
        expect(result).toContain('themes.day.custom');
        expect(result).toContain('themes.day.extra');
        expect(result).toContain('--duration-fastt');
    });

    it('accepts references to declared tokens, recommended keys and derived aliases', () => {
        const result = errors(ds((t) => {
            t.custom = { 'focus-ring': {} };
            t.system = { shadow: { md: '0 0 8px var(--color-primary-soft)' } };
            t.themes['day']!.custom = {
                'focus-ring': '0 0 0 calc(var(--border, 1px) * 2) var(--color-primary)',
            };
            t.themes['day']!.extra = { halo: 'var(--text-fixed-sm)' };
        }));
        expect(result).toBe('');
    });
});

describe('custom-property definition cycles', () => {
    it('errors on two tokens that reference each other', () => {
        // `--a: var(--b); --b: var(--a)` — CSS marks every property in the
        // cycle invalid at computed-value time, fallbacks included. Passed
        // validation clean before this check.
        const result = errors(ds((t) => {
            t.custom = { 'ring-width': {}, 'ring-gap': {} };
            t.themes['day']!.custom = {
                'ring-width': 'var(--ring-gap)',
                'ring-gap': 'var(--ring-width, 2px)',
            };
        }));
        expect(result).toMatch(/--ring-width.*--ring-gap|--ring-gap.*--ring-width/);
        expect(result).toContain('cycle');
    });

    it('errors on a self-reference', () => {
        const result = errors(ds((t) => {
            t.custom = { 'ring-width': {} };
            t.themes['day']!.custom = { 'ring-width': 'var(--ring-width, 2px)' };
        }));
        expect(result).toContain('cycle');
    });

    it('a chain without a cycle is fine', () => {
        const result = errors(ds((t) => {
            t.custom = { 'ring-width': {}, 'ring-gap': {} };
            t.themes['day']!.custom = {
                'ring-width': 'calc(var(--ring-gap) * 2)',
                'ring-gap': '2px',
            };
        }));
        expect(result).toBe('');
    });
});
