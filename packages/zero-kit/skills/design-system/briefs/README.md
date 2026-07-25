# Style-brief pack

Four complete, compiling starting points for a Zero design system. Each file is
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

They are deliberately not four palettes. Read all four and you have seen most
of what the token contract can express — the four type ratios alone (1.414,
1.25, 1.2, 1.125) are most of the difference between the four looks.

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
