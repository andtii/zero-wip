/**
 * The set of custom properties a design system actually guarantees.
 *
 * Recipes are checked against this rather than against a hardcoded list of
 * token names: it is derived from the declaration, so every category added to
 * `TOKEN_CATEGORIES` starts being enforced without touching the validator.
 */
import { BASE_SURFACE_TOKEN_LIST, TOKEN_CATEGORIES, resolveRoles, tokenProperty } from './contract.js';
import type { RolesDecl, TokensInput } from './tokens.js';
import { systemNodeAt } from './contract.js';

export interface TokenVocabulary {
    /** Every custom property the design system defines. */
    names: ReadonlySet<string>;
    /** Closest known name, for a "did you mean" hint. */
    nearest(name: string): string | undefined;
}

const normProp = (name: string): string => (name.startsWith('--') ? name : `--${name}`);

/** Levenshtein, bailed out early — only ever used to suggest a near miss. */
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
