# Hum - rituals — design system reference

**Purpose**: the single source of truth for layout, color, typography,
motion, and component patterns in the humm app. Colors live in
[`tailwind.config.js`](../tailwind.config.js) and
[`constants/theme.ts`](../constants/theme.ts) (kept in sync).

**Related**: [`AGENTS.md`](./AGENTS.md) (stack & conventions),
[`APPS_AND_FEATURES.md`](./APPS_AND_FEATURES.md) (product),
[`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) (component locations).

**Voice**: lowercase, warm, concise; lean on UI (color, layout, glyphs)
over prose. Store name is the only consistent capital-cased exception
(`Hum - rituals`).

---

## Core rules (inherited + locked 2026-05-08)

| Rule | Value | Notes |
|---|---|---|
| Interactive surfaces | `Pressable` + NativeWind `active:opacity-88` | `TouchableOpacity` is deprecated; do not introduce new usage. |
| Icon box geometry | `h-11 w-11 rounded-xl`, icon size `20` | Used for all feature/nav icon containers (home tiles, awards rows, profile rows). |
| Border opacity (primary) | `/25` on feature-tinted color | Hero cards, nav rows, stat cards. |
| Border opacity (inner) | `/18` on feature-tinted color or `border-hum-border/18` | Quote cards, list rows, dividers, dense surfaces. |
| Ambient glow | `<AmbientGlow tone="{feature}" />` | Required on every screen of a feature, including stack sub-screens. |
| Glyph over emoji | Hero positions and empty states use Ionicons in feature color | Emojis allowed inside content (mood stickers, habit emojis, category emojis). |
| Empty/loading states | Shared EmptyState / LoadingState / LinkPartnerGate | No inline empty or loading states. EmptyState uses ionicon prop (glyph-over-emoji). Every empty state has a primaryAction CTA unless next step is visually adjacent. |
| Section labels | `import { SectionLabel } from '@/components/shared/SectionLabel'` | 10px medium uppercase, 0.18em tracking, `text-hum-dim`. |
| Color discipline | Feature color on halo + border only | `theme.primary` (mendl pink) is the global interactive accent. |

## Color palette — Wes Anderson "Grand Budapest"

Defined in [`constants/theme.ts`](../constants/theme.ts). Each feature
owns one accent for halos and borders only.

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0F0E14` | Canvas. |
| `surface` | `#17151E` | Quiet inner surfaces. |
| `card` | `#1E1C27` | Card body. |
| `border` | `#2E2938` | Default chrome. |
| `text` | `#FAF7F4` | Primary text. |
| `muted` | `#ADA7B3` | Secondary text. |
| `dim` | `#767089` | Tertiary / labels. |
| `primary` | `#E8A09A` | Mendl pink — global interactive accent (CTAs, selection, profile). |
| `secondary` | `#9FB8D2` | Mendl sky — home cool anchor. |
| `bloom` | `#A990C2` | Heather — mood feature. |
| `spark` | `#9FB7BA` | Powder — decide feature. |
| `sage` | `#B5C68F` | Mustard sage — habits feature. |
| `crimson` | `#D27373` | Madame red — reasons feature, habits both-done celebration. |
| `gold` | `#E9C685` | Mustard yellow — awards feature. |
| `petal` | `#E89AAE` | Rose — legacy / unassigned. |

## Typography scale

| Size / weight | Use |
|---|---|
| `text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim` | Section labels (`SectionLabel`). |
| `text-[11px] font-light` | Tertiary metadata (counters, timestamps). |
| `text-[12px] font-light` | Hint copy, micro-explanations. |
| `text-[13px] font-light leading-[20px]` | Page taglines, secondary body. |
| `text-[14px] font-light leading-[22px]` | Standard body inside cards. |
| `text-[15px] font-medium leading-[20px]` | List row titles. |
| `text-[17px] font-medium leading-[22px] tracking-[-0.01em]` | Hero / nav row titles. |
| `text-[20px] font-light leading-[26px]` | Card heroes (rare). |
| `text-[22px] font-extralight tabular-nums` | Stat numerals. |
| `text-[30px] font-extralight leading-[36px] tracking-[-0.02em] text-hum-text` | Stack sub-screen title (`ScreenHeader`). |
| `text-[36px] font-extralight leading-[42px] tracking-[-0.025em] text-hum-text` | Tab root title (`ScreenTitle`). |
| `text-[40px] font-extralight leading-[44px] tracking-[-0.02em] text-hum-primary` | App name (auth screens). |

`maxFontSizeMultiplier` is set on every `Text` that participates in
layout to prevent dynamic-type breakage. Numerals use `tabular-nums`.

## Spacing rhythm

- Horizontal page padding: `px-6` (24px), set by
  [`scrollContentStandard`](../constants/screenLayout.ts).
- Vertical screen gap: `gap: 20` between top-level sections.
- Standard inner gaps: `gap-y-2.5` (rows in a section), `gap-y-3`
  (within a card), `gap-y-4` (between header and body of a card),
  `gap-y-5` (auth form blocks).
- Card padding: `px-5 py-5` for chrome cards, `px-4 py-4` for list rows,
  `px-4 py-3.5` for dense rows.
- Card radii: `rounded-[22px]` for hero/chrome cards,
  `rounded-[20px]` for inputs, `rounded-[18px]` for inner cards / list
  rows, `rounded-xl` for icon boxes, `rounded-full` for pills and
  status chips.
- Stack screen back button: 36×36pt (`h-9 w-9`) circle with
  `bg-hum-surface/55`, `chevron-back` glyph at 19px and 0.85 opacity,
  `hitSlop={16}` to land at a 68pt effective hit area. Defined once in
  `ScreenHeader`.

## Component primitives

| Component | Path | Notes |
|---|---|---|
| `Button` | [`components/shared/Button.tsx`](../components/shared/Button.tsx) | Variants: primary, secondary, ghost, danger. Sizes: sm, md, lg. |
| `Card` | [`components/shared/Card.tsx`](../components/shared/Card.tsx) | Standard chrome wrapper. |
| `Input` | [`components/shared/Input.tsx`](../components/shared/Input.tsx) | Label + text input pair. |
| `EmptyState` | [`components/shared/EmptyState.tsx`](../components/shared/EmptyState.tsx) | Use everywhere; prefer ionicon prop over emoji icon. Do not roll your own. |
| `LinkPartnerGate` | [`components/shared/LinkPartnerGate.tsx`](../components/shared/LinkPartnerGate.tsx) | Full-screen gate for screens requiring a linked partner. Standardises copy, icon, glow, and back-nav. |
| `LoadingState` | [`components/shared/LoadingState.tsx`](../components/shared/LoadingState.tsx) | Use everywhere; do not roll your own. |
| `AmbientGlow` | [`components/shared/AmbientGlow.tsx`](../components/shared/AmbientGlow.tsx) | Required on every feature screen. |
| `ScreenTitle` | [`components/shared/ScreenTitle.tsx`](../components/shared/ScreenTitle.tsx) | Tab roots. |
| `ScreenHeader` | [`components/shared/ScreenHeader.tsx`](../components/shared/ScreenHeader.tsx) | Stack sub-screens. |
| `SectionLabel` | [`components/shared/SectionLabel.tsx`](../components/shared/SectionLabel.tsx) | Eyebrow labels above content groups. |
| `CelebrationBadge` | [`components/shared/CelebrationBadge.tsx`](../components/shared/CelebrationBadge.tsx) | Center badge in full-screen celebrations. |
| `EmojiShower` | [`components/shared/EmojiShower.tsx`](../components/shared/EmojiShower.tsx) | Themed celebration shower with off-screen origins, gravity-consistent particles. |

## Motion

- **Library**: `react-native-reanimated` (Reanimated 4). Legacy
  `react-native` `Animated` is deprecated and fully retired from this
  codebase as of 2026-05-07.
- **Token source**: [`lib/motion.ts`](../lib/motion.ts) is the single
  source of truth. Inline `Easing.bezier(...)` and inline spring configs
  are banned in feature code. Add a named token to `lib/motion.ts` if
  the existing palette doesn't fit.
- **Spring API**: Reanimated 4 perceptual springs
  (`{ duration, dampingRatio }`) are canonical. Physics springs
  (`{ stiffness, damping }`) are reserved for cases where mass/velocity
  matter (none in current code).
- **Token vocabulary**:
  - `M3_EMPHASIZED` / `M3_EMPHASIZED_DECEL` / `M3_EMPHASIZED_ACCEL` /
    `M3_STANDARD` — easing curves.
  - `SPRING_FAST_SPATIAL` / `SPRING_DEFAULT_SPATIAL` /
    `SPRING_SLOW_SPATIAL` — critically damped, no bounce. Use for
    chrome (overlays settling, progress bars filling).
  - `SPRING_EXPRESSIVE_BLOOM` / `SPRING_EXPRESSIVE_SETTLE` /
    `SPRING_EXPRESSIVE_ENTRANCE` — visible bounce. Use for celebratory
    micro-interactions and reveal moments. Source:
    [M3 Expressive](https://m3.material.io/styles/motion/overview/expressive).
  - `TIMING_QUICK_MS` (140) / `TIMING_STANDARD_MS` (240) /
    `TIMING_EMPHASIZED_MS` (320) / `TIMING_EXPRESSIVE_MS` (480) — for
    `withTiming`. Loops longer than ~1500ms (heart breathing) state
    their ms inline with a comment.
- **Reduce-motion**: every `withTiming` / `withSpring` that participates
  in a celebration peak must specify
  `reduceMotion: REDUCE_MOTION_NEVER` so the moment still reads when
  iOS Reduce Motion is on. Continuous loops (heart breathing, partner
  pulse) **must NOT** force `Never`; respect the system flag.
  Vestibular safety wins for ambient motion (Apple HIG, WCAG 2.3.3).
- **Haptics**: `expo-haptics` with `Light` for selection, `Medium` for
  save, `Success` for celebration peak, `Warning` for "almost". Pair
  haptic with the visual peak, not the gesture release.

## Microcopy voice

Voice = **lowercase, fragment, lean-on-UI**. Source of truth for shared
strings: [`constants/hummVoice.ts`](../constants/hummVoice.ts).

### Voice families (exported from `hummVoice.ts`)

- `awardsVoice` — awards feature copy (start alignment, overlap, resolve,
  cheer).
- `reasonsVoice` — reasons feature copy (write/draw, partner-name
  variants, reward strings).
- `decideVoice` — decide feature copy (decide together, randomize, leave
  this pick, save this one, start over, resume).
- `moodVoice` — relative-time labels.
- `errorsVoice` — error toast titles + bodies. Always use these instead
  of inline strings when the alert intent matches.
- `navVoice` — back labels, cancel, done, stay.

### Rules

1. **One verb family per feature.** NN/g Heuristic #4. Do not mix
   "decide / pick / vote / battle" across the same feature; pick one and
   stay with it. The decide flow is `decide \u2192 vote \u2192 randomize`.
2. **Errors follow Avoid \u00b7 Explain \u00b7 Resolve.** Title = `couldn\u2019t <verb>`.
   Body = preserved + next, fragments separated by `\u00b7` (middle-dot).
   No commas, em-dashes, or "Something went wrong". Source: Unicorn Club
   2026.
3. **Buttons name the outcome, \u2264 3 words.** "Send invite" not "Submit",
   "save this one" not "save this decision". Source: NN/g UI copy.
4. **Stack header titles reflect the *current screen*, not the section.**
   Decide tab \u2192 stack subscreens are `pool`, `vote`, `result`, `history`.
   Awards tab \u2192 `this season`, `past season`, `overlap`, `cheer`,
   `alignment`, `your picks`, `award categories`. Apple HIG: "Use a title
   that reflects the current screen's purpose."
5. **Bottom ghost back-buttons name the destination.** `back to awards`,
   `back to pool`, `back to archive`. The header chevron handles
   step-back; the bottom ghost is a destination terminus. Generic `back`
   and `go back` are deprecated. Apple HIG: don\u2019t stack redundant nav.
6. **Separator is the middle-dot `\u00b7`** for two-fragment messages.
   Em-dash `\u2014` and comma are deprecated for fragment separation.
7. **Cancel verb is `cancel` (lowercase).** Use `navVoice.cancel` to
   prevent inline drift.

## Dynamic features

### Partner presence

A presence indicator shows the partner's activity status on the home
screen, below the time-aware greeting. The dot + partner name renders
only when presence ≠ `off`.

| Level | Threshold | Dot color | Animation |
|---|---|---|---|
| `online` | < 5 min since last active | `#4ADE80` (green) | 2.4s sine breathing loop |
| `recent` | < 30 min | `#6EE7A0` (light green) | Static, opacity 0.7 |
| `away` | < 6 hours | `#475569` (slate) | Static, opacity 0.35 |
| `off` | 6+ hours or no data | Hidden | — |

Source: `app/(tabs)/index.tsx` → `usePartnerPresence` hook.
Data: `lastActiveAt` field on `UserProfile`, updated by `heartbeat()`
in `lib/firestore/users.ts` (throttled to once per 2 min, fires on
app foreground via `AppState`).

### Relationship warmth glow

`AmbientGlow` reach varies dynamically based on the couple's engagement
streaks. Computed by `lib/useWarmthReach.ts`, applied globally (the hook
is called inside `AmbientGlow` when no explicit `reach` prop is passed).

| Streak | Weight | Rationale |
|---|---|---|
| Reason streak | ×3.0 | Rarest action — highest value |
| Joint daily habit streak | ×2.0 | Moderate effort |
| Mood both-logged streak | ×1.0 | Most frequent action |

Formula: `reach = min(0.55, 0.35 + weighted × 0.02)`.
Range: 0.35 (cold) → 0.55 (warm). A single mood-streak day adds +0.02;
a 2-day reason streak adds +0.12.

## Accessibility

### Hit targets

Every standalone interactive element must be **≥ 44 × 44 pt** visually.
This meets Apple HIG and WCAG 2.5.5 AAA. Icon-only chrome buttons
(ellipsis, chevron, close) grow to `h-11 w-11` (44pt). Adjacent targets
must have ≥ 8 pt gap to avoid mis-taps.

Use `hitSlop` only as a supplement — e.g. when a 44pt visual target
still needs a larger touch zone (the `ScreenHeader` back chevron uses
`hitSlop={16}` for a 68pt effective zone). Do not rely on `hitSlop`
alone to reach 44pt; the visual target itself must be at least 44pt.

### Screen-reader labels

Every `Pressable` (and any `View` with `onPress`) must have an explicit
`accessibilityLabel` that includes **context**, not just the visible
text. Examples:

- Icon-only: `accessibilityLabel="edit habit"`
- Text button: `accessibilityLabel="save reason"` (not just "save")
- Stateful: `accessibilityLabel="your mood: cozy. tap to change."`

Add `accessibilityRole` (`"button"`, `"checkbox"`, `"link"`, `"tab"`)
and `accessibilityState` (`{ selected, checked, disabled, busy }`)
wherever applicable. `accessibilityHint` is reserved for non-obvious
consequences.

### Dynamic Type (text scaling)

Four tiers, applied via `maxFontSizeMultiplier` on every `<Text>`:

| Tier | Content | `maxFontSizeMultiplier` | `allowFontScaling` |
|---|---|---|---|
| Emoji-only | `🔥`, `🏆`, sticker emoji | — | `false` |
| Tight UI | Eyebrow labels, chip labels, stat counters, tab bar | `1.25` | `true` (default) |
| Body | Card titles, button labels, descriptions, section headers | `1.3` | `true` |
| Long-form | Reason paragraphs, error message bodies, write screen | `1.5` | `true` |

`allowFontScaling={false}` is **only** for emoji-only `<Text>` where
scaling would break layout (icon sizing, alignment). Using it on real
words is an accessibility anti-pattern.

### Contrast

- Body text: ≥ 4.5:1 against its background (WCAG 2.2 AA).
- Large text (≥ 18pt or 14pt bold): ≥ 3:1.
- UI components and focus indicators: ≥ 3:1.

The `hum-dim` token (`#8a929e` at 55% opacity) against `hum-bg`
(`#0f1117`) yields ~4.8:1 — compliant. `hum-muted` (`#b0b6c1`) yields
~7.2:1 — compliant. Feature accents against `hum-card` (`#171b24`)
should be verified per-accent.

## Consistency rubric (audit framework)

Each screen scores 0–3 on each axis. Used to triage and rank weakness.

1. **Animation library** — legacy `Animated` usage where Reanimated belongs
2. **Border opacity tier** — deviations from `/25` primary, `/18` inner
3. **Icon box geometry** — `h-11 w-11 rounded-xl` + size `20`
4. **Pressable vs TouchableOpacity** — `TouchableOpacity` / `activeOpacity` leaks
5. **AmbientGlow presence** — required on every screen of a feature
6. **Empty state form** — uses shared `EmptyState`, glyph over emoji
7. **Loading state form** — uses shared `LoadingState`
8. **Microcopy voice** — lowercase, fragment, lean-on-UI
9. **Spacing rhythm** — `scrollContentStandard` and gap scale (2.5/3/4/5)
10. **Typography scale** — adheres to the size/weight table above
11. **Hit targets** — 44pt minimum, 8pt minimum gap between adjacent targets
12. **Color discipline** — feature color on halo/border only
13. **Stat-card / list-row chrome** — consistent shape, surface, separator
14. **Visual hierarchy / scan path** — primary action is the highest
    contrast element; metadata never out-shouts content

## What is deliberately not in this doc

- Product flow descriptions ([APPS_AND_FEATURES.md](./APPS_AND_FEATURES.md)).
- Firestore data shapes ([DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)).
- Marketing copy ([APP_STORE_LISTING.md](./APP_STORE_LISTING.md)).
