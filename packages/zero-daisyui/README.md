# @sigx/zero-daisyui

[daisyUI](https://daisyui.com)-flavored design system for
[SignalX Zero](https://npmjs.com/package/@sigx/zero): daisy's token values and
component look expressed as pure tokens + recipes over the zero anatomy. No
Tailwind, no daisyUI plugin — the whole skin is compiled CSS.

```ts
import '@sigx/zero/css';
import '@sigx/zero-daisyui/css';
import { installThemes } from '@sigx/zero-daisyui';
installThemes();   // registers the `light`/`dark` pair plus `dim`, `nord` and `sunset`
```

Beside the contract tokens it declares daisy's own two non-contract knobs as
custom properties, because daisy's controls read them directly: `--depth`
(`1` = the inset-shadow relief of `light`/`dark`, `0` = the flat look of `dim`,
`nord` and `sunset`) with the two paints it scales, `--depth-shade` and
`--depth-sheen`; and `--noise` with daisy's fractal tile in `--fx-noise`.
Override `--depth: 0` on a subtree to flatten it.

The checkbox tick, the radio dot and the rating fill are **drawn**, not typeset:
each is geometry that interpolates between states, so it rides the size ramp and
animates. Under `forced-colors` and `print` the checkbox swaps to a `✔`/`−`
glyph; the rating keeps its geometry, since no glyph can say "half".

Swap with `@sigx/zero-basic` (or your own generated design system) — same
components, different look, zero component-code changes.

MIT © Andreas Ekdahl
