import type { DesignSystemInput } from '@sigx/zero-kit';
import { tokens } from './tokens.js';
import { recipes } from './recipes.js';

export const designSystem: DesignSystemInput = {
    name: 'basic',
    tokens,
    recipes,
};

export default designSystem;
