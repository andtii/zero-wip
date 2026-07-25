# @sigx/zero-brutalist

A brutalist skin for [SignalX Zero](https://npmjs.com/package/@sigx/zero) —
**generated from a one-line style brief through the `design-system` agent
skill**, not written by hand against the API.

**Not published.** It exists to prove the thesis end to end, and to act as the
regression test for the skill itself.

## What it proves

The skill's cheat sheet describes brutalist as: radius 0, 2–3px solid borders,
a high-contrast palette with few hues, hard offset shadows, uppercase labels,
and a mono stack with 800+ weights and wide tracking. Every one of those is a
declaration:

| Brief | Declaration |
|---|---|
| nothing rounded | `radius: { selector: '0', field: '0', box: '0' }` |
| thick borders | `border: '3px'`, thinner under dark via `systemDark` |
| hard offset shadows | `shadow` drawn in `--color-base-content`, zero blur |
| mono, heavy, tracked out | `typography.fonts.mono` for both stacks, weights to 900, `tracking.wide` |
| violent type jump | `scale: { base: '1rem', ratio: 1.414 }`, `3xl` hand-tuned to a `clamp()` |
| doesn't ease | `easings: { standard: 'steps(2, end)' }` |

It validated and compiled **clean on the first run** — no errors, no warnings,
all fifteen components.

## What the run found

The skill listed `text` as a `system` category. It moved to
`system.typography.sizes`, and the compiler ignored the old spelling
*silently* — a generator following the skill would have produced a design
system with no type ramp and no clue why. The skill is corrected, and an
unknown key under `system` is now a validation error that names the right
path.

```ts
import '@sigx/zero-brutalist/css';
import { installThemes } from '@sigx/zero-brutalist';
installThemes();
```

MIT © Andreas Ekdahl
