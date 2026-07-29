# @sigx/zero-carbon

Carbon-flavoured design system for SignalX Zero — and the **runtime
acceptance test for the api `values` remap** (issue #183).

Where `zero-heroui` proved a vocabulary can be a different *shape* (no colour
axis, a fused `variant`), this package proves a vocabulary can carry a
*spelling* zero's attribute grammar cannot: Carbon's `danger--tertiary` and
`danger--ghost`. The design system declares the kebab members
(`danger-tertiary`, `danger-ghost`); the api declaration is the only place
the double-hyphen spelling lives, and the generated `./components` module
restores it at the prop boundary:

```tsx
import { Button } from '@sigx/zero-carbon/components';

<Button kind="danger--tertiary" hasIconOnly>×</Button>
// renders <button data-scope="button" data-variant="danger-tertiary" data-mod-icon-only="">
```

The rendered attribute keeps the zero spelling the recipes matched — the
vendor spelling never reaches the DOM.

## What it declares

- `roles: {}` — Carbon Button has no colour axis; `kind` fuses colour and
  treatment (`danger` is a kind). The palette lives in `custom` tokens.
- The seven-member `kind` vocabulary, surfaced as `kind` via
  `variant: { as: 'kind', values: { … } }` — grade `reshaped`.
- `hasIconOnly` / `isExpressive` — Carbon's boolean props over the
  `icon-only`/`expressive` presence modifiers.
- Carbon's five-step size ramp (`sm`–`2xl`, the 32–80 px field heights) and
  its `white`/`g100` themes.

## Coverage

Deliberately partial — Button only. This package exercises the api surface
that motivated issue #179 (Carbon's row in the conformance matrix), not a
product. Values are approximated from public documentation; it proves the
contract rather than shipping a licensed token set, which is why it is
private.

## Usage

```bash
pnpm --filter @sigx/zero-carbon build
```

```ts
import '@sigx/zero-carbon/css';
import { installThemes } from '@sigx/zero-carbon';
import { Button } from '@sigx/zero-carbon/components';

installThemes();
```

No `/register` import is needed for the `./components` path — its types are
self-contained: `kind` narrows to the seven Carbon spellings (including the
double-hyphen members), `kind="nope"` is rejected, and `variant`/`mods`/
`color` do not exist on the vendor surface.
