/**
 * Design-system validation — the check half of the AI-generate → validate →
 * iterate loop.
 *
 * - Role declaration: names are kebab-case identifiers outside the reserved
 *   `base-*` namespace; custom-token names stay outside `--color-*` and
 *   outside every token category's namespace.
 * - Token categories: declared keys are spellable as custom properties, and
 *   a `systemDark` / per-theme override only names keys the design system
 *   declared. Absence of a category is never an error — `css/base.css` ships
 *   fallbacks for the recommended keys.
 * - Token completeness: every declared role (+ `-content` where declared),
 *   every base surface, and every declared custom token present per theme;
 *   colors parseable. Color keys a theme defines but the DS never declared
 *   are errors — declare the role or drop the value.
 * - Contrast: WCAG ratio on every declared `role` / `role-content` pair and
 *   the base pairs (error < 3:1, warning < 4.5:1).
 * - Recipe coverage: recipes only touch known components/parts/states
 *   (compile already hard-errors); every declared machine state of a styled
 *   part is addressed or explicitly listed in `skipStates`.
 */
import { parse, wcagContrast } from 'culori';
import type { ZeroManifest } from './contract.js';
import {
    BASE_SURFACE_TOKEN_LIST,
    RESERVED_ROLE_NAMES,
    TOKEN_CATEGORIES,
    TOKEN_KEY_PATTERN,
    systemNodeAt,
    ROLE_NAME_PATTERN,
    contrastPairs,
    requiredColorTokens,
    resolveRoles,
} from './contract.js';
import type { RolesDecl } from './tokens.js';
import { BUILTIN_CONDITIONS } from './recipes.js';
import type { DesignSystemInput } from './design-system.js';
import { compileDesignSystem } from './design-system.js';
import { validateRecipes } from './validate-recipes.js';
import { tokenVocabulary } from './vocabulary.js';

export interface ValidationIssue {
    level: 'error' | 'warning';
    where: string;
    message: string;
}

export interface ValidationResult {
    ok: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
}

const FUNCTION_HEAD = /^\s*(?:var|calc|clamp|min|max|env|attr)\(/i;

/**
 * True when the value is ENTIRELY one CSS function call.
 *
 * A prefix test isn't enough in either direction: `150 var(--x)` must not
 * pass, and neither must `var(--x)junk` — both are invalid values CSS drops
 * silently, which is exactly what this validation exists to catch. So the
 * parens are balanced and the close has to land at the end of the string.
 */
function isWhollyFunctional(text: string): boolean {
    const head = FUNCTION_HEAD.exec(text);
    if (!head) return false;
    let depth = 0;
    for (let i = head[0].length - 1; i < text.length; i++) {
        if (text[i] === '(') depth++;
        else if (text[i] === ')' && --depth === 0) return text.slice(i + 1).trim() === '';
    }
    return false; // unbalanced — not a value we can vouch for
}
const TIME_VALUE = /^[+-]?(?:\d+\.?\d*|\.\d+)m?s$/i;
const NUMBER_VALUE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

/**
 * Check a declared value against its category's grammar, for the grammars
 * where getting it wrong fails silently rather than loudly.
 *
 * `<time>`: CSS ignores a unitless `150`, so a mistyped duration doesn't
 * error — the transition simply never runs and `transitionend` never fires.
 *
 * `<number>`: a unit here is dropped the same way. `font-weight: 700px` and a
 * `line-height` carrying a unit both misbehave silently rather than erroring.
 *
 * `<length>` is deliberately NOT checked: `0`, percentages, `em`-relative and
 * functional values are all legitimate, and the false-positive risk outweighs
 * the benefit — a rule that flags correct values gets switched off.
 */
function badValue(syntax: string, value: unknown): string | undefined {
    const text = String(value);
    if (isWhollyFunctional(text)) return undefined;

    if (syntax === '<time>' && !TIME_VALUE.test(text)) {
        return `"${text}" is not a valid <time> — CSS ignores a unitless duration, so this transition would never run (use "${text}ms" or "${text}s")`;
    }
    if (syntax === '<number>' && !NUMBER_VALUE.test(text)) {
        // A unit here is silently dropped the same way: `font-weight: 600px`
        // and `line-height` with a unit both misbehave rather than error.
        return `"${text}" is not a valid <number> — this token is unitless (a weight, a multiplier or an opacity)`;
    }
    return undefined;
}

export function validateDesignSystem<R extends RolesDecl>(
    ds: DesignSystemInput<R>,
    manifest: Pick<ZeroManifest, 'components'>,
): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const error = (where: string, message: string) => errors.push({ level: 'error', where, message });
    const warn = (where: string, message: string) => warnings.push({ level: 'warning', where, message });

    // ── Role + custom-token declarations ──
    const roles = resolveRoles(ds.tokens.roles);
    for (const name of Object.keys(roles)) {
        if (!ROLE_NAME_PATTERN.test(name)) {
            error('tokens.roles', `role "${name}" is not a kebab-case identifier`);
        }
        if (name === 'base' || name.startsWith('base-')) {
            error('tokens.roles', `role "${name}" uses the reserved base-* namespace (the base surfaces are fixed, not declarable roles)`);
        }
        if (RESERVED_ROLE_NAMES.has(name)) {
            error('tokens.roles', `role "${name}" is a CSS keyword — resolveColorToken would never resolve it to var(--color-${name})`);
        }
    }
    // Custom names may be spelled with or without the leading `--` — compare
    // through the normalized property name everywhere.
    const normProp = (name: string) => (name.startsWith('--') ? name : `--${name}`);
    const customDecls = ds.tokens.custom ?? {};
    const declaredCustom = new Map<string, string>();
    for (const name of Object.keys(customDecls)) {
        const prop = normProp(name);
        if (prop.startsWith('--color-')) {
            error('tokens.custom', `custom token "${name}" is inside the --color-* namespace — declare a role instead`);
        }
        // Same rule for every token category: a custom token that lands in a
        // category's namespace would be invisible to anything reasoning about
        // that category, so declare it under `system` instead.
        for (const category of TOKEN_CATEGORIES) {
            const collides = category.shape === 'scalar'
                ? prop === category.prefix
                : prop.startsWith(category.prefix);
            if (collides) {
                error(
                    'tokens.custom',
                    `custom token "${name}" is inside the ${category.prefix}* namespace — declare it under system.${category.path.join('.')} instead`,
                );
            }
        }
        const clash = declaredCustom.get(prop);
        if (clash) {
            error('tokens.custom', `custom tokens "${clash}" and "${name}" both emit ${prop} — declare one spelling`);
        } else {
            declaredCustom.set(prop, name);
        }
    }

    // ── Token categories ──
    // Absence is never an error: `css/base.css` ships fallbacks for every
    // recommended key, so a design system that declares no spacing (or no
    // categories at all) still resolves. What IS checked is that declared
    // keys can be spelled as custom properties, and that a per-theme override
    // names a key the design system actually declared — the runtime mirror of
    // the type error, since `validate` runs against compiled JS.
    const isKeyMap = (node: unknown): node is Record<string, unknown> =>
        typeof node === 'object' && node !== null && !Array.isArray(node);
    const categoryKeys = (node: unknown): string[] => (isKeyMap(node) ? Object.keys(node) : []);

    const declaredSystem = ds.tokens.system;

    /**
     * A key under `system` that matches no category is silently ignored by
     * the compiler — the values simply never appear, with nothing to say why.
     * That is how a stale doc cost a whole type ramp once, so it is an error
     * with a suggestion rather than a shrug.
     */
    const categoryRoots = new Set<string>(TOKEN_CATEGORIES.map((c) => c.path[0]!));
    // A nested category is plausibly reached for by two names other than its
    // real path: its category id (`text` — what `typography.sizes` was called
    // before it moved) and its leaf path segment (`sizes`). Both are unique
    // across the table today.
    const nestedAliases = new Map<string, readonly string[]>();
    for (const category of TOKEN_CATEGORIES) {
        if (category.path.length > 1) {
            nestedAliases.set(category.id, category.path);
            nestedAliases.set(category.path[category.path.length - 1]!, category.path);
        }
    }
    const checkSystemKeys = (where: string, source: unknown) => {
        if (!isKeyMap(source)) return;
        for (const key of Object.keys(source)) {
            if (categoryRoots.has(key)) continue;
            // The likely mistakes are naming a nested category by its id or
            // by its leaf, so say where the category actually lives.
            const nested = nestedAliases.get(key);
            const hint = nested ? ` — did you mean "${nested.join('.')}"?` : '';
            error(
                where,
                `"${key}" is not a token category (${[...categoryRoots].join(', ')}), so it is ignored${hint}`,
            );
        }
    };
    checkSystemKeys('tokens.system', declaredSystem);
    checkSystemKeys('tokens.systemDark', ds.tokens.systemDark);
    for (const category of TOKEN_CATEGORIES) {
        if (category.shape === 'scalar') continue;
        const path = category.path.join('.');
        const node = systemNodeAt(declaredSystem, category.path);
        if (node !== undefined && !isKeyMap(node)) {
            // Emission would otherwise spread a string into `--radius-0`,
            // `--radius-1`, … or silently drop it.
            error(
                `tokens.system.${path}`,
                `must be an object of key → value for the ${category.prefix}* category, got ${typeof node}`,
            );
            continue;
        }
        for (const [key, value] of Object.entries((node ?? {}) as Record<string, unknown>)) {
            if (!TOKEN_KEY_PATTERN.test(key)) {
                error(
                    `tokens.system.${path}`,
                    `key "${key}" is not a kebab-case identifier (it becomes ${category.prefix}${key})`,
                );
            }
            const bad = badValue(category.syntax, value);
            if (bad) error(`tokens.system.${path}`, `"${key}": ${bad}`);
        }
    }

    /**
     * An override may only touch values the design system declares.
     *
     * Beyond catching typos, this is what keeps scheme-divergence resettable:
     * a value that exists only under dark has no light counterpart for a
     * theme block to restate, so explicitly selecting a light theme while the
     * OS is dark could never override the `prefers-color-scheme` block.
     */
    const checkOverride = (where: string, source: unknown) => {
        if (!source) return;
        // `typography.scale` mints new `--text-*` keys, so it is a declaration
        // and belongs in `tokens.system`. `ThemeSystem` has no such field;
        // this is the runtime half, since `validate` sees compiled JS.
        if (systemNodeAt(source, ['typography', 'scale']) !== undefined) {
            error(
                `${where}.typography`,
                'declares a `scale` — a modular scale mints new --text-* keys, so it belongs in ' +
                'tokens.system.typography. Override individual steps with `sizes` instead',
            );
        }
        for (const category of TOKEN_CATEGORIES) {
            const path = category.path.join('.');
            const declaredNode = systemNodeAt(declaredSystem, category.path);
            const overrideNode = systemNodeAt(source, category.path);
            if (category.shape === 'scalar') {
                if (overrideNode !== undefined && declaredNode === undefined) {
                    error(
                        `${where}.${path}`,
                        `overrides "${path}", which the design system never declares in tokens.system.${path} — declare a base value there first`,
                    );
                }
                // An override is a declaration site for the VALUE even when it
                // isn't one for the key, so it needs the same value check.
                const bad = overrideNode === undefined
                    ? undefined
                    : badValue(category.syntax, overrideNode);
                if (bad) error(`${where}.${path}`, bad);
                continue;
            }
            const declared = new Set(categoryKeys(declaredNode));
            for (const [key, value] of Object.entries((overrideNode ?? {}) as Record<string, unknown>)) {
                if (!declared.has(key)) {
                    error(
                        `${where}.${path}`,
                        `overrides "${key}", which the design system never declares in tokens.system.${path} — declare a base value there first`,
                    );
                }
                const bad = badValue(category.syntax, value);
                if (bad) error(`${where}.${path}`, `"${key}": ${bad}`);
            }
        }
    };
    checkOverride('tokens.systemDark', ds.tokens.systemDark);

    // ── Token completeness + contrast, per theme ──
    const required = requiredColorTokens(roles);
    const declared = new Set<string>([
        ...required,
        ...Object.entries(roles).flatMap(([name, decl]) => (decl.soft === false ? [] : [`${name}-soft`])),
    ]);
    const pairs = contrastPairs(roles);
    for (const [themeName, theme] of Object.entries(ds.tokens.themes)) {
        checkOverride(`themes.${themeName}.system`, theme.system);
        checkSystemKeys(`themes.${themeName}.system`, theme.system);
        const colors = theme.colors as Record<string, string>;
        for (const token of required) {
            const value = colors[token];
            if (!value) {
                error(`themes.${themeName}`, `missing color token "${token}" (declared by the design system)`);
            } else if (!parse(value)) {
                error(`themes.${themeName}`, `color token "${token}" is not a parseable color: "${value}"`);
            }
        }
        for (const token of Object.keys(colors)) {
            if (!declared.has(token)) {
                error(`themes.${themeName}`, `color token "${token}" is not in the declared vocabulary — add it to tokens.roles or remove it`);
            }
        }
        for (const [bg, fg] of pairs) {
            const a = colors[bg];
            const b = colors[fg];
            if (!a || !b || !parse(a) || !parse(b)) continue;
            const ratio = wcagContrast(a, b);
            if (ratio < 3) {
                error(`themes.${themeName}`, `contrast ${bg} vs ${fg} is ${ratio.toFixed(2)}:1 (< 3:1)`);
            } else if (ratio < 4.5) {
                warn(`themes.${themeName}`, `contrast ${bg} vs ${fg} is ${ratio.toFixed(2)}:1 (< 4.5:1 AA)`);
            }
        }
        const themeCustom = new Set(Object.keys(theme.custom ?? {}).map(normProp));
        for (const name of Object.keys(customDecls)) {
            if (!themeCustom.has(normProp(name))) {
                error(`themes.${themeName}`, `missing value for declared custom token "${name}"`);
            }
        }
        for (const name of Object.keys(theme.custom ?? {})) {
            if (!declaredCustom.has(normProp(name))) {
                error(`themes.${themeName}`, `custom token "${name}" is not declared in tokens.custom`);
            }
        }
        if (theme.extra && Object.keys(theme.extra).length > 0) {
            warn(`themes.${themeName}`, `uses ${Object.keys(theme.extra).length} undeclared extra token(s) — declare them in tokens.custom so they surface in the manifest`);
        }
        if (theme.pair && !ds.tokens.themes[theme.pair]) {
            error(`themes.${themeName}`, `pair "${theme.pair}" is not a defined theme`);
        }
    }
    if (!ds.tokens.themes[ds.tokens.defaultLight]) {
        error('tokens', `defaultLight "${ds.tokens.defaultLight}" is not a defined theme`);
    }
    if (ds.tokens.defaultDark && !ds.tokens.themes[ds.tokens.defaultDark]) {
        error('tokens', `defaultDark "${ds.tokens.defaultDark}" is not a defined theme`);
    }
    for (const name of ds.tokens.swatch ?? []) {
        if (!roles[name] && !(BASE_SURFACE_TOKEN_LIST as readonly string[]).includes(name)) {
            error('tokens.swatch', `swatch entry "${name}" is not a declared role or base surface`);
        }
    }

    // ── Breakpoints ──
    // These become `@media (min-width: …)` preludes and the ORDER they are
    // declared in decides emission order, so a descending declaration would
    // silently make the wider breakpoint lose to the narrower one.
    const breakpoints = Object.entries(ds.tokens.breakpoints ?? {});
    let previousWidth = -Infinity;
    let unit: string | undefined;
    for (const [name, value] of breakpoints) {
        if (!TOKEN_KEY_PATTERN.test(name)) {
            error('tokens.breakpoints', `"${name}" is not a kebab-case identifier`);
        }
        if (Object.hasOwn(BUILTIN_CONDITIONS, name)) {
            error(
                'tokens.breakpoints',
                `"${name}" collides with the built-in condition of the same name — rename the breakpoint`,
            );
        }
        const width = /^(\d*\.?\d+)(px|rem|em)$/.exec(String(value));
        if (!width) {
            error('tokens.breakpoints', `"${name}": "${value}" is not a px/rem/em length`);
            continue;
        }
        // One unit throughout, so the ascending check below is a sound
        // comparison. Mixing them makes it meaningless in both directions:
        // `{ sm: '30rem', md: '400px' }` reads as ascending (30 < 400) while
        // 30rem is 480px at the default root size, and a rem list is anchored
        // to a root font size the design system doesn't control anyway.
        const [, magnitude, suffix] = width as unknown as [string, string, string];
        if (unit === undefined) {
            unit = suffix;
        } else if (suffix !== unit) {
            error(
                'tokens.breakpoints',
                `"${name}" is in ${suffix} but the others are in ${unit} — use one unit throughout so the ordering is comparable`,
            );
            continue;
        }
        const size = Number(magnitude);
        if (size <= previousWidth) {
            error(
                'tokens.breakpoints',
                `"${name}" (${value}) is not larger than the breakpoint before it — declare them mobile-first, ascending, since declaration order is emission order`,
            );
        }
        previousWidth = size;
    }

    // ── Recipes: unknown parts/states are hard compile errors — surface
    //    them as validation errors rather than throwing. ──
    try {
        compileDesignSystem(ds, manifest);
    } catch (e) {
        error('recipes', (e as Error).message);
    }

    // ── Recipe color variants should reference declared roles ──
    for (const recipe of ds.recipes) {
        for (const value of Object.keys(recipe.variants?.color ?? {})) {
            if (!roles[value]) {
                warn(`recipes.${recipe.component}`, `color variant "${value}" is not a declared role`);
            }
        }
    }

    // ── Recipe CONTENT: token references, literals, coverage ──
    for (const issue of validateRecipes(ds.recipes, manifest, tokenVocabulary(ds.tokens))) {
        (issue.level === 'error' ? errors : warnings).push(issue);
    }

    // ── Recipe state coverage ──
    const byScope = new Map(manifest.components.map((c) => [c.scope, c]));
    for (const recipe of ds.recipes) {
        const component = byScope.get(recipe.component);
        if (!component) continue; // already an error above
        for (const [partName, styles] of Object.entries(recipe.parts)) {
            const part = component.parts.find((p) => p.name === partName);
            if (!part) continue; // already an error above
            const styled = new Set(Object.keys(styles.states ?? {}));
            const skipped = new Set(recipe.skipStates?.[partName] ?? []);
            for (const state of part.states ?? []) {
                if (!styled.has(state) && !skipped.has(state)) {
                    warn(
                        `recipes.${recipe.component}.${partName}`,
                        `declared state "${state}" is not styled (add it or list it in skipStates)`,
                    );
                }
            }
        }
    }

    return { ok: errors.length === 0, errors, warnings };
}
