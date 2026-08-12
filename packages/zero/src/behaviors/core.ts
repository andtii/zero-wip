/**
 * `@sigx/zero/behaviors/core` — the platform-neutral behavior subset.
 *
 * Everything exported here is importable without `lib.dom`: no DOM types in
 * any signature, no DOM globals in any body (held honest by the `portable`
 * type-test project, which compiles this module graph under
 * `lib: ["es2022"]`). This is the entry a non-DOM runtime (`@sigx/lynx-zero`)
 * builds its component layer on; the full `@sigx/zero/behaviors` barrel keeps
 * the web-typed view of the same controllers plus the genuinely DOM-bound
 * behaviors (focus, press, dismiss listeners, anchored positioning).
 *
 * The list controller comes from `list-core.ts` with its element type OPEN
 * (`ItemElement`, a two-member structural slice of `HTMLElement`): a platform
 * that never mounts DOM elements registers `el: () => null` and gets the
 * registration-order fallback — depth-first render order, which IS visual
 * order there.
 */

export type { IdGenerator } from './create-id.js';
export { createId, useIdGenerator, zeroPlugin } from './create-id.js';

export type { ControllableState } from './controllable.js';
export { createControllableState } from './controllable.js';

export type { HighlightStep, ItemElement, ListController, ListItem } from './list-core.js';
export { createListController, moveHighlight, sortByDomOrder } from './list-core.js';

export { useFieldContext, provideFieldContext } from './field.js';
export type { FieldContext } from './field.js';

export { segmentOptions } from './options.js';
export type { OptionInput, OptionSegment } from './options.js';
