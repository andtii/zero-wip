import { defineAnatomy } from '../../contract/anatomy.js';

export const radioGroupAnatomy = defineAnatomy('radio-group', {
    root: {
        element: 'div',
        flags: ['disabled', 'invalid', 'required'],
        tokens: ['color'],
    },
    label: {
        element: 'div',
        flags: ['disabled', 'invalid', 'required'],
        tokens: ['color', 'text'],
    },
    item: {
        element: 'label',
        states: ['checked', 'unchecked'],
        flags: ['disabled', 'focus-visible'],
        tokens: ['color'],
    },
    'item-control': {
        element: 'span',
        states: ['checked', 'unchecked'],
        flags: ['disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-selector', 'size'],
    },
    'item-indicator': {
        element: 'span',
        states: ['checked', 'unchecked'],
        tokens: ['color'],
    },
    'item-label': {
        element: 'span',
        states: ['checked', 'unchecked'],
        flags: ['disabled'],
        tokens: ['color', 'text'],
    },
    'hidden-input': {
        element: 'input',
    },
}, { orientation: true });
