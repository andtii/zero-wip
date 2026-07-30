/**
 * Recipe layer — the typed authoring surface (`defineRecipe`, `RecipeInput`,
 * `PartStyles`) and the condition vocabulary. Target-neutral: nothing here
 * emits CSS. The web emitter lives in `targets/web/recipe-css.ts`.
 */

export type CssProps = Record<string, string | number>;

export interface PartStyles {
    base?: CssProps;
    /** state/flag/interaction name → declarations. */
    states?: Record<string, CssProps>;
    /** Nested selectors; `&` is the part selector. */
    selectors?: Record<string, CssProps>;
    /**
     * Conditional styles for the same part — condition → the same shape,
     * recursively. Nesting composes the at-rules.
     *
     * Keys resolve in this order:
     * - starts with `@` → used verbatim as the at-rule prelude
     *   (`'@container (min-width: 20rem)'`, `'@supports (…)'`,
     *   `'@starting-style'`)
     * - a name in the design system's `breakpoints` → `@media (min-width: …)`
     * - a built-in: see `BUILTIN_CONDITIONS`
     * - anything else is a hard error listing what was available
     *
     * `variants` and `compoundVariants` hold `PartStyles` too, so responsive
     * variants need no separate mechanism.
     */
    at?: Record<string, PartStyles>;
}

/**
 * Condition keys that don't come from the design system's breakpoints.
 *
 * `prefers-dark` is deliberately not called `dark`: it compiles to
 * `prefers-color-scheme` and so ignores `[data-theme="…-dark"]` entirely.
 * `at.dark` would read as "my dark theme" and silently mean something else —
 * the exact class of trap the recipe layer keeps eliminating elsewhere.
 */
export const BUILTIN_CONDITIONS: Readonly<Record<string, string>> = {
    'reduced-motion': '@media (prefers-reduced-motion: reduce)',
    'hover-none': '@media (hover: none)',
    'prefers-dark': '@media (prefers-color-scheme: dark)',
    'forced-colors': '@media (forced-colors: active)',
    // The other medium where a background-painted mark disappears: printing
    // drops backgrounds by default (`print-color-adjust: economy`), so a
    // drawn indicator needs the same glyph fallback `forced-colors` gets.
    // Named for exactly that reason — `forced-colors` having a name while
    // `print` did not made the raw prelude look like the only route, which
    // pushes authors past the tier machinery for no reason.
    print: '@media print',
    // The state an element animates FROM on its first style change — the
    // entry half of presence. Spellable as the raw `@starting-style` prelude
    // too; naming it makes it discoverable and lets the validator recognise
    // an entry animation and check for the exit half.
    'starting-style': '@starting-style',
};

/** Compile-time context a recipe needs beyond its own component anatomy. */
export interface RecipeContext {
    /** The design system's declared breakpoints, in mobile-first order. */
    breakpoints?: Record<string, string>;
}

export interface RecipeInput {
    /** The component scope this recipe styles (e.g. `'tabs'`). */
    component: string;
    /**
     * Component-level tokens declared on the carrier part (`root`, else the
     * first part). Emitted in `@layer zero.recipes`, which the layer order in
     * `zero/css/base.css` puts after `zero.tokens` — so a theme-level
     * declaration of the same property cannot override one of these.
     */
    tokens?: Record<string, string>;
    parts: Record<string, PartStyles>;
    /** axis → value → part → styles. Contract axes: color, size, variant. */
    variants?: Record<string, Record<string, Record<string, PartStyles>>>;
    /**
     * Presence-only modifiers: name → part → styles, emitted as
     * `[data-mod-<name>]`. Names must be declared in `tokens.modifiers`.
     *
     * There is no `defaultVariants` analogue — a modifier is absent by nature,
     * so absence already is the default.
     */
    modifiers?: Record<string, Record<string, PartStyles>>;
    /**
     * A conjunction over axis values, plus `true` for a modifier that must be
     * present. `{ variant: 'solid', block: true }` compiles to
     * `[data-variant="solid"][data-mod-block]`.
     */
    compoundVariants?: Array<{
        match: Record<string, string | true>;
        parts: Record<string, PartStyles>;
    }>;
    /** Values applied when the axis attribute is absent (CSS-only defaults). */
    defaultVariants?: Record<string, string>;
    /** name → raw keyframes body (`from { … } to { … }`). */
    keyframes?: Record<string, string>;
    /**
     * Raw CSS appended verbatim at the end of this component's
     * `@layer zero.recipes` block — the escape hatch for anything the typed
     * surface can't express. Lands in the component's own stylesheet, so it
     * stays with the rules it relates to.
     */
    css?: string;
    /**
     * Declared states intentionally left unstyled — part → state names.
     *
     * Two consumers read this, and an entry makes BOTH claims:
     * 1. the validator's coverage warning is silenced for that part+state;
     * 2. the state-legibility guard (`__tests__/state-legibility.test.ts`)
     *    accepts that the state is deliberately indistinguishable from its
     *    siblings — so listing a state here also asserts "this component does
     *    not need to look different in that state", which is a design claim
     *    and wants a comment saying why.
     *
     * Both readings are scoped to the part the entry names: skipping `checked`
     * on a `item-label` says nothing about `item-indicator`, and will not stop
     * the guard from requiring that the indicator draw its mark.
     */
    skipStates?: Record<string, readonly string[]>;
}

/** Identity with typing — the authoring entry point. */
export function defineRecipe(recipe: RecipeInput): RecipeInput {
    return recipe;
}
