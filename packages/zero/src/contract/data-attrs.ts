/**
 * The normative data-attribute spec — how zero components expose their
 * anatomy and state to CSS. Design systems style *only* against these
 * attributes (plus real pseudo-classes); zero itself ships no styling.
 *
 * ## The spec
 *
 * Every rendered part carries exactly:
 *
 * - `data-scope="<component>"` — component name, kebab-case, on EVERY part.
 * - `data-part="<part>"` — part name, kebab-case, unique within its scope.
 * - `data-state="<value>"` — enumerated lifecycle states only, ONE value at
 *   a time from a closed per-part set (`open|closed`,
 *   `checked|unchecked|indeterminate`, `active|inactive`). Enumerated states
 *   let CSS animate transitions (`[data-state="open"]`).
 * - Boolean flags — presence = true, ABSENT = false, empty-string value
 *   (`data-disabled=""`). Never `data-disabled="false"`. Flags compose:
 *   `[data-part="item"][data-highlighted][data-disabled]`.
 * - `data-orientation="horizontal|vertical"` on parts that need
 *   directional CSS.
 * - Contract variant axes pass through as `data-color` / `data-size` /
 *   `data-variant` — zero attaches no styling to them.
 *
 * The split is machine-checkable: a part has at most one `data-state` value
 * from a closed set, plus any subset of its declared flags.
 */

/**
 * The shared boolean-flag vocabulary. Components never invent synonyms —
 * a new flag is a contract change.
 *
 * `pressed` and `press-animating` are the press-feedback pair, produced by
 * `createPressFeedback`: `pressed` is present while a pointer or key is
 * physically down on the part (the *held* state a design system tints or
 * translates), `press-animating` from press-start until the design system's
 * press animation finishes — not until release, so a one-shot effect like a
 * ripple always plays to completion. The press point is published alongside
 * as `--press-x` / `--press-y` / `--press-r` custom properties.
 */
export const FLAG_VOCABULARY = [
    'disabled',
    'highlighted',
    'selected',
    'invalid',
    'required',
    'readonly',
    'placeholder',
    'focus-visible',
    'pressed',
    'press-animating',
] as const;

export type FlagName = typeof FLAG_VOCABULARY[number];

/**
 * Presence-boolean helper: `dataAttr(props.disabled)` → `'' | undefined`.
 * Spread-friendly: an `undefined` value removes the attribute entirely.
 */
export const dataAttr = (cond: unknown): '' | undefined => (cond ? '' : undefined);

/**
 * Enumerated two-state helper: `stateAttr(open, 'open', 'closed')`.
 */
export const stateAttr = <T extends string, F extends string>(
    cond: unknown,
    truthy: T,
    falsy: F,
): T | F => (cond ? truthy : falsy);

export type Orientation = 'horizontal' | 'vertical';
