/**
 * The lynx recipe emitter (#351): class-grammar projection of the recipe
 * surface, one test per capability verdict, plus the structural gate over
 * whole compiled recipes — flat compounds only, nothing lynx cannot parse.
 */
import { describe, expect, it } from 'vitest';
import { anatomies } from '@sigx/zero/anatomy';
import type { ManifestComponent } from '@sigx/zero-kit';
import { assertNoDanglingVars, compileDesignSystemLynx, compileLynxRecipeCss, emptyReport } from '../src/targets/lynx/index.js';
import { designSystem as basicDS } from '@sigx/zero-basic';
import { designSystem as daisyDS } from '@sigx/zero-daisyui';
import type { RecipeInput } from '../src/recipes.js';

const button = anatomies.button.toJSON() as ManifestComponent;
const tabs = anatomies.tabs.toJSON() as ManifestComponent;
const dialog = anatomies.dialog.toJSON() as ManifestComponent;
const toast = anatomies.toast.toJSON() as ManifestComponent;

const compile = (recipe: RecipeInput, component: ManifestComponent = button) => {
    const report = emptyReport();
    const css = compileLynxRecipeCss(recipe, component, report);
    return { css, report };
};

/** Selector lines must be flat class compounds — no combinators of any kind. */
function expectFlatCompounds(css: string): void {
    for (const line of css.split('\n')) {
        if (!line.endsWith('{') || line.startsWith('@keyframes')) continue;
        expect(line.trim()).toMatch(/^(\.[A-Za-z0-9_-]+)+ \{$/);
    }
}

describe('compileLynxRecipeCss', () => {
    it('projects parts, machine states and flags onto the grammar', () => {
        const { css } = compile({
            component: 'tabs',
            parts: {
                tab: {
                    base: { padding: '4px' },
                    states: { active: { color: 'red' }, disabled: { opacity: '0.5' } },
                },
            },
        }, tabs);
        expect(css).toContain('.zx-tabs__tab {');
        expect(css).toContain('.zx-tabs__tab.zx-s-active {');
        expect(css).toContain('.zx-tabs__tab.zx-f-disabled {');
        expectFlatCompounds(css);
    });

    it('translates interaction states to runtime-stamped flag classes and drops hover', () => {
        const { css, report } = compile({
            component: 'button',
            parts: {
                root: {
                    states: {
                        'focus-visible': { outline: '1px solid black' },
                        active: { transform: 'scale(0.97)' },
                        hover: { background: 'blue' },
                    },
                },
            },
        });
        expect(css).toContain('.zx-button__root.zx-f-focus-visible {');
        expect(css).toContain('.zx-button__root.zx-f-pressed {');
        expect(css).not.toContain('hover');
        expect(report.dropped.some((f) => f.what === 'states.hover')).toBe(true);
    });

    it('emits axis rules as flat compounds on the styled part — no donuts, no default twins', () => {
        const { css } = compile({
            component: 'tabs',
            parts: {},
            defaultVariants: { size: 'md' },
            variants: {
                size: {
                    md: { tab: { base: { fontSize: 'var(--text-sm)' } } },
                    xs: { tab: { base: { fontSize: 'var(--text-xs)' } } },
                },
            },
        }, tabs);
        // The non-carrier part gets the axis class ON ITSELF (push-down).
        expect(css).toContain('.zx-tabs__tab.zx-a-size-xs {');
        expect(css).toContain('.zx-tabs__tab.zx-a-size-md {');
        expect(css).not.toContain(':not');
        expect(css).not.toContain('@scope');
        expectFlatCompounds(css);
    });

    it('compound variants are longer compounds; modifiers use zx-m-*', () => {
        const { css } = compile({
            component: 'button',
            parts: {},
            modifiers: { block: { root: { base: { width: '100%' } } } },
            compoundVariants: [{
                match: { color: 'primary', block: true },
                parts: { root: { base: { border: '1px solid black' } } },
            }],
        });
        expect(css).toContain('.zx-button__root.zx-m-block {');
        expect(css).toContain('.zx-button__root.zx-a-color-primary.zx-m-block {');
        expectFlatCompounds(css);
    });

    it('styles a pseudo part as its own real part class', () => {
        const { css } = compile({
            component: 'dialog',
            parts: { backdrop: { base: { background: 'rgba(0, 0, 0, 0.4)' } } },
        }, dialog);
        expect(css).toContain('.zx-dialog__backdrop {');
        expect(css).not.toContain('::backdrop');
    });

    it('translates the contract attribute selectors and drops the rest', () => {
        const { css, report } = compile({
            component: 'toast',
            parts: {
                viewport: {
                    selectors: {
                        '&[data-placement="top-end"]': { top: '0' },
                        '&:first-child': { margin: '0' },
                    },
                },
            },
        }, toast);
        expect(css).toContain('.zx-toast__viewport.zx-p-top-end {');
        expect(css).not.toContain('first-child');
        expect(report.dropped.some((f) => f.what.includes(':first-child'))).toBe(true);
    });

    it('drops conditions with a report entry', () => {
        const { css, report } = compile({
            component: 'button',
            parts: { root: { at: { 'reduced-motion': { base: { transition: 'none' } } } } },
        });
        expect(css).not.toContain('@media');
        expect(report.dropped.some((f) => f.what === 'at["reduced-motion"]')).toBe(true);
    });

    it('expands the flex shorthand and keeps calc-over-var', () => {
        const { css, report } = compile({
            component: 'button',
            parts: {
                root: {
                    base: { flex: '1', width: 'calc(var(--size-field) * 10)' },
                },
            },
        });
        expect(css).toContain('flex-grow: 1;');
        expect(css).toContain('flex-shrink: 1;');
        expect(css).toContain('flex-basis: 0%;');
        expect(css).not.toContain('flex: 1');
        // `calc()` over `var()` was dropped for a whole release on the
        // grounds that it was "unproven on lynx". It was then measured
        // working on device (signalxjs/lynx#1029, iPhone 16 Pro / iOS 18.3),
        // and the drop was costing 216 declarations in zero-daisyui alone —
        // daisy's entire size system is `calc(var(--size-*) * n)`.
        expect(css).toContain('width: calc(var(--size-field) * 10);');
        expect(report.dropped.some((f) => f.what.includes('calc(var(--size-field)'))).toBe(false);
    });

    it('bakes literal color functions, and drops theme-var-dependent ones with no themes to bake against', () => {
        const { css, report } = compile({
            component: 'button',
            parts: {
                root: {
                    base: {
                        boxShadow: '0 1px 2px oklch(25% 0.02 260 / 0.05)',
                        background: 'color-mix(in oklab, var(--color-primary) 12%, white)',
                    },
                },
            },
        });
        expect(css).toMatch(/box-shadow: 0 1px 2px #[0-9a-f]{8};/);
        expect(css).not.toContain('color-mix');
        expect(report.dropped.some((f) => f.what.startsWith('background:'))).toBe(true);
    });

    it('restates a theme-var-dependent declaration once per theme, baked', () => {
        const report = emptyReport();
        const css = compileLynxRecipeCss(
            {
                component: 'button',
                parts: {
                    root: {
                        base: { background: 'color-mix(in oklab, var(--color-primary) 50%, white)' },
                    },
                },
            },
            button,
            report,
            [
                { name: 'light', colorScheme: 'light', isDefault: true, colors: { primary: '#000000' } },
                { name: 'dark', colorScheme: 'dark', isDefault: false, colors: { primary: '#ff0000' } },
            ],
        );
        // The default theme rides `.zx-root` alone so an app that never
        // selects a theme still paints; a named theme is one class more
        // specific, so selecting it wins.
        expect(css).toMatch(/\.zx-root \.zx-button__root \{\n\s+background: #[0-9a-f]{6};/);
        expect(css).toMatch(/\.zx-root\.zx-theme-dark \.zx-button__root \{\n\s+background: #[0-9a-f]{6};/);
        // Baked, not deferred: two different primaries give two different results.
        const baked = [...css.matchAll(/background: (#[0-9a-f]{6});/g)].map((m) => m[1]);
        expect(new Set(baked).size).toBe(2);
        expect(css).not.toContain('color-mix');
        expect(report.dropped.some((f) => f.what.startsWith('background:'))).toBe(false);
    });

    it('drops what no theme can resolve: currentColor and recipe-local properties', () => {
        const themes = [{ name: 'light', colorScheme: 'light' as const, isDefault: true, colors: { primary: '#000000' } }];
        const report = emptyReport();
        const css = compileLynxRecipeCss(
            {
                component: 'button',
                parts: {
                    root: {
                        base: {
                            boxShadow: '0 1px color-mix(in oklab, currentColor 10%, #0000)',
                            borderColor: 'color-mix(in oklab, var(--btn-accent) 50%, white)',
                        },
                    },
                },
            },
            button,
            report,
            themes,
        );
        // Neither can bake — `currentColor` is a runtime value and
        // `--btn-accent` is recipe-local, so it has no per-theme literal.
        // Dropped rather than thrown: legible degradation, not an author error.
        expect(css).not.toContain('box-shadow');
        expect(css).not.toContain('border-color');
        expect(report.dropped.some((f) => f.detail.includes('currentColor'))).toBe(true);
        expect(report.dropped.some((f) => f.detail.includes('--btn-accent'))).toBe(true);
    });

    it('rejects web-runtime property references', () => {
        expect(() => compile({
            component: 'button',
            parts: { root: { base: { backgroundPosition: 'var(--press-x) var(--press-y)' } } },
        })).toThrow(/web-runtime-published property/);
    });

    it('appends a lynx-authored css hatch verbatim (shared css never reaches this emitter)', () => {
        // By contract the resolver withholds SHARED css from the lynx view
        // (the compile records the drop); a css that arrives here came from
        // targets.lynx.css and is lynx-authored by construction.
        const { css } = compile({
            component: 'button',
            parts: {},
            css: '.zx-button__root.zx-m-glow { border-color: #ff00ff; }',
        });
        expect(css).toContain('.zx-button__root.zx-m-glow { border-color: #ff00ff; }');
    });

    it('emits keyframes and errors on unknown parts/states like the web emitter', () => {
        const { css } = compile({
            component: 'button',
            parts: { root: { base: { animation: 'spin 1s linear infinite' } } },
            keyframes: { spin: 'from { transform: rotate(0deg); } to { transform: rotate(360deg); }' },
        });
        expect(css).toContain('@keyframes spin {');
        expect(() => compile({ component: 'button', parts: { nope: { base: { color: 'red' } } } }))
            .toThrow(/unknown part "nope"/);
        expect(() => compile({ component: 'button', parts: { root: { states: { sideways: { color: 'red' } } } } }))
            .toThrow(/unknown state "sideways"/);
    });
});

describe('whole-skin lynx output is structurally lynx-safe', () => {
    // The compile-time analogue of the on-device css-engine probe, over the
    // ENTIRE emitted stylesheet of both opted-in skins: nothing the lynx
    // engine cannot parse may appear, and every selector is either a flat
    // class compound or a theme host followed by one (the per-theme
    // restatements; the axis push-down contract has no other combinators).
    //
    // `calc(var(*))` is deliberately NOT forbidden — measured working on
    // device, see the recipe test above.
    const FORBIDDEN = [
        /@layer/, /@property/, /@starting-style/, /@media/, /@supports/, /@scope/,
        /light-dark\(/, /oklch\(/, /oklab\(/, /color-mix\(/,
        /:root/, /\[data-/, /::/, /:hover/, /:focus/, /:active/, /:not\(/,
    ] as const;
    it.each([
        ['zero-basic', basicDS],
        ['zero-daisyui', daisyDS],
    ])('%s', (_name, ds) => {
        const { indexCss } = compileDesignSystemLynx(ds as never, { components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[] });
        for (const pattern of FORBIDDEN) {
            expect(indexCss, String(pattern)).not.toMatch(pattern);
        }
        const COMPOUND = '(\\.[A-Za-z0-9_-]+)+';
        const SELECTOR = new RegExp(`^(${COMPOUND} )?${COMPOUND} \\{$`);
        for (const line of indexCss.split('\n')) {
            if (!line.endsWith('{') || line.startsWith('@keyframes') || line.trim().endsWith('% {') || ['from {', 'to {'].includes(line.trim())) continue;
            expect(line.trim(), line).toMatch(SELECTOR);
        }
    });

    // The guard that would have caught signalxjs/lynx#1029: 24 custom
    // properties used and never defined, reaching 295 of 1043 rules. On lynx
    // an unresolvable var() does not fall back — the element paints nothing.
    it.each([
        ['zero-basic', basicDS],
        ['zero-daisyui', daisyDS],
    ])('%s defines every custom property it reads', (name, ds) => {
        const { indexCss } = compileDesignSystemLynx(ds as never, { components: Object.values(anatomies).map((a) => a.toJSON()) as ManifestComponent[] });
        expect(() => assertNoDanglingVars(name, indexCss)).not.toThrow();
    });
});

describe('assertNoDanglingVars', () => {
    it('accepts a property the stylesheet defines, anywhere in it', () => {
        expect(() => assertNoDanglingVars('ds', '.a { --x: 1px; }\n.b { width: var(--x); }')).not.toThrow();
    });

    it('rejects one nothing defines, and names it', () => {
        expect(() => assertNoDanglingVars('ds', '.b { width: var(--gone); }'))
            .toThrow(/reads 1 custom property that nothing defines: --gone/);
    });

    it('accepts a reference that carries its own fallback', () => {
        expect(() => assertNoDanglingVars('ds', '.b { width: var(--maybe, 8px); }')).not.toThrow();
    });

    it('still checks what a fallback itself reads', () => {
        // The whole point of scanning fallbacks rather than blanking them: the
        // outer reference is excused, the inner one is not.
        expect(() => assertNoDanglingVars('ds', '.b { width: var(--maybe, var(--gone)); }'))
            .toThrow(/--gone/);
        expect(() => assertNoDanglingVars('ds', '.b { color: var(--maybe, color-mix(in oklab, var(--gone), white)); }'))
            .toThrow(/--gone/);
        expect(() => assertNoDanglingVars('ds', '.a { --x: red; }\n.b { color: var(--maybe, var(--x)); }'))
            .not.toThrow();
    });
});
