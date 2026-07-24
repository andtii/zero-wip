import { defineAnatomy } from '../../contract/anatomy.js';

export const checkboxAnatomy = defineAnatomy('checkbox', {
    root: {
        element: 'label',
        states: ['checked', 'unchecked', 'indeterminate'],
        flags: ['disabled', 'focus-visible', 'invalid', 'required'],
        tokens: ['color'],
    },
    control: {
        element: 'span',
        states: ['checked', 'unchecked', 'indeterminate'],
        flags: ['disabled', 'focus-visible', 'invalid'],
        tokens: ['color', 'radius-selector', 'size'],
    },
    indicator: {
        element: 'span',
        states: ['checked', 'unchecked', 'indeterminate'],
        tokens: ['color'],
    },
    label: {
        element: 'span',
        states: ['checked', 'unchecked', 'indeterminate'],
        flags: ['disabled'],
        tokens: ['color', 'text'],
    },
    'hidden-input': {
        element: 'input',
    },
});
