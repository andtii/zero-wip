/**
 * Conformance fixture: **Ant Design** — Button (RFC 0003 §7.2, Tier 2).
 *
 * The mechanics this fixture exercises: **a renamed axis that shadows a
 * component prop, an exact custom axis, and modifiers under their own
 * names.** Ant's `type` is zero's `variant` renamed — and `type` is also
 * zero-Button's native button-type prop. The shadowing is vendor-faithful
 * (Ant itself spells the native attribute `htmlType`), which is why the
 * validator deliberately does not reserve component-specific prop names.
 * `shape` is a custom axis surfacing unrenamed; `danger`/`ghost`/`block` are
 * presence flags surfacing as boolean props of the same name.
 */
import { defineApi } from '@sigx/zero-kit';

export const source = {
    url: 'https://ant.design/components/button',
    version: 'antd v5',
    verified: '2026-07-29',
} as const;

export const vocabulary = {
    variants: ['primary', 'dashed', 'link', 'text', 'default'],
    axes: { shape: ['default', 'circle', 'round'] },
    modifiers: ['danger', 'ghost', 'block'],
} as const;

export const api = defineApi(vocabulary, {
    variant: { as: 'type' },
    axes: { shape: {} },
    modifiers: { danger: {}, ghost: {}, block: {} },
});
