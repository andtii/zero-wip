/**
 * The class-name grammar — how the anatomy contract projects onto platforms
 * whose style engines cannot select on attributes (Lynx: class, compound and
 * descendant selectors only; `[data-*]`, pseudo-classes and pseudo-elements
 * do not exist there).
 *
 * On such a target the `data-*` attributes still RENDER — they stay the
 * machine-readable anatomy for tests and tooling — but every styling hook is
 * a class composed by these functions. The functions are the contract: the
 * runtime (e.g. `@sigx/lynx-zero`) derives an element's class list from the
 * same inputs that produce its data-attributes, and the compiler
 * (`@sigx/zero-kit`'s lynx target, which keeps a parity-tested mirror of this
 * module — the kit never depends on zero at runtime) emits selectors from the
 * same grammar. One definition, two readers, no drift.
 *
 * ## The grammar (version 1)
 *
 * | concept     | web selector                            | class            |
 * |-------------|------------------------------------------|------------------|
 * | part        | `[data-scope="tabs"][data-part="tab"]`   | `zx-tabs__tab`   |
 * | state       | `[data-state="open"]`                    | `zx-s-open`      |
 * | flag        | `[data-disabled]`                        | `zx-f-disabled`  |
 * | axis value  | `[data-size="xs"]`                       | `zx-a-size-xs`   |
 * | modifier    | `[data-mod-block]`                       | `zx-m-block`     |
 * | orientation | `[data-orientation="vertical"]`          | `zx-o-vertical`  |
 * | placement   | `[data-placement="top"]`                 | `zx-p-top`       |
 * | theme       | `[data-theme="dark"]`                    | `zx-theme-dark`  |
 * | token host  | `:root`                                  | `zx-root`        |
 *
 * State/flag/axis classes are deliberately scope-agnostic: semantics attach
 * through the compound with the part class (`.zx-tabs__tab.zx-s-active`), and
 * the runtime's emission stays a trivial map over the part's own inputs.
 * Every input is grammar-guarded kebab-case already (`TOKEN_KEY_PATTERN`
 * governs axis/mod names, the state and flag vocabularies are closed), so no
 * escaping is needed; classes are write-only — nothing ever parses one back —
 * so the joining `-` in `zx-a-<axis>-<value>` is unambiguous in practice.
 *
 * ## The axis push-down rule
 *
 * On the web, a non-carrier axis rule reaches a child part through an
 * `@scope ([root][data-size="xs"]) to ([root])` donut. This grammar has no
 * counterpart selector ON PURPOSE: axis and modifier classes appear on EVERY
 * part, stamped by the runtime from carrier context (nearest provider wins,
 * which reproduces `@scope` proximity exactly), and the compiler emits axis
 * rules as flat compounds on the styled part itself — never through a
 * combinator. This also removes the `:not([data-size])` default twins: the
 * runtime always stamps a concrete axis class, explicit or default.
 */

/**
 * Version stamp for the grammar itself, carried by compiled artifacts
 * (`dist/lynx/manifest.json`) so a runtime can refuse CSS emitted under a
 * grammar it does not speak. Bump on any change to the class shapes above.
 */
export const CLASS_GRAMMAR_VERSION = 1;

/**
 * The class every token host carries — the projection of `:root` onto a
 * platform whose custom properties must live on a real element's class
 * (Lynx has no `:root`). The theme provider's host element renders it.
 */
export const HOST_CLASS = 'zx-root';

/** `zx-<scope>__<part>` — the part identity, and every compound's anchor. */
export const partClass = (scope: string, part: string): string => `zx-${scope}__${part}`;

/** `zx-s-<state>` — one machine state from the part's closed set. */
export const stateClass = (state: string): string => `zx-s-${state}`;

/** `zx-f-<flag>` — a presence-only boolean flag (`disabled`, `pressed`, …). */
export const flagClass = (flag: string): string => `zx-f-${flag}`;

/** `zx-a-<axis>-<value>` — a variant-axis value (`color`, `size`, custom). */
export const axisClass = (axis: string, value: string): string => `zx-a-${axis}-${value}`;

/** `zx-m-<name>` — a presence-only design-system modifier. */
export const modClass = (name: string): string => `zx-m-${name}`;

/** `zx-o-<value>` — layout orientation. */
export const orientationClass = (value: string): string => `zx-o-${value}`;

/** `zx-p-<value>` — declared placement (anchored popups, toast, rows). */
export const placementClass = (value: string): string => `zx-p-${value}`;

/** `zx-theme-<name>` — the theme block a token host switches between. */
export const themeClass = (name: string): string => `zx-theme-${name}`;
