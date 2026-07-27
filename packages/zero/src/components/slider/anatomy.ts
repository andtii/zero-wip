import { defineAnatomy } from '../../contract/anatomy.js';

// Cross-platform superset anatomy (the one deliberately platform-divergent
// case — see docs/rfcs/0001): the web renders `control` (a native
// `<input type="range">`, thumb styled via its vendor pseudo-elements) and
// never renders `track`/`range`/`thumb`; a platform without a native range
// widget (Lynx) renders `track`/`range`/`thumb` as real views and no
// `control`. Declaring all of them here is what lets one recipe carry both
// projections — rules for parts a platform doesn't render are inert there.
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
    control: {
        element: 'input',
        flags: ['disabled', 'invalid', 'focus-visible', 'pressed'],
        tokens: ['color', 'radius-selector', 'size'],
    },
    track: {
        element: 'div',
        flags: ['disabled'],
        tokens: ['color', 'radius-selector', 'size'],
    },
    range: {
        element: 'div',
        flags: ['disabled'],
        tokens: ['color', 'radius-selector'],
    },
    thumb: {
        element: 'div',
        flags: ['disabled', 'pressed'],
        tokens: ['color', 'radius-selector', 'size'],
    },
    'value-text': {
        element: 'output',
        tokens: ['color', 'text'],
    },
}, { orientation: true });
