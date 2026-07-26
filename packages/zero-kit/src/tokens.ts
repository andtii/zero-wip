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
 * - `light-dark()` is a `<color>` function, so ANY other token that differs
 *   between the default light and dark themes — a category value, a declared
 *   `custom` token, an `extra` token, a component override — is emitted in a
 *   `prefers-color-scheme: dark` block instead, and restated by every theme
 *   block so an explicit choice still wins and nested `[data-theme]` scopes
 *   don't inherit the wrong value.
 * - Declared roles (and `custom` tokens carrying a `syntax`) are registered
 *   via `@property` so theme switches can animate typed values.
 * - Everything sits in `@layer zero.tokens` behind `:where()` so app CSS
 *   always wins without specificity fights.
 */
import type { RoleDecl } from './contract.js';
import type { TypeScale } from './scale.js';
import { generateTypeScale } from './scale.js';
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
export type FontKey = 'sans' | 'serif' | 'mono' | 'display';
export type WeightKey = 'normal' | 'medium' | 'semibold' | 'bold';
export type LeadingKey = 'none' | 'tight' | 'normal' | 'relaxed';
export type TrackingKey = 'tight' | 'normal' | 'wide';
export type SpaceKey = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type ShadowKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type DurationKey = 'instant' | 'fast' | 'normal' | 'slow';
export type EaseKey = 'linear' | 'standard' | 'emphasized';

/**
 * A design system's typographic voice.
 *
 * `fonts` is FAMILIES — `--font-sans` is a stack, never a size. Sizes are
 * `--text-*`, generated from `scale` or listed in `sizes`, with `sizes`
 * winning per key so a hand-tuned display size can sit on a generated ramp.
 */
export interface TypographyDecl {
    fonts?: Scale<FontKey>;
    weights?: Scale<WeightKey>;
    leading?: Scale<LeadingKey>;
    tracking?: Scale<TrackingKey>;
    /** Explicit size ramp. Overrides `scale` per key. */
    sizes?: Scale<TextKey>;
    /** Modular scale the `--text-*` ramp is generated from. */
    scale?: TypeScale;
}

/**
 * A design system's motion personality: how long things take, and the shape
 * of the movement. Split because the two vary independently — a snappy system
 * shortens durations while keeping its easing curves.
 *
 * Declared durations are collapsed to ~0 under `prefers-reduced-motion`, so
 * referencing `var(--duration-*)` in a recipe is what makes that recipe
 * respect the preference.
 */
export interface MotionDecl {
    durations?: Scale<DurationKey>;
    easings?: Scale<EaseKey>;
}

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
    typography?: TypographyDecl;
    spacing?: Scale<SpaceKey>;
    shadow?: Scale<ShadowKey>;
    motion?: MotionDecl;
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

/** Step names a `scale` generates, defaulting to the recommended ramp. */
type ScaleSteps<C> = C extends { steps: readonly (infer S extends string)[] } ? S : TextKey;

/** The `--text-*` keys this design system ends up with. */
type TextKeysOf<T extends SystemTokens> =
    | Extract<keyof Sub<Sub<T, 'typography'>, 'sizes'>, string>
    | ([Sub<Sub<T, 'typography'>, 'scale'>] extends [never]
        ? never
        : ScaleSteps<Sub<Sub<T, 'typography'>, 'scale'>>);

/** `SystemTokens`, narrowed to what this design system declared. */
export interface ThemeSystem<T extends SystemTokens> {
    radius?: OverrideOf<Sub<T, 'radius'>>;
    size?: OverrideOf<Sub<T, 'size'>>;
    typography?: {
        fonts?: OverrideOf<Sub<Sub<T, 'typography'>, 'fonts'>>;
        weights?: OverrideOf<Sub<Sub<T, 'typography'>, 'weights'>>;
        leading?: OverrideOf<Sub<Sub<T, 'typography'>, 'leading'>>;
        tracking?: OverrideOf<Sub<Sub<T, 'typography'>, 'tracking'>>;
        /** Narrowed to the generated steps plus any explicit `sizes` keys. */
        sizes?: Partial<Record<TextKeysOf<T>, TokenValue>>;
    };
    spacing?: OverrideOf<Sub<T, 'spacing'>>;
    shadow?: OverrideOf<Sub<T, 'shadow'>>;
    motion?: {
        durations?: OverrideOf<Sub<Sub<T, 'motion'>, 'durations'>>;
        easings?: OverrideOf<Sub<Sub<T, 'motion'>, 'easings'>>;
    };
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
    /**
     * The design system's `size` axis vocabulary — the values its recipes may
     * key `variants.size` on and consumers may pass as `size`. Omitted → the
     * recommended ramp (`xs`, `sm`, `md`, `lg`, `xl`).
     *
     * Declared rather than inferred, for the same reason `roles` is: it
     * flows into the DS manifest, so tooling, the docs site and the
     * generation skill can see the ramp, and the validator can tell a typo
     * from a deliberate step. Unlike a token category this emits no custom
     * property — `--size-*` is control sizing, a different thing entirely.
     */
    sizes?: readonly string[];
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
/**
 * Expand `typography.scale` into `typography.sizes` before the categories are
 * read, so the generated ramp goes through exactly the same emission and
 * override path as a hand-listed one. Explicit `sizes` win per key: a
 * generated ramp with one hand-tuned display size is a normal thing to want.
 */
function expandScale(tier: AnySystem): AnySystem {
    const typography = (tier as { typography?: TypographyDecl }).typography;
    if (!typography?.scale) return tier;
    const textCategory = TOKEN_CATEGORIES.find((c) => c.id === 'text')!;
    const generated = generateTypeScale(typography.scale, textCategory.recommended);
    return {
        ...tier,
        typography: { ...typography, sizes: { ...generated, ...typography.sizes } },
    } as AnySystem;
}

function resolveSystem(...tiers: (AnySystem | undefined)[]): Record<string, string> {
    const props: Record<string, string> = {};
    for (const [index, raw] of tiers.entries()) {
        if (!raw) continue;
        // Only the base tier expands a scale. `scale` is a DECLARATION — it
        // mints `--text-*` keys — and declarations live in `system`;
        // `ThemeSystem` has no `scale` field for exactly that reason. Expanding
        // it in an override would let a theme introduce keys behind the
        // "override only declared keys" rule. Validation reports it too, since
        // `validate` runs against compiled JS where the type can't.
        const tier = index === 0 ? expandScale(raw) : raw;
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

/**
 * A reference to any color token — role, base surface, `-content` or `-soft`.
 * `[,)]` rather than `)` so a fallback (`var(--color-primary, red)`) counts:
 * the value still has to be substituted where the theme's colors are in scope.
 */
const COLOR_REF = /var\(\s*--color-[a-z0-9-]+\s*[,)]/;

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

/**
 * A theme's non-category custom properties: declared `custom` values, the
 * untyped `extra` escape hatch, and component-token overrides.
 */
function themeOwnProps(theme: AnyTheme): Record<string, string> {
    const props: Record<string, string> = {};
    for (const [name, value] of Object.entries(theme.custom ?? {})) {
        props[customProp(name)] = value;
    }
    for (const [name, value] of Object.entries(theme.extra ?? {})) {
        props[customProp(name)] = value;
    }
    for (const overrides of Object.values(theme.components ?? {})) {
        for (const [name, value] of Object.entries(overrides)) {
            props[name] = value;
        }
    }
    return props;
}

/**
 * `:where(:root)` — the scheme-following defaults.
 *
 * Colors collapse into `light-dark()` pairs. Nothing else can:
 * `light-dark()` is a `<color>` function, so every other property emits its
 * light value here, and any that differ under dark go in the caller's
 * `prefers-color-scheme: dark` block.
 */
function rootDecls(
    light: AnyTheme,
    dark: AnyTheme | undefined,
    roles: RolesDecl,
    nonColorLight: Record<string, string>,
): string[] {
    if (!dark) {
        return [
            'color-scheme: light;',
            ...colorDecls(light, roles),
            ...systemDecls(nonColorLight),
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
    decls.push(...systemDecls(nonColorLight));
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

/**
 * Every non-color custom property a theme resolves to: the token categories
 * after all three tiers, then the theme's own `custom` / `extra` /
 * `components` values.
 *
 * One map, because scheme handling has to apply to all of them equally —
 * `light-dark()` only rescues colors, so anything else that differs per
 * scheme needs the `prefers-color-scheme` treatment regardless of which
 * authoring field it came from.
 */
function nonColorFor(input: TokensInput<any, any>, theme: AnyTheme): Record<string, string> {
    return {
        ...resolveSystem(
            input.system,
            theme.colorScheme === 'dark' ? input.systemDark : undefined,
            theme.system,
        ),
        ...themeOwnProps(theme),
    };
}

/**
 * Collapse every declared duration under `prefers-reduced-motion: reduce`.
 *
 * This cannot live in `@sigx/zero`'s `base.css` the way the structural
 * fallbacks do: duration KEYS are design-system-declared, so base.css can
 * only neutralize the recommended ones and would miss a DS's own
 * `--duration-emphasized-decelerate`. Same reasoning that moved `@property`
 * registration into the compiled tokens.css.
 *
 * Two details that look arbitrary and aren't:
 *
 * - `0.01ms`, not `0ms`. A zero duration suppresses `transitionend` /
 *   `animationend` entirely, and the presence/exit-animation work (#29)
 *   waits on those events to know when an overlay may close. 0.01ms is
 *   visually instant and still fires them.
 * - `:root, [data-theme]` — both branches are (0,1,0), the same specificity
 *   as a `[data-theme="x"]` block. Emitted last inside the layer, it wins the
 *   tie; `:where(:root)` at (0,0,0) would silently lose to every theme block,
 *   so reduced motion would stop working the moment a theme was selected.
 */
function reducedMotionBlock(input: TokensInput<any, any>, light: AnyTheme): string | undefined {
    const durations = TOKEN_CATEGORIES.find((c) => c.id === 'duration')!;
    const declared = new Set<string>();
    for (const tier of [input.system, input.systemDark, light.system]) {
        for (const key of Object.keys((systemNodeAt(tier, durations.path) ?? {}) as object)) {
            declared.add(tokenProperty(durations, key));
        }
    }
    for (const theme of Object.values(input.themes)) {
        for (const key of Object.keys((systemNodeAt(theme.system, durations.path) ?? {}) as object)) {
            declared.add(tokenProperty(durations, key));
        }
    }
    if (declared.size === 0) return undefined;
    const decls = [...declared].map((prop) => `${prop}: 0.01ms;`);
    return (
        `    @media (prefers-reduced-motion: reduce) {\n` +
        `${block(':root, [data-theme]', decls, '        ')}\n` +
        `    }`
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

    const nonColorLight = nonColorFor(input, light);
    const nonColorDark = dark ? nonColorFor(input, dark) : {};
    // Properties that resolve differently per scheme. These need the
    // `prefers-color-scheme` block below AND must be restated by every theme
    // block — otherwise a `<div data-theme="light">` nested under a
    // system-dark root would inherit the dark value, and explicitly picking a
    // light theme while the OS is dark would leave the media block winning.
    //
    // Restricted to properties the light side also defines: a dark-only value
    // has nothing for a light theme block to restate. The kit cannot write
    // base.css's fallback either — `revert-layer` skips the whole
    // `zero.tokens` layer that base.css shares — so declaring the light value
    // is the only way to make the value resettable. `validateDesignSystem`
    // says so; here the emission simply can't produce the trap.
    const schemeDivergent = dark
        ? new Set(
            [...divergentProps(nonColorLight, nonColorDark)].filter((prop) => prop in nonColorLight),
        )
        : new Set<string>();

    /**
     * Properties whose value reads a color token, which every theme block must
     * restate for the same reason — but a subtler one.
     *
     * CSS substitutes `var()` in a custom property where the property is
     * DECLARED, not where it is used. A system-tier token is declared once, at
     * `:root`, so `--shadow-md: 0 0 8px var(--color-primary)` captures the
     * `:root` primary and inherits that captured color into every
     * `[data-theme]` block — the theme redeclares the role, but nothing
     * redeclares the token built from it. Measured: a phosphor glow written
     * that way stayed green on an amber theme.
     *
     * Restating the token inside each theme block re-runs the substitution
     * there, against that theme's own colors. `:root` itself is already
     * correct: the color it reads is a `light-dark()`, which resolves per
     * element from `color-scheme`.
     *
     * (Reading an unregistered token — a base surface — happens to survive as
     * a `light-dark()` token stream, but only for a single light/dark pair.
     * Both cases are handled the same way rather than relying on that.)
     */
    const colorReferencing = new Set(
        Object.entries(nonColorLight)
            .filter(([, value]) => COLOR_REF.test(value))
            .map(([prop]) => prop),
    );

    // Specificity ladder inside `@layer zero.tokens`:
    //   `:where(:root)` defaults      → (0,0,0)
    //   `[data-theme="x"]` overrides  → (0,1,0)  — always beat the defaults
    // so an explicit theme wins regardless of source order, and a nested
    // `[data-theme]` element re-themes its subtree via inheritance. App CSS
    // is unlayered, so it still wins over everything here.
    const blocks: string[] = [block(':where(:root)', rootDecls(light, dark, roles, nonColorLight))];

    if (schemeDivergent.size > 0) {
        blocks.push(
            `    @media (prefers-color-scheme: dark) {\n` +
            `${block(':where(:root)', systemDecls(nonColorDark, schemeDivergent), '        ')}\n` +
            `    }`,
        );
    }

    for (const [name, theme] of Object.entries(input.themes)) {
        const nonColor = nonColorFor(input, theme);
        // Emit only what this theme actually changes relative to the :root
        // defaults, plus the scheme-divergent set. Everything else is
        // inherited, so restating it would be dead weight in every theme.
        const own = divergentProps(nonColor, nonColorLight);
        const emit = new Set([...own, ...schemeDivergent, ...colorReferencing]);
        // A theme that doesn't define a scheme-divergent property still has to
        // state one, or under system dark it would inherit the media block's
        // value instead of the `:root` default it actually resolves to. Only
        // `extra` and `components` can land here — declared `custom` tokens are
        // required in every theme, and category values resolve from `system`.
        const source: Record<string, string> = { ...nonColor };
        for (const prop of [...schemeDivergent, ...colorReferencing]) {
            if (!(prop in source)) source[prop] = nonColorLight[prop]!;
        }
        blocks.push(block(
            `[data-theme="${name}"]`,
            [
                `color-scheme: ${theme.colorScheme};`,
                ...colorDecls(theme, roles),
                ...systemDecls(source, emit),
            ],
        ));
    }
    const reduced = reducedMotionBlock(input, light);
    if (reduced) blocks.push(reduced);

    const registrations = propertyRegistrations(input, roles, light);
    const preamble = registrations.length ? `${registrations.join('\n')}\n\n` : '';
    return `${preamble}@layer zero.tokens {\n${blocks.join('\n\n')}\n}\n`;
}
