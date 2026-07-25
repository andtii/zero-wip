import { render } from 'sigx';
import '@sigx/zero/css';

// A kit-compiled theme declaring a novel `brand` role — the
// extensible-vocabulary demo. Imported before the DS so the DS's later
// :root block overrides the shared base tokens; the brand-only tokens
// (--color-brand*, --brand-glow) stay defined globally and the demo scopes
// itself with [data-theme="brand"].
import './brand-theme.css';

// The design system is ONE import pair. Swap the two lines for any other
// design system and the whole app changes skin — no component code touched.
// zero-material is the strongest form of the claim: thirteen colour roles
// instead of eight, a level1–level5 elevation ramp, its own easings and a
// dialog that goes full-screen below its own breakpoint, and still nothing
// here changes but these two lines.
import '@sigx/zero-basic/css';
import { installThemes } from '@sigx/zero-basic';
// import '@sigx/zero-daisyui/css';
// import { installThemes } from '@sigx/zero-daisyui';
// import '@sigx/zero-material/css';
// import { installThemes } from '@sigx/zero-material';
// import '@sigx/zero-brutalist/css';
// import { installThemes } from '@sigx/zero-brutalist';

import { App } from './App';

installThemes();
render(<App />, document.getElementById('app')!);
