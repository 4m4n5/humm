# Hum brand assets

Locked 2026-05-12 as part of the repackage from `humm` /
`com.humtum.app` to `Hum` / `dev.aaam.hum`. See `REPACKAGE_PLAN.md`
in the repo root for the full migration plan and audit history.

## Source files

| File | Purpose |
|---|---|
| `icon-master.svg` | Canonical 1024x1024 icon. Solid `#0B0B12` canvas, single-period sine wave with two-tone candlelight halo. Source of truth for `assets/icon.png` and any marketing renders. |
| `icon-adaptive-foreground.svg` | Same composition as `icon-master.svg` but with no canvas fill. Source for `assets/adaptive-icon.png`; Android composites it over `app.json` adaptiveIcon.backgroundColor. |

## Composition: "candlelight resonance"

- A single-period sine wave drawn with a saturated rose stroke
  (`#FF8E9B`, 40px, round caps).
- Two-tone halo behind the stroke:
  - Outer corona: warm coral (`#FFB392`), wide gaussian blur
    (stdDev 42, 70% opacity).
  - Inner core: rose (`#FF8E9B`), tight gaussian blur (stdDev 14).
- Mimics the physics of candlelight: a bright cool core surrounded
  by warm falloff. Reads as quiet, intimate, lit-from-within.

## Color tokens

| Token | Hex | Where |
|---|---|---|
| Canvas | `#0B0B12` | `icon-master.svg` background, `app.json` `splash.backgroundColor` and `adaptiveIcon.backgroundColor` (set in Phase 2) |
| Stroke (rose) | `#FF8E9B` | All three wave path strokes |
| Outer halo (coral) | `#FFB392` | Outer feGaussianBlur path only |

## aaam.dev studio system conformance

Hum slots into the studio family established by `tir`:

- Same warm-near-black canvas (`#0B0B12`).
- Single saturated accent (rose `#FF8E9B`); the corona is a halo
  effect, not a second mark color, so the studio "single accent"
  rule still holds.
- Two flat geometric primitives in source (the wave path - drawn
  three times with different filter passes - and an implicit
  background). Liquid Glass / iOS 26 can apply additional dynamic
  depth on top.
- Asymmetry-as-character: the wave's two peaks (one up, one down)
  carry the asymmetry that distinguishes Hum from a centered or
  symmetric mark.

## Re-rendering the PNG assets

```bash
cd humm
rsvg-convert -w 1024 -h 1024 assets/brand/icon-master.svg \
  -o assets/icon.png
rsvg-convert -w 1024 -h 1024 assets/brand/icon-adaptive-foreground.svg \
  -o assets/adaptive-icon.png
```

`rsvg-convert` is libRSVG's CLI; install via `brew install librsvg`
if missing. Cairo handles the gaussian blur faithfully; the result
matches preview render in any modern browser opening the SVG
directly.

## Accent registry (aaam.dev suite)

| App | Bundle | Accent | Hex | Marketing line |
|---|---|---|---|---|
| `tir` | `com.tirapp` | Electric cyan | `#00E5FF` | speed, precision |
| `Hum` | `dev.aaam.hum` | Saturated rose | `#FF8E9B` | warm, intimate |

Future apps reserve accents at least 60 deg apart on the hue wheel
from every existing app's accent.
