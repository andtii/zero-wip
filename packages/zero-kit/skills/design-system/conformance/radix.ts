/**
 * Conformance fixture: **Radix Themes** — Button (RFC 0003 §7.2, Tier 1).
 *
 * The mechanics this fixture exercises: **an exact variant axis beside a
 * camelCase-renamed modifier.** Radix's `variant` vocabulary maps onto zero's
 * `variant` with no rename and no respelling — the `exact` grade the
 * declaration states with a bare `{}`. `radius` is a custom axis surfacing
 * unrenamed; `highContrast` is the camelCase rename of a kebab modifier, and
 * `loading` surfaces under its own name.
 */
import { defineApi } from '@sigx/zero-kit';

export const source = {
    url: 'https://www.radix-ui.com/themes/docs/components/button',
    version: '@radix-ui/themes v3',
    verified: '2026-07-29',
} as const;

export const vocabulary = {
    variants: ['classic', 'solid', 'soft', 'surface', 'outline', 'ghost'],
    axes: { radius: ['none', 'small', 'medium', 'large', 'full'] },
    modifiers: ['high-contrast', 'loading'],
} as const;

export const api = defineApi(vocabulary, {
    variant: {},
    axes: { radius: {} },
    modifiers: {
        'high-contrast': { as: 'highContrast' },
        loading: {},
    },
});
