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

export { createPressFeedback } from './press.js';
export type { PressFeedbackOptions, PressFeedbackHandlers } from './press.js';

export { createDismissable } from './dismiss.js';
export type { DismissableOptions } from './dismiss.js';

export { createFocusRestore, focusFirst, getTabbables } from './focus.js';

export { createTypeahead } from './typeahead.js';
export type { TypeaheadOptions } from './typeahead.js';

export { createAnchorPosition, fixedPositionStrategy, pointAnchor } from './position.js';
export type {
    Placement, PositionOptions, PositionStrategy, AnchorPositionInput,
    AnchorPositionHandle, PositionAnchor, VirtualAnchor,
} from './position.js';

export { useFieldContext, provideFieldContext } from './field.js';
export type { FieldContext } from './field.js';
