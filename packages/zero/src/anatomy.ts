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

export { tabsAnatomy, collapsibleAnatomy, switchAnatomy, dialogAnatomy, popoverAnatomy, tooltipAnatomy, menuAnatomy };

export const anatomies: Record<string, Anatomy> = {
    tabs: tabsAnatomy,
    collapsible: collapsibleAnatomy,
    switch: switchAnatomy,
    dialog: dialogAnatomy,
    popover: popoverAnatomy,
    tooltip: tooltipAnatomy,
    menu: menuAnatomy,
};
