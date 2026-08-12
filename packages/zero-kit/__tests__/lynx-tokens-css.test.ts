/**
 * The lynx token emitter (#351): baked literals on class hosts, capability
 * verdicts, and the structural gate that makes "capability-safe" a property
 * of the artifact rather than of reviewer attention — the compile-time
 * analogue of the lynx repo's on-device css-engine probe.
 */
import { describe, expect, it } from 'vitest';
import {
    bakeColor,
    bakeSoft,
    compileLynxTokensCss,
    emptyReport,
    runtimePropertyIn,
} from '../src/targets/lynx/index.js';
import type { TokensInput } from '../src/tokens.js';
import { tokens as basicTokens } from '@sigx/zero-basic';
import { tokens as daisyTokens } from '@sigx/zero-daisyui';

/**
 * What lynx's engine cannot parse and this target must therefore never emit.
 * One list, applied to every compiled artifact below — a new emission path
 * that leaks a web-ism fails here by construction.
 */
const FORBIDDEN = [
    /@layer/, /@property/, /@starting-style/, /@media/, /@supports/,
    /light-dark\(/, /oklch\(/, /oklab\(/, /color-mix\(/, /calc\(var\(/,
    /:root/, /\[data-/,
] as const;

function expectLynxSafe(css: string): void {
    for (const pattern of FORBIDDEN) {
        expect(css).not.toMatch(pattern);
    }
    // Every selector is a class chain — nothing else can select on lynx.
    for (const line of css.split('\n')) {
        if (!line.endsWith('{')) continue;
        expect(line.trim()).toMatch(/^\.[A-Za-z0-9_.-]+(\s*\.[A-Za-z0-9_.-]+)*\s*\{$/);
    }
}

describe('capability primitives', () => {
    it('bakes color functions to literals', () => {
        expect(bakeColor('oklch(45% 0.24 277.023)', 'test')).toMatch(/^#[0-9a-f]{6}$/);
        expect(bakeColor('#123456', 'test')).toBe('#123456');
        expect(bakeColor('rgba(0, 0, 0, 0.5)', 'test')).toMatch(/^#[0-9a-f]{8}$/);
    });

    it('rejects a value nothing can bake', () => {
        expect(() => bakeColor('var(--nope)', 'tokens theme "x"')).toThrow(/cannot resolve/);
        expect(() => bakeColor('0 0 8px oklch(45% 0.1 200)', 'tokens')).toThrow(/cannot resolve/);
    });

    it('derives soft tints with the same oklab mix as the web target', () => {
        const soft = bakeSoft('#422ad5', '#ffffff', 0.16, 'test');
        expect(soft).toMatch(/^#[0-9a-f]{6}$/);
        expect(soft).not.toBe('#422ad5');
        expect(soft).not.toBe('#ffffff');
    });

    it('spots runtime-published properties in either spelling', () => {
        expect(runtimePropertyIn('var(--press-x)')).toBe('--press-x');
        expect(runtimePropertyIn('translate(var(--press-x), var(--press-y))')).toBe('--press-x');
        expect(runtimePropertyIn('--progress-percent: 0')).toBe('--progress-percent');
        // A property that merely CONTAINS one as a substring is not a match.
        expect(runtimePropertyIn('var(--press-xylophone)')).toBeUndefined();
        expect(runtimePropertyIn('var(--color-primary)')).toBeUndefined();
    });
});

describe('compileLynxTokensCss', () => {
    it('compiles zero-basic to lynx-safe, literal, class-hosted tokens', () => {
        const report = emptyReport();
        const css = compileLynxTokensCss(basicTokens as TokensInput, report);
        expectLynxSafe(css);
        expect(css).toContain('.zx-root {');
        // Every theme gets a compound block on the host class.
        for (const name of Object.keys((basicTokens as TokensInput).themes)) {
            expect(css).toContain(`.zx-root.zx-theme-${name} {`);
        }
        // Colors are hex literals.
        expect(css).toMatch(/--color-primary: #[0-9a-f]{6}/);
        // Soft tints are baked, not live color-mix.
        expect(css).toMatch(/--color-primary-soft: #[0-9a-f]{6}/);
        // The fixed-text aliases are literals, not var() indirection.
        const fixed = /--text-fixed-sm: ([^;]+);/.exec(css);
        expect(fixed).not.toBeNull();
        expect(fixed![1]).not.toContain('var(');
    });

    it('compiles zero-daisyui (oklch source) to lynx-safe output', () => {
        const report = emptyReport();
        const css = compileLynxTokensCss(daisyTokens as TokensInput, report);
        expectLynxSafe(css);
        expect(css).toContain('.zx-root {');
        expect(css).toMatch(/--color-primary: #[0-9a-f]{6}/);
    });

    it('pins the emitted shape (golden)', () => {
        const css = compileLynxTokensCss(basicTokens as TokensInput, emptyReport());
        expect(css).toMatchSnapshot();
    });

    it('rejects a token that references a runtime-published property', () => {
        const input: TokensInput = {
            defaultLight: 'l',
            themes: {
                l: {
                    colorScheme: 'light',
                    colors: { 'base-100': '#ffffff', 'base-content': '#111111' },
                    extra: { '--glow': 'circle at var(--press-x) var(--press-y)' },
                },
            },
        };
        expect(() => compileLynxTokensCss(input, emptyReport())).toThrow(/--press-x.*web-only/s);
    });

    it('inlines non-color var() chains and keeps color references live', () => {
        const input: TokensInput = {
            defaultLight: 'l',
            themes: {
                l: {
                    colorScheme: 'light',
                    colors: { 'base-100': '#ffffff', 'base-content': '#111111' },
                    extra: {
                        '--ring-width': '2px',
                        '--ring': '0 0 0 var(--ring-width) var(--color-primary)',
                    },
                },
            },
        };
        const css = compileLynxTokensCss(input, emptyReport());
        expect(css).toContain('--ring: 0 0 0 2px var(--color-primary);');
    });

    it('reports an unresolvable non-color var() instead of silently keeping it', () => {
        const report = emptyReport();
        const input: TokensInput = {
            defaultLight: 'l',
            themes: {
                l: {
                    colorScheme: 'light',
                    colors: { 'base-100': '#ffffff', 'base-content': '#111111' },
                    extra: { '--pad': 'var(--app-defined)' },
                },
            },
        };
        compileLynxTokensCss(input, report);
        expect(report.dropped.some((f) => f.what.includes('--pad'))).toBe(true);
    });

    it('rejects a theme name that cannot be a class', () => {
        const input: TokensInput = {
            defaultLight: 'ok',
            themes: {
                'ok': { colorScheme: 'light', colors: { 'base-100': '#fff', 'base-content': '#111' } },
                'Bad Name': { colorScheme: 'dark', colors: { 'base-100': '#000', 'base-content': '#eee' } },
            },
        };
        expect(() => compileLynxTokensCss(input, emptyReport())).toThrow(/not a kebab-case identifier/);
    });
});
