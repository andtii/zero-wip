/**
 * The anatomy registry — every component's machine-readable anatomy,
 * importable WITHOUT pulling any component code. This is what build
 * tooling, the recipe compiler and AI design-system generators consume;
 * `manifest.json` is generated from it.
 */
export { defineAnatomy } from './contract/anatomy.js';
export type { Anatomy, AnatomyJSON, PartSpec, PartJSON, TokenHint } from './contract/anatomy.js';

import type { Anatomy } from './contract/anatomy.js';
import { tabsAnatomy } from './components/tabs/anatomy.js';
import { collapsibleAnatomy } from './components/collapsible/anatomy.js';
import { switchAnatomy } from './components/switch/anatomy.js';
import { dialogAnatomy } from './components/dialog/anatomy.js';
import { popoverAnatomy } from './components/popover/anatomy.js';
import { tooltipAnatomy } from './components/tooltip/anatomy.js';
import { menuAnatomy } from './components/menu/anatomy.js';
import { fieldAnatomy } from './components/field/anatomy.js';
import { checkboxAnatomy } from './components/checkbox/anatomy.js';
import { radioGroupAnatomy } from './components/radio-group/anatomy.js';
import { progressAnatomy } from './components/progress/anatomy.js';
import { sliderAnatomy } from './components/slider/anatomy.js';
import { accordionAnatomy } from './components/accordion/anatomy.js';
import { buttonAnatomy } from './components/button/anatomy.js';
import { selectAnatomy } from './components/select/anatomy.js';
import { avatarAnatomy } from './components/avatar/anatomy.js';
import { toastAnatomy } from './components/toast/anatomy.js';
import { comboboxAnatomy } from './components/combobox/anatomy.js';
import { toggleAnatomy } from './components/toggle/anatomy.js';
import { toggleGroupAnatomy } from './components/toggle-group/anatomy.js';
import { numberInputAnatomy } from './components/number-input/anatomy.js';
import { ratingGroupAnatomy } from './components/rating-group/anatomy.js';
import { treeViewAnatomy } from './components/tree-view/anatomy.js';
import { inputAnatomy } from './components/input/anatomy.js';
import { textareaAnatomy } from './components/textarea/anatomy.js';
import { cardAnatomy } from './components/card/anatomy.js';
import { alertAnatomy } from './components/alert/anatomy.js';
import { badgeAnatomy } from './components/badge/anatomy.js';
import { dividerAnatomy } from './components/divider/anatomy.js';

export {
    buttonAnatomy,
    tabsAnatomy, collapsibleAnatomy, switchAnatomy, dialogAnatomy, popoverAnatomy, tooltipAnatomy, menuAnatomy,
    fieldAnatomy, checkboxAnatomy, radioGroupAnatomy, progressAnatomy, sliderAnatomy, accordionAnatomy, selectAnatomy,
    avatarAnatomy, toastAnatomy, comboboxAnatomy, toggleAnatomy, toggleGroupAnatomy, numberInputAnatomy,
    ratingGroupAnatomy, treeViewAnatomy, inputAnatomy, textareaAnatomy,
    cardAnatomy, alertAnatomy, badgeAnatomy, dividerAnatomy,
};

export const anatomies = {
    button: buttonAnatomy,
    tabs: tabsAnatomy,
    collapsible: collapsibleAnatomy,
    switch: switchAnatomy,
    dialog: dialogAnatomy,
    popover: popoverAnatomy,
    tooltip: tooltipAnatomy,
    menu: menuAnatomy,
    field: fieldAnatomy,
    checkbox: checkboxAnatomy,
    'radio-group': radioGroupAnatomy,
    progress: progressAnatomy,
    slider: sliderAnatomy,
    accordion: accordionAnatomy,
    select: selectAnatomy,
    avatar: avatarAnatomy,
    toast: toastAnatomy,
    combobox: comboboxAnatomy,
    toggle: toggleAnatomy,
    'toggle-group': toggleGroupAnatomy,
    'number-input': numberInputAnatomy,
    'rating-group': ratingGroupAnatomy,
    'tree-view': treeViewAnatomy,
    input: inputAnatomy,
    textarea: textareaAnatomy,
    card: cardAnatomy,
    alert: alertAnatomy,
    badge: badgeAnatomy,
    divider: dividerAnatomy,
} as const satisfies Record<string, Anatomy>;

/**
 * The registry with its literal keys — `as const satisfies` rather than a
 * `Record` annotation, which would erase the key set this type exists to
 * carry.
 */
export type ZeroAnatomies = typeof anatomies;

/**
 * Every component scope, as a closed literal union. A generated
 * `register.d.ts` asserts its `components` keys against this, so a typo'd or
 * version-skewed scope fails to compile instead of silently taking the open
 * fallback (RFC 0002 §3.1).
 */
export type ZeroScope = keyof ZeroAnatomies & string;
