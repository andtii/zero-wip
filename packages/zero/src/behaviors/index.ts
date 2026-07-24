// Headless behavior layer — plain setup-time factories over signals.

export type { IdGenerator } from './create-id.js';
export { createId, useIdGenerator, zeroPlugin } from './create-id.js';

export type { ControllableState } from './controllable.js';
export { createControllableState } from './controllable.js';

export type { ListItem, ListController } from './list.js';
export { createListController } from './list.js';

export type { RovingOptions } from './roving.js';
export { createRovingKeydown } from './roving.js';

export { isFocusVisible } from './focus-visible.js';

export { createDismissable } from './dismiss.js';
export type { DismissableOptions } from './dismiss.js';

export { createFocusRestore, focusFirst, getTabbables } from './focus.js';
