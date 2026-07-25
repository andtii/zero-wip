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

2. **Author tokens** (`src/tokens.ts`): one light + one dark theme minimum,
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
     (selector/field/box), `size` (selector/field), `text` (the xs…3xl ramp),
     `border`, `disabledOpacity`. Brutalist ⇒ radius 0 + thick border;
     soft/friendly ⇒ large radius.
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

3. **Author recipes** (`src/recipes.ts`): for each component in the manifest,
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

4. **Assemble** (`src/design-system.ts`): `{ name, tokens, recipes }` exported
   as `designSystem`.

5. **Validate and iterate**: `zero-kit validate` (after building the TS), or
   programmatically `validateDesignSystem(ds, manifest)`. Fix every error and
   drive warnings to zero unless deliberate. This loop is the point: generate
   → validate → fix → repeat.

6. **Build**: `zero-kit build` (or the package's `build.mjs`) emits
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
- a part that declares `focus-visible` and doesn't style it. If the ring
  genuinely belongs on an inner part, say so with
  `skipStates: { root: ['focus-visible'] }` rather than leaving it implicit.
- `var(--x, fallback)` referencing something undeclared — the fallback makes
  it safe, so it's the sanctioned way to read an app-supplied property.

## Reference

`@sigx/zero-basic` in the zero repo is the canonical example — read its
`src/tokens.ts` and `src/recipes.ts` before writing your own.

## Style briefs → decisions cheat sheet

| Brief | radius | border | palette | extras |
|---|---|---|---|---|
| brutalist | 0 | 2-3px solid | high-contrast, few hues | hard shadows (`4px 4px 0 0`), uppercase labels |
| glass | 1rem+ | 1px translucent | low-chroma + one accent | `backdrop-filter: blur()`, translucent `base-100` |
| corporate | 0.375rem | 1px | blue primary, gray ramp | subtle shadows, AA+ contrast everywhere |
| terminal | 0 | 1px | dark base, green/amber content | `fonts.mono`, no transitions |

Typography carries a brief further than anything else: brutalist wants a
mono or condensed stack with 800+ weights and wide tracking; editorial
wants a serif with generous `leading`; corporate wants a humanist sans and
a restrained `ratio`.
