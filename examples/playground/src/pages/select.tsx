import { component, signal } from 'sigx';
import { Select } from '@sigx/zero';
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
        </>
    );
}, { name: 'SelectDemos' });

export const selectPage: PageEntry = {
    id: 'select',
    title: 'Select',
    category: 'Forms & inputs',
    Demos: SelectDemos,
};
