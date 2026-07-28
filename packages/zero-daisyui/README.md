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

Swap with `@sigx/zero-basic` (or your own generated design system) — same
components, different look, zero component-code changes.

MIT © Andreas Ekdahl
