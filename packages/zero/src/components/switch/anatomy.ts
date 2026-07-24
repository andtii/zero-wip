import { defineAnatomy } from '../../contract/anatomy.js';

export const switchAnatomy = defineAnatomy('switch', {
    root: {
        element: 'label',
        states: ['checked', 'unchecked'],
        flags: ['disabled', 'focus-visible', 'invalid', 'required'],
        tokens: ['color'],
    },
    control: {
        element: 'span',
        states: ['checked', 'unchecked'],
        flags: ['disabled', 'focus-visible'],
        tokens: ['color', 'radius-selector', 'size'],
    },
    thumb: {
        element: 'span',
        states: ['checked', 'unchecked'],
        tokens: ['color', 'radius-selector'],
    },
    label: {
        element: 'span',
        states: ['checked', 'unchecked'],
        flags: ['disabled'],
        tokens: ['color', 'text'],
    },
    'hidden-input': {
        element: 'input',
    },
});
