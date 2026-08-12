/**
 * The lynx emit target (#351): class-grammar selectors over the same anatomy
 * manifest, tokens baked to literals lynx's engine parses. The recipe emitter
 * and the `runStandardBuild` wiring land in the follow-up PR; until then the
 * pieces here are exercised directly by their tests.
 */
export {
    CLASS_GRAMMAR_VERSION,
    HOST_CLASS,
    partClass,
    stateClass,
    flagClass,
    axisClass,
    modClass,
    orientationClass,
    placementClass,
    themeClass,
} from './class-names.js';
export type { LynxCapabilityReport, LynxFinding } from './capabilities.js';
export {
    INTERACTION_STATE_CLASSES,
    bakeColor,
    bakeSoft,
    emptyReport,
    hasUnsupportedColorFunction,
    runtimePropertyIn,
} from './capabilities.js';
export { compileLynxTokensCss } from './tokens-css.js';
