import type { DesignSystemInput } from '@sigx/zero-kit';
// The ecosystem adoption (the acceptance loop): zero-basic covers the
// ext-stepper scope by adopting its recipe pack. The pack comes from the
// data-only `/fragment` entry, so this stays a build-time dependency —
// nothing of it ships at runtime.
import { recipes as extRecipes } from '@sigx/zero-ext-example/fragment';
import { roles, tokens } from './tokens.js';
import { recipes } from './recipes.js';

export const designSystem: DesignSystemInput<typeof roles> = {
    name: 'basic',
    tokens,
    recipes,
};

/**
 * `designSystem` plus the adopted ecosystem recipe pack — what `build.mjs`
 * actually compiles (against the fragment-merged manifest). A separate export
 * rather than folded into `designSystem`: the plain export is the reference
 * input for everything that reasons about zero's OWN scopes (the kit's
 * golden/coverage suites), while this one is the acceptance proof that
 * adoption is pure composition — spread the pack, merge the fragment, done.
 */
export const adopted: DesignSystemInput<typeof roles> = {
    ...designSystem,
    recipes: [...recipes, ...extRecipes],
};

export default designSystem;
