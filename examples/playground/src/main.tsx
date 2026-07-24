import { render } from 'sigx';
import '@sigx/zero/css';

// A kit-compiled theme declaring a novel `brand` role — the
// extensible-vocabulary demo. Imported before the DS so the DS's later
// :root block overrides the shared base tokens; the brand-only tokens
// (--color-brand*, --brand-glow) stay defined globally and the demo scopes
// itself with [data-theme="brand"].
import './brand-theme.css';

// The design system is ONE import pair. Swap `zero-basic` for
// `zero-daisyui` (CSS + installThemes) and the whole app changes skin —
// no component code touched.
import '@sigx/zero-basic/css';
import { installThemes } from '@sigx/zero-basic';
// import '@sigx/zero-daisyui/css';
// import { installThemes } from '@sigx/zero-daisyui';

import { App } from './App';

installThemes();
render(<App />, document.getElementById('app')!);
