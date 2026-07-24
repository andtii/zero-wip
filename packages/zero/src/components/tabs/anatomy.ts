import { defineAnatomy } from '../../contract/anatomy.js';

export const tabsAnatomy = defineAnatomy('tabs', {
    root: {
        element: 'div',
        tokens: ['color'],
    },
    list: {
        element: 'div',
        tokens: ['color', 'radius-field'],
    },
    tab: {
        element: 'button',
        states: ['active', 'inactive'],
        flags: ['disabled', 'focus-visible'],
        tokens: ['color', 'radius-field', 'size', 'text'],
        asChild: true,
    },
    panel: {
        element: 'div',
        states: ['active', 'inactive'],
        tokens: ['color', 'radius-box', 'text'],
    },
}, { orientation: true });
