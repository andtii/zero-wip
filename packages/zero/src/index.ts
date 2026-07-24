// @sigx/zero — unstyled, accessible component foundation for SignalX.
//
// Components render a stable data-scope/data-part/data-state anatomy and no
// styling; design systems are pure tokens + CSS compiled by @sigx/zero-kit.

export * from './contract/index.js';
export * from './behaviors/index.js';
export * from './theme/index.js';

export { anatomies } from './anatomy.js';

export { Tabs, tabsAnatomy, useTabsContext } from './components/tabs/index.js';
export type { TabsRootProps, TabsListProps, TabsTabProps, TabsPanelProps, TabsContext, TabsActivationMode } from './components/tabs/index.js';

export { Collapsible, collapsibleAnatomy, useCollapsibleContext } from './components/collapsible/index.js';
export type { CollapsibleRootProps, CollapsibleTriggerProps, CollapsiblePanelProps } from './components/collapsible/index.js';

export { Switch, switchAnatomy } from './components/switch/index.js';
export type { SwitchRootProps } from './components/switch/index.js';

export { Dialog, dialogAnatomy, useDialogContext } from './components/dialog/index.js';
export type {
    DialogRootProps,
    DialogTriggerProps,
    DialogPopupProps,
    DialogTitleProps,
    DialogDescriptionProps,
    DialogCloseProps,
} from './components/dialog/index.js';
