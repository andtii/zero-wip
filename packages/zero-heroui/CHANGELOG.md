# Changelog

`@sigx/zero-heroui` is private and unpublished — it proves the contract rather
than shipping a licensed token set — so there are no released versions to log
against. This file records recipe-level behaviour changes for reviewers and for
the AI skill that reads this package as a reference pair.

## [Unreleased]

### Fixed

- **Dialog, popover and menu triggers are buttons** (#214). All three shipped
  `base: { cursor: 'pointer' }` and a focus ring — three identical inline
  literals, no box, fill, radius, padding or type. zero renders each as a real
  `<button>`, so Chrome supplied the rest: `appearance: auto`, a 2px outset
  bevel, `border-radius: 0`, `padding: 1px 6px` and 13.33px Arial, a few rows
  below HeroUI's own soft-radii tinted buttons on the same page. They now share
  `pressableOverlayTrigger` — the `overlayTrigger` #213 introduced for the
  tooltip, plus Button's own `[data-pressed]` inward scale, which the tooltip
  cannot take because its anatomy declares no `pressed` flag and these three
  do. The `secondary` button box the two consts share is extracted as
  `secondaryButton`, so the treatment lives in one place rather than being
  re-agreed per component.

- **`Dialog.Close` and `Popover.Close` read as controls, not captions** (#218).
  One `ghostClose` recipe served two jobs — a corner ✕ and a labelled dismiss —
  and was shaped for the former: transparent, `2xs` padding, `--hero-muted`
  ink, which gave "Got it" and "Done" a 36×19px grey-text hit area inside an
  otherwise polished surface. The recipe is split by the job the **anatomy**
  implies, not by guesswork about the label:
  - `iconClose` (was `ghostClose`, unchanged in output) is now toast's alone.
    Toast is the one of the three whose anatomy declares a separate `action`
    part for the labelled job, so its `close` is a glyph by construction.
  - `dismissAction` is new, for dialog's and popover's `close`. Neither anatomy
    has an `action` part, so `close` *is* the surface's action — HeroUI's
    `secondary` button box, with the press scale. It stays `secondary` rather
    than `primary` because a recipe cannot know whether the label reads "Got
    it" or "Cancel"; an app that wants to say more can wrap the part.

  The toast ✕ is byte-identical: `toast.css` did not move.
