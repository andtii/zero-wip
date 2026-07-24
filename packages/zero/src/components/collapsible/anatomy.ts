import { defineAnatomy } from '../../contract/anatomy.js';

export const collapsibleAnatomy = defineAnatomy('collapsible', {
    root: {
        element: 'details',
        states: ['open', 'closed'],
        flags: ['disabled'],
        tokens: ['color', 'radius-box'],
    },
    trigger: {
        element: 'summary',
        states: ['open', 'closed'],
        flags: ['disabled', 'focus-visible'],
        tokens: ['color', 'radius-field', 'size', 'text'],
    },
    panel: {
        element: 'div',
        states: ['open', 'closed'],
        tokens: ['color', 'text'],
    },
});
