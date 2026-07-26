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
        // The size axis is yours too — omit for the recommended xs–xl ramp.
        sizes: ['compact', 'comfortable', 'spacious'],
        // Non-color tokens: declared ONCE for the design system, not per
        // theme. Categories are closed; the keys inside them are yours.
        system: {
            radius: { selector: '0.375rem', field: '0.375rem', box: '0.75rem' },
            border: '1px',
        },
        // Values that must differ by color scheme (light-dark() is a <color>
        // function, so non-color tokens need this).
        systemDark: { border: '2px' },
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
with `sizes`, `system`, `custom` and `breakpoints`, in the DS's
`dist/manifest.json` (which also lists every custom property the design system
emits).

Both variant axes zero interprets work this way. `roles` names what `color`
accepts, `sizes` names what `size` accepts; both have a recommended default
and neither is a closed set. (`variant` has no declaration because zero never
interprets it at all.) `sizes` is the `data-size` axis — not `system.size`,
which is the `--size-*` control-sizing unit.

Both halves of the token contract work the same way: a **closed set of
categories**, each fixing a `--prefix-` and a value grammar, with **open keys
inside** that the design system declares. `zero-kit` curates the categories
because they carry semantics tooling needs; the vocabulary within is yours.
Omitting a category is fine — `@sigx/zero/css` ships fallbacks for the
recommended keys, so absence is never a validation error.

```bash
zero-kit validate   # tokens, WCAG contrast, recipe structure + content
zero-kit build      # dist/css/index.css + per-component files + manifest
```

Conditional styles live in `parts.<part>.at`, keyed by a declared breakpoint
(`@media (min-width: …)`), a built-in preference query (`reduced-motion`,
`hover-none`, `prefers-dark`, `forced-colors`) or a raw `@` prelude
(`@container`, `@supports`, `@starting-style`). Nesting composes the
at-rules, and because `variants` hold the same shape, responsive variants
need nothing extra. Author mobile-first — breakpoints are `min-width`, and
declaration order is emission order.

Unknown parts/states fail the build — the anatomy manifest is the contract.
So do undeclared token references: a recipe that says `var(--color-brnad)`
is an error naming the nearest declared token, not a stylesheet that silently
renders nothing. The vocabulary is derived from your own declaration, so it
grows with the design system rather than being a list to maintain.
The `skills/design-system` folder ships an agent skill that generates a
complete design system from a style brief and iterates against `validate`.

MIT © Andreas Ekdahl
