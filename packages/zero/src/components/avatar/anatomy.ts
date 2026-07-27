import { defineAnatomy } from '../../contract/anatomy.js';

export const avatarAnatomy = defineAnatomy('avatar', {
    root: {
        element: 'span',
        states: ['loading', 'loaded', 'error'],
        tokens: ['color', 'radius-selector', 'size'],
    },
    image: {
        element: 'img',
        states: ['loading', 'loaded', 'error'],
        asChild: true,
    },
    fallback: {
        element: 'span',
        states: ['loading', 'loaded', 'error'],
        tokens: ['color', 'radius-selector', 'text'],
    },
});
