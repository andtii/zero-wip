import { component, signal } from 'sigx';
import { Select } from '@sigx/zero';
import { pickVariant } from '../design-systems';
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
              * reads as a button. Every other design system wires none, so
              * `pickVariant` renders the prop off there rather than naming a
              * value that scope does not offer.
              */}
            <p>
                <small>
                    zero-basic wires a per-scope <code>variant</code> here:{' '}
                    <code>outline | soft | ghost</code>. Other design systems
                    offer none, and the prop goes unset.
                </small>
            </p>
            {(['outline', 'soft', 'ghost'] as const).map((v) => (
                <>
                    <Select.Root variant={pickVariant(v)} placeholder={`${v}…`}>
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
