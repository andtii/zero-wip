import { defineAnatomy } from '../../contract/anatomy.js';

// No backdrop part: the native `<dialog>` top layer provides `::backdrop`,
// which design systems style via
// `[data-scope="dialog"][data-part="popup"]::backdrop`.
export const dialogAnatomy = defineAnatomy('dialog', {
    trigger: {
        element: 'button',
        states: ['open', 'closed'],
        flags: ['disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-field', 'size', 'text'],
        asChild: true,
    },
    popup: {
        element: 'dialog',
        states: ['open', 'closed'],
        tokens: ['color', 'radius-box'],
    },
    title: {
        element: 'h2',
        tokens: ['color', 'text'],
    },
    description: {
        element: 'p',
        tokens: ['color', 'text'],
    },
    close: {
        element: 'button',
        flags: ['disabled', 'focus-visible', 'pressed', 'press-animating'],
        tokens: ['color', 'radius-field', 'size'],
        asChild: true,
    },
});
