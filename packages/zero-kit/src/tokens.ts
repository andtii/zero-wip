/**
 * Token layer — the typed authoring surface (`defineTokens` and the
 * `TokensInput` shape). Target-neutral: nothing here emits CSS. The web
 * emitter lives in `targets/web/tokens-css.ts`.
 */
import type { RoleDecl } from './contract.js';
import type { TypeScale } from './scale.js';
import { BASE_SURFACE_TOKEN_LIST, DEFAULT_ROLES } from './contract.js';

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
