# @sigx/zero-basic

Neutral starter design system for [SignalX Zero](https://npmjs.com/package/@sigx/zero) —
readable defaults so a zero app looks sane on day one, and the reference
implementation for generating your own design system with `@sigx/zero-kit`.

Its visual identity is **Monograph**: documentation-grade calm, engineered for
UIs people read all day.

- **Paper surfaces** — cool slate-tinted bases (hue 260), no pure white and no
  pure black anywhere; input wells are always windows of `base-100` cut into
  whatever surface they sit on.
- **Hairline structure** — depth is drawn with 1px `base-300` rules, not
  shadows. A card is a bordered region; the single honest `lg` shadow is
  reserved for transient overlays (in dark they sit on `base-200` and catch a
  moonlit inset edge instead).
- **Printed-ink petrol** — one protagonist hue, a petrol blue-black at hue 205
  (iron-gall document ink), carries every interactive signal; focus-visible is
  always the same 2px petrol ring, every role, every variant. Selected items
  wear a 2px margin marker over a soft wash rather than a solid fill.
- **Borders, not shadows; ink, not motion** — nothing moves on hover, pressed
  feedback is instantaneous ink density, overlays enter with a 4px rise and
  fade out with no travel. Meta-text is mono; numbers are tabular everywhere.
- **Marks are drawn ink, not typeset glyphs** — the checkbox tick and the
  rating star are geometry that interpolates, so a mark's weight is Monograph's
  and not the reader's font's, and it draws itself out of the corner rather than
  scaling up (nothing scales here). Under `forced-colors` and on paper the
  checkbox falls back to a `✔`/`−` glyph; the rating keeps its geometry, because
  no glyph can say "half". A `RatingGroup.Item` rendering its **own** symbol
  through the slot opts out of the drawn geometry and gets the colour treatment
  only — the slot hands you the state, so drawing your own half is yours to do.

```ts
import '@sigx/zero/css';
import '@sigx/zero-basic/css';
import { installThemes } from '@sigx/zero-basic';
installThemes();   // registers the `basic` / `basic-dark` themes
```

Granular imports: `@sigx/zero-basic/css/tokens`, `@sigx/zero-basic/css/tabs`, ….

MIT © Andreas Ekdahl
