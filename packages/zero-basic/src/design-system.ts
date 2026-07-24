import type { DesignSystemInput } from '@sigx/zero-kit';
import { roles, tokens } from './tokens.js';
import { recipes } from './recipes.js';

export const designSystem: DesignSystemInput<typeof roles> = {
    name: 'basic',
    tokens,
    recipes,
};

export default designSystem;
