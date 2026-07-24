import { defineAnatomy } from '../../contract/anatomy.js';

export const menuAnatomy = defineAnatomy('menu', {
    trigger: {
        element: 'button',
        states: ['open', 'closed'],
        flags: ['disabled', 'focus-visible'],
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
        flags: ['disabled', 'highlighted'],
        tokens: ['color', 'radius-selector', 'text'],
        asChild: true,
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
