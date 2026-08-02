import { component } from 'sigx';
import { Tooltip } from '@sigx/zero';
import type { PageEntry } from './registry';

const TooltipDemos = component(() => () => (
    <Tooltip.Root>
        <Tooltip.Trigger>Hover me</Tooltip.Trigger>
        <Tooltip.Popup>Tooltips ride the top layer via popover="manual"</Tooltip.Popup>
    </Tooltip.Root>
), { name: 'TooltipDemos' });

export const tooltipPage: PageEntry = {
    id: 'tooltip',
    title: 'Tooltip',
    category: 'Overlays',
    Demos: TooltipDemos,
};
