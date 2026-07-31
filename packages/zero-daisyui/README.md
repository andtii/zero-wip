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

The palette is daisyUI **5.7.8**'s, role for role, in all five themes — checked
against its shipped `themes.css` rather than transcribed. `light` and `dark` had
drifted a major version behind (#231): among others, light's `primary` was
`oklch(49.12% 0.3096 275.75)` where 5.7.8 declares `oklch(45% 0.24 277.023)`,
and dark's `primary-content` was a *dark* ink where 5.7.8 pairs a light one.
`dim`, `nord` and `sunset` were already exact.

The checkbox's print fallback names `--print-ink` where real daisy names no ink
at all — its glyph inherits `--color-primary-content` and prints at 1.37:1, a
pale lavender on white paper (#233). Fidelity to a mark nobody can see is not
fidelity; the same trade as the ratios below.

Five of daisy's own ratios are deliberately moved, and only these five: the
unchecked toggle knob and the unfilled rating symbol are base-content at **60%**
rather than daisy's 50% and 20%, the rating's default `warning` fill is deepened
**60/40** toward its content pair, the progress bar's fill **90/10** (its
`complete` green **55/45**), and the role **ink** — the colour a transparent or
tinted surface draws a label, a border, a focus ring or an error message with —
is the role mixed toward `--color-base-content`, per role, rather than the raw
role token daisy draws with. Each was measured under 3:1 against the surface it
has to be seen on in at least one shipped theme — an unfilled rating symbol at
daisy's 20% reads 1.44:1 on `nord`, a raw-role `neutral` ghost button 1.22:1 in
every dark theme, and 5.7.8's own lighter `error` 2.87:1 as message text on
white — and 3:1 is the floor a mark owes the reader. The ratios and their
per-theme measurements are recorded at each declaration in `src/recipes.ts`;
every other value in this package is daisy's.

`select`, `combobox` and `number-input` share one field metric — the same
`--size-field` height ramp, inset and `--shadow-xs` lift — so two controls in a
column are the same height. Only the select had it before.

Swap with `@sigx/zero-basic` (or your own generated design system) — same
components, different look, zero component-code changes.

MIT © Andreas Ekdahl
