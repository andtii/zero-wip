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
   - Structural feel lives in `radius` (selector/field/box) and `border` —
     brutalist ⇒ radius 0 + thick border; soft/friendly ⇒ large radius.
   - DS-specific tokens (a blur radius, a glow color…) go in `custom`
     declarations (name → `{ description, syntax? }`), valued per-theme in
     `custom` — never in `extra`, which the validator flags as undeclared.

3. **Author recipes** (`src/recipes.ts`): for each component in the manifest,
   a `RecipeInput` with `parts.<name>.base` styles and `parts.<name>.states`.
   State names resolve automatically: machine states (`open`, `checked`,
   `active`, …) → `[data-state]` selectors; flags (`disabled`, `focus-visible`)
   → `[data-*]`; `hover`/`focus-visible`/`active` (when not a machine state)
   → real pseudo-classes. Reference tokens with `var(--color-*)`,
   `var(--radius-*)` — never hardcode palette colors in recipes.
   Cover every declared state (empty `{}` marks intentional no-styling).
   Always style `focus-visible` visibly.

4. **Assemble** (`src/design-system.ts`): `{ name, tokens, recipes }` exported
   as `designSystem`.

5. **Validate and iterate**: `zero-kit validate` (after building the TS), or
   programmatically `validateDesignSystem(ds, manifest)`. Fix every error and
   drive warnings to zero unless deliberate. This loop is the point: generate
   → validate → fix → repeat.

6. **Build**: `zero-kit build` (or the package's `build.mjs`) emits
   `dist/css/index.css` + per-component files. The app consumes it with two
   lines: `import '<pkg>/css'` and `installThemes()`.

## Reference

`@sigx/zero-basic` in the zero repo is the canonical example — read its
`src/tokens.ts` and `src/recipes.ts` before writing your own.

## Style briefs → decisions cheat sheet

| Brief | radius | border | palette | extras |
|---|---|---|---|---|
| brutalist | 0 | 2-3px solid | high-contrast, few hues | hard shadows (`4px 4px 0 0`), uppercase labels |
| glass | 1rem+ | 1px translucent | low-chroma + one accent | `backdrop-filter: blur()`, translucent `base-100` |
| corporate | 0.375rem | 1px | blue primary, gray ramp | subtle shadows, AA+ contrast everywhere |
| terminal | 0 | 1px | dark base, green/amber content | monospace font token, no transitions |
