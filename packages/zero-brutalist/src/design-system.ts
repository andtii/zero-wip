import type { DesignSystemInput } from '@sigx/zero-kit';
import { roles, system, tokens } from './tokens.js';
import { recipes } from './recipes.js';

export const designSystem: DesignSystemInput<typeof roles, typeof system> = {
    name: 'brutalist',
    tokens,
    recipes,
};

export default designSystem;
