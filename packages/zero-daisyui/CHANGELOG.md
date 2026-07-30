# Changelog

## [Unreleased]

### Fixed

- **`outline` / `soft` / `ghost` buttons no longer paint with a raw role token**
  (#210). The three transparent-ish fills read a new `--btn-ink` — the role
  mixed toward `--color-base-content`, per role — for their label, their border
  and their focus ring; `solid` is untouched and keeps `--btn-accent` over
  `--btn-on-accent`. A raw role token is a *fill* colour: it is contrast-checked
  against its own `-content` pair and against nothing else, so as ink on a base
  surface it had no floor. `color="neutral"` measured **1.22:1** on `base-100`
  in all three dark themes and 1.11–1.18 on its own `-soft`; `accent` measured
  1.70–1.83 in `light` and `nord`. Measured live through the compiled CSS in
  every theme: **35 of 160** label cells and **11 of 40** outline borders were
  under 3:1 before, **0 and 0** after, worst cell now 3.23:1 (`nord` / `soft` /
  `primary`). The mix partner is `base-content` and not the role's own
  `-content` because `-content` is the pole opposite the *role* — it darkens a
  dark theme's ink straight into a dark surface — while `base-content` is the
  pole opposite the *surface*, so one number per role holds across all five
  themes. This is the ad-hoc `color-mix` #126 exists to replace.

- **`select`, `combobox` and `number-input` are one field** (#219). The three
  now share the same height ramp, inset and `--shadow-xs` elevation: at `md`
  all three measure **48px** (they were 48 / 50 / 50, and 48 / 31 / 31 before
  the height existed at all), and the ramp steps together through `xs`–`xl`.
  The mixin states `box-sizing: border-box`, because `select/trigger` is a
  `<button>` (which every UA gives `border-box`) while the other two controls
  are `<div>`s (`content-box`) — the same declared height measured 2px apart.
  `combobox/control` also changes from `align-items: center` to `stretch`, so
  its input and trigger fill the field they sit in rather than a 31px band
  inside it.
