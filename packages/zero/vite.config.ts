import { defineLibConfig } from '@sigx/vite/lib';

// Unstyled component foundation with subpath exports for tree-shaking.
// One entry per component so a consumer importing `@sigx/zero/tabs` pulls
// nothing else.
export default defineLibConfig({
    entry: {
        'index': 'src/index.ts',
        'anatomy': 'src/anatomy.ts',
        'contract/index': 'src/contract/index.ts',
        'behaviors/index': 'src/behaviors/index.ts',
        'theme/index': 'src/theme/index.ts',
        'components/tabs/index': 'src/components/tabs/index.ts',
        'components/collapsible/index': 'src/components/collapsible/index.ts',
        'components/switch/index': 'src/components/switch/index.ts',
        'components/dialog/index': 'src/components/dialog/index.ts'
    },
    external: ['sigx', 'sigx/jsx-runtime', 'sigx/jsx-dev-runtime'],
    jsx: true
});
