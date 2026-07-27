# RFC 0001 — Multi-target design systems: Lynx adopts the zero model

- **Status**: Proposed
- **Tracking issue**: #95 (pluggability amendment: #107)
- **Affected repos**: `signalxjs/zero` (this repo), `signalxjs/lynx`
- **Decisions locked before this RFC**: (1) `@sigx/zero-kit` grows a pluggable
  emitter layer — one authoring toolchain, emit targets behind a published
  SPI; (2) one design-system source (`tokens.ts` + `recipes.ts`) compiles to
  every target it declares; (3) `lynx-heroui` is rebuilt as pure data and is
  the **pilot**; (4) no backward compatibility anywhere — pre-1.0, get it
  right; (5) **zero-kit knows no concrete foreign platform** (#107): it ships
  the SPI, the target-neutral core, and the built-in `web` target only — the
  Lynx emitter is `@sigx/lynx-zero-kit` in the lynx repo, and further targets
  (terminal, …) can come later without touching this repo.

## 1. Motivation

Zero exists so that *a design system is data*. The idea started in the lynx
repo — and the lynx repo is the measured proof of the problem:

- `lynx-daisyui`: 28 components, ~4.5k LOC, 292 hand-written CSS classes.
- `lynx-heroui`: 24 components, ~2.5k LOC, 180 `hero-`-prefixed classes.
- 13 of hero's 24 components differ by **≤30 lines** from their daisy twin
  after stripping the class prefix. `Tabs` differs by 2 lines; all of its
  actual design difference is ~25 lines of CSS.
- ~74% of the lynx UI code is per-DS duplication. Every additional design
  system costs a full second component set, test suite, and showcase.
- `lynx-zero` (the "foundation") holds almost nothing: 5 layout primitives,
  one styled component, a 1.2k-LOC theme engine, and a TypeScript prop
  contract. The one extracted headless behavior (`tabs-selection.ts`)
  demonstrates the fix works; nothing else was extracted.

Web zero has since proven the full model: headless compound components
carrying a machine-readable anatomy (`data-scope`/`data-part`/`data-state`),
and `zero-kit` compiling typed tokens+recipes into plain CSS, validated
against the anatomy manifest. This RFC extends that model to Lynx so that
**one design-system source skins every sigx target**, as the README already
promises.

### Why this is not a straight port

The Lynx CSS engine (ByteDance Lynx, native iOS/Android + Lynx-for-Web) lacks,
per constraints documented in-source in the lynx repo: attribute selectors,
`@layer`, `@property`, `@media`, pseudo-classes (`:hover`/`:focus`/`:active`),
pseudo-elements, `calc(var())`, `color-mix()`, `oklch()`. Additionally `var()`
does not resolve in inline styles (stylesheet class rules only), and
`display:none` is unsafe (paint leaks). So zero's `[data-*]` selector output
cannot run on Lynx — but everything *above* the emitter (anatomy data, token
grammar, recipe structure, validation) is platform-neutral. The design
follows that seam.

### Pilot choice

`lynx-heroui` has **zero consumers** outside its own package and the showcase
(verified by grep). `lynx-daisyui` has a real production consumer:
`lynx-updates-ui` (Button, Modal, Progress, Alert). Therefore hero pilots the
entire pipeline — breaking it costs nothing — and daisy converts only after
the Phase 2 go/no-go gate passes.

## 2. Unified token contract

The token-name contract currently exists twice: `packages/zero/src/contract/tokens.ts`
("web edition", mirrored into `zero-kit/src/contract.ts` behind a parity test)
and a hand-mirrored, drifted copy in `lynx-zero/src/contract.ts`. The lynx
copy is deleted; the zero-kit contract becomes the single source, and the lynx
side consumes *generated data* (§6), so no third copy exists.

Collision resolutions:

| Collision | Decision | Rationale |
|---|---|---|
| `--font-*`: lynx = control font **sizes**, web = font **families** | Web wins: `--font-*` = families everywhere. Lynx's `--font-xs…lg` ramp is deleted. | Already settled in zero-kit CHANGELOG ("that side renames when it is rewritten") and tracked as #53. This is the rewrite. |
| Lynx needs control chrome that ignores `fontScale` | **New contract addition**: for every declared `--text-<key>` the compiler also emits `--text-fixed-<key>`. Web: pure alias (`--text-fixed-sm: var(--text-sm)`). Lynx: a literal px the ThemeProvider never rescales. Recipes wanting unscaled control labels reference `var(--text-fixed-sm)`. | Preserves lynx's deliberate scaled-app-text / fixed-control-chrome split without a second size ramp, authored once for both platforms. |
| `--text-base` (lynx) vs `--text-md` (web) | `md` is the recommended key. Keys stay open per DS; lynx-zero's hardcoded font tables die with the generated artifact. The 17px iOS-HIG *value* is a DS choice, not foundation law. | The web ramp is the published contract. |
| Closed role/size unions (lynx) vs open grammar (web) | Lynx adopts the open grammar: `ROLE_NAME_PATTERN`, recommended unions widened with `(string & {})`. `COLOR_VARIANT_LIST` as a closed union is retired; `resolveColorToken` checks the *registered DS's declared roles*, not a static list. | One grammar, one validator. Autocomplete survives via recommended unions. Hero's forced role-squeezing (`danger→error`, no `accent` upstream) showed the closed set was already breaking. |
| Lynx-only token families: `--toggle-*`, `--checkbox-*`, `--badge-*`, `--padding-btn-*`, `--border-btn/card`, `--padding-box*`, `--gap-box`, `--step-indicator`, `--progress-height`, `--modal-max-width`, `--size-xs…lg` | All become **recipe component tokens** (`RecipeInput.tokens`, emitted on the component's carrier class as `--<scope>-*`). | They were a DS's sizing math leaking into the foundation, never contract. The kit already has the mechanism (`recipe.tokens` + per-theme `ThemeInput.components` overrides). |
| `--size-selector` / `--size-field` | Kept verbatim (already in the `size` category). The lynx `FIELD_STEPS`/`SELECTOR_STEPS` multiplication tables are deleted; recipes write `calc(var(--size-field) * 12)` and the lynx target folds it (§3.4). | |
| `-soft` derivation: web mixes in oklab (`color-mix(in oklab, …)`), lynx lerps in sRGB | Unified on **oklab** at `ThemeInput.softMix`. The kit materializes `-soft` per theme for the lynx artifact; lynx's runtime `mixColors` (kept for tenant themes) is upgraded to an inline oklab mix so runtime-registered themes match compiled ones. | Today the same theme renders different tints per platform. |
| `RUNTIME_PROPERTIES` (`--press-x/y/r`, `--progress-percent`, `--slider-percent`) | Declared **web-only** in the contract. Lynx press feedback stays `Pressable`-driven; recipes referencing runtime properties are web-only sections by definition. | Inline `var()` doesn't resolve on Lynx — the mechanism cannot port. |
| Everything else (`--radius-*`, `--space-*`, `--weight-*`, `--leading-*`, `--tracking-*`, `--duration-*`, `--ease-*`, `--border`, `--disabled-opacity`) | Adopted by lynx verbatim, values lowered where needed. `--shadow-*` is web-leaning until Lynx shadow support is verified on-device (open question). | |

## 3. zero-kit: target-neutral core + pluggable emitters

zero-kit's job splits into a **target-neutral core** (authoring types,
resolution, validation, lowering toolkit) and a published **target SPI**.
zero-kit itself contains exactly one target: `web` (zero's own platform, the
reference implementation). Every other target is an external package
implementing the SPI — `@sigx/lynx-zero-kit` for Lynx, a future terminal
target, anything else. zero-kit never names a foreign platform: it knows the
SPI, the generic `target-<id>` recipe-condition pattern, and nothing more.

### 3.1 Pipeline

```
defineTokens / defineRecipe / defineDesignSystem     (authoring — target-neutral)
        │
   resolve()        theme completion, soft/derived materialization,
        │           vocabulary, per-target recipe projection
   validate()       shared structural pass (per target manifest)
        │           + per-target capability pass
   target.emit()    built-in 'web' | any EmitTarget plugin (e.g. @sigx/lynx-zero-kit)
        │
   writeArtifacts() → dist/<target-id>/**
```

### 3.2 Module layout

```
packages/zero-kit/src/
  contract.ts              # shared vocabulary (role/category grammar) — unchanged home
  tokens.ts                # authoring types + defineTokens (compileTokensCss moves out)
  recipes.ts               # authoring types + defineRecipe (compileRecipeCss moves out)
  design-system.ts         # defineDesignSystem + target declarations, resolve() dispatch
  resolve/
    index.ts               # ResolvedDesignSystem builder
    themes.ts              # per-theme value tables, soft/derived materialization (culori)
    project-recipes.ts     # per-target recipe projection (target sections, targets: filter)
    vocabulary.ts          # (moved) token vocabulary + Levenshtein
    validate.ts            # (moved) shared validation
    validate-recipes.ts    # (moved) + capability-aware value checks
  lower/                   # EXPORTED toolkit (capability-driven), usable by any target plugin
    color.ts               # oklch / color-mix → hex (culori)
    calc.ts                # length-arithmetic folding
    derive.ts              # expression hoisting → derived tokens + derivation program
  targets/
    spi.ts                 # EmitTarget, TargetCapabilities, TargetArtifacts — the published SPI
    load.ts                # resolves a targets: entry ('web' | module specifier) to an EmitTarget
    web/                   # the built-in reference target (current compileTokensCss / compileRecipeCss)
  artifacts.ts             # writes dist/<target-id>/** for any TargetArtifacts
  cli.ts
```

There is deliberately **no `targets/lynx/`**. The Lynx emitter (class
projection, recipe-CSS emission, `themes.js` generation — §4 and §6) lives in
the lynx repo as `@sigx/lynx-zero-kit`, a Node-only package depending on
zero-kit for the SPI, the resolve/validate core, and the lowering toolkit.

### 3.3 Key types

```ts
export interface TargetCapabilities {
    attributeSelectors: boolean;         // web: true, lynx: false
    pseudoClasses: ReadonlySet<string>;  // lynx: empty
    atRules: boolean;                    // @media/@layer/@property/@container
    colorSyntax: 'css-color-4' | 'hex-rgb';
    varInCalc: boolean;                  // lynx: false → fold or error
    colorMix: boolean;                   // lynx: false → materialize or error
}

export interface EmitTarget {
    readonly id: string;                 // open — 'web' (built-in), 'lynx', 'terminal', …
    readonly capabilities: TargetCapabilities;
    readonly defaultManifest: string;    // the target's foundation manifest, e.g. '@sigx/zero/manifest.json'
    validate(ds: ResolvedDesignSystem, manifest: FoundationManifest): ValidationIssue[];
    emit(ds: ResolvedDesignSystem, manifest: FoundationManifest): TargetArtifacts;
}

export type DerivationEntry =
    | { prop: string; kind: 'mix'; a: string; b: string; ratio: number; space: 'oklab' }
    | { prop: string; kind: 'mul'; of: string; by: number };
```

The derivation-program grammar is deliberately frozen at `mix | mul` — it
covers every derivation observed in both repos; anything else is a
compile-time error until a real DS needs more.

**Target loading**: an entry in `targets:` is either the built-in name
`'web'` or a module specifier (`'@sigx/lynx-zero-kit'`) whose default export
is an `EmitTarget`; the kit `import()`s it at build time. The CLI addresses
targets by their resolved `id`. Duplicate ids across declared targets are an
error.

### 3.4 Value lowering — the central mechanism

The lowering machinery is an **exported, capability-driven toolkit**
(`@sigx/zero-kit/lowering`), not private plumbing: any target plugin whose
`TargetCapabilities` rule out a construct calls the same folding helpers, so
a future terminal target reuses them unchanged. Theme values are compile-time
data (they live in `tokens.ts`), so any expression whose free variables are
theme-resolvable tokens can be **folded**:

- `oklch(…)` literals → hex via culori. Always.
- `color-mix(in oklab, var(--color-primary) 16%, var(--color-base-100))` in a
  recipe → hoisted to a generated derived token `--zx-d-<hash>`, computed to
  hex **per theme** into the lynx theme artifact, declaration rewritten to
  `var(--zx-d-<hash>)`. (The existing `-soft` materialization pattern,
  generalized.)
- `calc(var(--size-field) * 12)` → same hoisting; a small length-arithmetic
  evaluator folds it per theme (themes may override sizes).
- Expressions over runtime-only values (`--press-*`, `env()`, percentages of
  unknown boxes) → **hard error** for a target that can't compute them, with
  the fix named: *"move it under `at: { 'target-web': … }` or provide a
  `target-<id>` literal for this target."*

Every hoisted derivation is also recorded as a `DerivationEntry` in the
artifact so runtime-registered tenant themes (`registerTheme`/`extendTheme`)
can recompute derived values in JS — replacing lynx's hand-maintained
`completeTheme`/steps logic with generated data.

### 3.5 Two foundation manifests, one kit

Each target validates against **its own foundation manifest**, named by the
target's `defaultManifest` (overridable per build). `lynx-zero` adopts the
same `defineAnatomy` authoring (per-component `anatomy.ts`, aggregated
registry, `manifest.json` emitted at build). The anatomy *format* is shared
law; the *inventory* is per-foundation (lynx has `nav-tab-bar`; web has
`popover`). The manifest schema gains an open `foundation: string`
discriminator (`'zero'`, `'lynx-zero'`, …).

For components existing on more than one platform, part/state/flag names
**must** match so one recipe styles all of them. Enforcement is a
**build-time parity check** in the kit core: for every recipe compiled for
two or more targets, diff the parts/states the recipe touches across all
loaded foundation manifests; error on mismatch. This is the established
zero↔zero-kit parity-test pattern applied across repos — no shared anatomy
package (deliberately deferred until drift proves chronic).

### 3.6 DS declaration, CLI, artifact layout

```ts
export const designSystem = defineDesignSystem({
    name: 'daisy',
    targets: ['web', '@sigx/lynx-zero-kit'],   // built-in name | module specifier; default: ['web']
    tokens, recipes,
    css: [...],                                // web-only escape hatch
});
```

```
zero-kit build    [entry] [--target <id>[,<id>…]] [--out dist]
                  [--manifest <path>] [--manifest.<id> <path>]
zero-kit validate [entry] [--target …] [--strict]
```

The DS declares *which* target packages it ships (it must — it authors the
target sections and publishes the artifacts); `--target` filters among the
declared ids. This puts the knowledge where it belongs: the **DS** knows its
targets, each **target package** knows its platform, the **kit** knows
neither. (Consequence: a dual-target DS package here takes a devDependency on
`@sigx/lynx-zero-kit` — no cycle, since zero-kit never depends back.)

Artifact root becomes `dist/<target-id>/` for **every** DS package (breaking:
web moves from `dist/css/**` to `dist/web/css/**`, `dist/web/manifest.json`).
A dual-target DS ships both trees behind subpath exports (`./css` → web,
`./lynx`, `./lynx/css`).

Recipes for components a target doesn't have are **skipped with an
info-level note** (never an error — inventories legitimately differ;
`--strict` does not promote it). A recipe may pin `targets: ['web']` to
document intent and silence the note. The inverse — a target component with
no recipe — remains a per-target coverage warning.

## 4. Anatomy → class projection for Lynx

*(Normative for `@sigx/lynx-zero-kit` — the Lynx target plugin in the lynx
repo. zero-kit contains none of this.)*

No attribute selectors on Lynx, so the anatomy projects onto a deterministic
generated class scheme. Descendant combinators are proven in the Lynx engine
(today's `.progress-primary .progress-bar`), so variant projection mirrors
web's carrier-descendant rule exactly.

| Anatomy concept | Web projection | Lynx class |
|---|---|---|
| root part | `[data-scope="switch"][data-part="root"]` | `zx-switch` |
| other part | `[data-part="thumb"]` | `zx-switch__thumb` |
| machine state | `[data-state="checked"]` | `.zx--checked` (compound with the part class) |
| boolean flag | `[data-disabled]` | `.zx--disabled` |
| orientation | `[data-orientation="horizontal"]` | `.zx--horizontal` |
| variant axis | `[data-color="primary"]` on carrier | `.zx--color-primary` on carrier |

```css
.zx-button.zx--color-primary { … }                        /* carrier part */
.zx-progress.zx--color-primary .zx-progress__bar { … }    /* other part, via descendant */
.zx-button.zx--color-primary.zx--variant-outline { … }    /* compound variant */
```

State/flag classes are generic (`zx--checked`) but only ever emitted compound
with a part class, so there are no collisions. Emission order mirrors the web
emitter rule-for-rule (parts: base then states; variants; compound variants)
so equal-specificity resolution behaves identically on both platforms.

**defaultVariants without `:not()`**: resolved at class-computation time. The
generated lynx DS manifest carries `defaultVariants` per component; the
runtime helper fills in the default value's class when an axis prop is unset,
so an axis class is always present on the carrier.

**Interaction states** (the only states that are pseudo-classes on web):

- `active` → `.zx--pressed`, toggled by `Pressable` (which already tracks
  press). Because it's a stylesheet rule, it may use `var()` — which
  Pressable's inline styles never could. Pressable's inline scale/opacity
  literals remain the zero-config default.
- `focus` / `focus-visible` → `.zx--focus`, toggled by components that
  receive focus events (text inputs). Dropped with a note elsewhere.
- `hover` → dropped on lynx with an info note (touch platform).

**Runtime helper** in lynx-zero:

```ts
export function zx(scope: string, part: string, o?: {
    state?: string;                              // → 'zx--checked'
    flags?: Record<string, boolean>;             // → 'zx--disabled'
    axes?: Record<string, string | undefined>;   // defaults filled from registered DS meta
    orientation?: 'horizontal' | 'vertical';
    class?: string;                              // appended verbatim
}): string;

export function registerDesignSystemMeta(meta: LynxDsManifest): void;  // seeded by the DS artifact
```

The projection function is *specified* in `@sigx/lynx-zero-kit` and mirrored
(~30 lines) in lynx-zero at runtime, kept honest by a parity test that runs
the plugin's projection over the lynx manifest and compares — the established
duplication pattern, entirely within the lynx repo.

**Class prefix / DS coexistence**: the lynx emitter accepts an optional
`classPrefix` (e.g. `hero-`), and lynx-zero components read a provided prefix
from a `<DesignSystemScope prefix>` injectable (default `''`). Apps build
exactly one DS (web's rule); the showcase builds daisy+hero with distinct
prefixes and switches at runtime by swapping the provided prefix +
`clearThemes()` + the other DS's `installThemes()` — the Lynx analogue of the
web playground's `<link>` swap.

## 5. Recipe portability — one source, many targets

Two mechanisms, no overlay files:

1. **Capability-based lowering (the default path).** Well-written recipes
   (var refs, lengths, flex, colors, radius, opacity, typography, portable
   keyframes) compile to every target untouched; foldable expressions lower
   automatically (§3.4); non-portable constructs outside a target section are
   errors that name the fix.

2. **The reserved `at` condition namespace `target-<id>`** for genuine
   divergence. zero-kit reserves the *pattern*, not any names: an emitter
   inlines `target-<its own id>` (no at-rule wrapper) and strips every other
   `target-*` block. A `target-<id>` whose id matches no declared target is a
   validation warning (likely a typo), never silently meaningful:

```ts
parts: {
    root: {
        base: { display: 'flex', borderRadius: 'var(--radius-field)' },
        states: {
            active: { backgroundColor: 'var(--color-primary-soft)' },  // web :active, lynx .zx--pressed
            hover:  { filter: 'brightness(1.05)' },                    // web only; lynx drops w/ note
        },
        at: {
            'target-web':  { base: { transition: 'background-color var(--duration-fast) var(--ease-standard)' } },
            'target-lynx': { base: { /* literal alternative where lowering can't */ } },
        },
    },
},
```

`at` already nests inside `variants` and `compoundVariants`, so target
divergence composes with every existing mechanism for free. Whole-recipe
divergence: pin `targets: ['web']` and write a sibling
`defineRecipe({ component, targets: ['lynx'], … })` (`RecipeInput.targets`
holds target *ids*).

**Value grammar tiers** (published via `TargetCapabilities`, enforced by
target validation):

- *Portable*: literal lengths/numbers/percentages, hex/`rgb()` colors,
  `var()` refs to declared tokens, box-model/flex/border/radius/opacity/font
  props, foldable `oklch()`/`color-mix()`/`calc()`, `@keyframes` with
  portable bodies (Lynx supports CSS animations — the existing spinner spins).
- *Web-only*: pseudo-elements, `selectors` blocks, every `at` condition
  except the `target-<id>` namespace (breakpoints, `@container`,
  `starting-style`, raw `@…`), runtime properties, `light-dark()`,
  filters/backdrop.
- *Lynx-only*: nothing, by design — `target-lynx` exists for literal
  alternatives, not new vocabulary. The same rule applies to any future
  target.

Validation becomes target-aware: the structural pass runs against each
declared target's manifest; the value pass extends the existing vocabulary
machinery with capability checks. `validate --strict` stays the CI gate.

## 6. Lynx artifacts and the theme pipeline

*(Artifact shapes owned and emitted by `@sigx/lynx-zero-kit`; zero-kit only
provides the generic `TargetArtifacts` writer.)*

```
dist/lynx/
  themes.js  (+ .d.ts, .json)      # generated data module
  css/
    zero.css                       # structural literals (+ --text-fixed-*)
    components/<scope>.css         # class-selector recipe CSS
    index.css
  manifest.json                    # lynx DS manifest
```

`themes.js` carries, per DS: the declared vocabulary (roles/sizes/axes), the
text ramp as px numbers (fontScale input), `defaultVariants` per component,
the derivation program, and per theme a **fully materialized** palette (all
hex, `-soft` precomputed in oklab) plus folded `vars` (including derived
tokens) and the swatch. An `installThemes()` entry calls lynx-zero's
`registerTheme()` for each — the exact analogue of a web DS package.

**Compile time (kit, culori)**: oklch→hex, color-mix folding, soft
materialization, calc folding, `systemDark` merging, per-theme component-token
overrides. **Runtime (lynx-zero)**: fontScale multiplication over the text
ramp (`--text-fixed-*` untouched), derivation re-execution for tenant themes,
icon hex resolution, StatusBarSync.

`ThemeProvider` becomes fully data-driven: `buildThemeVars` paints
`theme.colors` + `theme.vars` + the scaled text ramp. The hardcoded
`FONT_DEFAULTS` / `FIELD_STEPS` / `SELECTOR_STEPS` tables die.

**Controller unification** (lynx adopts web's design):

- Three-valued selection: `theme(): string | null` (null = follow system),
  `resolvedScheme()`, `setTheme(name | null)`, `toggle()` via `pair` /
  `pickThemeFor`. Same observable behavior as today's `followSystem()` flag,
  one API shape across platforms.
- Persistence via an injectable storage adapter (default
  `@sigx/lynx-storage`), mirroring web's `storageKey`.
- `clearThemes()` for registry re-seeding (showcase DS switching).

**Stays lynx-only** (platform-motivated): full palettes painted as inline
custom properties by `ThemeProvider` (no `light-dark()`, no `[data-theme]`
selectors on Lynx), `fontScale`, `StatusBarSync`, `useScreenTheme`, the icon
color resolver DI, nested provider sub-scopes (Lynx's `ThemeScope`), runtime
oklab `mixColors` for tenant themes.

## 7. The new `@sigx/lynx-zero` — the single component set

lynx-zero becomes the one component set in the lynx repo: headless compound
components rendering the anatomy as generated classes on Lynx primitives
(`<view>`, `<text>`, `<image>`, `Pressable`, `TouchGuard`), styled entirely
by kit-emitted stylesheets. `lynx-daisyui` and `lynx-heroui` are deleted at
the end of the migration.

**Canonical names = web anatomy names**: Toggle→`switch`, Modal→`dialog`,
Range→`slider`, Collapse→`collapsible`, FormField→`field`, Loading→`spinner`.
Where an anatomy is shared, scope/part/state/flag names are identical on both
platforms; parts a platform cannot render are simply unrendered there (rules
targeting them are inert), and flags a platform never publishes (e.g.
`focus-visible` on touch) are never applied.

### Tier A — shared anatomy with web (parts/states must match; parity-checked)

| Scope | Replaces (lynx) | Notes / mismatches to resolve |
|---|---|---|
| `button` | Button | `focus-visible`/`press-animating` web-only; `pressed` published on Lynx via Pressable. |
| `tabs` | Tabs | Lynx gains the `list` part (and optional `panel`); `active`/`inactive` map directly. |
| `switch` | Toggle | `hidden-input` unrendered on Lynx. Thumb translation stays a JS inline transform; colors/radius from recipe classes. |
| `checkbox` | Checkbox | Adds `indeterminate` support to honor the closed state set; `indicator` stays a part so recipes restyle the glyph. |
| `radio-group` | Radio/RadioGroup | Clean mapping (`radio-mark` → `item-indicator`). |
| `dialog` | Modal | **Anatomy change (web too)**: add `backdrop` part (web emitter maps it to `::backdrop`; Lynx renders the TouchGuard) and a shared `footer` part (replaces Modal.Actions; benefits web). `trigger` optional on Lynx. Closed state via presence behavior, never `display:none`. |
| `select` | Select | `select-option`→`item`, `select-dropdown`→`popup`; `highlighted` web-only; positioning via `behaviors/position`. |
| `slider` | Range | **The one platform-divergent anatomy (web change required)**: superset parts `root, label, control, track, range, thumb, value-text` — web renders `control` (native input), Lynx renders `track`/`range`/`thumb`. Each emitter drops the parts its platform doesn't render. |
| `progress` | Progress | `progress-bar` → `track`/`range`; `indeterminate` via a portable keyframe. |
| `collapsible` | Collapse | Web is `<details>`; Lynx is view + Pressable + measured-height animation. States `open`/`closed` shared. |
| `field` | FormField | Clean: `root, label, description, error`. |
| `input`, `textarea` | Input, Textarea | Native text widgets can't read CSS vars (#225 in lynx repo): the `control` part's colors are bridged from the palette via `useThemeColors` in the component; recipes style the `root` chrome. |

Deferred but cheap later: `accordion` (compose collapsible; no lynx
counterpart today).

### Tier B — shared-name, Lynx-first (registered in the shared namespace so web can adopt later)

`card` (root, body, title, actions, figure) · `alert` (root, icon, content,
title, description, actions) · `badge` · `avatar` (root, image, fallback) ·
`skeleton` · `spinner` · `steps` (root, item [complete/active/incomplete],
indicator, label, separator) · `divider` (root, label) · `rating` (root, item
[filled/empty/partial]) · `table` (root, header, row, cell; `selected` flag
on row).

### Tier C — Lynx-only anatomies

`nav-header` (root, leading, title, trailing) · `nav-tab-bar` (root, item
[active/inactive], icon, label) · `nav-drawer` (backdrop, panel, item,
header) · `swiper-indicator` (root, dot [active/inactive]).

**Deliberately NOT ported to Lynx**: `tooltip` (no hover), `popover` and
`menu` (touch idiom is a sheet — `@sigx/lynx-sheet` exists; a sheet-based
menu anatomy is explicitly out of scope here). `StatusBarSync` renders
nothing themable and stays a theme-engine service, not an anatomy component.
Text/Heading move to `lynx-zero/src/typography/` as foundation primitives
(same tier as Row/Col), reading the `--text-*` ramp.

### Behaviors (`lynx-zero/src/behaviors/`)

| Module | Origin | Notes |
|---|---|---|
| `controllable.ts` | port of web | Near byte-identical over `@sigx/lynx` (same reactive core re-exported). The `model`/`default*`/`onChange` convention becomes law on Lynx. |
| `create-id.ts` | port of web | No SSR, but DI-backed ids still wanted for lists/tests. |
| `selection.ts` | generalized `tabs-selection.ts` | Serves tabs, radio-group, select, rating, nav-tab-bar, swiper-indicator. Keeps the inert-fallback design. |
| `list.ts` | simplified port | Registration-order only (no `compareDocumentPosition`). |
| `press.ts` | evolved `shared/press.ts` | Pressable inline feedback + publishes the `pressed` flag as `.zx--pressed`. No `press-animating`, no `--press-*`. |
| `dismiss.ts` | new | Centralizes the overlay pattern: layer stack, TouchGuard backdrop (#787), `catchtap` on the surface (#260 — no stopPropagation). One implementation replaces four copies. |
| `presence.ts` | new | The safe closed-state rendering (zero-size absolute + opacity 0, never `display:none`). Used by every open/close anatomy. |
| `position.ts` | ported `select-position.ts` | Anchored-dropdown measurement; its test carries over. |

Not ported (no Lynx counterpart): `focus`, `focus-visible`, `roving`,
`typeahead`, Escape handling, web press's coordinate/animation machinery.
Accessibility flows through `accessibility-*` props.

**Shared code policy**: parallel implementation with a header comment naming
the web source file plus conformance tests reusing web's test cases — no
shared runtime package for ~150 portable lines across two lockstep release
trains. Revisit (`@sigx/zero-core`) when a third platform appears.

## 8. Design-system packages live in this repo

- `zero-daisyui` grows the lynx target: same `tokens.ts` + `recipes.ts`,
  exports `.`/`./css` (web) and `./lynx` (stylesheet + themes module +
  `installThemes`).
- **`zero-heroui` is created here as the pilot**: tokens converted from
  `lynx-heroui/src/theme/builtins.ts`, recipes authored fresh. It gets the
  web target essentially for free — proof of "one source, both targets" in
  the other direction. Private (like `zero-material`) pending trademark
  thinking.
- **Nothing DS-shaped remains in the lynx repo.** A lynx app installs
  `@sigx/lynx-zero` + `@sigx/zero-heroui/lynx`; one import loads the
  stylesheet and seeds the registry.
- daisy's markdown/emoji/EditorToolbar adapters move to `@sigx/lynx-markdown`
  / `@sigx/lynx-emoji` component subpaths, rewritten against anatomy
  components — they become DS-agnostic, strictly better than today.
- `lynx-updates-ui` (daisy's real consumer) migrates to lynx-zero components
  in the daisy phase and inherits whatever DS the host app installs.

Rationale for zero-repo residency: this repo owns the kit, the recipe
language, and the contract, and its DS packages are lockstep-versioned with
them. A DS source in the lynx repo would chase kit changes across repos on
every contract tweak; vendoring shared source is the worst of both.

## 9. Migration phases (hero pilots, daisy last)

| Phase | Repo | Work | Milestone / gate |
|---|---|---|---|
| **0** | lynx | Land `behaviors/` (controllable, create-id, selection, list, press, dismiss, presence, position) + typography move. No kit dependency; existing DSes untouched. | Tests green; behavior tests match web's cases. |
| **1** | both | Kit SPI + core refactor + lowering toolkit + built-in web target (this repo); **`@sigx/lynx-zero-kit`** implementing the SPI (lynx repo); lynx repo proves the loop with a throwaway smoke DS. | A showcase screen styled purely by generated classes + a generated theme. On-device verification of the open questions (transition, box-shadow, descendant selectors, the two in-source contradictions). |
| **2** | both | 5 pilot components (`button`, `switch`, `dialog`, `tabs`, `field` — together they exercise press, controllable, dismiss/presence, selection, composition) + `zero-heroui` with recipes for them. | **Go/no-go gate**: side-by-side showcase screen, old `lynx-heroui` vs new stack, visually equivalent. |
| **3** | both | Full Tier A/B/C inventory; complete hero recipes; hero showcase screens re-pointed; hero's tests absorbed as anatomy tests. | **Delete `lynx-heroui`**; repo greps clean. |
| **4** | both | `zero-daisyui` lynx target (+ recipes it lacks: card, badge, nav-* — web benefits too); migrate `lynx-updates-ui`; move markdown/emoji adapters; carry daisy's 26 test files; showcase DS switcher via `classPrefix`. | **Delete `lynx-daisyui`**; `lynx-updates-ui` DS-agnostic; runtime daisy↔hero switching works. |
| **5** | both | Three-valued controller API + persistence adapter + `clearThemes()`; prune `styles/tokens.css` of kit-emitted content; docs (AGENTS.md package tables, READMEs, CHANGELOGs) in both repos. | Release. |

Phases 0–1 are parallelizable; 2 gates 3; 3 gates 4 (daisy strictly after
hero proves the system).

## 10. Open questions

1. **Lynx `transition` and `box-shadow` support extent** — verify on-device
   in Phase 1. Until then both are treated as web-only (info note, not
   error); if supported, promote `--duration-*`/`--ease-*`/`--shadow-*` to
   portable.
2. **Two in-source lynx contradictions** to settle in Phase 1:
   `resolveBoxStyle` writes `var()` into inline styles (documented elsewhere
   as painting transparent); `SwiperIndicator` uses `color-mix()` in inline
   styles (documented elsewhere as unsupported).
3. **Descendant-selector reliability on-device** decides whether showcase
   multi-DS uses scope-classes (`.ds-hero …`) instead of class prefixes.
4. **`zero-heroui` published vs private** — recommend private (trademark).
5. **Derivation grammar** frozen at `mix | mul`; extend only when a real DS
   needs it.
6. **Sheet-based `menu` anatomy** for touch — explicitly out of scope.

## 11. Tracking issues

Filed and cross-linked from #95 (this RFC's tracking issue; #107 is the
pluggability amendment):

- zero repo: #96 contract changes (`--text-fixed-*`, web-only runtime
  properties, settles #53), #97 kit SPI + target-neutral core + lowering
  toolkit + built-in web target (no lynx knowledge — #107), #98 web anatomy
  changes (slider superset, dialog `backdrop`/`footer`), #99 `zero-heroui`
  pilot package, #100 `zero-daisyui` lynx target.
- lynx repo: [signalxjs/lynx#804](https://github.com/signalxjs/lynx/issues/804)
  Phase 0 behaviors,
  [#810](https://github.com/signalxjs/lynx/issues/810) `@sigx/lynx-zero-kit`
  (the Lynx `EmitTarget` plugin),
  [#805](https://github.com/signalxjs/lynx/issues/805)
  Phase 1 kit adoption + on-device verification,
  [#806](https://github.com/signalxjs/lynx/issues/806) Phase 2 pilot
  (go/no-go gate), [#807](https://github.com/signalxjs/lynx/issues/807)
  Phase 3 hero completion + `lynx-heroui` deletion,
  [#808](https://github.com/signalxjs/lynx/issues/808) Phase 4 daisy
  conversion + `lynx-daisyui` deletion,
  [#809](https://github.com/signalxjs/lynx/issues/809) Phase 5 controller
  unification + cleanup + release.
