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
import {
    BASE_SURFACE_TOKEN_LIST,
    DEFAULT_ROLES,
    TOKEN_CATEGORIES,
    resolveRoles,
    systemNodeAt,
    tokenProperty,
} from './contract.js';

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

export type TokenValue = string | number;

/**
 * Constraint for one token category's keys: the recommended keys are
 * autocompleted, any other key is accepted.
 *
 * Deliberately used as a CONSTRAINT on a `const` type parameter and never as a
 * declared property type — `keyof` an intersection like this widens to
 * `string`, which would lose both the autocomplete and the ability to narrow
 * per-theme overrides to the keys a design system actually declared.
 */
export type Scale<Recommended extends string> =
    Partial<Record<Recommended, TokenValue>> & Record<string, TokenValue>;

export type RadiusKey = 'selector' | 'field' | 'box';
export type SizeKey = 'selector' | 'field';
export type TextKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Design-system-level values for every non-color token category — the
 * declaration the per-theme override type is derived from.
 *
 * Structure, type and (later) motion are design-system personality, not
 * scheme-dependent, so they live here once rather than being restated in
 * every theme. A theme that genuinely differs overrides via
 * `ThemeInput.system`, and `TokensInput.systemDark` covers the common
 * "all dark themes want this" case.
 */
export interface SystemTokens {
    radius?: Scale<RadiusKey>;
    size?: Scale<SizeKey>;
    text?: Scale<TextKey>;
    border?: TokenValue;
    disabledOpacity?: TokenValue;
}

type Sub<T, K extends PropertyKey> = K extends keyof T ? NonNullable<T[K]> : never;

/** `Record<string, never>` (not `{}`) so an undeclared category rejects keys. */
type NoKeys = Record<string, never>;

/** A per-theme override: only the keys the design system declared. */
type OverrideOf<G> =
    [G] extends [never] ? NoKeys
    : [G] extends [object] ? Partial<Record<Extract<keyof G, string>, TokenValue>>
    : NoKeys;

/**
 * A scalar override is only available once the design system declares a base
 * value — overriding something with no base leaves nothing for a theme to
 * fall back to, and for scheme-divergent values it would be unresettable.
 */
type ScalarOverrideOf<G> = [G] extends [never] ? never : TokenValue;

/** `SystemTokens`, narrowed to what this design system declared. */
export interface ThemeSystem<T extends SystemTokens> {
    radius?: OverrideOf<Sub<T, 'radius'>>;
    size?: OverrideOf<Sub<T, 'size'>>;
    text?: OverrideOf<Sub<T, 'text'>>;
    border?: ScalarOverrideOf<Sub<T, 'border'>>;
    disabledOpacity?: ScalarOverrideOf<Sub<T, 'disabledOpacity'>>;
}

/** Metadata for a DS-declared custom token (values live per-theme). */
export interface CustomTokenDecl {
    /** What the token means — surfaced in the DS manifest for tooling/AI. */
    description?: string;
    /** CSS `@property` syntax string (e.g. `'<color>'`, `'<length>'`) → typed registration. */
    syntax?: string;
}

export interface ThemeInput<R extends RolesDecl = RolesDecl, T extends SystemTokens = SystemTokens> {
    colorScheme: 'light' | 'dark';
    /** The theme `toggle()` switches to. */
    pair?: string;
    /** Soft-tint mix ratio (0–1) for `-soft` tokens. Default 0.16. */
    softMix?: number;
    colors: ThemeColors<R>;
    /** Overrides of the design-system-level `system` values — declared keys only. */
    system?: ThemeSystem<T>;
    /** Values for the design system's declared `custom` tokens. */
    custom?: Record<string, string>;
    /** DS-specific extra tokens, emitted verbatim (undeclared escape hatch — prefer `custom`). */
    extra?: Record<string, string>;
    /** Component-token overrides: `{ button: { '--btn-radius': '9999px' } }`. */
    components?: Record<string, Record<string, string>>;
}

export interface TokensInput<R extends RolesDecl = RolesDecl, T extends SystemTokens = SystemTokens> {
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
    /**
     * Design-system-level values for the non-color token categories. The
     * literal key set declared here is what per-theme overrides narrow to.
     */
    system?: T;
    /**
     * Overrides applied to every `colorScheme: 'dark'` theme, and to `:root`
     * under `prefers-color-scheme: dark`. `light-dark()` only accepts
     * `<color>`, so this is how a non-color token differs per scheme.
     */
    systemDark?: ThemeSystem<T>;
    themes: Record<string, ThemeInput<R, T>>;
    /** Theme used for `:root` (system light). */
    defaultLight: string;
    /** Theme paired with `defaultLight` for system dark. */
    defaultDark?: string;
}

/** Identity with typing — the authoring entry point. */
export function defineTokens<
    const R extends RolesDecl = typeof DEFAULT_ROLES,
    const T extends SystemTokens = SystemTokens,
>(input: TokensInput<R, T>): TokensInput<R, T> {
    return input;
}

const softVar = (role: string, mix: number): string =>
    `color-mix(in oklab, var(--color-${role}) ${Math.round(mix * 100)}%, var(--color-base-100))`;

/* eslint-disable @typescript-eslint/no-explicit-any -- `R` appears in both
   variance positions, so internal plumbing erases it. */
type AnyTheme = ThemeInput<any, any>;
/** Either tier's shape — `SystemTokens` and `ThemeSystem<T>` are structurally alike. */
type AnySystem = SystemTokens | ThemeSystem<any>;
const color = (theme: AnyTheme, token: string): string | undefined =>
    (theme.colors as Record<string, string>)[token];

const customProp = (name: string): string => (name.startsWith('--') ? name : `--${name}`);

/**
 * Flatten the authoring shape into `--prop` → value for every token category,
 * applying the resolution tiers in order (later wins):
 *
 *     system  →  systemDark (dark-scheme themes only)  →  theme.system
 *
 * Walking `TOKEN_CATEGORIES` rather than naming each category here is the
 * point of the table: a new category is one entry plus a `base.css` fallback,
 * not another branch in this function.
 *
 * Keys emit in declaration order — `recommended` is a hint, not an ordering.
 */
function resolveSystem(...tiers: (AnySystem | undefined)[]): Record<string, string> {
    const props: Record<string, string> = {};
    for (const tier of tiers) {
        if (!tier) continue;
        for (const category of TOKEN_CATEGORIES) {
            const node = systemNodeAt(tier, category.path);
            if (node === undefined || node === null) continue;
            if (category.shape === 'scalar') {
                props[tokenProperty(category)] = String(node);
                continue;
            }
            // A non-object here would spread into `--radius-0`-style nonsense;
            // `validateDesignSystem` reports it, and emission skips it.
            if (typeof node !== 'object') continue;
            for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
                if (value === undefined || value === null) continue;
                props[tokenProperty(category, key)] = String(value);
            }
        }
    }
    return props;
}

/** `--prop: value;` lines, optionally restricted to a subset of properties. */
function systemDecls(props: Record<string, string>, only?: ReadonlySet<string>): string[] {
    return Object.entries(props)
        .filter(([prop]) => !only || only.has(prop))
        .map(([prop, value]) => `${prop}: ${value};`);
}

/** Properties whose resolved value differs between the two property maps. */
function divergentProps(a: Record<string, string>, b: Record<string, string>): Set<string> {
    const out = new Set<string>();
    for (const prop of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (a[prop] !== b[prop]) out.add(prop);
    }
    return out;
}

function colorDecls(theme: AnyTheme, roles: RolesDecl): string[] {
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
    return decls;
}

function nonSystemDecls(theme: AnyTheme): string[] {
    const decls: string[] = [];
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

/**
 * `:where(:root)` — the scheme-following defaults.
 *
 * Colors collapse into `light-dark()` pairs. Non-color categories cannot:
 * `light-dark()` is a `<color>` function, so the light values go here and any
 * that differ under dark are emitted by the caller in a
 * `prefers-color-scheme: dark` block.
 */
function rootDecls(
    light: AnyTheme,
    dark: AnyTheme | undefined,
    roles: RolesDecl,
    systemLight: Record<string, string>,
): string[] {
    if (!dark) {
        return [
            'color-scheme: light;',
            ...colorDecls(light, roles),
            ...systemDecls(systemLight),
            ...nonSystemDecls(light),
        ];
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
    decls.push(...systemDecls(systemLight), ...nonSystemDecls(light));
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
    // Custom names may be spelled with or without the leading `--`; compare
    // through the normalized property name so spellings can't drift apart.
    const customValues = Object.fromEntries(
        Object.entries(light.custom ?? {}).map(([n, v]) => [customProp(n), v]),
    );
    for (const [name, decl] of Object.entries(input.custom ?? {})) {
        if (!decl.syntax) continue;
        const prop = customProp(name);
        const initial = customValues[prop];
        if (!initial && decl.syntax !== '*') continue;
        rules.push(
            `@property ${prop} { syntax: '${decl.syntax}'; inherits: true;${initial ? ` initial-value: ${initial};` : ''} }`,
        );
    }
    return rules;
}

const block = (selector: string, decls: string[], indent = '    '): string =>
    `${indent}${selector} {\n${decls.map((d) => `${indent}    ${d}`).join('\n')}\n${indent}}`;

/** Effective non-color token values for one theme, after all three tiers. */
function systemFor(input: TokensInput<any, any>, theme: AnyTheme): Record<string, string> {
    return resolveSystem(
        input.system,
        theme.colorScheme === 'dark' ? input.systemDark : undefined,
        theme.system,
    );
}

/** Compile a `TokensInput` to the design system's `tokens.css`. */
export function compileTokensCss<R extends RolesDecl, T extends SystemTokens>(
    input: TokensInput<R, T>,
): string {
    const roles = resolveRoles(input.roles);
    const light = input.themes[input.defaultLight];
    if (!light) throw new Error(`[zero-kit] defaultLight theme "${input.defaultLight}" is not in themes`);
    const dark = input.defaultDark ? input.themes[input.defaultDark] : undefined;
    if (input.defaultDark && !dark) {
        throw new Error(`[zero-kit] defaultDark theme "${input.defaultDark}" is not in themes`);
    }

    const systemLight = systemFor(input, light);
    const systemDark = dark ? systemFor(input, dark) : {};
    // Non-color tokens that resolve differently per scheme. These need the
    // `prefers-color-scheme` block below AND must be restated by every theme
    // block, or explicitly picking the light theme while the OS is dark would
    // strand the dark values (they'd still be winning from the media block).
    //
    // Restricted to properties the light side also defines: a dark-only value
    // has nothing for a theme block to restate, so putting it in the media
    // block would make it unresettable. `validateDesignSystem` reports that
    // as an error; here the emission simply can't produce the trap.
    const schemeDivergent = dark
        ? new Set(
            [...divergentProps(systemLight, systemDark)].filter((prop) => prop in systemLight),
        )
        : new Set<string>();

    // Specificity ladder inside `@layer zero.tokens`:
    //   `:where(:root)` defaults      → (0,0,0)
    //   `[data-theme="x"]` overrides  → (0,1,0)  — always beat the defaults
    // so an explicit theme wins regardless of source order, and a nested
    // `[data-theme]` element re-themes its subtree via inheritance. App CSS
    // is unlayered, so it still wins over everything here.
    const blocks: string[] = [block(':where(:root)', rootDecls(light, dark, roles, systemLight))];

    if (schemeDivergent.size > 0) {
        blocks.push(
            `    @media (prefers-color-scheme: dark) {\n` +
            `${block(':where(:root)', systemDecls(systemDark, schemeDivergent), '        ')}\n` +
            `    }`,
        );
    }

    for (const [name, theme] of Object.entries(input.themes)) {
        const system = systemFor(input, theme);
        // Emit only what this theme actually changes relative to the :root
        // defaults, plus the scheme-divergent set. Everything else is
        // inherited, so restating it would be dead weight in every theme.
        const own = divergentProps(system, systemLight);
        const emit = new Set([...own, ...schemeDivergent]);
        blocks.push(block(
            `[data-theme="${name}"]`,
            [
                `color-scheme: ${theme.colorScheme};`,
                ...colorDecls(theme, roles),
                ...systemDecls(system, emit),
                ...nonSystemDecls(theme),
            ],
        ));
    }
    const registrations = propertyRegistrations(input, roles, light);
    const preamble = registrations.length ? `${registrations.join('\n')}\n\n` : '';
    return `${preamble}@layer zero.tokens {\n${blocks.join('\n\n')}\n}\n`;
}
