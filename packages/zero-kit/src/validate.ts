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
import type { DesignSystemInput } from './design-system.js';
import { compileDesignSystem } from './design-system.js';

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

/** Values built from CSS functions are opaque here — accept them as-is. */
const FUNCTIONAL_VALUE = /(?:var|calc|clamp|min|max|env|attr)\(/;
const TIME_VALUE = /^-?(?:\d+\.?\d*|\.\d+)m?s$/;

/**
 * Check a declared value against its category's grammar, for the grammars
 * where getting it wrong fails silently rather than loudly.
 *
 * `<time>` is the one that matters: CSS ignores a unitless `150`, so a
 * mistyped duration doesn't error — the transition simply never runs, and
 * `transitionend` never fires. `<length>` is deliberately not checked; `0`,
 * percentages, `em`-relative and functional values are all legitimate and the
 * false-positive risk outweighs the benefit.
 */
function badValue(syntax: string, value: unknown): string | undefined {
    if (syntax !== '<time>') return undefined;
    const text = String(value);
    if (FUNCTIONAL_VALUE.test(text)) return undefined;
    if (!TIME_VALUE.test(text)) {
        return `"${text}" is not a valid <time> — CSS ignores a unitless duration, so this transition would never run (use "${text}ms" or "${text}s")`;
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
        for (const category of TOKEN_CATEGORIES) {
            const path = category.path.join('.');
            const declaredNode = systemNodeAt(declaredSystem, category.path);
            if (category.shape === 'scalar') {
                if (systemNodeAt(source, category.path) !== undefined && declaredNode === undefined) {
                    error(
                        `${where}.${path}`,
                        `overrides "${path}", which the design system never declares in tokens.system.${path} — declare a base value there first`,
                    );
                }
                continue;
            }
            const declared = new Set(categoryKeys(declaredNode));
            for (const key of categoryKeys(systemNodeAt(source, category.path))) {
                if (!declared.has(key)) {
                    error(
                        `${where}.${path}`,
                        `overrides "${key}", which the design system never declares in tokens.system.${path} — declare a base value there first`,
                    );
                }
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
