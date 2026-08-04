import { component, signal } from 'sigx';
import { Select } from '@sigx/zero';
import { activeVocabulary } from '../design-systems';
import type { PageEntry } from './registry';

const SelectDemos = component(() => {
    const state = signal({ fruit: '' });

    return () => (
        <>
            {/*
              * Named like the Combobox page's: the hidden input is
              * what a Select posts, so the interactive one carries the
              * field name it would have in a real form. It is also what
              * identifies this instance to the e2e suite — the invalid
              * sample beside it and the five in the size ramp are the
              * same anatomy, and a spec that means *this* select has to
              * say so rather than take whichever comes first.
              */}
            <Select.Root model={() => state.fruit} name="fruit" placeholder="Pick a fruit…">
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
            {' '}
            <Select.Root invalid placeholder="Pick a fruit…">
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popup>
                    <Select.Item value="apple">Apple</Select.Item>
                    <Select.Item value="banana">Banana</Select.Item>
                </Select.Popup>
            </Select.Root>
            {/*
              * The first scope other than button to wire a variant (#297).
              * zero-basic gives select its OWN three-value vocabulary through
              * `tokens.scopes` — `outline | soft | ghost`, without button's
              * `solid`, because a field filled with the role at full strength
              * reads as a button.
              *
              * The row is the manifest's, not a retyped literal: it maps the
              * live design system's per-scope wired list, so a design system
              * that wires two variants shows two and one that wires none
              * shows none — the same rule the axis rows follow, asked of the
              * scope. Retyping a hardcoded array here was exactly the drift
              * the axis rows already paid for (see the note above
              * `basicManifestUrl` in design-systems.ts).
              */}
            <p>
                <small>
                    Every <code>variant</code> the live design system wires on
                    the <code>select</code> scope, straight from its manifest.
                    zero-basic wires <code>outline | soft | ghost</code>; other
                    design systems wire none here, and the row is empty.
                </small>
            </p>
            {(activeVocabulary().perScope['select']?.variants ?? []).map((v) => (
                <>
                    <Select.Root variant={v} placeholder={`${v}…`}>
                        <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popup>
                            <Select.Item value="apple">Apple</Select.Item>
                            <Select.Item value="banana">Banana</Select.Item>
                        </Select.Popup>
                    </Select.Root>
                    {' '}
                </>
            ))}
        </>
    );
}, { name: 'SelectDemos' });

export const selectPage: PageEntry = {
    id: 'select',
    title: 'Select',
    category: 'Forms & inputs',
    Demos: SelectDemos,
};
