import { component, signal } from 'sigx';
import {
    Accordion, Checkbox, Collapsible, Dialog, Field, Menu, Popover, Progress,
    RadioGroup, Select, Slider, Switch, Tabs, Tooltip, themeController, listThemes,
} from '@sigx/zero';

export const App = component(() => {
    const state = signal({
        tab: 'components',
        switchOn: true,
        dialogOpen: false,
        plan: 'free',
        fruit: '',
        volume: 40,
    });

    return () => (
        <main style={{ maxWidth: '40rem', margin: '2rem auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' }}>
            <h1>SignalX Zero playground</h1>
            <p>
                Unstyled primitives + one design-system import. Current themes:{' '}
                {listThemes().map((t) => t.name).join(', ') || 'none registered'}
                {' '}
                <button onClick={() => themeController().toggle()}>toggle light/dark</button>
                {' '}
                <button onClick={() => themeController().setTheme(null)}>follow system</button>
            </p>

            <Tabs.Root model={() => state.tab}>
                <Tabs.List>
                    <Tabs.Tab value="components">Components</Tabs.Tab>
                    <Tabs.Tab value="forms">Forms</Tabs.Tab>
                    <Tabs.Tab value="about">About</Tabs.Tab>
                    <Tabs.Tab value="disabled" disabled>Disabled</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="components">
                    <h2>Switch</h2>
                    <Switch.Root model={() => state.switchOn}>Notifications</Switch.Root>
                    {' '}
                    <Switch.Root color="success" defaultChecked>Autosave</Switch.Root>
                    {' '}
                    <Switch.Root disabled>Disabled</Switch.Root>

                    <h2>Collapsible</h2>
                    <Collapsible.Root defaultOpen>
                        <Collapsible.Trigger>What is zero?</Collapsible.Trigger>
                        <Collapsible.Panel>
                            Headless, accessible components rendering a stable
                            data-scope/data-part/data-state anatomy. Styling is a
                            separate, generatable artifact.
                        </Collapsible.Panel>
                    </Collapsible.Root>

                    <h2>Popover, Tooltip, Menu</h2>
                    <Popover.Root placement="bottom-start">
                        <Popover.Trigger>Filters</Popover.Trigger>
                        <Popover.Popup>
                            <Popover.Title>Filters</Popover.Title>
                            <Switch.Root defaultChecked>Only mine</Switch.Root>
                            <br />
                            <Popover.Close>Done</Popover.Close>
                        </Popover.Popup>
                    </Popover.Root>
                    {' '}
                    <Tooltip.Root>
                        <Tooltip.Trigger>Hover me</Tooltip.Trigger>
                        <Tooltip.Popup>Tooltips ride the top layer via popover="manual"</Tooltip.Popup>
                    </Tooltip.Root>
                    {' '}
                    <Menu.Root onSelect={(v) => console.log('menu select:', v)}>
                        <Menu.Trigger>Actions</Menu.Trigger>
                        <Menu.Popup>
                            <Menu.Group>
                                <Menu.GroupLabel>File</Menu.GroupLabel>
                                <Menu.Item value="rename">Rename</Menu.Item>
                                <Menu.Item value="duplicate">Duplicate</Menu.Item>
                            </Menu.Group>
                            <Menu.Separator />
                            <Menu.Item value="delete">Delete…</Menu.Item>
                        </Menu.Popup>
                    </Menu.Root>

                    <h2>Dialog</h2>
                    <Dialog.Root model={() => state.dialogOpen}>
                        <Dialog.Trigger>Open dialog</Dialog.Trigger>
                        <Dialog.Popup>
                            <Dialog.Title>Native top layer</Dialog.Title>
                            <Dialog.Description>
                                This is a real &lt;dialog&gt; — focus trap, Escape and
                                backdrop come from the platform, not from JavaScript.
                            </Dialog.Description>
                            <Dialog.Close>Got it</Dialog.Close>
                        </Dialog.Popup>
                    </Dialog.Root>
                </Tabs.Panel>

                <Tabs.Panel value="forms">
                    <h2>Field + Checkbox</h2>
                    <Field.Root required>
                        <Field.Label>Subscription</Field.Label>
                        <Checkbox.Root defaultChecked>Weekly newsletter</Checkbox.Root>
                        <Field.Description>Wired label, description and required flag — automatically.</Field.Description>
                    </Field.Root>

                    <h2>RadioGroup</h2>
                    <RadioGroup.Root model={() => state.plan}>
                        <RadioGroup.Label>Plan</RadioGroup.Label>
                        <RadioGroup.Item value="free">Free</RadioGroup.Item>
                        <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
                        <RadioGroup.Item value="team">Team</RadioGroup.Item>
                    </RadioGroup.Root>

                    <h2>Select</h2>
                    <Select.Root model={() => state.fruit} placeholder="Pick a fruit…">
                        <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popup>
                            <Select.Item value="apple">Apple</Select.Item>
                            <Select.Item value="banana">Banana</Select.Item>
                            <Select.Item value="cherry">Cherry</Select.Item>
                        </Select.Popup>
                    </Select.Root>

                    <h2>Slider + Progress</h2>
                    <Slider.Root model={() => state.volume}>
                        <Slider.Label>Volume</Slider.Label>
                        <Slider.Input />
                        <Slider.ValueText />
                    </Slider.Root>
                    <Progress.Root value={state.volume}>
                        <Progress.Label>Mirrors the slider</Progress.Label>
                        <Progress.Track><Progress.Range /></Progress.Track>
                        <Progress.ValueText />
                    </Progress.Root>

                    <h2>Accordion</h2>
                    <Accordion.Root defaultValue={['one']}>
                        <Accordion.Item value="one">
                            <Accordion.Trigger>Native details</Accordion.Trigger>
                            <Accordion.Panel>Exclusive by default, `multiple` for many.</Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="two">
                            <Accordion.Trigger>Second section</Accordion.Trigger>
                            <Accordion.Panel>Hello.</Accordion.Panel>
                        </Accordion.Item>
                    </Accordion.Root>

                    <h2>Extensible roles</h2>
                    <p>
                        The <code>brand</code> role below is in no built-in vocabulary —
                        a scoped theme declares it (<code>scripts/gen-brand-theme.mjs</code>,
                        compiled by zero-kit like any design system).
                    </p>
                    <div
                        data-theme="brand"
                        style={{
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            background: 'var(--color-base-100)',
                            color: 'var(--color-base-content)',
                        }}
                    >
                        <span
                            style={{
                                background: 'var(--color-brand)',
                                color: 'var(--color-brand-content)',
                                boxShadow: '0 0 14px var(--brand-glow)',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                            }}
                        >
                            brand
                        </span>
                        {' '}
                        <span
                            style={{
                                background: 'var(--color-brand-soft)',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                            }}
                        >
                            brand-soft (derived)
                        </span>
                    </div>
                </Tabs.Panel>

                <Tabs.Panel value="about">
                    <p>
                        Swap the two design-system imports in <code>main.tsx</code>{' '}
                        (basic ↔ daisyui) and reload — same components, different skin.
                    </p>
                </Tabs.Panel>
                <Tabs.Panel value="disabled">
                    <p>Unreachable.</p>
                </Tabs.Panel>
            </Tabs.Root>
        </main>
    );
});
