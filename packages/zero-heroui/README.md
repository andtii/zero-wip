# @sigx/zero-heroui

A HeroUI-flavoured design system for [SignalX Zero](https://npmjs.com/package/@sigx/zero),
and **the acceptance test for non-orthogonal axis surfaces and presence-only
modifiers** (RFC 0003 §8).

Private, like `@sigx/zero-material`: it proves the contract rather than shipping
a licensed token set. Values are approximated from public documentation.

## Why it exists

The other four design systems in this repo are all the same shape — a colour
axis crossed with a fill treatment, on an `xs`–`xl` ramp — and all four
independently declare the *same* four variants (`solid`, `outline`, `soft`,
`ghost`). Nothing in the contract requires that. It is convention, and a
convention nothing contradicts is indistinguishable from a constraint.

HeroUI v3 contradicts it on every axis at once:

| | the other four | this package |
|---|---|---|
| colour | 8–13 roles, passed as `color` | **no colour axis at all** — `roles: {}` |
| variant | `solid \| outline \| soft \| ghost` | `primary \| secondary \| tertiary \| outline \| ghost \| danger \| danger-soft` |
| size | the recommended five (none declares its own) | **three, declared** — `sm \| md \| lg` |
| booleans | none expressible before RFC 0003 §3 | `icon-only`, `pending` as `data-mod-*` |

In v3 there is no `color` prop: colour is *fused into* `variant`, so `danger` is
a variant and `danger-soft` is one member carrying a colour and a treatment
together. That cannot be expressed as colour × fill, which is exactly the point.

## What it proves

- **`roles: {}` works end to end.** No `--color-<role>` is emitted, every
  component types `color: never`, and the generated register module says *why*
  — "heroui declares no color axis at all", not "no recipe wires it", which
  would send an author looking for a bug that isn't there.
- **The theme swatch degrades rather than breaking**, falling back to the base
  pair so a theme picker still has something to show.
- **A declared `sizes` closes the set** — the first package here to declare one,
  so `size.xl` in a recipe is an error rather than a silently minted step.
- **Modifiers render presence-only** (`[data-mod-icon-only]`, no value), and one
  participates in a `compoundVariants` match — the first use of either by any
  design system.

Every claim above is asserted in `packages/zero-kit/__tests__/heroui-acceptance.test.ts`.

## Coverage

Deliberately partial: **button, tabs, switch, checkbox, select, dialog, field,
toast**. The package exists to exercise the *axis surface*, and button carries
all of it. The validator warns about the components with no recipe, which is
the honest signal — this is not yet a design system you would ship a product
on, and it is not wired into the playground for that reason.

## Usage

```bash
pnpm --filter @sigx/zero-heroui build
```

```ts
import '@sigx/zero-heroui/css';
import '@sigx/zero-heroui/register';   // opt-in types
import { installThemes } from '@sigx/zero-heroui';

installThemes();
```

With `/register` imported, `<Button.Root variant="danger-soft" mods={{ 'icon-only': true }}>`
type-checks, `variant="solid"` does not, and `color` is rejected outright.
