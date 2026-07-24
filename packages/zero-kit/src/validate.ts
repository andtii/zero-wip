/**
 * Design-system validation — the check half of the AI-generate → validate →
 * iterate loop.
 *
 * - Role declaration: names are kebab-case identifiers outside the reserved
 *   `base-*` namespace; custom-token names stay outside `--color-*`.
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
        if (name.replace(/^--/, '').startsWith('color-')) {
            error('tokens.custom', `custom token "${name}" is inside the --color-* namespace — declare a role instead`);
        }
        const prop = normProp(name);
        const clash = declaredCustom.get(prop);
        if (clash) {
            error('tokens.custom', `custom tokens "${clash}" and "${name}" both emit ${prop} — declare one spelling`);
        } else {
            declaredCustom.set(prop, name);
        }
    }

    // ── Token completeness + contrast, per theme ──
    const required = requiredColorTokens(roles);
    const declared = new Set<string>([
        ...required,
        ...Object.entries(roles).flatMap(([name, decl]) => (decl.soft === false ? [] : [`${name}-soft`])),
    ]);
    const pairs = contrastPairs(roles);
    for (const [themeName, theme] of Object.entries(ds.tokens.themes)) {
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
