import { component, signal } from 'sigx';
import {
    Accordion, Button, Checkbox, Collapsible, Dialog, Field, Menu, Popover, Progress,
    RadioGroup, Select, Slider, Switch, Tabs, Tooltip,
} from '@sigx/zero';
import { Toolbar } from './Toolbar';

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
            <Toolbar />

            <Tabs.Root model={() => state.tab}>
                <Tabs.List>
                    <Tabs.Tab value="components">Components</Tabs.Tab>
                    <Tabs.Tab value="forms">Forms</Tabs.Tab>
                    <Tabs.Tab value="about">About</Tabs.Tab>
                    <Tabs.Tab value="disabled" disabled>Disabled</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="components">
                    <h2>Button</h2>
                    <p>
                        The variant axes the contract has always advertised, now with
                        somewhere to apply them. <code>color</code> sets an accent pair;
                        <code>variant</code> decides how the accent is used — so the two
                        axes compose instead of multiplying.
                    </p>
                    {(['solid', 'outline', 'soft', 'ghost'] as const).map((variant) => (
                        <p style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <code style={{ width: '4rem' }}>{variant}</code>
                            {(['primary', 'success', 'warning', 'error'] as const).map((color) => (
                                <Button.Root color={color} variant={variant}>{color}</Button.Root>
                            ))}
                            <Button.Root variant={variant} disabled>disabled</Button.Root>
                        </p>
                    ))}
                    <p style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <code style={{ width: '4rem' }}>size</code>
                        {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
                            <Button.Root size={size}>{size}</Button.Root>
                        ))}
                    </p>

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

                    <h2>Extensible axes</h2>
                    <p>
                        <code>color</code>, <code>size</code> and <code>variant</code> have
                        named props because almost every design language has them — they are
                        not the whole list. <code>axes</code> passes any other axis through
                        as <code>data-&lt;axis&gt;</code>, so a design system with density,
                        emphasis or tone has somewhere to put it. The two rules below are
                        playground CSS rather than a design system; what zero contributes is
                        the attribute reaching the DOM at all.
                    </p>
                    <style>{`
                        .axis-demo [data-density="compact"] { padding-block: 0.15rem; font-size: 0.8rem; }
                        .axis-demo [data-density="spacious"] { padding-block: 0.7rem; letter-spacing: 0.04em; }
                    `}</style>
                    <div class="axis-demo" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Button.Root axes={{ density: 'compact' }}>compact</Button.Root>
                        <Button.Root>default</Button.Root>
                        <Button.Root axes={{ density: 'spacious' }}>spacious</Button.Root>
                    </div>
                </Tabs.Panel>

                <Tabs.Panel value="about">
                    <p>
                        Pick a design system in the toolbar — same components, different
                        skin, no reload. A design system compiles to one stylesheet, so
                        switching is a <code>&lt;link&gt;</code> swap: the new sheet is
                        loaded and awaited before the old one is dropped, which is why
                        there is no unstyled flash.
                    </p>
                    <p>
                        Exactly one is ever live. Token blocks are scoped by{' '}
                        <code>data-theme</code>, but recipe CSS is not — every design
                        system writes the same{' '}
                        <code>[data-scope][data-part]</code> selectors into the same{' '}
                        <code>@layer zero.recipes</code>, so two sheets would blend into
                        a chimera rather than replace one another.
                    </p>
                    <p>
                        The swap leaves nothing behind. <code>@property</code>{' '}
                        registrations sit outside the cascade layers, so you would expect
                        a visited design system's roles — material-only ones like{' '}
                        <code>--color-tertiary</code> — to stay registered for the life of
                        the page. They don't — measured in Chromium: removing the
                        stylesheet withdraws its registrations with it, so switching
                        gets you the same result as loading that design system fresh.
                    </p>
                </Tabs.Panel>
                <Tabs.Panel value="disabled">
                    <p>Unreachable.</p>
                </Tabs.Panel>
            </Tabs.Root>
        </main>
    );
});
