# @sigx/zero-ext-example

The acceptance test for the **ecosystem-component contract**: a component zero
doesn't ship (`ExtStepper`, scope `ext-stepper`), built **entirely from
`@sigx/zero`'s public surface** — `defineAnatomy`, the behaviors
(controllable state, list registration, roving tabindex, press feedback,
focus-visible), the contract helpers (`variantAttrs`, `renderAsChild`,
`synthesizesClickFrom`) — and held to the contract by the published
`@sigx/zero/testing` assertion. Private on purpose: it proves the loop the
way zero-heroui proves axis shapes, rather than shipping a product.

What it publishes to design systems, from the data-only `./fragment` entry:

- **`fragment`** — the manifest fragment
  (`{ package: '@sigx/zero-ext-example', components: [anatomy.toJSON()] }`).
  A design system opts into covering the component by merging it:
  `mergeManifests(zeroManifest, fragment)` in its build script, or
  `--extra-manifest` on the CLI.
- **`recipes`** — the recipe pack: default styling written against the
  *recommended* token grammar (`var(--color-primary)`,
  `var(--radius-selector)`), so any design system keeping the recommended
  vocabulary adopts it by spreading into its `recipes`.

`@sigx/zero-basic` consumes both — which makes it the end-to-end proof that a
merged scope compiles, that the generated `register.d.ts` takes the
`Exclude<…>` form and still typechecks (`type-tests/ecosystem/`), and that a
design system that never merges the fragment simply leaves the component
unstyled-but-accessible.

MIT © Andreas Ekdahl
