import { component, signal } from 'sigx';
import { Field, NativeSelect } from '@sigx/zero';
import { DemoRow } from '../demo/Section';
import { pickRole } from '../design-systems';
import type { PageEntry } from './registry';

const CITIES = [
    { value: 'berlin', label: 'Berlin', group: 'Europe' },
    { value: 'lisbon', label: 'Lisbon', group: 'Europe' },
    { value: 'tokyo', label: 'Tokyo', group: 'Asia' },
    { value: 'osaka', label: 'Osaka', group: 'Asia' },
    { value: 'remote', label: 'Remote' },
    { value: 'atlantis', label: 'Atlantis', disabled: true },
];

const NativeSelectDemos = component(() => {
    const state = signal({ city: '' });

    return () => (
        <>
            <p>
                A real <code>&lt;select&gt;</code> in zero anatomy — the
                form-heavy-page workhorse the custom listbox is too heavy for.
                The platform owns the popup, the keyboard and the a11y tree;
                the recipe owns the well (<code>appearance: none</code>) and
                draws the replacement chevron. <code>group</code> renders a
                real <code>&lt;optgroup&gt;</code>.
            </p>
            <DemoRow gap="1rem" align="flex-end">
                {/*
                  * Named by the field it posts (`name="city"`) — the e2e
                  * suite's handle for this instance. The Field names the
                  * control: a <select> is labelable, so Field.Label lands
                  * on it through `for`.
                  */}
                <Field.Root>
                    <Field.Label>City</Field.Label>
                    <NativeSelect
                        model={() => state.city}
                        name="city"
                        placeholder="Pick a city…"
                        options={CITIES}
                    />
                </Field.Root>
                <Field.Root>
                    <Field.Label>City (colored)</Field.Label>
                    <NativeSelect placeholder="Pick a city…" options={CITIES} color={pickRole('secondary')} />
                </Field.Root>
            </DemoRow>
            <DemoRow gap="1rem" align="flex-end">
                <Field.Root>
                    <Field.Label>Disabled</Field.Label>
                    <NativeSelect disabled defaultValue="berlin" options={CITIES} />
                </Field.Root>
                <Field.Root invalid required>
                    <Field.Label>Invalid + required</Field.Label>
                    <NativeSelect placeholder="Pick a city…" options={CITIES} />
                    <Field.Error>Pick one to continue.</Field.Error>
                </Field.Root>
            </DemoRow>
            <p>
                Hand-written <code>&lt;option&gt;</code> children win entirely
                over <code>options</code> — the same precedence Select's and
                Combobox's sugar follows.
            </p>
            <DemoRow gap="1rem" align="flex-end">
                <Field.Root>
                    <Field.Label>Hand-written options</Field.Label>
                    <NativeSelect name="handwritten" defaultValue="two">
                        <option value="one">One</option>
                        <option value="two">Two</option>
                    </NativeSelect>
                </Field.Root>
            </DemoRow>
            <p><small>City model: <code>{state.city || '—'}</code></small></p>
        </>
    );
}, { name: 'NativeSelectDemos' });

export const nativeSelectPage: PageEntry = {
    id: 'native-select',
    title: 'NativeSelect',
    category: 'Forms & inputs',
    Demos: NativeSelectDemos,
};
