import { defineAnatomy } from '../../contract/anatomy.js';

export const tooltipAnatomy = defineAnatomy('tooltip', {
    trigger: {
        element: 'button',
        states: ['open', 'closed'],
        flags: ['disabled'],
        asChild: true,
    },
    popup: {
        element: 'div',
        states: ['open', 'closed'],
        tokens: ['color', 'radius-field', 'text'],
    },
});
