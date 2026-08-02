# Style-brief pack

Five complete, compiling starting points for a Zero design system. Each file is
one `TokensInput` — every category filled, both colour schemes, contrast clean —
plus one worked `RecipeInput` for Button, the component a design system is
judged on and the only one where all three variant axes matter at once.

**Copy the closest file to `src/tokens.ts` and `src/recipes.ts`, then diverge.**

| File | The look | Teaches |
|---|---|---|
| [`brutalist.ts`](brutalist.ts) | square, thick-ruled, hard-shadowed, shouted in mono | how far the standard categories stretch before you need a custom token |
| [`glass.ts`](glass.ts) | frosted translucent surfaces over a soft field | declared `custom` tokens, and translucency that survives both schemes |
| [`corporate.ts`](corporate.ts) | blue primary, grey ramp, modest and layered | contrast discipline and declared breakpoints |
| [`terminal.ts`](terminal.ts) | phosphor console, monospace, one signal colour | `0ms` durations instead of `transition: none`, and a glow built from theme colours |
| [`riso.ts`](riso.ts) | duotone risograph print, two spot inks on warm paper | `roles: {}` / `sizes: []` to decline an axis, a fused `variant` vocabulary, modifiers, and a compound that matches one |

They are deliberately not five palettes. Read all five and you have seen most
of what the token contract can express — the type ratios alone (1.414, 1.25,
1.2, 1.125, 1.333) are most of the difference between the five looks.

**The first four all take the default axis surface** — the recommended eight
roles, the `xs…xl` ramp, and `solid | outline | soft | ghost`. That set is a
convention, not the contract, and reading only those four is how a generated
design system ends up inheriting it by accident. `riso.ts` is the counterweight:
it declines the colour and size axes outright and fuses colour into `variant`,
the shape `@sigx/zero-heroui` and `@sigx/zero-carbon` declare.

## These files run

`packages/zero-kit/__tests__/briefs.test.ts` validates and compiles every brief
on each test run, asserts each one's signature move survives into the CSS, and
compares the skill's cheat-sheet table against the values in these files cell by
cell. A brief that goes stale is a failing test rather than a trap for whoever
copies it next — which is the failure mode this pack exists to prevent.

## What writing them found

Two defects, both silent, both now guarded:

- **`data-color` was invisible on the glass Button.** The frosted default fill
  never read `--btn-accent`, so the whole colour axis did nothing. Caught by
  rendering it, not by reading the CSS.
- **A design-system-level token that reads a colour was frozen at `:root`.**
  CSS substitutes `var()` where a property is declared, so
  `0 0 16px var(--color-primary)` in `system.shadow` captured the `:root`
  colour and every `[data-theme]` block inherited it — the terminal glow stayed
  green on the amber theme. Fixed in the compiler (#60): a colour-referencing
  token is now restated inside each theme block, so `terminal.ts` states its
  glow once and it resolves per theme.
