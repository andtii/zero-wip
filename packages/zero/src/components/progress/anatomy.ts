import { defineAnatomy } from '../../contract/anatomy.js';

export const progressAnatomy = defineAnatomy('progress', {
    root: {
        element: 'div',
        states: ['loading', 'complete', 'indeterminate'],
        tokens: ['color'],
    },
    label: {
        element: 'div',
        tokens: ['color', 'text'],
    },
    track: {
        element: 'div',
        tokens: ['color', 'radius-selector'],
    },
    range: {
        element: 'div',
        states: ['loading', 'complete', 'indeterminate'],
        tokens: ['color', 'radius-selector'],
    },
    'value-text': {
        element: 'div',
        tokens: ['color', 'text'],
    },
});
