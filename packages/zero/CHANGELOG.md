# Changelog

## [Unreleased]

### Added

- **`PartSpec.hiddenIn` — the anatomy declares the states the runtime hides a
  part in** (#227). Optional and additive: `hiddenIn: ['error']` on avatar's
  `image` says zero sets the `hidden` attribute there, so a rule for that
  state can never paint and styling it identically to a visible state is
  correct rather than lazy — the difference is presence, and the runtime owns
  it. Declared on the four parts zero hides: `avatar.image` (`error`),
  `avatar.fallback` (`loaded`), `tabs.panel` (`inactive`) and
  `tree-view.branch-content` (`closed`). Emitted into `manifest.json` (key
  omitted for every other part), so tooling reads the fact instead of
  hardcoding it — zero-kit's state-legibility guard carried exactly such a
  hardcoded avatar exemption until now. `expectAnatomy` checks the
  declaration against the DOM in both directions.

- **`@sigx/zero/adapt` — the generic runtime behind vendor-named component
  modules** (issue #179, RFC 0003 §2). `adapt(Base, spec)` returns a factory
  whose setup delegates to the base component's with a renaming view over its
  props: vendor props (`kind`, `hasIconOnly`) route onto zero's variant
  surface (`variant`, `mods`, custom axes) at read time, values respell at
  the prop boundary, and the rendered attributes keep zero's spelling — the
  anatomy contract does not move. One component instance: slots, events,
  models, refs and lifecycle pass through untouched, reactivity included. A
  vendor prop deliberately shadows same-named base props (Ant's `type`) and
  is consumed, never leaked to the DOM. Ships with the `Adapted` type the
  kit-generated `components.d.ts` instantiates, and `AdaptedStatics` for a
  compound's non-carrier statics. New subpath export, ~0.95 kB; nothing else
  in zero imports it.

- **The `mods` prop — presence-only design-system modifiers** (RFC 0003 §3,
  #166). An axis answers *which one* and always carries a value; a modifier
  answers *is it on* and carries none. `<Button.Root mods={{ block: true }}>`
  renders `data-mod-block=""`, and `false` or an omitted key render nothing —
  the same presence-only shape the anatomy contract's own flags use. Added to
  `WithVariantAxes`, so every component already accepting the axis props
  accepts `mods` too, and narrowed per component by a design system's
  `/register` module through the new `ModsFor<S>`.

  They render into a `data-mod-*` namespace rather than as bare `data-<name>`
  flags. Zero owns the unprefixed presence-only vocabulary and **extends it
  between versions**, so an unprefixed modifier named `busy` would silently
  start matching a `data-busy` flag a later zero adds. A valued axis cannot
  fail that way — a collision there never matches, and `variantAttrs` throws.
  New exports: `WithMods`, `ModsFor`, `MOD_ATTR_PREFIX`.

- **`ThemeSource.defaultLight` / `defaultDark`** (RFC 0002 phase 5, #132):
  the registry stores the source's declared scheme defaults (they flow
  structurally from the kit's `TokensInput`, so `installThemes()` calls need
  no change) and `pickThemeFor` prefers them over first-registered — the
  latent bug only a third theme exposes. `clearThemes` drops them with the
  themes. With one theme per scheme nothing changes.

- **Theme, property, breakpoint and token-key narrowing** (RFC 0002 phase 3,
  #131): `ZeroThemeName` (closed on the authoring surface — `setTheme`, the
  `ThemeProvider`/`ThemeScope` `theme` props, `ThemeControllerOptions.initial`)
  and `ZeroThemeNameOrCustom` (the lookup surface — `getTheme`, `pairOf`, and
  `theme()`'s return, which can carry persisted or tenant-registered names);
  `ZeroProperty` and `ZeroBreakpoint` (open with autocomplete);
  `ZeroTokenCategory` and `TokenKeyFor<C>`, whose unaugmented fallback is the
  category's *recommended* keys so autocomplete works before any design
  system opts in. Two one-line runtime helpers: `cssVar(name)` and
  `token(category, key)` → `var(--<prefix>-<key>)`. All resolve to today's
  open types until a `/register` module is imported.

- **The `ZeroVocabulary` augmentation seam** (RFC 0002 phase 2, #130):
  `@sigx/zero` exports an empty `ZeroVocabulary` interface plus the scoped
  resolvers `ColorValueFor<S>` / `SizeScaleFor<S>` / `VariantValueFor<S>` /
  `AxesFor<S>`. The four variant-axis prop fragments become generic on the
  component scope (defaulting to the open unions), a combined
  `WithVariantAxes<S>` composes them, and every component carrying the axes
  names its own scope — toast's `ToastOptions.color`/`ToastData.color`
  included. With no augmentation every helper resolves to exactly the union
  it replaced; a design system's generated `/register` module (phase 3) is
  what narrows them. Also new: `ZeroAnatomies`/`ZeroScope` (the anatomy
  registry keeps its literal keys), an exported `VARIANT_AXES`
  (parity-tested against the kit's copy; previously the private
  `NAMED_AXES`), and compile-time type tests under `pnpm test:types` in two
  isolated projects, since module augmentation leaks program-wide.

### Fixed

- **`RatingGroup.Item`'s default `half` symbol is now `★`, not `⯪`** (#222).
  `⯪` (U+2BEA STAR WITH LEFT HALF BLACK) has essentially no coverage in the
  macOS/Chromium sans stacks: it resolved to the last-resort tofu box, proven
  by canvas advance-width equality against a guaranteed-unmapped codepoint.
  The default is now `state === 'empty' ? '☆' : '★'`.

  `★` rather than something cleverer — an inline SVG, a wrapper, a `clip-path`
  on a child — because the default has to stay a bare **text node**: a
  consumer's symbol arrives as an element, and design systems tell the two
  apart with exactly that difference (`:not(:has(> *))` in `@sigx/zero-basic`,
  the inverse `:has(*)` in `@sigx/zero-heroui`). Wrapping the default would
  silently switch their drawn stars off. It also repairs the two skins that
  render a half by masking or clipping this very glyph —
  `@sigx/zero-daisyui`'s `mask-size: 50% 100%` and `@sigx/zero-material`'s
  hard-stop gradient under `background-clip: text` — both of which were
  halving a tofu box and now get the full-width star they were written for.

  The residual, stated plainly: with **no design system loaded at all**, a
  half now renders identically to a full star. `⯪` was distinguishable but
  wrong; `★` is correct under every real skin, and rendering a *distinct* half
  is the design system's job. The value is never lost to assistive tech — the
  hidden input carries it and each item carries its own aria-label.

### Changed

- `variantAttrs` accepts `axes` values of `string | undefined` and skips
  `undefined` entries before its guards — a narrowed `AxesFor<S>` bag has
  optional members, and an unset one must neither throw nor emit an
  attribute. The guards themselves are unchanged.

- **TreeView** (`@sigx/zero/tree-view`) — the APG tree pattern. Unnamed
  model = selected value; `model:expandedValues` (named-models convention)
  = the expansion set. ArrowRight expands then descends, ArrowLeft
  collapses then climbs (RTL-mirrored), Enter/Space select, typeahead over
  visible nodes, one tab stop. Collapsed content stays mounted and
  `hidden`. Single selection in v1.
- **`createTreeController` behavior** (`behaviors/tree.ts`) — hierarchical
  registration that IMPLEMENTS the flat `ListController` interface over the
  VISIBLE nodes (every ancestor expanded, DOM-ordered), so
  `createRovingKeydown` and `createTypeahead` work on a tree unchanged.
  `sortByDomOrder` is now exported from `behaviors/list.ts` (shared by
  both controllers).

- **RatingGroup** (`@sigx/zero/rating-group`) — radio semantics over a row
  of symbols with hover preview and optional half values. The `item` part
  carries the library's one three-value state set (`full|half|empty`),
  driven by the DISPLAYED value (preview included);
  `data-highlighted` marks the preview range. Keyboard moves the VALUE —
  with `allowHalf` two values share one element, so element roving can't
  express the step; one tab stop rides `ceil(value)`. Pointer x decides
  halves (RTL-aware); touch taps commit with the same math; `deselectable`
  re-click clears; `hidden-input` posts the fractional value; `readonly`
  renders fractional averages without interaction.

- **Context menu: `Menu.ContextTrigger`** — an additive `context-trigger`
  part on the `menu` anatomy (no separate component: same popup, items,
  submenus, typeahead and focus restore). Wrap any surface; right-click /
  Android long-press opens the popup at the pointer through a virtual
  anchor — deferred until the gesture completes, because an auto popover
  opened mid-gesture is racily light-dismissed by its own pointerup —
  and Shift+F10 / the ContextMenu key open it anchored to the surface's
  rect (APG). A second right-click outside the popup re-anchors it; the
  regular `Menu.Trigger` re-claims the anchor on open, so the last opener
  wins. iOS long-press (no native `contextmenu`) is deferred.

- **NumberInput** (`@sigx/zero/number-input`) — a WAI-ARIA spinbutton over a
  real `type="text" inputmode="decimal"` input. Model is `number | null`
  (empty is not 0); typing edits an uncommitted draft committed on
  blur/Enter (parse → clamp → step-snap anchored at `min`,
  decimal-precision-safe), stepping (arrows, PageUp/Down ×10, Home/End,
  hold-to-repeat triggers, opt-in focus-gated `allowWheel`) commits
  immediately. `hidden-input` posts the canonical decimal — the visible
  input never carries `name`, so a custom display `format` can't corrupt
  form data. `clampOnBlur` (default true) opt-out keeps out-of-range
  commits and flags `data-invalid`.
- **`createSpinPress` behavior** (`behaviors/spin.ts`) — press-and-hold
  auto-repeat for stepper triggers: one spin on press, repeat after
  `delay` (400ms) every `interval` (64ms), release-anywhere via a one-shot
  window listener, stops on drag-off and on going disabled mid-hold.

- **Toggle** (`@sigx/zero/toggle`) — a two-state button (`aria-pressed`,
  `on|off` on `data-state`). A mode you flip, not a form value; Switch keeps
  the form-participating case.
- **ToggleGroup** (`@sigx/zero/toggle-group`) — toggle buttons under one
  `string[]` model, single (`deselectable` opt-out) or `multiple` selection,
  orientation-aware arrow-key roving with a single tab stop, RTL-aware. The
  `item` part mirrors the standalone toggle's `on|off` contract and doubles
  the on state as a `data-selected` presence flag.
- **Virtual anchors in the positioning behavior** — `PositionAnchor =
  HTMLElement | VirtualAnchor` (anything with `getBoundingClientRect()`),
  a `pointAnchor(x, y, size?)` factory for anchoring at client coordinates,
  and `createAnchorPosition` now returns an `AnchorPositionHandle` whose
  `update()` re-runs the strategy while open — a moved anchor repositions
  without a close/reopen. `PositionStrategy.apply` and
  `AnchorPositionInput.getAnchor` widen to `PositionAnchor`; element
  anchors and existing custom strategies keep working unchanged. One
  type-level change: `createAnchorPosition` returns the handle instead of
  `void` — callers that ignored the return value are unaffected, but a
  wrapper typed as returning `void` will need its annotation updated.

## [0.1.0] - 2026-07-27

### Changed (breaking — pre-release, multi-target RFC docs/rfcs/0001, #98)

- **Slider: the styled part is `control`, not `input`** (`Slider.Control`
  replaces `Slider.Input`), and the anatomy grows the cross-platform superset
  parts `track`, `range`, `thumb` — the projection for platforms without a
  native range widget. The web renders only `control`; rules against the new
  parts are inert here, which is what lets one recipe carry both projections.
- **Dialog: the backdrop is now a first-class `backdrop` part.** It renders
  no element on the web — the anatomy declares it
  `pseudo: { of: 'popup', selector: '::backdrop' }` and recipes style
  `parts.backdrop` instead of hand-writing
  `selectors: { '&::backdrop': … }` (states narrow the popup:
  `[data-state="open"]::backdrop`). Dialog also gains a `footer` part and
  `Dialog.Footer` component — the shared action row.
- `defineAnatomy` supports **pseudo parts** (`PartSpec.pseudo`): parts that
  render no element of their own on the web and project onto a
  pseudo-element of another part. `selector()` and `toJSON()` compose the
  host + state fragments + pseudo-element (always last).

### Added

- **`--text-fixed-<key>` aliases in the token contract** (`TEXT_FIXED_PREFIX`
  in `@sigx/zero/contract`): for every emitted `--text-<key>` the compiler
  also emits `--text-fixed-<key>` — on the web pure indirection
  (`var(--text-<key>)`); on an emit target with a runtime font scale (lynx's
  `fontScale`) a materialized literal that scaling never touches. Recipes
  reference it for control chrome that must not grow with in-app text
  scaling. `css/base.css` ships fallback aliases for the recommended ramp.
  Part of the multi-target RFC (docs/rfcs/0001, #96).

### Changed (breaking — pre-release)

- **The `size` axis is now open, like the color axis.** `SizeScale` was a
  closed union (`'xs' | 'sm' | 'md' | 'lg' | 'xl'`) while `ColorValue` had the
  `(string & {})` escape hatch, so a design system specifying density
  (`compact`, `comfortable`) or a numbered ramp could not be consumed at all —
  `<Button.Root size="comfortable">` was a compile error. It is now
  `RecommendedSize | (string & {})`; `SIZE_SCALE_LIST` keeps its name and
  becomes the *recommended* ramp, with `RecommendedSize` as its element type.
- `manifest.json` `tokens.sizeScale` is now `tokens.recommendedSizes`, named
  like `tokens.colors.recommendedRoles` because it means the same thing: a
  default a design system may replace, not a closed set.
- **The color contract is now a naming grammar, not a fixed vocabulary**:
  design systems declare their own roles (via `@sigx/zero-kit`); zero knows
  only the `--color-<role>[-content|-soft]` convention and the fixed base
  surfaces (`base-100/200/300/base-content`).
- `resolveColorToken` resolves by convention: `--x` → `var(--x)`, bare
  kebab-case identifiers → `var(--color-<name>)` (CSS-wide keywords,
  `transparent`, `currentcolor` excluded), everything else passes through.
  Named CSS colors like `'red'` now resolve as token names — write literal
  colors as `#f00` / `rgb()`.
- The `color` prop (`WithColor`) accepts any DS-declared role;
  recommended roles keep autocomplete.
- `manifest.json` `tokens.colors` is now `{ convention, required,
  recommendedRoles }` instead of a flat token list.
- `css/base.css` no longer registers `@property` for the eight recommended
  roles — registrations are emitted per-declaration by the kit into each
  design system's compiled `tokens.css`.
- Removed the fixed-vocabulary exports `COLOR_VARIANT_LIST`,
  `CORE_COLOR_TOKEN_LIST`, `COLOR_TOKEN_LIST`, `ColorVariant`, `ColorToken`,
  `CoreColorToken`, `SoftColorToken` in favor of `RECOMMENDED_ROLE_LIST`,
  `BASE_SURFACE_TOKEN_LIST`, `RecommendedRole`, `BaseSurfaceToken`,
  `ColorValue`.

- **Token categories replace the flat structural token list.**
  `STRUCTURAL_TOKEN_LIST` / `StructuralToken` are removed in favor of
  `TOKEN_CATEGORIES`, `TokenCategory`, `TokenCategoryId`, `TOKEN_KEY_PATTERN`
  and `tokenProperty`. A flat closed array could not express the open,
  design-system-declared keys the contract is built on — the same reason the
  color vocabulary stopped being a fixed list.
- `manifest.json` `tokens.structural` (a flat array of property names) is now
  `tokens.categories`, publishing the grammar: prefix, recommended keys,
  value syntax and intent per category. `cat.recommended.map(k => cat.prefix
  + k)` reproduces the old array.

### Added

- **Combobox component** (`@sigx/zero/combobox`) — and with it the
  **named-models convention**: a component has exactly one unnamed `model`
  (its essential value, what `hidden-input` posts); every additional
  controllable state is a named model (`model:inputValue`, `model:open` in
  JSX, via sigx `Define.Model<'name', T>`), each keeping the standard
  `default<Name>` + `<name>Change` companions. Parts:
  Root/Control/Input/Trigger/Popup/Item/ItemIndicator/Empty/HiddenInput —
  Control is the field chrome around input + trigger, mirroring
  open/invalid/focus-visible so recipes draw the ring on the box; the input
  is a real `<input>` (no `data-placeholder`; use `:placeholder-shown`).
  APG editable combobox: focus stays in the input, highlight travels by
  `aria-activedescendant`, Home/End stay with the caret, Enter fills the
  input with the picked item's label. **Filtering belongs to the consumer**
  (items are JSX children); zero prunes a highlight whose item unmounts so
  the activedescendant never dangles. The popup is `popover="manual"` plus
  the dismiss layer — the first component consumer of
  `createDismissable` — because native light dismiss would close the list
  on a caret click in the input. All four design systems ship a combobox
  recipe.
- **Avatar component** (`@sigx/zero/avatar`): Root/Image/Fallback, every part
  mirroring the image load status as `data-state="loading|loaded|error"` (a
  missing `src` resolves to `error` on mount). Zero toggles `hidden` — the
  fallback while `loaded`, the image while `error` — and styles nothing, so
  recipes must gate any `display` they set on those parts behind
  `&:not([hidden])`. Cached images that complete before hydration are
  detected from the element itself; server markup always renders `loading`.
  `statusChange` event; `asChild` on Image keeps load detection through the
  spread bag. All four design systems ship an avatar recipe.
- **Toast component + manager/queue** (`@sigx/zero/toast`):
  Viewport/Root/Title/Description/Action/Close over an imperative queue —
  `toast({ title, color, duration, role })` from anywhere in the browser,
  `createToaster()` for apps and tests, `useToaster` injectable with a
  fresh-empty server fallback so SSR requests can never share toasts. The
  viewport is a `popover="manual"` top layer (`role=region`) with
  pause-on-hover/focus; each root is `role=status`/`alert`, carries
  `data-color` and `data-placement`, and publishes
  `--toast-index`/`--toast-count`. Mounted toasts cap at `max` (default 5)
  with a FIFO overflow queue. **Presence is runtime-managed** — the one
  deliberate exception to the declarative presence rule, because toasts must
  unmount: roots enter `closed`→`open` a frame apart and stay mounted after
  dismissal until their longest computed transition/animation finishes
  (instant when none — every engine, reduced motion included). Recipes style
  the plain two-state transition; `@starting-style`/`allow-discrete` are
  wrong here, and the skill documents why. All four design systems ship a
  toast recipe with a role-driven `variants.color` block.
- **Menu submenus** (`Menu.Sub` / `Menu.SubTrigger` / `Menu.SubPopup`):
  nested menus to any depth, built on nested `popover="auto"` — the platform
  supplies the stacking model (opening a child keeps ancestors open, Escape
  closes one level, light dismiss closes the chain, opening a sibling closes
  the other). `Menu.Sub` shadows the menu context for its subtree, so
  Item/Group/Separator work unchanged and `select` bubbles to the root.
  Anatomy grows two parts (additive): `sub-trigger` (data-state open|closed
  plus the item flags — style `[data-state="open"]` to keep it active while
  focus is in the submenu) and `sub-popup` (its own part so it can animate
  on its own axis). Keyboard per APG (ArrowRight/Enter/Space open + focus
  first, ArrowLeft closes back, mirrored under RTL, per-level typeahead);
  hover opens after `openDelay` (100ms) without moving focus and closes
  after `closeDelay` (300ms). All four design systems style the new parts.
- `fixedPositionStrategy` now shifts into the viewport after flipping (a
  tall submenu near the bottom edge rendered partly off screen — flip picks
  the side, shift keeps it on screen) and re-measures one frame after
  placement, because the open-state write races `showPopover()` across
  reactive callbacks and a still-hidden float measures 0×0.
- **Real-browser interaction suite** (Playwright over the playground):
  the press contract on chromium/firefox/webkit plus reduced-motion and
  forced-colors projects, with real pointer, keyboard and touch input.
  Runs in CI. It immediately caught the mouse-drag slider fix below.
- **Press feedback everywhere Material presses.** The primitive shipped on
  Button now covers every interactive part: tabs tab, dialog/popover
  trigger+close, menu trigger+item, select trigger+item (item pointer-only —
  keyboard selection lives on the trigger), collapsible/accordion trigger,
  switch/checkbox control and radio-group item-control (cross-element: the
  press lands anywhere in the label row, the feedback on the visible
  control, Space via the hidden input), and slider input. Anatomy flags are
  additive per part; slider declares only `pressed`.
- `createPressFeedback` gained `oneShot: false` for drag surfaces — skips
  the `data-press-animating` machinery entirely (a drag has no ripple).

### Fixed (pre-release)

- `llms.txt` documented 4 of the 14 shipped components; it now lists all
  fourteen with their parts and notes which accept variant axes.
- **A mouse drag off the slider no longer drops the held state.** Implicit
  pointer capture is a touch behavior, so a mouse drag fired pointerleave
  the moment it wandered off the box. The slider spreads no pointerleave
  handler, and press feedback now installs a one-shot, pointer-scoped
  window-level pointerup/pointercancel listener at pointer-press-start,
  ending the press wherever the release lands. Explicit `setPointerCapture`
  was rejected: it breaks WebKit's native range-drag value tracking.
- **Press lifecycle is now capture-aware.** `pointerleave` ended the press
  unconditionally; that is right for uncaptured pointers (drag off a button
  to cancel) but wrong under pointer capture — a native range input
  implicitly captures during drag, and touch implicitly captures on any
  element. A press now ends when the gesture ends: leave is ignored while
  the element holds capture for that pointer; pointerup/pointercancel (which
  capture retargets to the element) end it.

- **Press feedback — `createPressFeedback` and the `pressed` /
  `press-animating` flags.** CSS can see `:active` but not *where* a press
  landed, so pointer-anchored effects (Material's ink ripple) were
  inexpressible as pure recipe data. On parts whose anatomy declares the
  `pressed` flag — Button root, in this release — the runtime now sets
  `data-pressed` while the pointer/key is down, sets `data-press-animating`
  from press-start until the part's CSS animation finishes (so a quick tap
  plays a one-shot effect to completion; cleared on `animationend`, or
  synchronously when the active design system attaches no animation), and
  writes the press point as `--press-x` / `--press-y` / `--press-r` (px;
  `r` is the farthest-corner radius). Keyboard presses (Enter/Space) press
  at the box center. The design system consumes all of it in plain CSS; the
  behavior is exported as `createPressFeedback` for future components.
- Button's anatomy root gains the `pressed` and `press-animating` flags
  (additive), and the `PartProps` bag documents the pointer/keyup handlers
  it now carries — asChild renders get press feedback through the ordinary
  bag spread.
- **`axes` — the variant-axis set is open.** `variantAttrs` hardcoded exactly
  `color`/`size`/`variant`, and sigx forwards no rest props, so a design system
  with a fourth axis (density, emphasis, tone) had no route to the DOM at all:
  the kit compiled `[data-density="compact"]` selectors and then correctly
  warned they were dead on arrival. `axes` passes any other axis through as
  `data-<axis>`:

  ```tsx
  <Button.Root color="primary" axes={{ density: 'compact' }}>Save</Button.Root>
  ```

  Available on every component carrying variant axes (Button, Checkbox,
  Progress, RadioGroup, Select, Slider, Switch, Tabs). The three named props
  stay — they are the axes almost every design language has, and they keep
  autocomplete. An axis name must be kebab-case and may not be one the anatomy
  contract owns (`RESERVED_AXES`: `scope`, `part`, `state`, `orientation`, and
  every flag), nor one of the three that already has a prop (`color`, `size`,
  `variant` — use those, and keep their autocomplete). Zero throws rather than
  dropping it silently: shadowing `data-state` from userland would repoint
  every `[data-state="open"]` rule a design system wrote, and a second spelling
  of `data-color` would win over the named prop by loop order alone.
- `RESERVED_AXES` — exported from `@sigx/zero/contract` (it lives with the prop
  fragments, beside `variantAttrs`, not with the token vocabulary), mirrored in
  `@sigx/zero-kit` and parity-tested, so the validator rejects exactly what the
  runtime refuses.
- `manifest.json` `attributeSpec` gains `extraAxisForm`; `variantAxes` is now
  documented as the axes with named props rather than as the whole set.

- `clearThemes()` — drop every registered theme, for hosts that exchange design
  systems at runtime. Theme names are design-system-specific, so re-seeding
  without clearing would leave a previous DS's names selectable while its
  stylesheet is gone: `listThemes()` would offer a `[data-theme]` block that no
  longer exists, and `pickThemeFor()`/`toggle()` could land on a theme belonging
  to a design system that is no longer loaded. Browser-only by intent — the
  registry is otherwise write-once so a module-level Map stays SSR-safe.
- `registerThemes(tokens)` + the `ThemeSource` type — seed the theme registry
  from a design system's token declaration in one call, with the picker swatch
  DERIVED from that declaration (`tokens.swatch`, else the first four declared
  roles plus the base pair) instead of hardcoded per package. Design systems'
  `installThemes()` collapse to a single line, and what lands in the registry
  now matches what the kit compiles into their `manifest.json` — previously
  `@sigx/zero-basic` and `@sigx/zero-daisyui` registered four swatch tokens
  while their own manifests named six. `ThemeSource` is typed structurally, so
  `@sigx/zero-kit`'s `TokensInput` is assignable to it without zero taking any
  dependency on the Node-only kit.
- `defaultSwatch(roleNames)` on the token contract — the rule the compiler and
  the runtime registry share, mirrored in `@sigx/zero-kit` and parity-tested,
  so a theme picker can no longer disagree with the design system's manifest.

- **Button** — one part on a native `<button>`, carrying all three variant
  axes. Zero shipped fourteen components and none of them was the one every
  design system is judged on; `data-variant` (outline / soft / ghost) had
  nothing to apply to.

- `css/base.css` ships fallbacks for the typography categories
  (`--font-*` families, `--weight-*`, `--leading-*`, `--tracking-*`).
  `--font-*` is families only; sizes remain `--text-*`.
- `css/base.css` ships fallbacks for the spacing and elevation categories
  (`--space-2xs`…`--space-2xl`, `--shadow-xs`…`--shadow-xl`), so zero
  primitives have sane density and elevation before any design system loads.
  A design system's own keys come from its compiled `tokens.css`.
- `css/base.css` ships fallbacks for the motion categories
  (`--duration-*`, `--ease-*`) and a global
  `@media (prefers-reduced-motion: reduce)` block neutralizing the
  recommended durations, so zero primitives honor the preference before any
  design system loads. A design system's own duration keys are neutralized by
  its compiled `tokens.css`.

- `CSS_COLOR_KEYWORDS` and `ROLE_NAME_PATTERN` are now exported from the
  contract. `resolveColorToken` resolves through them rather than through
  private constants, so `@sigx/zero-kit`'s mirrored copy of the contract can
  be compared against them by an automated parity test.
