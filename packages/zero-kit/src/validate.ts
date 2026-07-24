/**
 * Design-system validation — the check half of the AI-generate → validate →
 * iterate loop.
 *
 * - Token completeness: every core contract token present and parseable per
 *   theme.
 * - Contrast: WCAG ratio on every `x` / `x-content` pair (error < 3:1,
 *   warning < 4.5:1).
 * - Recipe coverage: recipes only touch known components/parts/states
 *   (compile already hard-errors); every declared machine state of a styled
 *   part is addressed or explicitly listed in `skipStates`.
 */
import { parse, wcagContrast } from 'culori';
import type { ZeroManifest } from './contract.js';
import { CONTRAST_PAIRS, CORE_COLOR_TOKEN_LIST } from './contract.js';
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

export function validateDesignSystem(
    ds: DesignSystemInput,
    manifest: Pick<ZeroManifest, 'components'>,
): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const error = (where: string, message: string) => errors.push({ level: 'error', where, message });
    const warn = (where: string, message: string) => warnings.push({ level: 'warning', where, message });

    // ── Tokens ──
    for (const [themeName, theme] of Object.entries(ds.tokens.themes)) {
        for (const token of CORE_COLOR_TOKEN_LIST) {
            const value = theme.colors[token];
            if (!value) {
                error(`themes.${themeName}`, `missing core color token "${token}"`);
            } else if (!parse(value)) {
                error(`themes.${themeName}`, `color token "${token}" is not a parseable color: "${value}"`);
            }
        }
        for (const [fg, bg] of CONTRAST_PAIRS) {
            const a = theme.colors[fg];
            const b = theme.colors[bg];
            if (!a || !b || !parse(a) || !parse(b)) continue;
            const ratio = wcagContrast(a, b);
            if (ratio < 3) {
                error(`themes.${themeName}`, `contrast ${fg} vs ${bg} is ${ratio.toFixed(2)}:1 (< 3:1)`);
            } else if (ratio < 4.5) {
                warn(`themes.${themeName}`, `contrast ${fg} vs ${bg} is ${ratio.toFixed(2)}:1 (< 4.5:1 AA)`);
            }
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

    // ── Recipes: unknown parts/states are hard compile errors — surface
    //    them as validation errors rather than throwing. ──
    try {
        compileDesignSystem(ds, manifest);
    } catch (e) {
        error('recipes', (e as Error).message);
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
