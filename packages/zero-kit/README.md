# @sigx/zero-kit

Design-system authoring for [SignalX Zero](https://npmjs.com/package/@sigx/zero):
typed tokens and per-part recipes compiled to plain, layered CSS against the
zero anatomy manifest. Node-only — a built design system ships CSS plus a tiny
runtime module.

```bash
npm install -D @sigx/zero-kit
```

```ts
import { defineTokens, defineRecipe, defineDesignSystem } from '@sigx/zero-kit';

export const designSystem = defineDesignSystem({
    name: 'acme',
    tokens: defineTokens({
        // The color vocabulary is YOURS: declare any roles (omit for the
        // recommended eight). Each emits --color-<role> (+ -content/-soft).
        roles: { primary: {}, surface: { content: false, soft: false } },
        // DS-specific tokens, declared → validated + in the manifest.
        custom: { 'glass-blur': { description: 'backdrop blur', syntax: '<length>' } },
        defaultLight: 'acme', defaultDark: 'acme-dark',
        themes: {
            acme: {
                colorScheme: 'light',
                colors: { primary: 'oklch(60% 0.2 260)', 'primary-content': 'oklch(98% 0.01 260)', surface: 'oklch(97% 0 0)', /* + base-100/200/300/base-content */ },
                custom: { 'glass-blur': '12px' },
            }, /* … */
        },
    }),
    recipes: [
        defineRecipe({
            component: 'tabs',
            parts: { tab: { base: { padding: '0.5rem 1rem' }, states: { active: { color: 'var(--color-primary)' } } } },
        }),
    ],
});
```

Only the base surfaces (`base-100/200/300/base-content`) are fixed — they
anchor `-soft` derivation, `light-dark()` emission and theme swatches.
Declared roles are `@property`-registered in the compiled CSS and surfaced,
with `custom` and `breakpoints`, in the DS's `dist/manifest.json`.

```bash
zero-kit validate   # declared-role completeness, WCAG contrast, state coverage
zero-kit build      # dist/css/index.css + per-component files + manifest
```

Unknown parts/states fail the build — the anatomy manifest is the contract.
The `skills/design-system` folder ships an agent skill that generates a
complete design system from a style brief and iterates against `validate`.

MIT © Andreas Ekdahl
