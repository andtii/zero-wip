import { defineAnatomy } from '../../contract/anatomy.js';

export const selectAnatomy = defineAnatomy('select', {
    root: {
        element: 'div',
        flags: ['disabled', 'invalid', 'required'],
        tokens: ['color'],
    },
    trigger: {
        element: 'button',
        states: ['open', 'closed'],
        flags: ['disabled', 'invalid', 'focus-visible', 'placeholder'],
        tokens: ['color', 'radius-field', 'size', 'text'],
        asChild: true,
    },
    value: {
        element: 'span',
        flags: ['placeholder'],
        tokens: ['color', 'text'],
    },
    indicator: {
        element: 'span',
        states: ['open', 'closed'],
        tokens: ['color'],
    },
    popup: {
        element: 'div',
        states: ['open', 'closed'],
        tokens: ['color', 'radius-box'],
    },
    item: {
        element: 'div',
        flags: ['selected', 'highlighted', 'disabled'],
        tokens: ['color', 'radius-selector', 'text'],
        asChild: true,
    },
    'item-indicator': {
        element: 'span',
        flags: ['selected'],
        tokens: ['color'],
    },
    'hidden-input': {
        element: 'input',
    },
});
