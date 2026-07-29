/**
 * Conformance fixture: **IBM Carbon** — Button (RFC 0003 §7.2, Tier 2).
 *
 * The mechanic this fixture exercises: **a renamed axis with respelled
 * values.** Carbon's `kind` is zero's `variant` under another name, and two of
 * its members (`danger--tertiary`, `danger--ghost`) use a double hyphen the
 * attribute grammar cannot hold — so the design system declares the kebab
 * spellings and the api's `values` remap is the only place the vendor
 * spelling lives. Grade: `reshaped` on the variant axis, `reshaped` on both
 * modifiers (boolean prop → presence attribute).
 */
import { defineApi } from '@sigx/zero-kit';

export const source = {
    url: 'https://react.carbondesignsystem.com/?path=/docs/components-button--overview',
    version: '@carbon/react v11',
    verified: '2026-07-29',
} as const;

export const vocabulary = {
    variants: [
        'primary',
        'secondary',
        'tertiary',
        'ghost',
        'danger',
        'danger-tertiary',
        'danger-ghost',
    ],
    modifiers: ['icon-only', 'expressive'],
} as const;

export const api = defineApi(vocabulary, {
    variant: {
        as: 'kind',
        values: {
            'danger-tertiary': 'danger--tertiary',
            'danger-ghost': 'danger--ghost',
        },
    },
    modifiers: {
        'icon-only': { as: 'hasIconOnly' },
        expressive: { as: 'isExpressive' },
    },
});
