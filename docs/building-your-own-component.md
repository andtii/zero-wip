# Building your own component on zero

Zero's component set is closed; its **authoring surface is not**. An
ecosystem component package is a *peer* of `@sigx/zero` — it ships a
component zero doesn't, built from the same public machinery zero's own
components are built from, and held to the same contract. This guide is the
map; the worked example is
[`packages/zero-ext-example`](../packages/zero-ext-example) (an `ExtStepper`),
adopted end to end by
[`packages/zero-basic`](../packages/zero-basic)'s `build.mjs`.

## The shape of an ecosystem package

Four exports, two entries:

| What | From | Why |
|---|---|---|
| the anatomy | main entry | `defineAnatomy('<vendor>-<name>', parts)` — the source of truth |
| the component | main entry | built from `@sigx/zero`'s behaviors + contract helpers — exported under the scope's Pascal spelling (`acme-stepper` → `AcmeStepper`): an api-declaring design system's generated `./components` module imports exactly that name |
| the **manifest fragment** | a data-only entry | how a design system learns the scope exists |
| a **recipe pack** (optional) | the same data entry | default styling any recommended-vocabulary DS can adopt |

Keep the fragment/recipes entry free of component imports — a design
system's Node build script imports it, and must not drag in a UI runtime.

## 1. Declare the anatomy

```ts
import { defineAnatomy } from '@sigx/zero/anatomy';

export const stepperAnatomy = defineAnatomy('acme-stepper', {
    'root': { element: 'div' },
    'item': {
        element: 'button',
        states: ['active', 'complete', 'inactive'],   // closed set
        flags: ['disabled', 'focus-visible'],          // from FLAG_VOCABULARY only
        tokens: ['color', 'radius-selector', 'text'],
        asChild: true,
    },
});
```

Rules that make it a *zero* anatomy:

- **Vendor-prefix the scope** (`acme-stepper`). The merge hard-errors on
  collisions; the prefix is what keeps you out of everyone's way.
- `data-state` values form a closed set; boolean flags come from zero's
  shared `FLAG_VOCABULARY` (never invent synonyms) and render presence-only.
- A part the runtime hides with `hidden` in some state declares `hiddenIn`.
- `anatomy.toJSON()` emits exactly the manifest component shape — you never
  hand-write manifest JSON.

## 2. Build the component from the public surface

Everything zero's own components use is exported: `createControllableState`
(the `Define.Model` convention), `createId`/`zeroPlugin` (SSR-safe ids),
`createListController` + `createRovingKeydown` (registration and arrow-key
focus), `createDismissable`, focus utilities, `createPressFeedback`,
`createTypeahead`, `createAnchorPosition`, and the contract helpers
`dataAttr` / `stateAttr` / `variantAttrs` / `renderAsChild`.

Conventions worth copying from any component in `packages/zero/src/components`:

- **Anatomy first**: import part names from your `anatomy.ts`; render
  `data-scope` / `data-part` / `data-state` exactly as declared.
- **Inert context fallback**: `defineInjectable` with a do-nothing default so
  a bare part still renders outside its root.
- **Registration isn't reactive**: at first render an item may only depend on
  items registered *before* it (DOM order) plus the model — derive state
  accordingly (see the `phase()` comment in the example's `Stepper.tsx`).
- **`asChild` + keyboard**: synthesize activation only for keys the platform
  won't — `synthesizesClickFrom(target, key)` is the exact test; skipping it
  double-activates anchors on Enter.
- Variant pass-through is `{...variantAttrs(props)}` on the carrier part;
  zero attaches no styling to any of it.

## 3. Hold it to the contract

`@sigx/zero/testing` ships the assertion zero's own suite runs:

```ts
import { expectAnatomy } from '@sigx/zero/testing';
expectAnatomy(container, stepperAnatomy);            // throws plain Error
expectAnatomy(el, anatomy, { axes: ['emphasis'] }); // custom axes, declared
```

It checks: declared parts only, states from the closed set, flags declared
and presence-only, `hidden` exactly where `hiddenIn` says. Runner-agnostic.

## 4. Publish the fragment (and the pack)

```ts
export const fragment = {
    package: '@acme/zero-stepper',        // your npm specifier — required
    components: [stepperAnatomy.toJSON()],
};

export const recipes: RecipeInput[] = [{ component: 'acme-stepper', /* … */ }];
```

The recipe pack targets the **recommended token grammar** — role names from
`RECOMMENDED_ROLE_LIST` (`var(--color-primary)` …), the recommended sizes —
so it styles itself under any design system that keeps the recommended
vocabulary without naming one. Generate a `color` axis over the *whole*
recommended role list rather than a subset (a partial axis diverges from
every sibling component, and the kit's validator says so). Style every
declared state distinctly — the state-legibility tooling measures ink.
JSON form of the fragment validates against the kit's
`schemas/fragment.schema.json`.

## 5. A design system opts in

```js
// build.mjs — build-time composition, the whole adoption
import { mergeManifests } from '@sigx/zero-kit';
import { fragment, recipes as stepperRecipes } from '@acme/zero-stepper/fragment';

const manifest = mergeManifests(zeroManifest, fragment);
const ds = { ...designSystem, recipes: [...designSystem.recipes, ...stepperRecipes] };
```

or on the CLI, with the fragment as JSON:

```sh
sigx zero:validate --extra-manifest ./node_modules/@acme/zero-stepper/dist/fragment.json
sigx zero:build    --extra-manifest ./node_modules/@acme/zero-stepper/dist/fragment.json
```

Merging is a statement of intent: a merged scope with no recipe draws the
ordinary `N component(s) have no recipe` warning — that is validate telling
you the adoption is half done (merge the fragment *and* spread the pack, or
write a recipe), not a false positive to suppress.

Everything downstream is automatic: validation, recipe compilation and the
coverage report treat the merged scope like any other; provenance is stamped
per component; the generated `register.d.ts` excludes merged scopes **by
name** from its ZeroScope compile gate (`ZeroScope` itself stays closed — see
`packages/zero/type-tests/ecosystem/` for the compile-time proof); and under
api mode the `./components` module imports the scope from your package.

If the ecosystem package is private or the design system is published,
keep the adoption in build tooling the package never ships — an import
reachable from the published entry would make the package uninstallable.

## 6. The fallback is the contract

A design system that never merges your fragment leaves your component
**unstyled but accessible** — correctly attributed anatomy, working
behavior, `[data-scope][data-part][hidden]` still honored by zero's base
CSS. That is the baseline of the whole thesis, not an error state. Ship
sensible unstyled rendering, and let recipe packs or per-DS recipes carry
the ink.
