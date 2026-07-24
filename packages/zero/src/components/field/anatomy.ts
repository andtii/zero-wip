import { defineAnatomy } from '../../contract/anatomy.js';

export const fieldAnatomy = defineAnatomy('field', {
    root: {
        element: 'div',
        flags: ['disabled', 'invalid', 'required'],
        tokens: ['color'],
    },
    label: {
        element: 'label',
        flags: ['disabled', 'invalid', 'required'],
        tokens: ['color', 'text'],
    },
    description: {
        element: 'p',
        tokens: ['color', 'text'],
    },
    error: {
        element: 'p',
        flags: ['invalid'],
        tokens: ['color', 'text'],
    },
});
