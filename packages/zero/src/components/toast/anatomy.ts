import { defineAnatomy } from '../../contract/anatomy.js';

export const toastAnatomy = defineAnatomy('toast', {
    viewport: {
        element: 'ol',
    },
    root: {
        element: 'li',
        parent: 'viewport',
        states: ['open', 'closed'],
        tokens: ['color', 'radius-box', 'text'],
    },
    title: {
        element: 'div',
        parent: 'root',
        tokens: ['color', 'text'],
    },
    description: {
        element: 'div',
        parent: 'root',
        tokens: ['color', 'text'],
    },
    action: {
        element: 'button',
        parent: 'root',
        flags: ['disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-field', 'size', 'text'],
        asChild: true,
    },
    close: {
        element: 'button',
        parent: 'root',
        flags: ['disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-selector'],
        asChild: true,
    },
});
