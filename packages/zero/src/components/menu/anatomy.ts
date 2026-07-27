import { defineAnatomy } from '../../contract/anatomy.js';

export const menuAnatomy = defineAnatomy('menu', {
    trigger: {
        element: 'button',
        states: ['open', 'closed'],
        flags: ['disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-field', 'size', 'text'],
        asChild: true,
    },
    popup: {
        element: 'div',
        states: ['open', 'closed'],
        tokens: ['color', 'radius-box'],
    },
    item: {
        element: 'div',
        flags: ['disabled', 'highlighted', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-selector', 'text'],
        asChild: true,
    },
    // A distinct part, not an item variant: it carries a data-state (item is
    // flags-only by contract), and recipes style [data-state="open"] to keep
    // it visually active after focus moves into the submenu.
    'sub-trigger': {
        element: 'div',
        states: ['open', 'closed'],
        flags: ['disabled', 'highlighted', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-selector', 'text'],
        asChild: true,
    },
    // Distinct from `popup` so a side-attached submenu can animate on its own
    // axis (translateX) without descendant selectors.
    'sub-popup': {
        element: 'div',
        states: ['open', 'closed'],
        tokens: ['color', 'radius-box'],
    },
    group: {
        element: 'div',
    },
    'group-label': {
        element: 'div',
        tokens: ['color', 'text'],
    },
    separator: {
        element: 'div',
        tokens: ['color'],
    },
});
