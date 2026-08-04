import { defineAnatomy } from '../../contract/anatomy.js';

export const selectAnatomy = defineAnatomy('select', {
    root: {
        element: 'div',
        flags: ['disabled', 'invalid', 'required'],
        tokens: ['color'],
    },
    trigger: {
        element: 'button',
        parent: 'root',
        states: ['open', 'closed'],
        flags: ['disabled', 'invalid', 'focus-visible', 'placeholder', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-field', 'size', 'text'],
        asChild: true,
    },
    value: {
        element: 'span',
        parent: 'trigger',
        flags: ['placeholder'],
        tokens: ['color', 'text'],
    },
    indicator: {
        element: 'span',
        parent: 'trigger',
        states: ['open', 'closed'],
        tokens: ['color'],
    },
    popup: {
        element: 'div',
        parent: 'root',
        states: ['open', 'closed'],
        tokens: ['color', 'radius-box'],
    },
    item: {
        element: 'div',
        parent: 'popup',
        flags: ['selected', 'highlighted', 'disabled', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-selector', 'text'],
        asChild: true,
    },
    'item-indicator': {
        element: 'span',
        parent: 'item',
        flags: ['selected'],
        tokens: ['color'],
    },
    'hidden-input': {
        element: 'input',
        parent: 'root',
    },
});
