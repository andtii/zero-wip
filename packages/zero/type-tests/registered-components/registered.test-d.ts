/**
 * The gate #316 exists for: every component's REAL prop surface, checked
 * under the REAL emitted zero-basic register golden in this program
 * (`basic.register.d.ts`, kept current by zero-kit's register-dts.test.ts).
 *
 * The other projects assert the vocabulary type aliases; none of them ever
 * imported a component, so the hand-written scope literal inside each
 * `WithVariantAxes<'…'>` — the joint that actually binds a component to its
 * vocabulary entry — was unverified. This file is that verification, for
 * all 31 scopes: the axes the golden wires must narrow to its exact unions,
 * the axes it leaves unwired must be `never`, and a scope with no axis
 * props must stay propless.
 *
 * When a design-system recipe changes what basic wires, the golden changes,
 * and the `Equal` assertions here are the reviewable diff of what apps will
 * feel. When #317 gives the 8 propless components axis props, their
 * `absent` assertions below flip to narrowing assertions — deliberately a
 * compile error here, not a silent widening.
 */
import { Accordion } from '@sigx/zero/accordion';
import { Alert } from '@sigx/zero/alert';
import { Avatar } from '@sigx/zero/avatar';
import { Badge } from '@sigx/zero/badge';
import { Button } from '@sigx/zero/button';
import { Card } from '@sigx/zero/card';
import { Checkbox } from '@sigx/zero/checkbox';
import { Collapsible } from '@sigx/zero/collapsible';
import { Combobox } from '@sigx/zero/combobox';
import { Dialog } from '@sigx/zero/dialog';
import { Divider } from '@sigx/zero/divider';
import { Field } from '@sigx/zero/field';
import { Input } from '@sigx/zero/input';
import { Menu } from '@sigx/zero/menu';
import { NumberInput } from '@sigx/zero/number-input';
import { Popover } from '@sigx/zero/popover';
import { Progress } from '@sigx/zero/progress';
import { RadioGroup } from '@sigx/zero/radio-group';
import { RatingGroup } from '@sigx/zero/rating-group';
import { Select } from '@sigx/zero/select';
import { Skeleton } from '@sigx/zero/skeleton';
import { Slider } from '@sigx/zero/slider';
import { Spinner } from '@sigx/zero/spinner';
import { Switch } from '@sigx/zero/switch';
import { Tabs } from '@sigx/zero/tabs';
import { Textarea } from '@sigx/zero/textarea';
import { Toast } from '@sigx/zero/toast';
import type { ToastOptions } from '@sigx/zero/toast';
import { Toggle } from '@sigx/zero/toggle';
import { ToggleGroup } from '@sigx/zero/toggle-group';
import { TreeView } from '@sigx/zero/tree-view';
import { Tooltip } from '@sigx/zero/tooltip';
import type { Equal, MustBeTrue } from '../assert.js';

/** What zero-basic's tokens declare — the unions the golden emits. */
type BasicColor =
    | 'primary' | 'secondary' | 'accent' | 'neutral'
    | 'info' | 'success' | 'warning' | 'error';
type BasicSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type PropsOf<C extends (...args: never[]) => unknown> = Parameters<C>[0];
/**
 * The axis prop's value union, or the sentinel when the prop does not exist
 * at all. The sentinel keeps "prop absent" distinguishable from
 * "prop present but never" — both matter: the first is a propless scope,
 * the second is a carrier whose axis basic leaves unwired.
 */
type Axis<P, K extends string> =
    K extends keyof P ? Exclude<P[K & keyof P], undefined> : 'absent';

/**
 * An unwired axis is unusable in either of its two spellings: `never`
 * (the vocabulary's type) or absent altogether — sigx's JSX prop surface
 * strips `never`-valued props from the parameter type, so `variant: never`
 * in the golden surfaces as no `variant` key at all. Both mean "no value
 * compiles"; a real union means the axis leaked open.
 */
type Unusable<X> = [X] extends ['absent'] | [never] ? true : false;

/* ── carriers wiring color + size; the variant axis basic leaves unwired
 * must be unusable. The checks stay bare booleans; MustBeTrue is applied at
 * each concrete use site — inside a generic alias its constraint is checked
 * against the deferred conditional's branch union and fails eagerly. */
type CheckColorSize<P> = [
    Equal<Axis<P, 'color'>, BasicColor>,
    Equal<Axis<P, 'size'>, BasicSize>,
    Unusable<Axis<P, 'variant'>>,
][number] extends true ? true : false;

export type _tabs = MustBeTrue<CheckColorSize<PropsOf<typeof Tabs.Root>>>;
export type _switch = MustBeTrue<CheckColorSize<PropsOf<typeof Switch.Root>>>;
export type _checkbox = MustBeTrue<CheckColorSize<PropsOf<typeof Checkbox.Root>>>;
export type _radioGroup = MustBeTrue<CheckColorSize<PropsOf<typeof RadioGroup.Root>>>;
export type _progress = MustBeTrue<CheckColorSize<PropsOf<typeof Progress.Root>>>;
export type _slider = MustBeTrue<CheckColorSize<PropsOf<typeof Slider.Root>>>;
export type _avatar = MustBeTrue<CheckColorSize<PropsOf<typeof Avatar.Root>>>;
export type _combobox = MustBeTrue<CheckColorSize<PropsOf<typeof Combobox.Root>>>;
export type _toggle = MustBeTrue<CheckColorSize<PropsOf<typeof Toggle.Root>>>;
export type _toggleGroup = MustBeTrue<CheckColorSize<PropsOf<typeof ToggleGroup.Root>>>;
export type _numberInput = MustBeTrue<CheckColorSize<PropsOf<typeof NumberInput.Root>>>;
export type _ratingGroup = MustBeTrue<CheckColorSize<PropsOf<typeof RatingGroup.Root>>>;
export type _treeView = MustBeTrue<CheckColorSize<PropsOf<typeof TreeView.Root>>>;
export type _input = MustBeTrue<CheckColorSize<PropsOf<typeof Input.Root>>>;
export type _textarea = MustBeTrue<CheckColorSize<PropsOf<typeof Textarea.Root>>>;
export type _card = MustBeTrue<CheckColorSize<PropsOf<typeof Card.Root>>>;
export type _alert = MustBeTrue<CheckColorSize<PropsOf<typeof Alert.Root>>>;
export type _divider = MustBeTrue<CheckColorSize<PropsOf<typeof Divider.Root>>>;
export type _skeleton = MustBeTrue<CheckColorSize<PropsOf<typeof Skeleton.Root>>>;
export type _spinner = MustBeTrue<CheckColorSize<PropsOf<typeof Spinner.Root>>>;

/* ── the three scopes basic wires a variant vocabulary for ── */
type ButtonProps = PropsOf<typeof Button.Root>;
export type _buttonColor = MustBeTrue<Equal<Axis<ButtonProps, 'color'>, BasicColor>>;
export type _buttonSize = MustBeTrue<Equal<Axis<ButtonProps, 'size'>, BasicSize>>;
export type _buttonVariant = MustBeTrue<Equal<
    Axis<ButtonProps, 'variant'>,
    'solid' | 'outline' | 'soft' | 'ghost'
>>;

type SelectProps = PropsOf<typeof Select.Root>;
export type _selectVariant = MustBeTrue<Equal<
    Axis<SelectProps, 'variant'>,
    'outline' | 'soft' | 'ghost'
>>;

type BadgeProps = PropsOf<typeof Badge.Root>;
export type _badgeVariant = MustBeTrue<Equal<
    Axis<BadgeProps, 'variant'>,
    'solid' | 'soft' | 'outline'
>>;

/* ── literal ergonomics on the reference component ── */
const buttonOk: ButtonProps = { color: 'primary', size: 'md', variant: 'ghost' };
// @ts-expect-error — a typo'd color is a compile error under the register
const buttonTypo: ButtonProps = { color: 'primryy' };
// @ts-expect-error — basic declares no custom axes; the bag is closed
const buttonAxes: ButtonProps = { axes: { density: 'compact' } };
// @ts-expect-error — basic wires no modifiers on button
const buttonMods: ButtonProps = { mods: { block: true } };
export const _use = [buttonOk, buttonTypo, buttonAxes, buttonMods];

/* ── toast: wired in the golden, reachable only through the toaster API ── */
export type _toastOptionColor = MustBeTrue<Equal<
    Exclude<ToastOptions['color'], undefined>,
    BasicColor
>>;

/* ── the 8 propless scopes: no axis props at all (until #317 wires them) ── */
type CheckPropless<P> = [
    Equal<Axis<P, 'color'>, 'absent'>,
    Equal<Axis<P, 'size'>, 'absent'>,
    Equal<Axis<P, 'variant'>, 'absent'>,
][number] extends true ? true : false;

export type _accordion = MustBeTrue<CheckPropless<PropsOf<typeof Accordion.Root>>>;
export type _collapsible = MustBeTrue<CheckPropless<PropsOf<typeof Collapsible.Root>>>;
export type _dialog = MustBeTrue<CheckPropless<PropsOf<typeof Dialog.Root>>>;
export type _field = MustBeTrue<CheckPropless<PropsOf<typeof Field.Root>>>;
export type _menu = MustBeTrue<CheckPropless<PropsOf<typeof Menu.Root>>>;
export type _popover = MustBeTrue<CheckPropless<PropsOf<typeof Popover.Root>>>;
export type _toastRoot = MustBeTrue<CheckPropless<PropsOf<typeof Toast.Root>>>;
export type _tooltip = MustBeTrue<CheckPropless<PropsOf<typeof Tooltip.Root>>>;
