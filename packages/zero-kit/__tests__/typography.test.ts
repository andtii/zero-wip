/**
 * Typography: families, weights, leading, tracking, and the modular scale.
 *
 * `--font-*` is FAMILIES. That is a deliberate contract decision, not an
 * accident of naming: the whole ecosystem spells it that way, and a
 * `--font-sans` that meant a size would be actively confusing. Sizes are
 * `--text-*`.
 */
import { describe, it, expect } from 'vitest';
import { compileTokensCss, defineTokens, generateTypeScale, validateDesignSystem } from '@sigx/zero-kit';
import type { DesignSystemInput, ManifestComponent } from '@sigx/zero-kit';
import { anatomies } from '@sigx/zero/anatomy';

const manifest = {
    components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[],
};
const colors = {
    'base-100': 'oklch(100% 0 0)', 'base-200': 'oklch(96% 0 0)',
    'base-300': 'oklch(92% 0 0)', 'base-content': 'oklch(20% 0 0)',
    primary: 'oklch(50% 0.2 260)', 'primary-content': 'oklch(98% 0.01 260)',
};
const roles = { primary: {} } as const;

const compile = (typography: Record<string, unknown>) => compileTokensCss(defineTokens({
    roles,
    system: { typography } as never,
    defaultLight: 'l',
    themes: { l: { colorScheme: 'light', colors } },
}));

const RAMP = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

describe('the modular scale generator', () => {
    it('steps geometrically out from the origin', () => {
        // base 1rem at `md` (index 2), ratio 2 — powers of two either side,
        // so the arithmetic is checkable by eye rather than by re-running it.
        expect(generateTypeScale({ base: '1rem', ratio: 2 }, RAMP)).toEqual({
            xs: '0.25rem',
            sm: '0.5rem',
            md: '1rem',
            lg: '2rem',
            xl: '4rem',
            '2xl': '8rem',
            '3xl': '16rem',
        });
    });

    it('rounds without mangling integers', () => {
        // `(100).toFixed(4)` is "100.0000"; a naive /\.?0+$/ trim turns that
        // into "1". Trailing-zero trimming has to anchor on the decimal point.
        expect(generateTypeScale({ base: '100px', ratio: 10, steps: ['a', 'b'], origin: 'a' }, RAMP))
            .toEqual({ a: '100px', b: '1000px' });
    });

    it('keeps the requested precision', () => {
        const scale = generateTypeScale({ base: '1rem', ratio: 1.25 }, RAMP);
        expect(scale.md).toBe('1rem');
        expect(scale.lg).toBe('1.25rem');
        expect(scale.xl).toBe('1.5625rem');
        expect(scale['2xl']).toBe('1.9531rem'); // 1.953125 at default precision 4
    });

    it('honours custom steps and origin', () => {
        expect(generateTypeScale(
            { base: '16px', ratio: 1.5, steps: ['body', 'lead', 'hero'], origin: 'body' },
            RAMP,
        )).toEqual({ body: '16px', lead: '24px', hero: '36px' });
    });

    it.each([
        ['a base with no unit', { base: '1', ratio: 1.25 }, /has no unit/],
        ['a non-numeric base', { base: 'clamp(1rem, 2vw, 2rem)', ratio: 1.25 }, /must be a number with a unit/],
        ['a ratio of 1', { base: '1rem', ratio: 1 }, /greater than 1/],
        ['an origin outside the steps', { base: '1rem', ratio: 1.25, origin: 'nope' }, /is not one of steps/],
    ])('rejects %s', (_label, scale, message) => {
        expect(() => generateTypeScale(scale as never, RAMP)).toThrow(message);
    });
});

describe('typography emission', () => {
    it('emits families, weights, leading and tracking', () => {
        const css = compile({
            fonts: { sans: 'Inter, system-ui', mono: 'JetBrains Mono, monospace' },
            weights: { normal: 400, bold: 700 },
            leading: { tight: 1.2 },
            tracking: { wide: '0.08em' },
        });
        expect(css).toContain('--font-sans: Inter, system-ui;');
        expect(css).toContain('--font-mono: JetBrains Mono, monospace;');
        expect(css).toContain('--weight-bold: 700;');
        expect(css).toContain('--leading-tight: 1.2;');
        expect(css).toContain('--tracking-wide: 0.08em;');
    });

    it('generates the --text-* ramp from a scale', () => {
        const css = compile({ scale: { base: '1rem', ratio: 2 } });
        expect(css).toContain('--text-md: 1rem;');
        expect(css).toContain('--text-lg: 2rem;');
        expect(css).toContain('--text-xs: 0.25rem;');
    });

    it('lets an explicit size override one generated step', () => {
        // A generated ramp with one hand-tuned display size is a normal thing
        // to want, so `sizes` wins per key rather than replacing the ramp.
        const css = compile({
            scale: { base: '1rem', ratio: 2 },
            sizes: { '3xl': 'clamp(2rem, 5vw, 4rem)' },
        });
        expect(css).toContain('--text-lg: 2rem;');                   // still generated
        expect(css).toContain('--text-3xl: clamp(2rem, 5vw, 4rem);'); // overridden
    });

    it('keeps --font-* for families only', () => {
        // The contract decision, asserted: nothing in the font namespace is a
        // size, and nothing in the text namespace is a family.
        const css = compile({ fonts: { sans: 'Inter' }, scale: { base: '1rem', ratio: 1.25 } });
        const fontDecls = [...css.matchAll(/--font-[\w-]+:\s*([^;]+);/g)].map((m) => m[1]!);
        expect(fontDecls.every((v) => !/^[\d.]+(rem|px|em)$/.test(v.trim()))).toBe(true);
        expect(css).toMatch(/--text-md:\s*[\d.]+rem;/);
    });
});

describe('unitless token validation', () => {
    const ds = (typography: Record<string, unknown>): DesignSystemInput => ({
        name: 'probe',
        recipes: [],
        tokens: {
            roles,
            system: { typography },
            defaultLight: 'l',
            themes: { l: { colorScheme: 'light', colors } },
        } as DesignSystemInput['tokens'],
    });
    const errors = (t: Record<string, unknown>) =>
        validateDesignSystem(ds(t), manifest).errors.map((e) => e.message);

    it('rejects a weight with a unit', () => {
        // `font-weight: 600px` is dropped silently, same failure mode as a
        // unitless duration.
        expect(errors({ weights: { bold: '700px' } }))
            .toContainEqual(expect.stringContaining('not a valid <number>'));
    });

    it('rejects a line-height with a unit', () => {
        expect(errors({ leading: { normal: '1.5rem' } }))
            .toContainEqual(expect.stringContaining('not a valid <number>'));
    });

    it('accepts unitless numbers and functional values', () => {
        expect(errors({ weights: { bold: 700 }, leading: { normal: '1.5', tight: 'var(--app-leading)' } }))
            .toEqual([]);
    });

    it('leaves tracking alone, since it is a length', () => {
        expect(errors({ tracking: { wide: '0.05em' } })).toEqual([]);
    });
});

describe('degenerate values', () => {
    it('rejects a step that rounds away to zero', () => {
        // `0rem` is valid CSS, so nothing downstream would complain about a
        // ramp step that renders invisible text.
        expect(() => generateTypeScale(
            { base: '0.00001rem', ratio: 2, steps: ['a', 'b'], origin: 'a' },
            RAMP,
        )).toThrow(/rounds to 0rem at precision 4/);
    });

    it('trims trailing zeros without emptying the value', () => {
        expect(generateTypeScale({ base: '1rem', ratio: 2, steps: ['a'], origin: 'a' }, RAMP))
            .toEqual({ a: '1rem' });
    });
});

describe('functional values must be the whole value', () => {
    const ds = (typography: Record<string, unknown>): DesignSystemInput => ({
        name: 'probe',
        recipes: [],
        tokens: {
            roles, system: { typography }, defaultLight: 'l',
            themes: { l: { colorScheme: 'light', colors } },
        } as DesignSystemInput['tokens'],
    });
    const errors = (t: Record<string, unknown>) =>
        validateDesignSystem(ds(t), manifest).errors.map((e) => e.message);

    it.each([
        ['trailing junk', 'var(--x)junk'],
        ['leading value', '700 var(--x)'],
        ['unbalanced', 'calc(1 + 2'],
    ])('rejects %s', (_label, value) => {
        expect(errors({ weights: { bold: value } }))
            .toContainEqual(expect.stringContaining('not a valid <number>'));
    });

    it('accepts a whole functional value, including nested calls', () => {
        expect(errors({ weights: { bold: 'calc(var(--base-weight) + max(100, 200))' } })).toEqual([]);
    });
});
