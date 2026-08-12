/**
 * The lynx recipe emitter (#351): class-grammar projection of the recipe
 * surface, one test per capability verdict, plus the structural gate over
 * whole compiled recipes — flat compounds only, nothing lynx cannot parse.
 */
import { describe, expect, it } from 'vitest';
import { anatomies } from '@sigx/zero/anatomy';
import type { ManifestComponent } from '@sigx/zero-kit';
import { compileLynxRecipeCss, emptyReport } from '../src/targets/lynx/index.js';
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

    it('expands the flex shorthand and drops calc-over-var', () => {
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
        expect(css).not.toContain('calc(');
        expect(report.dropped.some((f) => f.what.includes('calc(var(--size-field)'))).toBe(true);
    });

    it('bakes literal color functions and drops theme-var-dependent ones', () => {
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

    it('rejects web-runtime property references', () => {
        expect(() => compile({
            component: 'button',
            parts: { root: { base: { backgroundPosition: 'var(--press-x) var(--press-y)' } } },
        })).toThrow(/web-runtime-published property/);
    });

    it('rejects the raw css escape hatch', () => {
        expect(() => compile({
            component: 'button',
            parts: {},
            css: '[data-scope="button"] { color: red; }',
        })).toThrow(/web spelling by definition/);
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
