/**
 * Design-system assembly: tokens + recipes (+ optional raw CSS) compiled
 * into the artifacts a DS package ships — per-component CSS files, a
 * combined index, and theme metadata for the runtime registry.
 */
import type { ManifestComponent, RoleDecl, ZeroManifest } from './contract.js';
import { DEFAULT_ROLES, defaultSwatch, resolveRoles, resolveSizes } from './contract.js';
import type { CustomTokenDecl, RolesDecl, SystemTokens, TokensInput } from './tokens.js';
import { compileTokensCss } from './targets/web/tokens-css.js';
import type { RecipeInput } from './recipes.js';
import { compileRecipeCss } from './targets/web/recipe-css.js';

export interface DesignSystemInput<
    R extends RolesDecl = RolesDecl,
    T extends SystemTokens = SystemTokens,
> {
    name: string;
    tokens: TokensInput<R, T>;
    recipes: RecipeInput[];
    /** Raw CSS appended verbatim after the compiled recipes (escape hatch). */
    css?: string[];
}

/** Identity with typing — the authoring entry point. */
export function defineDesignSystem<
    const R extends RolesDecl = typeof DEFAULT_ROLES,
    const T extends SystemTokens = SystemTokens,
>(input: DesignSystemInput<R, T>): DesignSystemInput<R, T> {
    return input;
}

export interface CompiledTheme {
    name: string;
    colorScheme: 'light' | 'dark';
    pair?: string;
    swatch: Record<string, string>;
}

/**
 * The axis vocabulary one component's recipe actually wires — `variants`
 * keys unioned with every `compoundVariants[].match` value, since the
 * compiler emits CSS for both and a generated type must cover everything the
 * CSS matches. An absent axis is an empty array (the register generator
 * emits it as `never`).
 */
export interface CompiledComponentAxes {
    color: string[];
    size: string[];
    variant: string[];
    /** Custom axes: axis name → wired values. */
    axes: Record<string, string[]>;
    /** Presence-only modifiers this recipe wires — rendered `data-mod-<name>`. */
    mods: string[];
    /**
     * The recipe's `defaultVariants`, validated against the wired sets in
     * `validateRecipes`. Manifest/docs only — never widens a union.
     */
    defaults?: Record<string, string>;
}

export interface CompiledDesignSystem {
    name: string;
    tokensCss: string;
    /** component scope → compiled recipe CSS. */
    componentCss: Record<string, string>;
    /** tokens + all components + raw css, in order. */
    indexCss: string;
    themes: CompiledTheme[];
    /** scope → the axis vocabulary the recipes actually wire. */
    components: Record<string, CompiledComponentAxes>;
    /** The DS's declared token vocabulary — emitted into the DS manifest. */
    tokens: {
        roles: Record<string, RoleDecl>;
        /** The DS's `size` axis vocabulary, resolved (declared, else recommended). */
        sizes: string[];
        /**
         * The DS's declared `variant` axis vocabulary. `[]` for BOTH "undeclared"
         * and "declared empty", so pair it with `variantsDeclared` to tell them
         * apart — unlike `roles`/`sizes`, there is no default vocabulary whose
         * absence would reveal an explicit empty.
         */
        variants: string[];
        /**
         * True when `tokens.variants` was written at all. `variants: []` then
         * means "this design system has no variant axis", the claim `roles: {}`
         * and `sizes: []` already make (#200). Mirrors
         * `TokenVocabulary.sizesDeclared`.
         */
        variantsDeclared: boolean;
        /** Declared custom variant axes: axis name → values ({} when undeclared). */
        axes: Record<string, string[]>;
        /** Declared presence-only modifiers ([] when undeclared). */
        modifiers: string[];
        custom: Record<string, CustomTokenDecl>;
        breakpoints: Record<string, string>;
        /** DS-level values per category id, e.g. `{ radius: { field: '0.5rem' } }`. */
        system: Record<string, unknown>;
        /** Overrides applied to dark-scheme themes. */
        systemDark: Record<string, unknown>;
        /**
         * Every custom property this design system emits, flat and sorted —
         * what editor completion, the docs site and cross-platform emitters
         * want, rather than re-deriving it from the grammar.
         */
        properties: string[];
    };
}

/**
 * Every custom property the compiled tokens.css defines, sorted and deduped.
 *
 * Read back off the emitted CSS rather than re-derived from the declaration,
 * so it cannot drift from what the design system actually ships — including
 * derived tokens like `--color-<role>-soft` that no declaration lists.
 */
function emittedProperties(tokensCss: string): string[] {
    const found = new Set<string>();
    for (const [, prop] of tokensCss.matchAll(/^\s*(--[\w-]+)\s*:/gm)) found.add(prop!);
    return [...found].sort();
}

/** The wired-axis harvest for one recipe — see `CompiledComponentAxes`. */
function harvestAxes(recipe: RecipeInput): CompiledComponentAxes {
    const byAxis = new Map<string, Set<string>>();
    for (const [axis, values] of Object.entries(recipe.variants ?? {})) {
        byAxis.set(axis, new Set(Object.keys(values)));
    }
    // `true` in a match is a modifier, not an axis value — it must not be
    // harvested as one, or the generated types would offer the string "true".
    const mods = new Set(Object.keys(recipe.modifiers ?? {}));
    for (const compound of recipe.compoundVariants ?? []) {
        for (const [axis, value] of Object.entries(compound.match)) {
            if (value === true) {
                mods.add(axis);
                continue;
            }
            let set = byAxis.get(axis);
            if (!set) byAxis.set(axis, (set = new Set()));
            set.add(value);
        }
    }
    const take = (axis: string): string[] => {
        const values = [...(byAxis.get(axis) ?? [])];
        byAxis.delete(axis);
        return values;
    };
    const result: CompiledComponentAxes = {
        color: take('color'),
        size: take('size'),
        variant: take('variant'),
        axes: Object.fromEntries([...byAxis.entries()].map(([axis, values]) => [axis, [...values]])),
        mods: [...mods],
    };
    if (recipe.defaultVariants && Object.keys(recipe.defaultVariants).length > 0) {
        result.defaults = { ...recipe.defaultVariants };
    }
    return result;
}

/**
 * Axes this design system has declared OUT OF EXISTENCE, as opposed to merely
 * left unwired.
 *
 * The distinction matters in the diagnostic: "no recipe wires it" tells an
 * author to go wire one, which is wrong advice when there is no axis to wire.
 *
 * An axis is declared away only by an *explicitly empty* declaration.
 * `resolveRoles(undefined)` yields the recommended eight and
 * `resolveSizes(undefined)` the recommended ramp, so for `color` and `size` an
 * empty result here can only have come from `roles: {}` or `sizes: []`.
 *
 * `variant` needs the extra `variantsDeclared` guard rather than the same naked
 * length test, because it has no default vocabulary: omitting `tokens.variants`
 * means "declared nothing, check nothing", NOT "this design system has no
 * variant axis", and `compileDesignSystem` normalises the omission to `[]`.
 * Testing only the length would mislabel every unwired `variant` in a design
 * system that simply never declared the vocabulary — the exact error this
 * function exists to avoid, pointed the other way.
 *
 * Target-neutral, and shared: `compileRegisterDts` picks the `never` doc
 * comment from it, and `buildReport` names the same axes. Two readers of one
 * predicate, so the report and the register artifact cannot disagree — which is
 * the gate RFC 0003 §7.4 puts on the report.
 */
export function undeclaredAxes(compiled: CompiledDesignSystem): ReadonlySet<string> {
    const out = new Set<string>();
    if (Object.keys(compiled.tokens.roles).length === 0) out.add('color');
    if (compiled.tokens.sizes.length === 0) out.add('size');
    if (compiled.tokens.variantsDeclared && compiled.tokens.variants.length === 0) {
        out.add('variant');
    }
    return out;
}

export function compileDesignSystem<R extends RolesDecl, T extends SystemTokens>(
    ds: DesignSystemInput<R, T>,
    manifest: Pick<ZeroManifest, 'components'>,
): CompiledDesignSystem {
    const byScope = new Map<string, ManifestComponent>(
        manifest.components.map((c) => [c.scope, c]),
    );

    const tokensCss = compileTokensCss(ds.tokens);

    const componentCss: Record<string, string> = {};
    const components: Record<string, CompiledComponentAxes> = {};
    for (const recipe of ds.recipes) {
        const component = byScope.get(recipe.component);
        if (!component) {
            const known = [...byScope.keys()].join(', ');
            throw new Error(
                `[zero-kit] design system "${ds.name}" has a recipe for unknown component "${recipe.component}" (known: ${known})`,
            );
        }
        if (componentCss[recipe.component]) {
            throw new Error(`[zero-kit] duplicate recipe for component "${recipe.component}"`);
        }
        componentCss[recipe.component] = compileRecipeCss(recipe, component, {
            breakpoints: ds.tokens.breakpoints,
        });
        components[recipe.component] = harvestAxes(recipe);
    }

    const rawCss = (ds.css ?? []).join('\n');
    const indexCss = [
        `/* ${ds.name} — generated by @sigx/zero-kit. Do not edit. */`,
        tokensCss,
        ...Object.values(componentCss),
        ...(rawCss ? [`@layer zero.recipes {\n${rawCss}\n}`] : []),
    ].join('\n');

    const roles = resolveRoles(ds.tokens.roles);
    const swatch = ds.tokens.swatch ?? defaultSwatch(Object.keys(roles));
    const themes: CompiledTheme[] = Object.entries(ds.tokens.themes).map(([name, theme]) => {
        const colors = theme.colors as Record<string, string>;
        return {
            name,
            colorScheme: theme.colorScheme,
            ...(theme.pair ? { pair: theme.pair } : {}),
            swatch: Object.fromEntries(
                swatch.flatMap((t) => (colors[t] ? [[t, colors[t]]] : [])),
            ),
        };
    });

    return {
        name: ds.name,
        tokensCss,
        componentCss,
        indexCss,
        themes,
        components,
        tokens: {
            roles,
            sizes: [...resolveSizes(ds.tokens.sizes)],
            variants: [...(ds.tokens.variants ?? [])],
            variantsDeclared: ds.tokens.variants !== undefined,
            axes: Object.fromEntries(
                Object.entries(ds.tokens.axes ?? {}).map(([axis, values]) => [axis, [...values]]),
            ),
            modifiers: [...(ds.tokens.modifiers ?? [])],
            custom: ds.tokens.custom ?? {},
            breakpoints: ds.tokens.breakpoints ?? {},
            system: (ds.tokens.system ?? {}) as Record<string, unknown>,
            systemDark: (ds.tokens.systemDark ?? {}) as Record<string, unknown>,
            properties: emittedProperties(tokensCss),
        },
    };
}
