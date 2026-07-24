import { defineAnatomy } from '../../contract/anatomy.js';

export const sliderAnatomy = defineAnatomy('slider', {
    root: {
        element: 'div',
        flags: ['disabled', 'invalid', 'focus-visible'],
        tokens: ['color'],
    },
    label: {
        element: 'label',
        flags: ['disabled'],
        tokens: ['color', 'text'],
    },
    input: {
        element: 'input',
        flags: ['disabled', 'invalid', 'focus-visible'],
        tokens: ['color', 'radius-selector', 'size'],
    },
    'value-text': {
        element: 'output',
        tokens: ['color', 'text'],
    },
}, { orientation: true });
