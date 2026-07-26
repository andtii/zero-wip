import { defineAnatomy } from '../../contract/anatomy.js';

export const accordionAnatomy = defineAnatomy('accordion', {
    root: {
        element: 'div',
        tokens: ['color', 'radius-box'],
    },
    item: {
        element: 'details',
        states: ['open', 'closed'],
        flags: ['disabled'],
        tokens: ['color', 'radius-box'],
    },
    trigger: {
        element: 'summary',
        states: ['open', 'closed'],
        flags: ['disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-field', 'size', 'text'],
    },
    panel: {
        element: 'div',
        states: ['open', 'closed'],
        tokens: ['color', 'text'],
    },
});
