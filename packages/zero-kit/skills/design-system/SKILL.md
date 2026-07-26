---
name: design-system
description: Generate a complete SignalX Zero design system (tokens + recipes compiled to CSS) from a style brief — e.g. "brutalist", "glassmorphism", "corporate blue". Use when the user wants a new look-and-feel for a sigx app built on @sigx/zero.
---

# Generating a Zero design system

A Zero design system is **data**: a `TokensInput` (theme palettes on the
shared token contract) plus `RecipeInput`s (per-part styles against each
component's anatomy). No component code is ever written or changed.

## Workflow

1. **Read the anatomy manifest** — `node_modules/@sigx/zero/dist/manifest.json`
   (or https://signalxjs.github.io/zero/manifest.json). It lists every
   component's parts, their `data-state` values (as ready-made selectors),
   boolean flags, and token hints. Style ONLY what the manifest declares.

2. **Set up the package.** There is no `zero-kit init` yet (see issue #10),
   so copy the shape of an existing design system — `@sigx/zero-basic` is the
   smallest:

   ```
   packages/<name>/
     package.json      # peerDependency + devDependency on @sigx/zero,
                       # devDependency on @sigx/zero-kit; "build": tsgo && node build.mjs
     tsconfig.json
     build.mjs         # validate → compile → writeArtifacts (copy it verbatim)
     src/{tokens,recipes,design-system,index}.ts
   ```

   `src/index.ts` is the runtime half: it registers each theme so
   `themeController()` can switch between them. Hand your whole `tokens`
   object to `registerThemes` and it derives the rest — including the theme
   picker's swatch, which it reads from your own `tokens.swatch` (see step 3)
   so it matches your compiled `manifest.json`. Never hardcode role names
   here: a design system whose distinguishing colours aren't
   `primary`/`neutral` would render every theme identically in a picker.

   ```ts
   import { registerThemes } from '@sigx/zero';
   import { tokens } from './tokens.js';

   export { roles, system, tokens } from './tokens.js';
   export { recipes } from './recipes.js';
   export { designSystem } from './design-system.js';

   export function installThemes(): void {
       registerThemes(tokens);
   }
   ```

   Import from the kit **type-only** in `tokens.ts` and `recipes.ts`: those
   modules ship in the browser bundle, and the kit is Node-only. (`@sigx/zero`
   is the one runtime import a design system makes.)

3. **Author tokens** (`src/tokens.ts`): one light + one dark theme minimum,
   paired via `pair`. **Declare the color vocabulary first**: `roles` names
   every color role the design language needs — use the recommended eight
   (`primary|secondary|accent|neutral|info|success|warning|error`, the
   default when `roles` is omitted) unless the brief demands otherwise, and
   add/rename/drop roles freely when it does (e.g. Material-style
   `surface: { content: false, soft: false }` tonal steps). Every theme must
   then define every declared role (+ its `-content` when declared) plus the
   fixed base surfaces `base-100/200/300/base-content`. Rules of thumb:
   - `x-content` must contrast with `x` at ≥ 4.5:1 (the validator errors < 3:1).
   - oklch() everywhere; keep hue families consistent between light and dark.
   - `softMix` (0.08–0.2) controls the derived `-soft` tinted surfaces.
   - **Structural feel goes in `system`, declared once for the whole design
     system — not repeated per theme.** Categories today: `radius`
     (selector/field/box), `size` (selector/field), `spacing`, `shadow`,
     `motion`, `typography`, `border`, `disabledOpacity`. Brutalist ⇒ radius 0
     + thick border; soft/friendly ⇒ large radius.
     The `--text-*` ramp lives at `system.typography.sizes`, NOT `system.text`
     — an unknown key under `system` is ignored silently, so the ramp would
     simply never appear.
     ```ts
     export const system = {
         radius: { selector: '0', field: '0', box: '0' },
         border: '3px',
     } as const satisfies SystemTokens;

     export const tokens: TokensInput<typeof roles, typeof system> = {
         roles, system, defaultLight: 'brut', themes: { /* … */ },
     };
     ```
     Annotate with `TokensInput<typeof roles, typeof system>` — that is what
     narrows per-theme overrides to the keys you declared.
   - The keys inside a category are **yours**: `recommended` is what
     `@sigx/zero/css` ships fallbacks for, not a limit. Declare
     `radius: { pill: '9999px' }` and it flows into your manifest.
   - **Typography is the axis a style brief leans on hardest.**
     `typography` declares `fonts` (FAMILIES — `--font-sans` is a stack, never
     a size), `weights`, `leading`, `tracking`, and the `--text-*` size ramp.
     Give the ramp either as explicit `sizes` or as a modular `scale`:
     ```ts
     typography: {
         fonts: { sans: 'Inter, system-ui', mono: 'JetBrains Mono, monospace' },
         weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
         leading: { tight: 1.2, normal: 1.5 },
         tracking: { tight: '-0.01em', normal: '0em', wide: '0.05em' },
         scale: { base: '1rem', ratio: 1.25 },        // generates --text-*
         sizes: { '3xl': 'clamp(2rem, 5vw, 4rem)' },  // …one step hand-tuned
     }
     ```
     `sizes` wins per key, so a generated ramp with a hand-tuned display size
     is a normal thing to write. `ratio` is the whole personality: 1.125 is
     restrained, 1.5+ is dramatic. Weights and leading are **unitless** — the
     validator rejects `700px` and `1.5rem`, because CSS drops both silently.
     Fluid type belongs in `sizes` as a `clamp()`, not in the generator: the
     bounds are a design decision, not a ratio.
   - **Density and elevation are personality axes too.** `spacing` emits
     `--space-*` (padding, gap, margin) and `shadow` emits `--shadow-*`.
     Recipes reference them instead of literal rems and box-shadows, so the
     whole system can be tightened or flattened in one place. Airy ⇒ a wider
     ramp; brutalist ⇒ hard offset shadows (`4px 4px 0 0`) and often no blur.
     **Shadows usually need a dark counterpart** — one tuned for a white page
     is nearly invisible on a dark surface, so put the heavier ramp in
     `systemDark.shadow`. `light-dark()` cannot help here; it only takes
     colors.
   - **Motion is a personality axis — declare it, don't inline it.**
     `motion: { durations, easings }` emits `--duration-*` / `--ease-*`;
     recipes then write
     `transition: background var(--duration-fast) var(--ease-standard)`
     instead of magic numbers, and the whole system retunes in one place.
     Snappy ⇒ 100–150ms with a sharp curve; stately ⇒ 300ms+ and gentler.
     Durations must carry a unit — CSS silently ignores a bare `150`, and the
     validator errors on it.
     **Referencing `var(--duration-*)` is what makes a recipe respect
     `prefers-reduced-motion`**: the kit collapses every declared duration to
     ~0 in that mode. A hardcoded `0.2s` opts out of that, so don't.
     One exception: a *looping* animation (a spinner) should not take its
     duration from these tokens — collapsing it would spin absurdly fast
     rather than stop. Leave it literal until recipe conditions land.
   - Omitting a category entirely is fine — the fallbacks apply. Absence is
     never a validation error.
   - Values that must differ by color scheme go in `systemDark` (applies to
     every `colorScheme: 'dark'` theme); a single theme overrides via its own
     `system` block. Resolution order: `system` → `systemDark` →
     `theme.system`.
   - DS-specific tokens (a blur radius, a glow color…) go in `custom`
     declarations (name → `{ description, syntax? }`), valued per-theme in
     `custom` — never in `extra`, which the validator flags as undeclared.
     A custom token inside a category namespace (`--radius-…`) is an error;
     declare it in `system` instead.

4. **Author recipes** (`src/recipes.ts`): for each component in the manifest,
   a `RecipeInput` with `parts.<name>.base` styles and `parts.<name>.states`.
   State names resolve automatically: machine states (`open`, `checked`,
   `active`, …) → `[data-state]` selectors; flags (`disabled`, `focus-visible`)
   → `[data-*]`; `hover`/`focus-visible`/`active` (when not a machine state)
   → real pseudo-classes. Reference tokens with `var(--color-*)`,
   `var(--radius-*)` — never hardcode palette colors in recipes.
   Cover every declared state (empty `{}` marks intentional no-styling).
   Always style `focus-visible` visibly.
   **Conditional styles go in `at`** — the same shape, recursively:
   ```ts
   popup: {
       base: { width: '100%', height: '100dvh', borderRadius: '0' },  // mobile first
       at: {
           sm: { base: { maxWidth: '32rem', borderRadius: 'var(--radius-box)' } },
           'reduced-motion': { base: { transition: 'none' } },
           '@starting-style': { states: { open: { opacity: '0' } } },
       },
   }
   ```
   A key is a breakpoint declared in `tokens.breakpoints` (emitted as
   `@media (min-width: …)`), a built-in (`reduced-motion`, `hover-none`,
   `prefers-dark`, `forced-colors`), or anything starting with `@`, used as a
   raw prelude. Anything else is a hard error listing what was available.
   - Author **mobile-first**: breakpoints are `min-width`, so `base` is the
     small-screen case. Declare them ascending — declaration order is emission
     order, and the validator enforces it.
   - `at` works inside `variants` too, so responsive variants need nothing new.
   - `prefers-dark` is the *system* preference, not your dark theme; it does
     not fire for `[data-theme="…-dark"]`.
   - A **looping** animation should be stopped under `reduced-motion`
     (`animation: 'none'`), never shortened — collapsing its duration makes it
     spin faster instead of settling.
   - **Animate presence in the recipe — presence needs no runtime helper.**
     Zero never unmounts a popup: it keeps the node mounted,
     toggles `data-state` and calls the native `showPopover()`/`showModal()`.
     So both directions are CSS:
     ```ts
     popup: {
         base: {
             opacity: '0',
             transform: 'translateY(-4px)',
             transition: 'opacity var(--duration-fast) var(--ease-standard), '
                 + 'transform var(--duration-fast) var(--ease-standard), '
                 + 'display var(--duration-fast) allow-discrete, '
                 + 'overlay var(--duration-fast) allow-discrete',
         },
         states: { open: { opacity: '1', transform: 'none' } },
         at: {
             'starting-style': { states: { open: { opacity: '0', transform: 'translateY(-4px)' } } },
             'reduced-motion': { base: { transition: 'none' } },
         },
     }
     ```
     `starting-style` is the state the entry animates FROM. The two
     `allow-discrete` entries are the **exit**: they keep the element rendered
     — and, via `overlay`, in the top layer — for the length of the
     transition. Leave them out and the entry animates while the close is
     instant, which the validator warns about because nothing else would tell
     you. (`overlay` is Chromium-only as of writing; elsewhere the exit
     degrades to instant.)
   - **A disclosure panel animates through `::details-content`.** Collapsible
     and Accordion are native `<details>`, so the height animation belongs on
     the browser's own wrapper, with `interpolate-size` making `auto` a legal
     endpoint. Set it on the element, not globally:
     ```ts
     root: {
         base: { interpolateSize: 'allow-keywords' },
         selectors: {
             '&::details-content': {
                 blockSize: '0',
                 overflow: 'hidden',
                 transition: 'block-size var(--duration-normal) var(--ease-standard), '
                     + 'content-visibility var(--duration-normal) allow-discrete',
             },
             '&[open]::details-content': { blockSize: 'auto' },
         },
     }
     ```
     Accordion's `<details>` is its `item` part, not `root`.
   - **Press feedback: the runtime publishes the press, the recipe styles
     it.** CSS can see `:active` but not *where* a press landed, so on parts
     whose anatomy declares the `pressed` flag (Button root today) zero
     writes:
     - `data-pressed` — present while the pointer/key is physically down.
       Key non-animated press effects on this (a tint, a scale, an offset).
     - `data-press-animating` — present from press-start until the part's CSS
       animation finishes, **not** until release, so a quick tap plays a
       one-shot effect (a ripple) to completion. The runtime clears it on
       `animationend` — put the whole effect in ONE keyframe animation whose
       duration is `var(--duration-*)`; a rule on this flag that starts no
       animation is dead (the validator warns).
     - `--press-x` / `--press-y` — the press point in px relative to the
       part; keyboard presses (Enter/Space) get the box center.
     - `--press-r` — distance to the farthest corner, so a covering circle
       is `calc(var(--press-r) * 2)` wide without trigonometry.
     Material's ink ripple as a recipe (needs `position: relative` +
     `overflow: hidden` on the part):
     ```ts
     selectors: {
         '&::before': {   // held state layer — also the reduced-motion fallback
             content: '""', position: 'absolute', inset: '0', opacity: '0',
             background: 'var(--btn-ripple)', pointerEvents: 'none',
             transition: 'opacity var(--duration-fast) var(--ease-standard)',
         },
         '&[data-pressed]::before': { opacity: '0.12' },
         '&::after': {    // the ripple, anchored to the press point
             content: '""', position: 'absolute',
             left: 'var(--press-x, 50%)', top: 'var(--press-y, 50%)',
             width: 'calc(var(--press-r, 0px) * 2)', height: 'calc(var(--press-r, 0px) * 2)',
             borderRadius: '50%', background: 'var(--btn-ripple)',
             transform: 'translate(-50%, -50%) scale(0)', opacity: '0', pointerEvents: 'none',
         },
         '&[data-press-animating]::after': {
             animation: 'btn-ripple var(--duration-slow) var(--ease-standard)',
         },
     },
     keyframes: { 'btn-ripple': 'from { … scale(0); opacity: 0.12; } to { … scale(1); opacity: 0; }' },
     ```
     Reduced motion needs nothing extra — token durations collapse, the
     animation ends immediately, and the `data-pressed` tint remains as the
     non-motion feedback. Hide decorative press layers under
     `forced-colors`. The same hooks express non-Material ideas: a brutalist
     stamp (`[data-pressed] { translate: 2px 2px }`), a scale-press, a
     spotlight at `--press-x/y`.
   - `RecipeInput.css` takes raw CSS for anything the typed surface can't say.
   - **Style Button first, and make its axes compose.** It is the component a
     design system is judged on, and the only one where all three axes matter
     at once. Do NOT write a rule per `color` × `variant` — eight roles by
     four fills is thirty-two rule sets before sizes. Route the colour through
     component tokens the fill rules read:
     ```ts
     tokens: { '--btn-accent': 'var(--color-primary)', '--btn-on-accent': '…' },
     variants: {
         color:   { success: { root: { base: { '--btn-accent': 'var(--color-success)', … } } } },
         variant: { solid: { root: { base: { background: 'var(--btn-accent)' } } } },
         size:    { lg: { root: { base: { padding: 'var(--space-md) var(--space-xl)' } } } },
     },
     defaultVariants: { color: 'primary', variant: 'solid', size: 'md' },
     ```
     Adding a ninth role then costs one rule instead of four.
   - **Derive the colour axis from `roles`; never retype the list.** A role
     declared in `tokens.ts` but missing from a recipe's `color` axis renders
     as the default colour — the variant reads as broken rather than as one
     role being unwired, and nothing in the type system notices. Import
     `roles` as a value and filter it:
     ```ts
     import { roles } from './tokens.js';

     // Roles opting out of `-content` or `-soft` are fills and hairlines
     // (Material's `surface*`, `outline`) — not something a button can be.
     const ROLES = Object.entries(roles as Record<string, RoleDecl>)
         .filter(([, decl]) => decl.content !== false && decl.soft !== false)
         .map(([name]) => name);
     ```
     Wire the SAME set on every component that has a colour axis. The
     validator errors on a colour value that names no declared role, and warns
     when one component wires fewer roles than its siblings — holding a role
     back everywhere on purpose is fine and says nothing.
   - **The `size` axis is your vocabulary too.** `xs|sm|md|lg|xl` is the
     recommended ramp, not a fixed one. If the brief calls for density steps
     or a numbered ramp, declare it and use it — `<Button.Root size="…">`
     accepts any name, and the validator checks recipes against what you
     declared rather than against xs–xl:
     ```ts
     // src/tokens.ts
     export const tokens: TokensInput<typeof roles, typeof system> = {
         roles, system,
         sizes: ['compact', 'comfortable', 'spacious'],   // or [...SIZE_SCALE_LIST, '2xl']
         defaultLight: '…', themes: { /* … */ },
     };
     ```
     Declare it even when you keep the recommended ramp verbatim only if you
     want it stated in the manifest; omitting `sizes` already means xs–xl.
     Note `sizes` is the `data-size` axis — unrelated to `system.size`
     (`--size-*`, the control-sizing unit) and to `system.typography.sizes`
     (the `--text-*` ramp).
   - **You are not limited to three axes.** `color`, `size` and `variant` have
     named props because almost every design language has them. If the brief
     needs another — density, emphasis, tone, elevation — key `variants` on it
     and consumers reach it through zero's `axes` prop:
     ```ts
     variants: { density: { compact: { root: { base: { paddingBlock: 'var(--space-2xs)' } } } } },
     ```
     ```tsx
     <Button.Root color="primary" axes={{ density: 'compact' }}>Save</Button.Root>
     ```
     An axis name must be kebab-case and may NOT be one the anatomy contract
     owns (`scope`, `part`, `state`, `orientation`, or any flag such as
     `disabled` / `selected`) — the validator errors and zero refuses to render
     it, because shadowing `data-state` would silently repoint every
     `[data-state="open"]` rule you wrote.

5. **Assemble** (`src/design-system.ts`): `{ name, tokens, recipes }` exported
   as `designSystem`.

6. **Validate and iterate**: `zero-kit validate` (after building the TS), or
   programmatically `validateDesignSystem(ds, manifest)`. Fix every error and
   drive warnings to zero unless deliberate. This loop is the point: generate
   → validate → fix → repeat.

7. **Build**: `zero-kit build` (or the package's `build.mjs`) emits
   `dist/css/index.css` + per-component files. The app consumes it with two
   lines: `import '<pkg>/css'` and `installThemes()`.

## What `validate` will catch

Content is checked, not just structure. These are errors:

- a `var(--…)` this design system never declares — it resolves to nothing.
  The message suggests the nearest declared name.
- a component that styles `focus-visible` nowhere, so keyboard focus is
  invisible.
- a `skipStates` entry naming neither a state nor a flag of that part.
- variants on a component with no `root` part (Dialog, Popover, Tooltip,
  Menu) — the generated selectors can't match, so the rules would be dead CSS.

And these are warnings worth driving to zero:

- a hardcoded palette colour. Achromatic-with-alpha (`oklch(0% 0 0 / 0.3)`)
  is exempt — that's a shadow or scrim, not palette.
- a literal duration in a `transition`: reduced motion only collapses
  `var(--duration-*)`, so a literal opts out of the preference.
- a component in the manifest with no recipe at all.
- a part that declares `starting-style` but never transitions (the entry
  styles are never used), or transitions no discrete property with
  `allow-discrete` (the entry animates and the exit cannot — `allow-discrete`
  over `opacity` alone changes nothing).
- a part that declares `focus-visible` and doesn't style it. If the ring
  genuinely belongs on an inner part, say so with
  `skipStates: { root: ['focus-visible'] }` rather than leaving it implicit.
- `var(--x, fallback)` referencing something undeclared — the fallback makes
  it safe, so it's the sanctioned way to read an app-supplied property.

## Reference

### The brief pack — start here

`skills/design-system/briefs/` holds four complete, compiling starting points.
Each file is one `TokensInput` (every category filled, both schemes, contrast
clean) plus one worked `RecipeInput` for Button. **Copy the closest one to
`src/tokens.ts` and `src/recipes.ts`, then diverge.** They are compiled and
validated by the repo's test suite, so a brief that has gone stale is a
failing test rather than a trap.

The four are deliberately not four palettes — each one teaches a different
mechanic, and reading all four is the fastest way to learn what the token
contract can express:

| Brief | radius | border | Signature move | Teaches |
|---|---|---|---|---|
| brutalist | 0 | 3px | shadows drawn in `var(--color-base-content)` with zero blur, and `steps()` easings | how far the standard categories stretch before you need a custom token |
| glass | 1.25rem | 1px | `backdrop-filter: blur(var(--glass-blur))` on every floating surface | declared custom tokens, and translucency that survives both schemes |
| corporate | 0.5rem | 1px | a two-part shadow ramp (contact + ambient) and a 1.2 type ratio | contrast discipline and declared breakpoints — the two things this brief is judged on |
| terminal | 0 | 1px | every duration is 0ms, and `--shadow-*` is a glow in `var(--color-primary)` | 0ms durations instead of `transition:none`, and a glow built from theme colours |

Typography carries a brief further than anything else: brutalist wants a
mono or condensed stack with 800+ weights and wide tracking; editorial
wants a serif with generous `leading`; corporate wants a humanist sans and
a restrained `ratio`. The four ratios above — 1.414, 1.25, 1.2, 1.125 — are
most of the difference between those four looks.

### Worked design systems

Three ship in the zero repo, in increasing distance from the defaults:

- `@sigx/zero-basic` — the canonical starting point. Read its `src/tokens.ts`
  and `src/recipes.ts` before writing your own.
- `@sigx/zero-brutalist` — a brief taken to its extreme: radius 0, `steps()`
  easings, hard offset shadows drawn in the foreground colour, a 1.414 type
  ratio. Generated from this skill.
- `@sigx/zero-material` — a foreign vocabulary: thirteen colour roles, a
  `level1`–`level5` elevation ramp, `soft: false` tonal surfaces, and a role
  (`outline`) with `content: false`. Read this one when the brief needs names
  the recommended eight don't cover.

### Briefs the pack does not cover

Reach for the nearest file and change these axes:

| Brief | Nearest | Change |
|---|---|---|
| editorial / magazine | corporate | a serif `fonts.sans`, `leading.relaxed` up to 1.8, ratio to 1.333 |
| playful / toy | glass | radius to `9999px` on `field`, a bouncy `emphasized` easing, ratio 1.2 |
| dense / data-tool | corporate | halve the `spacing` ramp, ratio to 1.125, `text.base` to 0.875rem |
| neon / cyberpunk | terminal | keep the glow, raise chroma, restore real durations |
