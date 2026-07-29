import type { DesignSystemInput } from '@sigx/zero-kit';
import { defineApi } from '@sigx/zero-kit';
import { modifiers, roles, system, tokens, variants } from './tokens.js';
import { recipes } from './recipes.js';

/**
 * The vendor-named API (issue #179): HeroUI's own prop spellings for the
 * `./components` module. The fused `variant` maps exactly (grade `exact`);
 * `isIconOnly`/`isPending` are HeroUI's names for the two modifiers (grade
 * `reshaped` — boolean prop → presence attribute). This declaration is the
 * graduation of the kit's `conformance/heroui.ts` fixture into a shipped
 * artifact — the matrix row and the emitted module are the same object.
 */
const api = defineApi({ variants, modifiers }, {
    variant: {},
    modifiers: {
        'icon-only': { as: 'isIconOnly' },
        pending: { as: 'isPending' },
    },
});

export const designSystem: DesignSystemInput<typeof roles, typeof system> = {
    name: 'heroui',
    tokens,
    recipes,
    api,
};

export default designSystem;
