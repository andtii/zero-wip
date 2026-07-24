# @sigx/zero-basic

Neutral starter design system for [SignalX Zero](https://npmjs.com/package/@sigx/zero) —
readable defaults so a zero app looks sane on day one, and the reference
implementation for generating your own design system with `@sigx/zero-kit`.

```ts
import '@sigx/zero/css';
import '@sigx/zero-basic/css';
import { installThemes } from '@sigx/zero-basic';
installThemes();   // registers the `basic` / `basic-dark` themes
```

Granular imports: `@sigx/zero-basic/css/tokens`, `@sigx/zero-basic/css/tabs`, ….

MIT © Andreas Ekdahl
