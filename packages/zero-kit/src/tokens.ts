/**
 * Token layer — typed theme inputs compiled to modern, layered CSS.
 *
 * - Soft tints are LIVE CSS (`color-mix()` driven by the theme's `softMix`),
 *   so overriding `--color-primary` re-derives `--color-primary-soft` for
 *   free. Explicit soft values still win.
 * - The default light/dark pair is additionally emitted on `:root` as
 *   `light-dark()` pairs with `color-scheme: light dark` → system-correct
 *   first paint with ZERO JavaScript.
 * - Everything sits in `@layer zero.tokens` behind `:where()` so app CSS
 *   always wins without specificity fights.
 */
import type { CoreColorToken, SoftColorToken } from './contract.js';
import { COLOR_VARIANT_LIST, CORE_COLOR_TOKEN_LIST } from './contract.js';

export interface ThemeInput {
    colorScheme: 'light' | 'dark';
    /** The theme `toggle()` switches to. */
    pair?: string;
    /** Soft-tint mix ratio (0–1) for `-soft` tokens. Default 0.16. */
    softMix?: number;
    colors: Record<CoreColorToken, string> & Partial<Record<SoftColorToken, string>>;
    radius?: { selector?: string; field?: string; box?: string };
    size?: { selector?: string; field?: string };
    text?: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl', string>>;
    border?: string;
    disabledOpacity?: string;
    /** DS-specific extra tokens, emitted verbatim. */
    extra?: Record<string, string>;
    /** Component-token overrides: `{ button: { '--btn-radius': '9999px' } }`. */
    components?: Record<string, Record<string, string>>;
}

export interface TokensInput {
    themes: Record<string, ThemeInput>;
    /** Theme used for `:root` (system light). */
    defaultLight: string;
    /** Theme paired with `defaultLight` for system dark. */
    defaultDark?: string;
}

/** Identity with typing — the authoring entry point. */
export function defineTokens(input: TokensInput): TokensInput {
    return input;
}

const softVar = (variant: string, mix: number): string =>
    `color-mix(in oklab, var(--color-${variant}) ${Math.round(mix * 100)}%, var(--color-base-100))`;

function themeDecls(theme: ThemeInput): string[] {
    const decls: string[] = [];
    const mix = theme.softMix ?? 0.16;

    for (const token of CORE_COLOR_TOKEN_LIST) {
        const value = theme.colors[token];
        if (value) decls.push(`--color-${token}: ${value};`);
    }
    for (const variant of COLOR_VARIANT_LIST) {
        const explicit = theme.colors[`${variant}-soft`];
        decls.push(`--color-${variant}-soft: ${explicit ?? softVar(variant, mix)};`);
    }
    if (theme.radius?.selector) decls.push(`--radius-selector: ${theme.radius.selector};`);
    if (theme.radius?.field) decls.push(`--radius-field: ${theme.radius.field};`);
    if (theme.radius?.box) decls.push(`--radius-box: ${theme.radius.box};`);
    if (theme.size?.selector) decls.push(`--size-selector: ${theme.size.selector};`);
    if (theme.size?.field) decls.push(`--size-field: ${theme.size.field};`);
    for (const [step, value] of Object.entries(theme.text ?? {})) {
        decls.push(`--text-${step}: ${value};`);
    }
    if (theme.border) decls.push(`--border: ${theme.border};`);
    if (theme.disabledOpacity) decls.push(`--disabled-opacity: ${theme.disabledOpacity};`);
    for (const [name, value] of Object.entries(theme.extra ?? {})) {
        decls.push(`${name.startsWith('--') ? name : `--${name}`}: ${value};`);
    }
    for (const overrides of Object.values(theme.components ?? {})) {
        for (const [name, value] of Object.entries(overrides)) {
            decls.push(`${name}: ${value};`);
        }
    }
    return decls;
}

function rootDecls(light: ThemeInput, dark: ThemeInput | undefined): string[] {
    if (!dark) {
        return ['color-scheme: light;', ...themeDecls(light)];
    }
    const decls: string[] = ['color-scheme: light dark;'];
    const mix = light.softMix ?? 0.16;

    for (const token of CORE_COLOR_TOKEN_LIST) {
        const lv = light.colors[token];
        const dv = dark.colors[token];
        if (lv && dv && lv !== dv) decls.push(`--color-${token}: light-dark(${lv}, ${dv});`);
        else if (lv) decls.push(`--color-${token}: ${lv};`);
    }
    for (const variant of COLOR_VARIANT_LIST) {
        const le = light.colors[`${variant}-soft`];
        const de = dark.colors[`${variant}-soft`];
        if (le && de && le !== de) decls.push(`--color-${variant}-soft: light-dark(${le}, ${de});`);
        else decls.push(`--color-${variant}-soft: ${le ?? softVar(variant, mix)};`);
    }
    // Structural tokens come from the light default (they rarely differ per
    // scheme; a dark theme selected explicitly still applies its own).
    const structural = themeDecls(light).filter((d) => !d.startsWith('--color-'));
    decls.push(...structural);
    return decls;
}

const block = (selector: string, decls: string[], indent = '    '): string =>
    `${indent}${selector} {\n${decls.map((d) => `${indent}    ${d}`).join('\n')}\n${indent}}`;

/** Compile a `TokensInput` to the design system's `tokens.css`. */
export function compileTokensCss(input: TokensInput): string {
    const light = input.themes[input.defaultLight];
    if (!light) throw new Error(`[zero-kit] defaultLight theme "${input.defaultLight}" is not in themes`);
    const dark = input.defaultDark ? input.themes[input.defaultDark] : undefined;
    if (input.defaultDark && !dark) {
        throw new Error(`[zero-kit] defaultDark theme "${input.defaultDark}" is not in themes`);
    }

    const blocks: string[] = [block(':root', rootDecls(light, dark))];
    for (const [name, theme] of Object.entries(input.themes)) {
        blocks.push(block(
            `:where([data-theme="${name}"])`,
            [`color-scheme: ${theme.colorScheme};`, ...themeDecls(theme)],
        ));
    }
    return `@layer zero.tokens {\n${blocks.join('\n\n')}\n}\n`;
}
