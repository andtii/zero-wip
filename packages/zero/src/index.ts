// @sigx/zero — unstyled, accessible component foundation for SignalX.
//
// Components render a stable data-scope/data-part/data-state anatomy and no
// styling; design systems are pure tokens + CSS compiled by @sigx/zero-kit.

export * from './contract/index.js';
export * from './behaviors/index.js';
export * from './theme/index.js';

export { anatomies } from './anatomy.js';

export { Button, buttonAnatomy } from './components/button/index.js';
export type { ButtonRootProps } from './components/button/index.js';

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
    DialogFooterProps,
    DialogCloseProps,
} from './components/dialog/index.js';

export { Popover, popoverAnatomy, usePopoverContext } from './components/popover/index.js';
export type {
    PopoverRootProps,
    PopoverTriggerProps,
    PopoverPopupProps,
    PopoverTitleProps,
    PopoverCloseProps,
} from './components/popover/index.js';

export { Tooltip, tooltipAnatomy, useTooltipContext } from './components/tooltip/index.js';
export type { TooltipRootProps, TooltipTriggerProps, TooltipPopupProps } from './components/tooltip/index.js';

export { Menu, menuAnatomy, useMenuContext } from './components/menu/index.js';
export type {
    MenuRootProps,
    MenuTriggerProps,
    MenuPopupProps,
    MenuItemProps,
    MenuGroupProps,
    MenuGroupLabelProps,
    MenuSeparatorProps,
} from './components/menu/index.js';

export { Field, fieldAnatomy } from './components/field/index.js';
export type { FieldRootProps, FieldLabelProps, FieldDescriptionProps, FieldErrorProps } from './components/field/index.js';

export { Checkbox, checkboxAnatomy } from './components/checkbox/index.js';
export type { CheckboxRootProps } from './components/checkbox/index.js';

export { RadioGroup, radioGroupAnatomy, useRadioGroupContext } from './components/radio-group/index.js';
export type { RadioGroupRootProps, RadioGroupItemProps, RadioGroupLabelProps } from './components/radio-group/index.js';

export { Progress, progressAnatomy, useProgressContext } from './components/progress/index.js';
export type {
    ProgressRootProps,
    ProgressLabelProps,
    ProgressTrackProps,
    ProgressRangeProps,
    ProgressValueTextProps,
} from './components/progress/index.js';

export { Slider, sliderAnatomy, useSliderContext } from './components/slider/index.js';
export type { SliderRootProps, SliderLabelProps, SliderControlProps, SliderValueTextProps } from './components/slider/index.js';

export { Accordion, accordionAnatomy, useAccordionContext } from './components/accordion/index.js';
export type { AccordionRootProps, AccordionItemProps, AccordionTriggerProps, AccordionPanelProps } from './components/accordion/index.js';

export { Select, selectAnatomy, useSelectContext } from './components/select/index.js';
export type {
    SelectRootProps,
    SelectTriggerProps,
    SelectValueProps,
    SelectIndicatorProps,
    SelectPopupProps,
    SelectItemProps,
} from './components/select/index.js';

export { Avatar, avatarAnatomy, useAvatarContext } from './components/avatar/index.js';
export type { AvatarStatus, AvatarRootProps, AvatarImageProps, AvatarFallbackProps } from './components/avatar/index.js';

export {
    Toast, toastAnatomy, useToastViewportContext, useToastItemContext,
    createToaster, toaster, toast, useToaster,
} from './components/toast/index.js';
export type {
    ToastPlacement,
    ToastViewportProps,
    ToastRootProps,
    ToastTitleProps,
    ToastDescriptionProps,
    ToastActionProps,
    ToastCloseProps,
    Toaster,
    ToasterOptions,
    ToastData,
    ToastOptions,
    ToastActionData,
    ToastRole,
} from './components/toast/index.js';

export { Combobox, comboboxAnatomy, useComboboxContext } from './components/combobox/index.js';
export type {
    ComboboxRootProps,
    ComboboxControlProps,
    ComboboxInputProps,
    ComboboxTriggerProps,
    ComboboxPopupProps,
    ComboboxItemProps,
    ComboboxEmptyProps,
} from './components/combobox/index.js';
