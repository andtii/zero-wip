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
        defaultLight: 'acme', defaultDark: 'acme-dark',
        themes: { acme: { colorScheme: 'light', colors: { primary: 'oklch(60% 0.2 260)', /* … */ } }, /* … */ },
    }),
    recipes: [
        defineRecipe({
            component: 'tabs',
            parts: { tab: { base: { padding: '0.5rem 1rem' }, states: { active: { color: 'var(--color-primary)' } } } },
        }),
    ],
});
```

```bash
zero-kit validate   # token completeness, WCAG contrast, state coverage
zero-kit build      # dist/css/index.css + per-component files + manifest
```

Unknown parts/states fail the build — the anatomy manifest is the contract.
The `skills/design-system` folder ships an agent skill that generates a
complete design system from a style brief and iterates against `validate`.

MIT © Andreas Ekdahl
