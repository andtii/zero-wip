# @sigx/zero-material

A Material-flavoured skin for [SignalX Zero](https://npmjs.com/package/@sigx/zero) —
and the acceptance test for the whole token contract.

**Not published.** It exists to answer one question: does a design language
zero was *not* designed around fit the contract as data, with no
special-casing anywhere in the kit? Its palette is a Material approximation,
not a licensed token set.

## What it proves

Material differs from zero's recommended vocabulary in four ways at once, and
all four are expressed as declarations rather than escape hatches:

| Material | How it lands |
|---|---|
| 13 colour roles, including `tertiary` and a tonal `surface` family | `roles` — the vocabulary is the design system's, not zero's |
| `on-primary`, `on-surface` foregrounds | the `-content` suffix convention, unchanged |
| Surface containers are explicit tones, not derived tints | `soft: false` suppresses the `color-mix()` |
| `outline` is a hairline with no foreground | `content: false` — no unused token, no bogus contrast pair |
| Elevation named `level1`–`level5` | open keys inside the closed `shadow` category |
| `emphasized-decelerate` / `emphasized-accelerate` easings | open keys inside `motion` |
| Window-size classes at 600 / 840 / 1240px | `breakpoints`, driving a full-screen dialog below `sm` |
| The ink ripple, expanding from the press point | pure recipe CSS over the runtime's press feedback (`data-pressed`, `data-press-animating`, `--press-x/y/r`) — no JavaScript in this package |

It validates with **no errors and no warnings**, styles all fifteen
components, and required no change to `@sigx/zero-kit`.

```ts
import '@sigx/zero-material/css';
import { installThemes } from '@sigx/zero-material';
installThemes();
```

Two lines — the same two that select any other design system.

MIT © Andreas Ekdahl
