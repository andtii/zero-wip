import type { DesignSystemInput } from '@sigx/zero-kit';
import { roles, tokens } from './tokens.js';
import { recipes } from './recipes.js';

// The ecosystem adoption (#304) deliberately does NOT live here: this module
// is part of the published package's graph, and `@sigx/zero-ext-example` is
// private — an import of it from anywhere reachable from the root entry
// would make the published package uninstallable. The adoption is pure
// build-time composition in `build.mjs` (spread the pack, merge the
// fragment), which the `files` list never ships.
export const designSystem: DesignSystemInput<typeof roles> = {
    name: 'basic',
    tokens,
    recipes,
};

export default designSystem;
