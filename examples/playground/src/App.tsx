import { component, signal } from 'sigx';
import type { PartProps } from '@sigx/zero';
import {
    Accordion, Avatar, Button, Checkbox, Collapsible, Combobox, Dialog, Field, Menu, NumberInput, Popover,
    Progress, RadioGroup, RatingGroup, Select, Slider, Switch, Tabs, Toast, Toggle, ToggleGroup, Tooltip,
    TreeView, toast,
} from '@sigx/zero';
import { Toolbar } from './Toolbar';
import { activeVocabulary } from './design-systems';

/**
 * Four roles is enough to read a variant row; eight or thirteen turns it into
 * a wall. The design system still decides WHICH four, so a system that renames
 * or drops them shows its own.
 */
const SWATCH_LIMIT = 4;

const avatarSvg = (hue: number): string =>
    'data:image/svg+xml,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">`
        + `<rect width="80" height="80" fill="oklch(70% 0.15 ${hue})"/>`
        + `<circle cx="40" cy="30" r="14" fill="white"/>`
        + `<path d="M12 78c4-20 52-20 56 0z" fill="white"/></svg>`,
    );
const AVATAR_A = avatarSvg(250);
const AVATAR_B = avatarSvg(150);

const COUNTRIES = [
    'Argentina', 'Australia', 'Brazil', 'Canada', 'Denmark', 'Finland',
    'Germany', 'Iceland', 'Japan', 'Kenya', 'Mexico', 'Norway',
    'Portugal', 'Sweden', 'Thailand', 'Uruguay',
];

export const App = component(() => {
    const state = signal({
        tab: 'components',
        switchOn: true,
        dialogOpen: false,
        plan: 'free',
        fruit: '',
        volume: 40,
        avatarSrc: AVATAR_A,
        country: '',
        countryQuery: '',
        countryOpen: false,
        align: ['left'] as string[],
        qty: 2 as number | null,
        stars: 3.5,
        file: '',
    });

    // Read inside the render closure, so switching design systems re-renders
    // the rows against the newly active vocabulary.
    const axes = activeVocabulary;
    const swatchColors = () => axes().colors.slice(0, SWATCH_LIMIT);

    return () => (
        <main style={{ maxWidth: '40rem', margin: '2rem auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' }}>
            <h1>SignalX Zero playground</h1>
            <Toolbar />
            <Toast.Viewport placement="bottom-end" />

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
                        Every row below is read from the active design system's compiled
                        manifest, not from a list written here — so a design system with
                        seven variants shows seven, and one with no <code>color</code>{' '}
                        axis shows no colour row at all. Nothing in this file knows which
                        design system is loaded.
                    </p>
                    {axes().variants.map((variant) => (
                        <p style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <code style={{ width: '7rem' }}>{variant}</code>
                            {/*
                              * A colourless design system fuses colour into `variant`,
                              * so there is nothing to cross it with — one button per
                              * variant is the whole story there.
                              */}
                            {axes().colors.length === 0
                                ? <Button.Root variant={variant}>{variant}</Button.Root>
                                : swatchColors().map((color) => (
                                    <Button.Root color={color} variant={variant}>{color}</Button.Root>
                                ))}
                            <Button.Root variant={variant} disabled>disabled</Button.Root>
                        </p>
                    ))}
                    <p style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <code style={{ width: '7rem' }}>size</code>
                        {axes().sizes.map((size) => (
                            <Button.Root size={size}>{size}</Button.Root>
                        ))}
                    </p>
                    {axes().modifiers.length > 0 && (
                        <p style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/*
                              * Presence-only: `mods` renders `data-mod-<name>` with no
                              * value, the way the anatomy's own flags do.
                              */}
                            <code style={{ width: '7rem' }}>mods</code>
                            {axes().modifiers.map((mod) => (
                                <Button.Root mods={{ [mod]: true }}>{mod}</Button.Root>
                            ))}
                        </p>
                    )}

                    <h2>Switch</h2>
                    <Switch.Root model={() => state.switchOn}>Notifications</Switch.Root>
                    {' '}
                    <Switch.Root color="success" defaultChecked>Autosave</Switch.Root>
                    {' '}
                    <Switch.Root disabled>Disabled</Switch.Root>

                    <h2>Toggle + ToggleGroup</h2>
                    <p>
                        A mode you flip, not a value you submit: <code>aria-pressed</code>{' '}
                        semantics, <code>on|off</code> on <code>data-state</code>. The group
                        keeps one tab stop and roves with arrow keys; its model is always{' '}
                        <code>string[]</code> — <code>multiple</code> changes the setter,
                        not the shape.
                    </p>
                    <p style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Toggle.Root>Mute</Toggle.Root>
                        <Toggle.Root color="warning" defaultPressed>Pinned</Toggle.Root>
                        <Toggle.Root disabled>Disabled</Toggle.Root>
                        <ToggleGroup.Root model={() => state.align} deselectable={false} label="Alignment">
                            <ToggleGroup.Item value="left">Left</ToggleGroup.Item>
                            <ToggleGroup.Item value="center">Center</ToggleGroup.Item>
                            <ToggleGroup.Item value="right">Right</ToggleGroup.Item>
                        </ToggleGroup.Root>
                        <ToggleGroup.Root multiple defaultValue={['bold']} label="Formatting">
                            <ToggleGroup.Item value="bold"><b>B</b></ToggleGroup.Item>
                            <ToggleGroup.Item value="italic"><i>I</i></ToggleGroup.Item>
                            <ToggleGroup.Item value="underline"><u>U</u></ToggleGroup.Item>
                            <ToggleGroup.Item value="strike" disabled><s>S</s></ToggleGroup.Item>
                        </ToggleGroup.Root>
                    </p>

                    <h2>Avatar</h2>
                    <p>
                        Image with graceful fallback: every part mirrors the load status
                        as <code>data-state</code>, a broken or missing <code>src</code>
                        shows the fallback, and the design system decides shape and fill.
                        Swapping the src resets to <code>loading</code> until the new
                        image reports in.
                    </p>
                    <p style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Avatar.Root>
                            <Avatar.Image src={AVATAR_A} alt="A loaded avatar" />
                            <Avatar.Fallback>OK</Avatar.Fallback>
                        </Avatar.Root>
                        <Avatar.Root>
                            <Avatar.Image src="/definitely-missing.png" alt="A broken avatar" />
                            <Avatar.Fallback>404</Avatar.Fallback>
                        </Avatar.Root>
                        <Avatar.Root>
                            <Avatar.Image alt="No image at all" />
                            <Avatar.Fallback>ZX</Avatar.Fallback>
                        </Avatar.Root>
                        <Avatar.Root>
                            <Avatar.Image src={state.avatarSrc} alt="A swappable avatar" />
                            <Avatar.Fallback>…</Avatar.Fallback>
                        </Avatar.Root>
                        <Button.Root
                            variant="outline"
                            onClick={() => { state.avatarSrc = state.avatarSrc === AVATAR_A ? AVATAR_B : AVATAR_A; }}
                        >
                            Swap src
                        </Button.Root>
                    </p>

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
                            <Menu.Sub>
                                <Menu.SubTrigger>Share</Menu.SubTrigger>
                                <Menu.SubPopup>
                                    <Menu.Item value="email">Email</Menu.Item>
                                    <Menu.Item value="link">Copy link</Menu.Item>
                                    <Menu.Sub>
                                        <Menu.SubTrigger>Social</Menu.SubTrigger>
                                        <Menu.SubPopup>
                                            <Menu.Item value="mastodon">Mastodon</Menu.Item>
                                            <Menu.Item value="bluesky">Bluesky</Menu.Item>
                                        </Menu.SubPopup>
                                    </Menu.Sub>
                                </Menu.SubPopup>
                            </Menu.Sub>
                            <Menu.Separator />
                            <Menu.Item value="delete">Delete…</Menu.Item>
                        </Menu.Popup>
                    </Menu.Root>

                    <h2>Context menu</h2>
                    <p>
                        The same menu, opened at the pointer: <code>Menu.ContextTrigger</code>{' '}
                        wraps any surface, right-click (or Shift+F10 for the keyboard —
                        then it anchors to the surface, since a keyboard has no pointer)
                        opens the popup at the point via a virtual anchor. A second
                        right-click repositions in place — no close/reopen flicker.
                    </p>
                    <Menu.Root onSelect={(v) => console.log('context select:', v)}>
                        <Menu.ContextTrigger asChild>
                            {(p: PartProps) => (
                                <div
                                    {...p}
                                    tabIndex={0}
                                    style={{
                                        border: '2px dashed var(--color-base-300)',
                                        borderRadius: '0.5rem',
                                        padding: '2rem',
                                        textAlign: 'center',
                                        userSelect: 'none',
                                    }}
                                >
                                    Right-click (or Shift+F10) anywhere in this box
                                </div>
                            )}
                        </Menu.ContextTrigger>
                        <Menu.Popup>
                            <Menu.Item value="copy">Copy</Menu.Item>
                            <Menu.Item value="paste">Paste</Menu.Item>
                            <Menu.Sub>
                                <Menu.SubTrigger>Send to</Menu.SubTrigger>
                                <Menu.SubPopup>
                                    <Menu.Item value="chat">Chat</Menu.Item>
                                    <Menu.Item value="devices">Devices</Menu.Item>
                                </Menu.SubPopup>
                            </Menu.Sub>
                            <Menu.Separator />
                            <Menu.Item value="inspect">Inspect</Menu.Item>
                        </Menu.Popup>
                    </Menu.Root>

                    <h2>TreeView</h2>
                    <p>
                        The APG tree: the controller exposes only <em>visible</em> nodes
                        through the same flat-list interface every other component uses,
                        so roving and typeahead work unchanged. ArrowRight expands then
                        descends, ArrowLeft collapses then climbs, Enter/Space select —
                        selection and expansion are separate acts.
                    </p>
                    <TreeView.Root model={() => state.file} defaultExpandedValues={['src']}>
                        <TreeView.Label>Project files</TreeView.Label>
                        <TreeView.Tree>
                            <TreeView.Branch value="src">
                                <TreeView.BranchTrigger>
                                    <TreeView.BranchIndicator />
                                    src
                                </TreeView.BranchTrigger>
                                <TreeView.BranchContent>
                                    <TreeView.Item value="src/index.ts">index.ts</TreeView.Item>
                                    <TreeView.Branch value="src/components">
                                        <TreeView.BranchTrigger>
                                            <TreeView.BranchIndicator />
                                            components
                                        </TreeView.BranchTrigger>
                                        <TreeView.BranchContent>
                                            <TreeView.Item value="src/components/App.tsx">App.tsx</TreeView.Item>
                                            <TreeView.Item value="src/components/Nav.tsx">Nav.tsx</TreeView.Item>
                                        </TreeView.BranchContent>
                                    </TreeView.Branch>
                                </TreeView.BranchContent>
                            </TreeView.Branch>
                            <TreeView.Item value="package.json">package.json</TreeView.Item>
                            <TreeView.Item value="secrets.env" disabled>secrets.env</TreeView.Item>
                        </TreeView.Tree>
                    </TreeView.Root>
                    <p><small>Selected: <code>{state.file || '—'}</code></small></p>

                    <h2>Toast</h2>
                    <p>
                        An imperative queue behind a <code>popover="manual"</code> top
                        layer. Presence is runtime-managed — the enter/exit transition
                        is plain two-state CSS, and the node unmounts once the exit
                        finishes. Hover the stack to pause auto-dismiss.
                    </p>
                    <p style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Button.Root onClick={() => toast({ title: 'Saved', description: 'Your changes are safe.', color: 'success' })}>
                            Success toast
                        </Button.Root>
                        <Button.Root color="error" onClick={() => toast({ title: 'Sync failed', description: 'Retrying in 30s.', color: 'error', role: 'alert' })}>
                            Error alert
                        </Button.Root>
                        <Button.Root variant="outline" onClick={() => {
                            const started = toast({ title: 'Uploading…', duration: Infinity });
                            setTimeout(() => toast({ id: started, title: 'Upload complete', color: 'success', duration: 4000 }), 1500);
                        }}>
                            Progress → done
                        </Button.Root>
                        <Button.Root variant="outline" onClick={() => toast({
                            title: 'Undoable action',
                            action: { label: 'Undo', onClick: () => toast({ title: 'Undone', color: 'info' }) },
                            duration: 8000,
                        })}>
                            With action
                        </Button.Root>
                    </p>

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

                    <h2>Combobox</h2>
                    <p>
                        The named-models convention in action: <code>model</code> is the
                        selected value, <code>model:inputValue</code> the text,
                        <code>model:open</code> the popup — and filtering is the
                        consumer's, so this list is a plain <code>.filter()</code> over
                        the bound query.
                    </p>
                    <Combobox.Root
                        model={() => state.country}
                        model:inputValue={() => state.countryQuery}
                        model:open={() => state.countryOpen}
                        name="country"
                        placeholder="Search countries…"
                    >
                        <Combobox.Control>
                            <Combobox.Input />
                            <Combobox.Trigger />
                        </Combobox.Control>
                        <Combobox.Popup>
                            {COUNTRIES
                                .filter((c) => c.toLowerCase().includes(state.countryQuery.toLowerCase()))
                                .map((c) => (
                                    <Combobox.Item value={c.toLowerCase()} key={c}>{c}</Combobox.Item>
                                ))}
                            {COUNTRIES.every((c) => !c.toLowerCase().includes(state.countryQuery.toLowerCase()))
                                ? <Combobox.Empty>No countries match</Combobox.Empty>
                                : null}
                        </Combobox.Popup>
                    </Combobox.Root>
                    <p><small>Selected: <code>{state.country || '—'}</code></small></p>

                    <h2>NumberInput</h2>
                    <p>
                        A spinbutton over a real text input: typing is an uncommitted
                        draft (commits on blur/Enter — parse → clamp → snap), stepping
                        commits immediately, holding a trigger auto-repeats, and the
                        hidden input posts the canonical decimal whatever the display
                        format shows.
                    </p>
                    <p style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <NumberInput.Root model={() => state.qty} min={0} max={99}>
                            <NumberInput.Label>Quantity (0–99)</NumberInput.Label>
                            <NumberInput.Control>
                                <NumberInput.DecrementTrigger>−</NumberInput.DecrementTrigger>
                                <NumberInput.Input />
                                <NumberInput.IncrementTrigger>+</NumberInput.IncrementTrigger>
                            </NumberInput.Control>
                        </NumberInput.Root>
                        <NumberInput.Root defaultValue={19.9} min={0} step={0.1} allowWheel format={(v) => v.toFixed(2)}>
                            <NumberInput.Label>Price (step 0.1, wheel, formatted)</NumberInput.Label>
                            <NumberInput.Control>
                                <NumberInput.DecrementTrigger>−</NumberInput.DecrementTrigger>
                                <NumberInput.Input />
                                <NumberInput.IncrementTrigger>+</NumberInput.IncrementTrigger>
                            </NumberInput.Control>
                        </NumberInput.Root>
                        <NumberInput.Root defaultValue={5} disabled>
                            <NumberInput.Label>Disabled</NumberInput.Label>
                            <NumberInput.Control>
                                <NumberInput.DecrementTrigger>−</NumberInput.DecrementTrigger>
                                <NumberInput.Input />
                                <NumberInput.IncrementTrigger>+</NumberInput.IncrementTrigger>
                            </NumberInput.Control>
                        </NumberInput.Root>
                    </p>
                    <p><small>Quantity model: <code>{state.qty ?? '—'}</code></small></p>

                    <h2>Slider + Progress</h2>
                    <Slider.Root model={() => state.volume}>
                        <Slider.Label>Volume</Slider.Label>
                        <Slider.Control />
                        <Slider.ValueText />
                    </Slider.Root>
                    <Progress.Root value={state.volume}>
                        <Progress.Label>Mirrors the slider</Progress.Label>
                        <Progress.Track><Progress.Range /></Progress.Track>
                        <Progress.ValueText />
                    </Progress.Root>

                    <h2>RatingGroup</h2>
                    <p>
                        Radio semantics with fractional display: hover previews without
                        committing (<code>data-highlighted</code> marks the range), the
                        pointer x decides halves with <code>allowHalf</code>, and the
                        keyboard moves the <em>value</em> — one tab stop that rides{' '}
                        <code>ceil(value)</code>.
                    </p>
                    <p style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <RatingGroup.Root model={() => state.stars} allowHalf name="stars">
                            <RatingGroup.Label>Rate this (halves)</RatingGroup.Label>
                            <RatingGroup.Control>
                                {[1, 2, 3, 4, 5].map((i) => <RatingGroup.Item index={i} />)}
                            </RatingGroup.Control>
                        </RatingGroup.Root>
                        <RatingGroup.Root defaultValue={4} deselectable>
                            <RatingGroup.Label>Whole stars, deselectable</RatingGroup.Label>
                            <RatingGroup.Control>
                                {[1, 2, 3, 4, 5].map((i) => <RatingGroup.Item index={i} />)}
                            </RatingGroup.Control>
                        </RatingGroup.Root>
                        <RatingGroup.Root defaultValue={3.5} allowHalf readonly>
                            <RatingGroup.Label>Readonly average</RatingGroup.Label>
                            <RatingGroup.Control>
                                {[1, 2, 3, 4, 5].map((i) => <RatingGroup.Item index={i} />)}
                            </RatingGroup.Control>
                        </RatingGroup.Root>
                    </p>
                    <p><small>Model: <code>{state.stars}</code></small></p>

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
