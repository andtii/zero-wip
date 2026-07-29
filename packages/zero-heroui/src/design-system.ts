import type { DesignSystemApiFor, DesignSystemInput } from '@sigx/zero-kit';
import { modifiers, roles, system, tokens, variants } from './tokens.js';
import { recipes } from './recipes.js';

/**
 * The vendor-named API (issue #179): HeroUI's own prop spellings for the
 * `./components` module. The fused `variant` maps exactly (grade `exact`);
 * `isIconOnly`/`isPending` are HeroUI's names for the two modifiers (grade
 * `reshaped` — boolean prop → presence attribute). This declaration is the
 * graduation of the kit's `conformance/heroui.ts` fixture into a shipped
 * artifact — the matrix row and the emitted module are the same object.
 *
 * `satisfies` rather than `defineApi()`, deliberately: this module is in the
 * package's RUNTIME graph (the barrel re-exports `designSystem`, and the
 * playground imports the barrel in the browser), and zero-kit is Node-only —
 * a design system may never import it at runtime, only its types. The
 * `satisfies` form keeps the same literal narrowing the two-argument
 * `defineApi` gives, with a type-only import.
 */
const api = {
    variant: {},
    modifiers: {
        'icon-only': { as: 'isIconOnly' },
        pending: { as: 'isPending' },
    },
} satisfies DesignSystemApiFor<(typeof variants)[number], (typeof modifiers)[number], Record<never, readonly string[]>>;

export const designSystem: DesignSystemInput<typeof roles, typeof system> = {
    name: 'heroui',
    tokens,
    recipes,
    api,
};

export default designSystem;
