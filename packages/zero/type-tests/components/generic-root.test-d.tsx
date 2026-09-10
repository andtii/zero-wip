/**
 * The generic-root pin (#443, the mechanism #438 chose): a root written once
 * against `unknown` and exported through a cast to a generic call signature
 * infers `T` from `items`, types the model as the item unless `itemValue`
 * says otherwise, makes it an array under `multiple`, hands the scoped slot
 * the typed item, and rejects every mismatch — all through sigx's own JSX
 * prop mapping (`JsxProps`), and `compound()` still accepts the cast root.
 *
 * No runtime: a broken inference here is a compile error in `pnpm test:types`.
 */
import { component, compound, signal } from 'sigx';
import type { Define, JSXElement } from 'sigx';
import type { FactoryBrands, JsxProps } from '@sigx/zero/contract';

type RootProps<T, M> =
    & Define.Model<M>
    & Define.Prop<'items', ReadonlyArray<T>, true>
    & Define.Prop<'itemKey', (item: T) => string, false>
    & Define.Event<'valueChange', M>
    & Define.Slot<'item', { item: T }>
    & Define.Slot<'default'>;

const Impl = component<RootProps<unknown, unknown>>(() => () => null as unknown as JSXElement);

type GenericRoot = {
    <T>(props: JsxProps<RootProps<T, T>> & { itemValue?: undefined; multiple?: false }): JSXElement;
    <T>(props: JsxProps<RootProps<T, T[]>> & { itemValue?: undefined; multiple: true }): JSXElement;
    <T, V>(props: JsxProps<RootProps<T, V>> & { itemValue: (item: T) => V; multiple?: false }): JSXElement;
    <T, V>(props: JsxProps<RootProps<T, V[]>> & { itemValue: (item: T) => V; multiple: true }): JSXElement;
} & FactoryBrands;

const Root = Impl as unknown as GenericRoot;
const Select = compound(Root, { Root });

interface Country { code: string; name: string }
const countries: Country[] = [];
const state = signal({ c: null as unknown as Country, cs: [] as Country[], code: '', codes: [] as string[] });

// ── valid ──
export const objectModel = <Root items={countries} model={() => state.c} itemKey={(i) => i.code} onValueChange={(v) => v.name} />;
export const keyModel = <Root items={countries} itemValue={(i) => i.code} model={() => state.code} onValueChange={(v) => v.toUpperCase()} />;
export const primitives = <Root items={['a', 'b']} model={() => state.code} />;
export const multipleObjects = <Root items={countries} multiple model={() => state.cs} onValueChange={(v) => v[0]?.name} />;
export const multipleKeys = <Root items={countries} multiple itemValue={(i) => i.code} model={() => state.codes} />;
export const scopedSlot = <Select.Root items={countries} model={() => state.c} slots={{ item: ({ item }) => <span>{item.name}</span> }} />;
export const tupleForm = <Root items={countries} model={[state, 'c']} />;

// ── invalid ──
// @ts-expect-error — the model is the item unless itemValue says otherwise
export const e1 = <Root items={countries} model={() => state.code} />;
// @ts-expect-error — itemValue returns string, so the model is string
export const e2 = <Root items={countries} itemValue={(i) => i.code} model={() => state.c} />;
// @ts-expect-error — multiple makes the model an array
export const e3 = <Root items={countries} multiple model={() => state.c} />;
// @ts-expect-error — not multiple, so the model is not an array
export const e4 = <Root items={countries} model={() => state.cs} />;
// @ts-expect-error — itemKey's parameter is the item
export const e5 = <Root items={countries} model={() => state.c} itemKey={(i: number) => String(i)} />;
// @ts-expect-error — the change event carries the item
export const e6 = <Root items={countries} model={() => state.c} onValueChange={(v: string) => v} />;
