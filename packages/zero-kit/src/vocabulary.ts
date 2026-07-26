/**
 * What a design system actually declared — the custom properties it
 * guarantees, and the vocabularies its variant axes accept.
 *
 * Recipes are checked against this rather than against hardcoded lists: it is
 * derived from the declaration, so every category added to `TOKEN_CATEGORIES`
 * starts being enforced without touching the validator, and a design system
 * with its own size ramp is checked against *its* ramp.
 */
import {
    BASE_SURFACE_TOKEN_LIST,
    RUNTIME_PROPERTIES,
    TOKEN_CATEGORIES,
    resolveRoles,
    resolveSizes,
    tokenProperty,
} from './contract.js';
import type { RolesDecl, TokensInput } from './tokens.js';
import { systemNodeAt } from './contract.js';

export interface TokenVocabulary {
    /** Every custom property the design system defines. */
    names: ReadonlySet<string>;
    /**
     * The `size` axis values this design system declared, resolved — its own
     * `tokens.sizes`, else the recommended ramp.
     */
    sizes: readonly string[];
    /** The declared colour roles — what the `color` axis may key on. */
    roles: ReadonlySet<string>;
    /** Closest known name, for a "did you mean" hint. */
    nearest(name: string): string | undefined;
}

const normProp = (name: string): string => (name.startsWith('--') ? name : `--${name}`);

/**
 * Levenshtein distance, only ever used to suggest a near miss.
 *
 * The length check is a cheap reject, not an early exit from the matrix —
 * token names are short and vocabularies are dozens of entries, so the full
 * DP is not worth optimizing.
 */
function distance(a: string, b: string, limit: number): number {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        for (let j = 1; j <= b.length; j++) {
            row[j] = Math.min(
                prev[j]! + 1,
                row[j - 1]! + 1,
                prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
            );
        }
        prev = row;
    }
    return prev[b.length]!;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- variance-erased plumbing */
export function tokenVocabulary(tokens: TokensInput<any, any>): TokenVocabulary {
    const names = new Set<string>();

    // ── colors, per the declared role vocabulary ──
    const roles = resolveRoles(tokens.roles as RolesDecl | undefined);
    for (const [role, decl] of Object.entries(roles)) {
        names.add(`--color-${role}`);
        if (decl.content !== false) names.add(`--color-${role}-content`);
        if (decl.soft !== false) names.add(`--color-${role}-soft`);
    }
    for (const surface of BASE_SURFACE_TOKEN_LIST) names.add(`--color-${surface}`);

    // ── categories: what this design system declared, plus the recommended
    // keys `@sigx/zero/css` ships fallbacks for (those always resolve, so a
    // recipe may reference them even if the design system never set them) ──
    const tiers = [
        tokens.system,
        tokens.systemDark,
        ...Object.values(tokens.themes ?? {}).map((t) => (t as { system?: unknown }).system),
    ];
    for (const category of TOKEN_CATEGORIES) {
        if (category.shape === 'scalar') {
            names.add(tokenProperty(category));
            continue;
        }
        for (const key of category.recommended) names.add(tokenProperty(category, key));
        for (const tier of tiers) {
            const node = systemNodeAt(tier, category.path);
            if (typeof node !== 'object' || node === null) continue;
            for (const key of Object.keys(node)) names.add(tokenProperty(category, key));
        }
    }

    // ── runtime-published properties: the zero runtime writes these on
    // elements (press point, progress/slider percent), so a recipe may
    // reference them even though no design system declares them ──
    for (const name of RUNTIME_PROPERTIES) names.add(name);

    // ── declared custom tokens, plus the untyped escape hatches. `extra` and
    // `components` are emitted verbatim, so a reference to one resolves —
    // they get their own "declare it instead" warning elsewhere. ──
    for (const name of Object.keys(tokens.custom ?? {})) names.add(normProp(name));
    for (const theme of Object.values(tokens.themes ?? {})) {
        const t = theme as {
            custom?: Record<string, string>;
            extra?: Record<string, string>;
            components?: Record<string, Record<string, string>>;
        };
        for (const name of Object.keys(t.extra ?? {})) names.add(normProp(name));
        for (const overrides of Object.values(t.components ?? {})) {
            for (const name of Object.keys(overrides)) names.add(normProp(name));
        }
    }

    return {
        names,
        sizes: resolveSizes(tokens.sizes),
        roles: new Set(Object.keys(roles)),
        nearest(name) {
            let best: string | undefined;
            let bestDistance = 4; // anything further apart isn't a typo
            for (const candidate of names) {
                const d = distance(name, candidate, bestDistance);
                if (d < bestDistance) {
                    bestDistance = d;
                    best = candidate;
                }
            }
            return best;
        },
    };
}
