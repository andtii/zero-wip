import type { DesignSystemApiFor, DesignSystemInput } from '@sigx/zero-kit';
import { modifiers, roles, system, tokens, variants } from './tokens.js';
import { recipes } from './recipes.js';

/**
 * The vendor-named API (issue #183): Carbon's own prop spellings for the
 * `./components` module — and the first RUNTIME use of the api `values`
 * remap. `kind` is zero's `variant` renamed, with the two double-hyphen
 * members respelled at the prop boundary (`kind="danger--tertiary"` renders
 * `data-variant="danger-tertiary"`); `hasIconOnly`/`isExpressive` are
 * Carbon's names for the two modifiers. This declaration graduates the kit's
 * `conformance/carbon.ts` fixture into a shipped artifact — the matrix row
 * and the emitted module are the same object.
 *
 * `satisfies` rather than `defineApi()`, deliberately: this module is in the
 * package's RUNTIME graph (the barrel re-exports `designSystem`), and
 * zero-kit is Node-only — a design system may never import it at runtime,
 * only its types. The `satisfies` form keeps the same literal narrowing the
 * two-argument `defineApi` gives, with a type-only import (guarded by
 * zero-kit's `ds-runtime-imports.test.ts`).
 */
const api = {
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
} satisfies DesignSystemApiFor<(typeof variants)[number], (typeof modifiers)[number], Record<never, readonly string[]>>;

export const designSystem: DesignSystemInput<typeof roles, typeof system> = {
    name: 'carbon',
    tokens,
    recipes,
    api,
};

export default designSystem;
