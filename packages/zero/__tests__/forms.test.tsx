import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@sigx/runtime-dom';
import { signal } from 'sigx';
import {
    Accordion,
    Checkbox,
    Field,
    Progress,
    RadioGroup,
    Slider,
    accordionAnatomy,
    checkboxAnatomy,
    fieldAnatomy,
    progressAnatomy,
    radioGroupAnatomy,
    sliderAnatomy,
} from '@sigx/zero';
import { expectAnatomy } from './helpers';

let container: HTMLElement;
beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
});

describe('Checkbox', () => {
    it('renders anatomy, syncs model, supports indeterminate', () => {
        const state = signal({ checked: false });
        render(<Checkbox.Root model={[state, 'checked']}>Terms</Checkbox.Root>, container);
        expectAnatomy(container, checkboxAnatomy);
        const input = container.querySelector<HTMLInputElement>('input')!;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        expect(state.checked).toBe(true);
        expect(container.querySelector('[data-part="root"]')!.getAttribute('data-state')).toBe('checked');
    });

    it('indeterminate wins the data-state', () => {
        render(<Checkbox.Root indeterminate defaultChecked />, container);
        expect(container.querySelector('[data-part="control"]')!.getAttribute('data-state')).toBe('indeterminate');
    });
});

describe('Field', () => {
    it('wires label/description/error to the control', () => {
        render(
            <Field.Root invalid required>
                <Field.Label>Email</Field.Label>
                <Checkbox.Root>Subscribe</Checkbox.Root>
                <Field.Description>No spam.</Field.Description>
                <Field.Error>Required.</Field.Error>
            </Field.Root>,
            container,
        );
        expectAnatomy(container, fieldAnatomy);
        const label = container.querySelector<HTMLLabelElement>('[data-part="label"]')!;
        const input = container.querySelector<HTMLInputElement>('input')!;
        expect(label.getAttribute('for')).toBe(input.id);
        expect(input.getAttribute('aria-describedby')).toContain(
            container.querySelector('[data-scope="field"][data-part="description"]')!.id,
        );
        expect(input.required).toBe(true);
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(container.querySelector('[data-scope="field"][data-part="error"]')!.getAttribute('role')).toBe('alert');
        expect(container.querySelector('[data-scope="checkbox"][data-part="root"]')!.getAttribute('data-invalid')).toBe('');
    });
});

describe('RadioGroup', () => {
    it('renders anatomy with a shared generated name and syncs the model', () => {
        const state = signal({ plan: 'free' });
        render(
            <RadioGroup.Root model={[state, 'plan']}>
                <RadioGroup.Label>Plan</RadioGroup.Label>
                <RadioGroup.Item value="free">Free</RadioGroup.Item>
                <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
            </RadioGroup.Root>,
            container,
        );
        expectAnatomy(container, radioGroupAnatomy);
        expect(container.querySelector('[data-part="root"]')!.getAttribute('role')).toBe('radiogroup');
        const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
        expect(radios[0]!.name).toBe(radios[1]!.name);
        expect(radios[0]!.checked).toBe(true);

        radios[1]!.checked = true;
        radios[1]!.dispatchEvent(new Event('change', { bubbles: true }));
        expect(state.plan).toBe('pro');
        expect(container.querySelectorAll('[data-part="item"]')[1]!.getAttribute('data-state')).toBe('checked');
    });
});

describe('Slider', () => {
    it('renders a native range under the model with percent custom property', () => {
        const state = signal({ volume: 30 });
        render(
            <Slider.Root model={[state, 'volume']} min={0} max={100}>
                <Slider.Label>Volume</Slider.Label>
                <Slider.Input />
                <Slider.ValueText />
            </Slider.Root>,
            container,
        );
        expectAnatomy(container, sliderAnatomy);
        const input = container.querySelector<HTMLInputElement>('input[type="range"]')!;
        expect(container.querySelector('label')!.getAttribute('for')).toBe(input.id);
        input.value = '55';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(state.volume).toBe(55);
        expect(container.querySelector('[data-part="value-text"]')!.textContent).toBe('55');
    });
});

describe('Progress', () => {
    it('exposes progressbar semantics and range width', () => {
        render(
            <Progress.Root value={62}>
                <Progress.Label>Uploading</Progress.Label>
                <Progress.Track><Progress.Range /></Progress.Track>
                <Progress.ValueText />
            </Progress.Root>,
            container,
        );
        expectAnatomy(container, progressAnatomy);
        const root = container.querySelector<HTMLElement>('[data-part="root"]')!;
        expect(root.getAttribute('role')).toBe('progressbar');
        expect(root.getAttribute('aria-valuenow')).toBe('62');
        expect(root.getAttribute('data-state')).toBe('loading');
        expect(container.querySelector<HTMLElement>('[data-part="range"]')!.style.width).toBe('62%');
        expect(container.querySelector('[data-part="value-text"]')!.textContent).toBe('62%');
    });

    it('indeterminate without a value', () => {
        render(<Progress.Root><Progress.Track><Progress.Range /></Progress.Track></Progress.Root>, container);
        expect(container.querySelector('[data-part="root"]')!.getAttribute('data-state')).toBe('indeterminate');
    });
});

describe('Accordion', () => {
    function mount(state: { open: string[] }, multiple = false) {
        render(
            <Accordion.Root model={[state, 'open']} multiple={multiple}>
                <Accordion.Item value="a">
                    <Accordion.Trigger>Section A</Accordion.Trigger>
                    <Accordion.Panel>Content A</Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="b">
                    <Accordion.Trigger>Section B</Accordion.Trigger>
                    <Accordion.Panel>Content B</Accordion.Panel>
                </Accordion.Item>
            </Accordion.Root>,
            container,
        );
    }

    it('renders anatomy on native details', () => {
        mount(signal({ open: ['a'] }));
        expectAnatomy(container, accordionAnatomy);
        expect(container.querySelectorAll('details').length).toBe(2);
        expect(container.querySelectorAll('[data-part="item"]')[0]!.getAttribute('data-state')).toBe('open');
    });

    it('single mode swaps the open item', () => {
        const state = signal({ open: ['a'] });
        mount(state);
        const triggers = container.querySelectorAll<HTMLElement>('[data-part="trigger"]');
        triggers[1]!.click();
        expect(state.open).toEqual(['b']);
        expect(container.querySelectorAll('[data-part="item"]')[0]!.getAttribute('data-state')).toBe('closed');
    });

    it('multiple mode accumulates', () => {
        const state = signal({ open: ['a'] });
        mount(state, true);
        container.querySelectorAll<HTMLElement>('[data-part="trigger"]')[1]!.click();
        expect(state.open).toEqual(['a', 'b']);
    });
});
