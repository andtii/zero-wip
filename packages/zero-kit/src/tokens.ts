/**
 * Token layer — typed theme inputs compiled to modern, layered CSS.
 *
 * - The color vocabulary is DS-declared: `roles` names the roles, the
 *   compiler emits `--color-<role>` (+ `-content` / `-soft` per declaration).
 *   Omitting `roles` selects the recommended vocabulary, so a DS that is
 *   happy with the shared defaults declares nothing.
 * - Soft tints are LIVE CSS (`color-mix()` driven by the theme's `softMix`),
 *   so overriding `--color-primary` re-derives `--color-primary-soft` for
 *   free. Explicit soft values still win.
 * - The default light/dark pair is additionally emitted on `:root` as
 *   `light-dark()` pairs with `color-scheme: light dark` → system-correct
 *   first paint with ZERO JavaScript.
 * - Declared roles (and `custom` tokens carrying a `syntax`) are registered
 *   via `@property` so theme switches can animate typed values.
 * - Everything sits in `@layer zero.tokens` behind `:where()` so app CSS
 *   always wins without specificity fights.
 */
import type { RoleDecl } from './contract.js';
import { BASE_SURFACE_TOKEN_LIST, DEFAULT_ROLES, resolveRoles } from './contract.js';

export type RolesDecl = Record<string, RoleDecl>;

type RoleName<R extends RolesDecl> = keyof R & string;
type ContentRole<R extends RolesDecl> =
    { [K in keyof R]: R[K] extends { content: false } ? never : K }[keyof R] & string;
type SoftRole<R extends RolesDecl> =
    { [K in keyof R]: R[K] extends { soft: false } ? never : K }[keyof R] & string;

/** Theme-authorable color tokens for a role declaration. */
export type ThemeColors<R extends RolesDecl> =
    Record<RoleName<R> | `${ContentRole<R>}-content` | typeof BASE_SURFACE_TOKEN_LIST[number], string>
    & Partial<Record<`${SoftRole<R>}-soft`, string>>;

/** Metadata for a DS-declared custom token (values live per-theme). */
export interface CustomTokenDecl {
    /** What the token means — surfaced in the DS manifest for tooling/AI. */
    description?: string;
    /** CSS `@property` syntax string (e.g. `'<color>'`, `'<length>'`) → typed registration. */
    syntax?: string;
}

export interface ThemeInput<R extends RolesDecl = RolesDecl> {
    colorScheme: 'light' | 'dark';
    /** The theme `toggle()` switches to. */
    pair?: string;
    /** Soft-tint mix ratio (0–1) for `-soft` tokens. Default 0.16. */
    softMix?: number;
    colors: ThemeColors<R>;
    radius?: { selector?: string; field?: string; box?: string };
    size?: { selector?: string; field?: string };
    text?: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl', string>>;
    border?: string;
    disabledOpacity?: string;
    /** Values for the design system's declared `custom` tokens. */
    custom?: Record<string, string>;
    /** DS-specific extra tokens, emitted verbatim (undeclared escape hatch — prefer `custom`). */
    extra?: Record<string, string>;
    /** Component-token overrides: `{ button: { '--btn-radius': '9999px' } }`. */
    components?: Record<string, Record<string, string>>;
}

export interface TokensInput<R extends RolesDecl = RolesDecl> {
    /**
     * The design system's color role vocabulary. Every role emits
     * `--color-<role>` plus `-content` / `-soft` per its declaration.
     * Omitted → the recommended eight (primary, secondary, accent, neutral,
     * info, success, warning, error).
     */
    roles?: R;
    /** Role/base token names sampled into theme swatches. Default: first four roles + base. */
    swatch?: (RoleName<R> | typeof BASE_SURFACE_TOKEN_LIST[number])[];
    /** DS-declared custom tokens: name → metadata. Values live per-theme in `custom`. */
    custom?: Record<string, CustomTokenDecl>;
    /** Mobile-first min-width breakpoints (compile-time values, surfaced in the DS manifest). */
    breakpoints?: Record<string, string>;
    themes: Record<string, ThemeInput<R>>;
    /** Theme used for `:root` (system light). */
    defaultLight: string;
    /** Theme paired with `defaultLight` for system dark. */
    defaultDark?: string;
}

/** Identity with typing — the authoring entry point. */
export function defineTokens<const R extends RolesDecl = typeof DEFAULT_ROLES>(
    input: TokensInput<R>,
): TokensInput<R> {
    return input;
}

const softVar = (role: string, mix: number): string =>
    `color-mix(in oklab, var(--color-${role}) ${Math.round(mix * 100)}%, var(--color-base-100))`;

/* eslint-disable @typescript-eslint/no-explicit-any -- `R` appears in both
   variance positions, so internal plumbing erases it. */
type AnyTheme = ThemeInput<any>;
const color = (theme: AnyTheme, token: string): string | undefined =>
    (theme.colors as Record<string, string>)[token];

const customProp = (name: string): string => (name.startsWith('--') ? name : `--${name}`);

function themeDecls(theme: AnyTheme, roles: RolesDecl): string[] {
    const decls: string[] = [];
    const mix = theme.softMix ?? 0.16;

    for (const [name, decl] of Object.entries(roles)) {
        const value = color(theme, name);
        if (value) decls.push(`--color-${name}: ${value};`);
        if (decl.content !== false) {
            const content = color(theme, `${name}-content`);
            if (content) decls.push(`--color-${name}-content: ${content};`);
        }
    }
    for (const token of BASE_SURFACE_TOKEN_LIST) {
        const value = color(theme, token);
        if (value) decls.push(`--color-${token}: ${value};`);
    }
    for (const [name, decl] of Object.entries(roles)) {
        if (decl.soft === false) continue;
        const explicit = color(theme, `${name}-soft`);
        decls.push(`--color-${name}-soft: ${explicit ?? softVar(name, mix)};`);
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
    for (const [name, value] of Object.entries(theme.custom ?? {})) {
        decls.push(`${customProp(name)}: ${value};`);
    }
    for (const [name, value] of Object.entries(theme.extra ?? {})) {
        decls.push(`${customProp(name)}: ${value};`);
    }
    for (const overrides of Object.values(theme.components ?? {})) {
        for (const [name, value] of Object.entries(overrides)) {
            decls.push(`${name}: ${value};`);
        }
    }
    return decls;
}

function rootDecls(light: AnyTheme, dark: AnyTheme | undefined, roles: RolesDecl): string[] {
    if (!dark) {
        return ['color-scheme: light;', ...themeDecls(light, roles)];
    }
    const decls: string[] = ['color-scheme: light dark;'];
    const mix = light.softMix ?? 0.16;

    const pushPair = (token: string) => {
        const lv = color(light, token);
        const dv = color(dark, token);
        if (lv && dv && lv !== dv) decls.push(`--color-${token}: light-dark(${lv}, ${dv});`);
        else if (lv) decls.push(`--color-${token}: ${lv};`);
    };
    for (const [name, decl] of Object.entries(roles)) {
        pushPair(name);
        if (decl.content !== false) pushPair(`${name}-content`);
    }
    for (const token of BASE_SURFACE_TOKEN_LIST) pushPair(token);
    for (const [name, decl] of Object.entries(roles)) {
        if (decl.soft === false) continue;
        const le = color(light, `${name}-soft`);
        const de = color(dark, `${name}-soft`);
        if (le && de && le !== de) decls.push(`--color-${name}-soft: light-dark(${le}, ${de});`);
        else decls.push(`--color-${name}-soft: ${le ?? softVar(name, mix)};`);
    }
    // Structural tokens come from the light default (they rarely differ per
    // scheme; a dark theme selected explicitly still applies its own).
    const structural = themeDecls(light, roles).filter((d) => !d.startsWith('--color-'));
    decls.push(...structural);
    return decls;
}

/**
 * `@property` registrations for declared roles (typed, animatable theme
 * switches) and for declared custom tokens that carry a `syntax`.
 * Initial values come from the default light theme. Derivatives are not
 * registered: `-soft` values can be `color-mix()` expressions (invalid as
 * `initial-value`), and `-content` is deliberately kept off the registration
 * surface to match the role-only registration zero's base.css previously
 * shipped — roles are the tokens theme transitions animate.
 */
function propertyRegistrations(input: TokensInput<any>, roles: RolesDecl, light: AnyTheme): string[] {
    const rules: string[] = [];
    for (const name of Object.keys(roles)) {
        const initial = color(light, name);
        if (!initial) continue;
        rules.push(`@property --color-${name} { syntax: '<color>'; inherits: true; initial-value: ${initial}; }`);
    }
    for (const [name, decl] of Object.entries(input.custom ?? {})) {
        if (!decl.syntax) continue;
        const initial = light.custom?.[name];
        if (!initial && decl.syntax !== '*') continue;
        rules.push(
            `@property ${customProp(name)} { syntax: '${decl.syntax}'; inherits: true;${initial ? ` initial-value: ${initial};` : ''} }`,
        );
    }
    return rules;
}

const block = (selector: string, decls: string[], indent = '    '): string =>
    `${indent}${selector} {\n${decls.map((d) => `${indent}    ${d}`).join('\n')}\n${indent}}`;

/** Compile a `TokensInput` to the design system's `tokens.css`. */
export function compileTokensCss<R extends RolesDecl>(input: TokensInput<R>): string {
    const roles = resolveRoles(input.roles);
    const light = input.themes[input.defaultLight];
    if (!light) throw new Error(`[zero-kit] defaultLight theme "${input.defaultLight}" is not in themes`);
    const dark = input.defaultDark ? input.themes[input.defaultDark] : undefined;
    if (input.defaultDark && !dark) {
        throw new Error(`[zero-kit] defaultDark theme "${input.defaultDark}" is not in themes`);
    }

    // Specificity ladder inside `@layer zero.tokens`:
    //   `:where(:root)` defaults      → (0,0,0)
    //   `[data-theme="x"]` overrides  → (0,1,0)  — always beat the defaults
    // so an explicit theme wins regardless of source order, and a nested
    // `[data-theme]` element re-themes its subtree via inheritance. App CSS
    // is unlayered, so it still wins over everything here.
    const blocks: string[] = [block(':where(:root)', rootDecls(light, dark, roles))];
    for (const [name, theme] of Object.entries(input.themes)) {
        blocks.push(block(
            `[data-theme="${name}"]`,
            [`color-scheme: ${theme.colorScheme};`, ...themeDecls(theme, roles)],
        ));
    }
    const registrations = propertyRegistrations(input, roles, light);
    const preamble = registrations.length ? `${registrations.join('\n')}\n\n` : '';
    return `${preamble}@layer zero.tokens {\n${blocks.join('\n\n')}\n}\n`;
}
