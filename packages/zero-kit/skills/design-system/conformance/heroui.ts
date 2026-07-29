/**
 * Conformance fixture: **HeroUI** — Button (RFC 0003 §7.2, Tier 1).
 *
 * The mechanics this fixture exercises: **an exact fused variant beside
 * renamed boolean modifiers** — and, uniquely, this fixture describes a
 * design system that exists in this repo. The vocabulary below is
 * `@sigx/zero-heroui`'s declared vocabulary verbatim (the fused seven-member
 * `variant` with no colour axis, `icon-only`/`pending` as modifiers), and the
 * api is the one that package ships: `isIconOnly`/`isPending` are HeroUI's
 * own spellings of the two modifiers. The graduation from this fixture to the
 * package's real `api` declaration is what makes the matrix row and the
 * shipped artifact the same object.
 */
import { defineApi } from '@sigx/zero-kit';

/**
 * §7.2 placement. Tier 1: the system is buildable as a package, and IS built
 * — column 8 points at `packages/zero-heroui`, which ships this api. No
 * fixture tokens/recipe here; the package is the executing artifact.
 */
export const matrix = {
    system: 'HeroUI',
    tier: 1,
    provenBy: 'packages/zero-heroui',
} as const;

export const source = {
    url: 'https://www.heroui.com/docs/components/button',
    version: 'HeroUI v3',
    verified: '2026-07-29',
} as const;

export const vocabulary = {
    variants: ['primary', 'secondary', 'tertiary', 'outline', 'ghost', 'danger', 'danger-soft'],
    modifiers: ['icon-only', 'pending'],
} as const;

export const api = defineApi(vocabulary, {
    variant: {},
    modifiers: {
        'icon-only': { as: 'isIconOnly' },
        pending: { as: 'isPending' },
    },
});
