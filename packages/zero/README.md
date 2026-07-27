# @sigx/zero

Unstyled, accessible component primitives for [SignalX](https://sigx.dev).
Components render a stable, machine-readable anatomy — `data-scope`,
`data-part`, `data-state` — and no styling; a design system is a separate CSS
artifact compiled by [`@sigx/zero-kit`](https://npmjs.com/package/@sigx/zero-kit)
(start with `@sigx/zero-basic` or `@sigx/zero-daisyui`).

```bash
npm install @sigx/zero sigx
```

```tsx
import { Dialog } from '@sigx/zero/dialog';
import '@sigx/zero/css';               // layer order + token fallbacks
import '@sigx/zero-basic/css';         // ← the design system (swappable)

<Dialog.Root model={() => state.open}>
    <Dialog.Trigger>Open</Dialog.Trigger>
    <Dialog.Popup>
        <Dialog.Title>Native top layer</Dialog.Title>
        <Dialog.Close>Close</Dialog.Close>
    </Dialog.Popup>
</Dialog.Root>
```

## Components

Button · Tabs · Collapsible · Accordion · Dialog · Popover · Tooltip · Menu ·
Select · Switch · Checkbox · RadioGroup · Slider · Progress · Field · Avatar ·
Toast · Combobox · Toggle · ToggleGroup · NumberInput · RatingGroup

All state is one two-way `model` prop (sigx `Define.Model`) — bind a signal
property with `model={() => state.open}`, or leave it uncontrolled with
`defaultOpen` / `defaultValue`. No controlled/uncontrolled prop triplets.
Native-platform first: `<dialog>` +
top layer (no Portal), the `popover` attribute, `<details>`, real form
inputs. SSR-safe ids via `app.use(zeroPlugin())` per request.

Interaction state is published as data for the design system to style:
`data-focus-visible`, and press feedback on every interactive part —
`data-pressed` while the pointer/key is down (a press ends when the gesture
ends: captured pointers, like a slider drag, hold it until release),
`data-press-animating` until the press animation finishes, with the press
point as `--press-x` / `--press-y` / `--press-r`. Checkable controls
(Switch, Checkbox, RadioGroup) take the press from anywhere in their label
row and surface it on the visible control. That is what makes a
pointer-anchored effect like Material's ink ripple — or its selection-control
halo and slider-thumb halo — expressible as pure CSS.

## For tooling / AI

- `@sigx/zero/anatomy` — every component's parts × states × flags as typed
  objects with a `selector()` builder.
- `@sigx/zero/manifest.json` — the same registry as JSON, states as
  ready-made CSS selectors.
- `llms.txt` — the compact spec for language models.

MIT © Andreas Ekdahl
