// @sigx/zero-ext-example — the ecosystem-component acceptance test.
//
// A component zero doesn't ship, built entirely from @sigx/zero's public
// surface, held to the contract by the published `@sigx/zero/testing`
// assertion, and consumed by a design system through its manifest fragment
// and recipe pack (`./fragment`).

export { stepperAnatomy } from './anatomy.js';
export { Stepper, useStepperContext } from './Stepper.js';
export type { StepperRootProps, StepperItemProps } from './Stepper.js';
export { fragment, recipes } from './fragment.js';
