import { defineAnatomy } from '../../contract/anatomy.js';

export const toastAnatomy = defineAnatomy('toast', {
    viewport: {
        element: 'ol',
    },
    root: {
        element: 'li',
        states: ['open', 'closed'],
        tokens: ['color', 'radius-box', 'text'],
    },
    title: {
        element: 'div',
        tokens: ['color', 'text'],
    },
    description: {
        element: 'div',
        tokens: ['color', 'text'],
    },
    action: {
        element: 'button',
        flags: ['disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-field', 'size', 'text'],
        asChild: true,
    },
    close: {
        element: 'button',
        flags: ['disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-selector'],
        asChild: true,
    },
});
