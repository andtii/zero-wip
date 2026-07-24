import { render } from 'sigx';
import '@sigx/zero/css';

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
