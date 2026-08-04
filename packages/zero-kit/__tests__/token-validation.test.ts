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
