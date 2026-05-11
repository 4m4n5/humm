# aaam.dev studio icon system

This file documents the icon-design rules that every app in the
`aaam.dev` suite follows, derived from `tir`'s established icon and
extended with `humm` as the second sibling. New apps in the suite
should conform to these rules so the family is recognizable at a
glance on a user's home screen.

Last refreshed: 2026-05-11.

---

## 1. Studio DNA — what every aaam.dev icon shares

| Rule | Spec |
|---|---|
| **Canvas** | 1024×1024, fully opaque RGB, no transparency |
| **Background color** | Warm-near-black `#0B0B12` (matches each app's `bg-app-ink` token) |
| **Composition** | Two simple geometric primitives. No more, no fewer. |
| **Primitive vocabulary** | Circles, arcs, rings, dots, single-period sine waves. **No letterforms. No emoji. No multi-curve organic shapes.** |
| **Source rendering** | Flat. **No shadows, glows, gradients, opacity, translucency in the SVG.** iOS 26 Liquid Glass adds depth at render time; baked-in depth compounds and looks muddy. (Apple HIG, iOS 26.) |
| **Single accent** | One saturated accent per app. ~80–100% chroma. Avoid pure white, neon, very dark, low-saturation grays. |
| **Safe inset** | ≥15% from canvas edge to nearest visual content (Apple's squircle mask sits at ~20%). |
| **Asymmetry as character** | Each app has one structural choice that gives it personality — tir uses an offset dot; humm chooses among the four options below. |
| **No rounded corners in source** | Apple applies the squircle mask. |
| **At-size legibility** | Must read at 60×60pt (Settings list, search results). Two primitives means two pieces of detail to lose; nothing else. |

### Per-app variation slots

Each app picks:

1. **Signature accent color**, distinguishable on a home screen from
   every other accent already in the suite.
2. **Compositional gesture**, drawn from the studio vocabulary, that
   tells the app's core idea in one glance.
3. **Asymmetry direction**, which gives the app its individual
   character.

### Accent color reservation (registry)

| App | Accent | Hex | Notes |
|---|---|---|---|
| `tir` | Electric cyan | `#00E5FF` | Speed / precision / digital |
| `humm` | Saturated rose | `#FF8E9B` | Warmth / intimacy / human |
| _next app_ | _claim one_ | — | Stay distinguishable from cyan and rose at icon size |

Future apps should pick accents that are at least ~60° apart on the
hue wheel from every existing app's accent so they never look like
re-skins of each other on a home screen.

---

## 2. iOS 26 Liquid Glass conformance checklist

Verified against `developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer`
(Apple, 2026). Every aaam.dev icon must pass:

- [ ] **No baked depth** — no shadow, glow, specular highlight,
      blur, opacity, gradient. (System adds these dynamically.)
- [ ] **Fully opaque background** — solid fill, no transparency.
- [ ] **Layered SVG source** — separate background, foreground
      shapes into individual layers in Icon Composer (Xcode 26).
- [ ] **Six-mode preview pass** — looks correct in Default, Dark,
      Clear Light, Clear Dark, Tinted Light, Tinted Dark.
- [ ] **15% safe inset** — content stays clear of the squircle mask.
- [ ] **60pt legibility** — readable in Settings list size.
- [ ] **No text** — text-as-shape-outlines is allowed (logos), but
      legible text inside an app icon is an HIG anti-pattern.

---

## 3. humm — candidate icons

All candidates satisfy the studio DNA: same canvas, same accent
(`#FF8E9B`), same flat-geometry rule. They differ only in
compositional gesture and what the gesture says about humm.

### Round 1 — kept

#### A · "pair within"
Studio ring (= shared orbit) + two clustered offset dots (= the
couple). Direct structural transformation of tir: tir says "one
player at the destination"; humm says "two people inside their
shared orbit." Strongest family cohesion via shared ring grammar.

#### C · "concentric"
Same primitives as tir (ring + single dot), but the dot is
centered instead of offset. tir uses asymmetry to express
"captured / reached"; humm uses symmetry to express "grounded
together at the centre." Maximum studio identity, minimum per-app
character.

#### D · "resonance"
Single-period sine wave + two dots riding it at opposite peaks.
"Two people in counterpoint on the same waveform." Strongest
concept-to-name match — a hum is a shared frequency.

### Round 2 — more in the same spirit

#### E · "two orbits"
Two concentric rings, no dot. Each partner has their own orbit;
they share the centre. Pure ring vocabulary. Closest formal
cousin to tir.

#### F · "tangent rings"
Two rings touching externally at a single point, with one ring
slightly larger to introduce asymmetry. Reads as "two lives
meeting." More figurative than C, more abstract than A.

#### G · "polar pair"
Outer ring + two dots at opposite poles. Same primitives as A
but inverted: where A clusters the dots (intimacy), G separates
them (balance). "Orbiting each other within shared space."

#### H · "duet waves"
Two phase-shifted sine waves weaving through each other (peaks
meet troughs at zero crossings). No dots — the waves themselves
are the couple. "Two voices in counterpoint."

#### I · "in-phase"
D's wave with both dots clustered at the SAME peak instead of
opposite peaks. "Shared frequency, in unison." Subtle inversion
of D's emotional reading.

#### J · "wave-in-ring"
Outer ring containing a sine wave inscribed inside it. Bridges
A/C's ring vocabulary with D's wave vocabulary into one
composition. "Resonance held within shared space."

---

## 4. Picking heuristics

The nine candidates split along three axes:

- **What primitive carries the meaning?**
  - Ring-only: A, C, E, F, G
  - Wave-only: D, H, I
  - Ring + wave: J
- **Where is the dot/subject?**
  - Centered (symmetric, grounded): C
  - Clustered (intimate): A, I
  - Polar / mirrored (balanced): G, H
  - Absent (medium-as-message): E, F, H, J
- **How asymmetric?**
  - Strong asymmetry (most character): A, F
  - Symmetric (most studio identity): C, E, G, J

Mix-and-match by the feeling humm should project. "Intimate &
warm" picks toward A/I/D. "Stable & grounded" picks toward
C/E/G/J. "Lyrical & musical" picks toward D/H/I/J.

---

## 5. After picking — wiring it into the app

1. Set chosen master SVG as `assets/brand/icon-master.svg`.
2. Render to PNG sizes: 1024 (App Store), 180 (iPhone @3x), 167
   (iPad @2x), 152 (iPad @1x), 120 (iPhone Spotlight @2x), 87
   (iPhone Settings @3x), 80, 60 (search), 40 (Notification @2x).
3. Replace `assets/icon.png` (Expo's `icon` field reads from here).
4. For Android adaptive icon: split into foreground (the two
   primitives, transparent background, ≥66% safe area) and
   background (`#0B0B12` solid). Update `assets/adaptive-icon.png`
   if `app.json` references it.
5. Bump `app.json` `ios.buildNumber` and `android.versionCode`.
6. Submit a new build to App Store Connect — icon ships in the
   binary, not as metadata. (No way to swap the live icon
   without a new review.)
7. Optional: keep the current "h" letterform icon as an
   **Alternate App Icon** so users who prefer it can opt in via
   Settings (requires a small bit of native config in Expo).

---

## 6. Web sweep sources (2026-05-11)

- developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer
- createwithswift.com/crafting-liquid-glass-app-icons-with-icon-composer
- getskyscraper.com/blog/liquid-glass-app-icon-design-ios-26-guide
- iconbundlr.com/blog/ios-app-icon-sizes-2026-complete-guide
- iconsearch.info/blog/how-to-build-consistent-icon-system
- wolfnhare.com/designing-app-icons-for-apple-ecosystem-layered-depth-and-brand-consistency
- appscreenshotstudio.com/blog/app-icon-design-2026-the-indie-developer-guide
