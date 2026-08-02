import { component, signal } from 'sigx';
import { Progress, Slider } from '@sigx/zero';
import type { PageEntry } from './registry';

const SliderDemos = component(() => {
    const state = signal({ volume: 40 });

    return () => (
        <>
            <Slider.Root model={() => state.volume}>
                <Slider.Label>Volume</Slider.Label>
                <Slider.Control />
                <Slider.ValueText />
            </Slider.Root>
            <Slider.Root defaultValue={95} invalid>
                <Slider.Label>Invalid (above the allowed budget)</Slider.Label>
                <Slider.Control />
                <Slider.ValueText />
            </Slider.Root>
            {/*
              * The mirror lives here rather than on the Progress page because
              * it is the slider's value it mirrors — the two components share
              * one signal, which only works on one page.
              */}
            <Progress.Root value={state.volume}>
                <Progress.Label>Mirrors the slider</Progress.Label>
                <Progress.Track><Progress.Range /></Progress.Track>
                <Progress.ValueText />
            </Progress.Root>
        </>
    );
}, { name: 'SliderDemos' });

export const sliderPage: PageEntry = {
    id: 'slider',
    title: 'Slider',
    category: 'Forms & inputs',
    Demos: SliderDemos,
};
