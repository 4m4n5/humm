# Hum - rituals — consistency audit

A living plan + progress tracker for the app-wide design consistency pass.
Goal: every screen feels like it was designed by one team. Updated each
session. Companion to [`DESIGN.md`](./DESIGN.md) (the rules) — this file
tracks the work of *applying* those rules.

**Owner**: design + engineering, in the loop. **Last updated**: 2026-05-07.

---

## Phase 0 — Foundations · DONE

- ✅ 14-axis consistency rubric in [`DESIGN.md § Consistency rubric`](./DESIGN.md#consistency-rubric-audit-framework).
- ✅ DESIGN.md rewritten as the canonical rule reference.
- ✅ Wes Anderson "Grand Budapest" palette adopted across `tailwind.config.js`
  and `constants/theme.ts`.

## Phase 1 — Per-screen audit · DONE

All 30 screens in `app/(tabs)/**` and `app/(auth)/**` scored against the
14-axis rubric. Weakest-first ordering established for Phase 2.

## Phase 2 — Per-feature batch fixes · ESSENTIALLY DONE

- ✅ `AmbientGlow tone="{feature}"` added to every stack sub-screen
  (awards, decide, profile, auth all covered).
- ✅ Two-tier border opacity (`/25` outer, `/18` inner) applied across
  feature cards.
- ✅ Standard icon-box geometry (`h-11 w-11 rounded-xl`, icon size `20`).
- ✅ `Pressable` + NativeWind `active:opacity-88` migration; legacy
  `TouchableOpacity` retired in audited surfaces.
- ✅ Glyph-over-emoji in hero positions and empty states.
- ✅ `awards/overlap.tsx` neutralised emerald/amber semantic colors;
  positive = feature accent (gold), cautionary = neutral chrome.
- ✅ `awards/reveal.tsx` AmbientGlow restored after redesign churn
  (2026-05-07).
- 📝 `profile/dev-tools.tsx` — `__DEV__`-only screen; no glow needed for
  production parity, deferred.

**Intentional exclusions**:
- `app/(tabs)/index.tsx` (home) ships without a glow per explicit
  product call to keep the dashboard cool and quiet.

## Phase 3 — Shared component review · DONE (high-leverage portion)

Audited all 12 components in `components/shared/**`. Findings + diffs
landed 2026-05-07.

### Scorecard

| Target | Status | Action |
|---|---|---|
| `Button` | ⚠️ migrated | `TouchableOpacity` → `Pressable` + `active:opacity-88`; props extend `Omit<PressableProps, 'style' \| 'children'>`. |
| `Card` | ⚠️ rewritten | Variant API: `tone`, `tier`, `padding`, `pressable`, `dashed`, `bgClassName`, `flat`. Default `p-5` (was `p-6`, drift relative to DESIGN.md). |
| `Input` | ✅ DRY'd | Inline label replaced with `<SectionLabel>`. |
| `EmptyState` | ⚠️ open | `icon` is still `string` — blocks Ionicons in zero states. Decision deferred (Phase 4d sweep). |
| `LoadingState` | ✅ clean | |
| `ScreenTitle` | ✅ doc patch | `text-[36px]` size now in `DESIGN.md` typography table. |
| `ScreenHeader` | ✅ doc patch | `text-[30px]` + 36pt back button geometry now in `DESIGN.md`. |
| `SectionLabel` | ✅ hardened | Added `maxFontSizeMultiplier={1.3}` so caps don't blow up under Dynamic Type. |
| `AnimatedNumber` | ✅ clean | rAF justified (digit morphing) — comment in source. |
| `CelebrationBadge` | ✅ envelope | Added `ReduceMotion.Never` to `withSpring` + `withTiming`. Still used in 3 celebration wrappers (decide / habits / reasons). |
| `AmbientGlow` | ✅ clean | |
| `EmojiShower` | ✅ already audited | (See research-log 2026-05-07 entries.) |

### Beyond `components/shared/`: ripple fixes

- `MoodGrid`, `HabitCard`, `EditHabitSheet`: migrated `TouchableOpacity` → `Pressable`. Closes the rule-violation rooted in `Button`.
- `EditHabitSheet`: inline caps treatments (cadence label, "emoji" label) → `SectionLabel`.

### Card consolidation: 22 cards across 14 files

Consolidated to the new variant API:

| File | Cards migrated | Notes |
|---|---|---|
| `components/profile/PartnerXpCard.tsx` | 3 | `bgClassName` overrides for translucent surfaces; `py-6/py-5` overrides dropped (aligning to `p-5`). |
| `components/profile/BadgeShelf.tsx` | 1 | dashed empty state via `<Card padding="hero" dashed flat>`. |
| `components/awards/SeasonCalendarPanels.tsx` | 1 | season timeline panel. |
| `app/(tabs)/awards/overlap.tsx` | 2 | gold inner + neutral inner. |
| `app/(tabs)/awards/ceremony-calendar.tsx` | 1 | season nominations stat block. |
| `app/(tabs)/awards/resolve.tsx` | 1 | per-category resolution card. Also neutralised emerald/amber colors here (rule from 2026-05-07: positive=gold, cautionary=neutral). |
| `app/(tabs)/awards/index.tsx` | 1 | season hub card. Removed redundant `cardShadow` (Card adds it by default). |
| `app/(tabs)/profile/index.tsx` | 4 | dashed loading-badges hero, primary inner invite (border drift `/15` → `/18`), notification list-row pressable, dev-tools list-row dashed pressable. Removed redundant `cardShadow`. |
| `app/(tabs)/decide/index.tsx` | 1 | "link your partner" empty state. |
| `app/(tabs)/mood/log.tsx` | 1 | bloom dense "right now" pill-card. |
| `app/(tabs)/profile/dev-tools.tsx` | 1 | ceremony state list-row. |
| `app/(tabs)/reasons/index.tsx` | 1 | "by you" reasons list card. |
| `app/(tabs)/index.tsx` (home) | 3 | feature tile grid (`borderClass: string` → `tone: CardTone` — type-safe per-feature accent), mood card, "you" card. |
| `app/(tabs)/decide/pick-vote.tsx` | 1 | DoneCard (outer-tier hero with custom `py-10`). |

### Intentionally inline (Card's docstring rule: "80% not 100%")

- `awards/reveal.tsx` RevealWinnerCard — wrapped in `Animated.View` for entrance animation; Card returns `Pressable`/`View`, can't replace the animated wrapper.
- `reasons/index.tsx` hero (line 332) — same: `Animated.View` wrapper.
- `(auth)/link-partner.tsx` invite-code card — `px-7 py-11` is a one-off; adding a `hero-lg` variant for one site = over-engineering.
- `HabitCard.tsx` — specialized variants (shared/personal × daily/weekly) with conditional border tones.
- `MoodTodayHero`, `WeekStrip`, `IntradayTrail`, `DayTrailSlot` — dynamic border tones tied to mood data; layout contracts beyond Card's vocabulary.
- `HabitsAdherenceLog` — heatmap with custom horizontal-padding contract (`cardPadH = 24` constant tied to cell sizing).
- `SeasonCompleteOverlay` — `Animated.View` + custom modal sheet padding.
- `GamificationToastHost` — toast cards (border `/35`, bg `/95`); non-standard chrome.
- `app/(tabs)/profile/notification-settings.tsx` — outer wrapper around list rows uses `overflow-hidden` to clip child borders; different chrome contract.

These will revisit in Phase 4d (loading/empty/error) and Phase 4b (motion) where appropriate.

### Open Phase-3 items deferred

- **`EmptyState` icon API** (`string` → `string | IoniconName`) — needs a UX call: do we want Ionicons in zero states for parity with the glyph-over-emoji rule? Phase 4d.
- **30+ inline caps treatments** (`text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim`) duplicated across screens for chip metadata, chart eyebrows, etc. Many already use `SectionLabel`; the inline copies are mostly in tight metadata contexts (chart labels with `maxFontSizeMultiplier={1.15}`, not 1.3). Phase 4a microcopy/typography sweep.

## Phase 4a — Microcopy sweep · DONE

Audited 47 `Alert.alert` callers, 50+ Buttons, 22 stack/tab headers, plus
auth-store error strings. Landed 2026-05-07.

### `hummVoice.ts` expansion

Three new voice families exported alongside `awardsVoice` / `reasonsVoice`
/ `moodVoice`:

| Voice | Surface | Highlights |
|---|---|---|
| `errorsVoice` | All `Alert.alert` titles + bodies | `couldnt(verb)`, `couldntSave/Add/Remove/Update/Finish/Pick/Leave/Link/Reset/Enable/Open(what)/Start`; bodies `tryAgain`, `tryAgainLater`, `checkConnection`, `permissions`; validation prompts `needTitle`, `needText`, `needName`, `needEmail`, `needPassword`. |
| `navVoice` | Back / cancel / done / stay | `backTo(destination)`, `cancel`, `done`, `stay`. `goBack` exported as deprecated marker, never as a button label. |
| `decideVoice` | Decide-feature buttons + alerts | Verb family `decide \u2192 vote \u2192 randomize`. Includes `primaryAction`, `randomizeAction`, `resumeAction`, `startAction`, `leaveAction`, `saveResultAction`, `startOverAction`, plus full alert pairs for `leavePick` and `randomizeConfirm`. |

### Stack header titles \u2014 task-reflective

| Before | After | Why |
|---|---|---|
| `decide` (4\u00d7 stack subscreens) | `pool`, `vote`, `decided` (kept), `history` | Tab title was repeating on stack screens. Apple HIG. |
| `season` (current ceremony-calendar) | `this season` | Disambiguates from past. |
| `season` (past/[ceremonyId]) | `past season` | Same disambiguation. |

### Bottom ghost back-button policy

User-approved rule: **always name the destination**.

- 7\u00d7 `go back` (nominate.tsx) \u2192 `back to awards`.
- 5\u00d7 generic `back` (decide/pick-vote, decide/pick-lobby,
  decide/pick-result, ceremony-calendar, manage-categories, overlap)
  \u2192 destination-named (`back to pool`, `back to decide`, `back to awards`).
- 1\u00d7 `back to list` (past/[ceremonyId]) \u2192 `back to archive`.
- 3\u00d7 inline empty-state error pages (`reasons/write.tsx`,
  `habits/new.tsx` link-prompt, `awards/nominate.tsx` empty-states) \u2192
  destination-named (`back to reasons`, `back to habits`, `back to awards`).

`navVoice.backTo(...)` is now the only canonical source.

### Error toast voice \u2014 unified

- Title pattern: always `couldn\u2019t <verb>` (12 file migrations).
  - One-offs replaced: `vote didn\u2019t stick`, `not yet`, `hold on`,
    `empty page`, `session`, `name?`, `email?`, `password?`,
    `couldn\u2019t open your trio` \u2192 all routed through `errorsVoice`.
- Body separator: middle-dot `\u00b7`. Comma + em-dash variants migrated.
  - `'check connection, try again'` (5\u00d7) \u2192 `errorsVoice.checkConnection`.
  - `'permissions issue \u00b7 try again later'` \u2192 `errorsVoice.permissions`.
  - `'we\u2019ll pick from the pool \u2014 no voting needed'` \u2192
    `decideVoice.randomizeConfirmBody` (`'we\u2019ll pick from the pool \u00b7 no vote'`).
- Auth store + `awardsLogic.ts` em-dash strings (8 sites) migrated to
  middle-dot for inline error parity.

### Side fixes (gold/amber semantic states, second pass)

- `awards/manage-categories.tsx` `text-amber-200/90` \u2192 `text-hum-dim`
  (matches the 2026-05-07 \u201cno emerald/amber\u201d rule).
- `awards/[category].tsx` paused chip `text-amber-200/90` \u2192 `text-hum-dim`.

### Decide-feature button labels DRY\u2019d

`pick-lobby.tsx`, `decide/index.tsx`, `pick-result.tsx` now consume
`decideVoice.*` for `decide together`, `randomize`, `resume`, `start`,
`leave`, `save this one`, `start over` (parenthetical \u201c(no save)\u201d
dropped \u2014 the alert flow already gates the destructive intent; the
parenthetical read as system-tooltip noise).

### Files touched

- `constants/hummVoice.ts` (errorsVoice / navVoice / decideVoice added)
- `app/(tabs)/decide/{index,pick-lobby,pick-vote,pick-result}.tsx`
- `app/(tabs)/awards/{index,resolve,reveal,deliberate,ceremony-calendar,
  overlap,manage-categories,nominate,[category],past/[ceremonyId]}.tsx`
- `app/(tabs)/{mood/log,reasons/{index,write},habits/new,
  profile/{index,notification-settings,delete-account}}.tsx`
- `app/(auth)/{sign-up,link-partner}.tsx`
- `components/habits/{HabitCard,EditHabitSheet}.tsx`
- `lib/{stores/authStore,awardsLogic}.ts`
- `docs/DESIGN.md` (microcopy section added)

### Open Phase-4a items deferred

- **EmptyState voice consistency.** Today: `decide/history.tsx` uses an
  `\u25cb` glyph + action; `habits/index.tsx` uses an emoji `\u2728` + dynamic
  copy; `awards/past/index.tsx` uses no glyph + action; `awards/[category].tsx`
  uses no glyph + no action. Phase 4d (incl. EmptyState API decision).
- **`awards/index.tsx` confirmation alert** keeps charm-driven cancel
  buttons (`not yet` for the start-alignment alert) intentionally; not
  in the `errorsVoice` pattern, deliberately preserved.

## Phase 4b — Motion sweep · DONE (2026-05-07)

### Shipped

- ✅ **`lib/motion.ts` created** as the single source of truth for motion
  tokens. Exports M3 easings (`M3_EMPHASIZED`, `M3_EMPHASIZED_DECEL`,
  `M3_EMPHASIZED_ACCEL`, `M3_STANDARD`), M3 spring tokens
  (`SPRING_FAST_SPATIAL`, `SPRING_DEFAULT_SPATIAL`, `SPRING_SLOW_SPATIAL`),
  M3 Expressive springs (`SPRING_EXPRESSIVE_BLOOM`,
  `SPRING_EXPRESSIVE_SETTLE`, `SPRING_EXPRESSIVE_ENTRANCE`), timings
  (`TIMING_QUICK_MS`, `TIMING_STANDARD_MS`, `TIMING_EMPHASIZED_MS`,
  `TIMING_EXPRESSIVE_MS`), and the `REDUCE_MOTION_NEVER` envelope.
  All spring tokens use Reanimated 4's perceptual API (`{ duration,
  dampingRatio }`) so design tokens read like spec, not physics.
- ✅ Duplicated `M3_EMPHASIZED = Easing.bezier(0.2, 0, 0, 1)` consolidated.
  `lib/pickRevealMotion.ts` and `app/(tabs)/awards/reveal.tsx` now import
  from `lib/motion.ts`.

### Legacy `Animated` migration · 11 callers, 0 remaining

All callers using `react-native`'s legacy `Animated` API migrated to
`react-native-reanimated`. Rationale: legacy Animated has no
`ReduceMotion.Never` escape hatch — celebratory blooms snap to final
value when iOS Reduce Motion is enabled, which reads as broken UI.

| File | Component | Animation | Token |
|---|---|---|---|
| `MoodGrid.tsx` | `StickerPill` | tap-bloom on mood select | `EXPRESSIVE_BLOOM` → `EXPRESSIVE_SETTLE` |
| `HabitCard.tsx` | `ParticipantPill` | bloom on partner check | `EXPRESSIVE_BLOOM` → `EXPRESSIVE_SETTLE` |
| `HabitCard.tsx` | `AnimatedEmojiTile` | bloom + glow on solo & both done | `EXPRESSIVE_BLOOM` + 1200ms timing glow |
| `HabitCard.tsx` | `BloomingCheck` | bloom on personal check | `EXPRESSIVE_BLOOM` → `EXPRESSIVE_SETTLE` |
| `HabitCard.tsx` | `CardPulseWrapper` | shared-card pulse on both done | `FAST_SPATIAL` |
| `PickReveal.tsx` | static reveal entrance | 420ms timing + spring | `EXPRESSIVE_ENTRANCE` |
| `BracketProgress.tsx` | `PulseDot` | infinite opacity pulse | `withRepeat(withSequence(...))` |
| `SeasonCompleteOverlay.tsx` | overlay entrance | opacity + scale + delayed trophy | `EXPRESSIVE_ENTRANCE` + `EXPRESSIVE_BLOOM` |
| `GamificationToastHost.tsx` | xp banner fade | 200ms in, 320ms out + JS callback | `withTiming` + `runOnJS` |
| `HabitsActionBar.tsx` | `AnimatedProgressBar` | scaleX fill + opacity glow | `DEFAULT_SPATIAL` + 800ms timing |
| `MoodHomeRow.tsx` | partner pill bloom on update | 4% scale | `FAST_SPATIAL` |

### `ReduceMotion.Never` coverage on celebration peaks

Audited every Reanimated call site. `REDUCE_MOTION_NEVER` applied to:

- ✅ `awards/reveal.tsx` (RevealWinnerCard entrance — gap closed)
- ✅ All 11 newly-migrated celebration surfaces above
- ✅ `EmojiShower`, `CelebrationBadge`, `PickRevealAnimated`, `pick-vote`
  (already covered in prior phases)

Intentionally NOT forced to `Never` (respects system flag — HIG-correct
for ambient/continuous motion):

- `reasons/index.tsx` — heart breathing 6.4s loop (ambient ≠ celebration)
- `MoodHomeRow` partner pulse — large-ish scale on a peer-attention surface

### Decisions

- **All-10 migration scope** chosen over surgical (high-frequency only).
  Rationale: one library throughout, design rule cleanly enforced. Low
  perceptual regression risk because tokens preserve the bloom feel via
  M3 Expressive damping ratios (0.55).
- **M3 perceptual spring API** adopted (`{ duration, dampingRatio }`) over
  the physics API (`{ stiffness, damping }`). Tokens read like design
  spec; can be remapped without breaking call sites.
- **M3 Expressive token family** added alongside M3 standard. M3's
  default springs are critically damped (no bounce); celebrations need
  visible bounce to feel rewarding. Source:
  https://m3.material.io/styles/motion/overview/expressive
- **Continuous loops respect system reduce-motion.** Apple HIG flags
  infinite ambient motion (breathing, pulsing) as the most
  vestibular-disturbing pattern; system flag wins for those even when
  the surface is a celebration feature.

### Post-migration feel-check calibration (2026-05-07)

Initial migration tokens were calibrated against perceptual M3 spec
(`{ duration: 320, dampingRatio: 0.55 }` for blooms). User feel-check
revealed all motion felt ~5× faster than the original — because legacy
`Animated.spring({ tension: 220, friction: 3.5 })` had ζ ≈ 0.12 and a
~1.7s settling time, far slower than M3's spec values suggest.

Final tokens after two feel-check rounds:

| Token | Initial | Final |
|---|---|---|
| `SPRING_FAST_SPATIAL` | 250 / 0.9 | **460 / 0.8** |
| `SPRING_DEFAULT_SPATIAL` | 400 / 0.9 | **550 / 0.85** (preserved; HabitsActionBar uses an inline 280ms override) |
| `SPRING_EXPRESSIVE_BLOOM` | 320 / 0.55 | **480 / 0.5** |
| `SPRING_EXPRESSIVE_SETTLE` | 360 / 0.85 | **750 / 0.75** |
| `SPRING_EXPRESSIVE_ENTRANCE` | 480 / 0.7 | **720 / 0.65** |
| `SPRING_RICH_REVEAL` (new) | — | **950 / 0.55** |

Per-surface overrides:

- `awards/reveal.tsx` — `CARD_ENTER_MS` 200 → 600, scale uses
  `SPRING_RICH_REVEAL` (visible breath, not plain easing).
- `pickRevealMotion.ts` — `landPop` 380 / 0.65 → 520 / 0.7 (cleaner
  settle in a `withSequence` of two springs; ζ < 0.6 caused chaotic
  wobble across legs); `holdMs` 950 → 1500; `landColorMs` 340 → 600.
- `EmojiShower` — `baseDuration` standard 1900 → 3500 (~85% longer
  particle dwell); fade in 120 → 200, fade out 450 → 550.
- `PickReveal` (static) — `ENTRANCE_DURATION_MS` 420 → 850; uses
  `SPRING_RICH_REVEAL`.
- `HabitsActionBar` progress bar — inline `withSpring(target,
  { duration: 280, dampingRatio: 0.9 })` instead of
  `SPRING_DEFAULT_SPATIAL` (chrome surface; faster than celebration
  tokens by design).

Lessons:

- The mapping from legacy `tension/friction` to perceptual
  `{ duration, dampingRatio }` is **not** mechanical — settling time
  matters more than peak time for feel. Old physics springs felt slow
  because of long settling tails (low ζ); naive duration ports lose
  that.
- A `withSequence` of two springs amplifies bounce. Use ζ ≥ 0.65 for
  sequence members.
- Reserve high-bounce, long-duration tokens (`SPRING_RICH_REVEAL`,
  ζ 0.55, 950ms) for once-per-flow peaks. Apply more widely and the
  hierarchy flattens — every surface fights for attention.
- Chrome surfaces (progress bars, partner pulse on home) get
  shorter, critically-damped configs even when other tokens are slow.
  Mixing chrome and celebration tempos is what makes the slow tokens
  read as celebration rather than as lag.

## Phase 4c — Accessibility sweep · PENDING

- Screen-reader labels on every `Pressable`.
- 44pt minimum hit targets, 8pt minimum gap.
- `maxFontSizeMultiplier` on every `Text` participating in layout.
- Contrast 4.5:1 body, 3:1 UI components.

## Phase 4d — Empty / loading / error sweep · DONE (2026-05-08)

### EmptyState API upgrade

- `EmptyState` now accepts an `ionicon` prop (`Ionicons` name) alongside the
  existing `icon` (emoji string). When `ionicon` is provided, renders a 56×56
  tinted box with the icon inside (consistent with the glyph-over-emoji rule).
  `ioniconColor` controls the icon hex; defaults to `theme.primary` at 70%.

### Shared `LinkPartnerGate` component

Created `components/shared/LinkPartnerGate.tsx` — a full-screen gate shown
when a feature requires a linked partner. Standardises icon (`people-outline`),
copy ("link your partner first · invite them · everything here is for two"),
`AmbientGlow` tone, and back-navigation CTA.

6 inline "link partner" gates migrated:

| File | Feature tone |
|------|-------------|
| `decide/index.tsx` | `spark` (uses inline `EmptyState`, not `LinkPartnerGate` — embedded in scroll) |
| `habits/new.tsx` | `sage` |
| `reasons/write.tsx` | `crimson` |
| `awards/past/index.tsx` | `gold` |
| `awards/nominate.tsx` | `gold` |
| `awards/manage-categories.tsx` | `gold` |

### Inline empty states → `EmptyState`

~14 additional inline empty/gate/phase screens migrated to the shared
`EmptyState` component with Ionicons, feature-tinted color, and
`primaryAction` CTAs where actionable:

| File | States migrated | Notes |
|------|----------------|-------|
| `awards/past/[ceremonyId].tsx` | invalid ceremony, no winners | Back to archive CTA on invalid; no-winners CTA skipped (back button above) |
| `awards/overlap.tsx` | wrong phase, agreed-empty, contested-empty | Inline card empties use `className="px-0 py-2"` |
| `awards/resolve.tsx` | wrong phase, nothing contested | Expanded to title + description |
| `awards/reveal.tsx` | not ready, no steps | Trophy/ribbon icons, gold tint |
| `awards/deliberate.tsx` | wrong phase, post-submit, no nominations | Dynamic ionicon/copy per state |
| `awards/manage-categories.tsx` | no enabled rows | No CTA (add form is directly below) |
| `awards/nominate.tsx` | not on list, paused, missing, forbidden | Paused: primary "award categories" + ghost back |
| `profile/badge-teasers.tsx` | no teasers | Informational, no CTA |
| `mood/index.tsx` | unlinked, earlier feed empty | Unlinked → "open profile"; earlier → "log today" |
| `reasons/index.tsx` | partner list empty | CTA uses `reasonsVoice.primaryWriteFor` |

### Coverage summary (post-sweep)

- **`EmptyState`**: 14+ route files (up from 4)
- **`LinkPartnerGate`**: 5 route files (new shared component)
- **`LoadingState`**: unchanged (already consistent — no inline `ActivityIndicator`)
- **Inline empties remaining**: 0 for list/gate states. Only intentionally
  inline: award ceremony flow phase conditionals that are tightly coupled
  to multi-branch logic.
- **Error handling**: already standardised in Phase 4a via `errorsVoice`.

## Phase 5 — Documentation refresh · DONE (2026-05-08)

- Rolled new rules into `DESIGN.md`: empty/loading states row in core
  rules, `LinkPartnerGate` + updated `EmptyState` in component table,
  new "Dynamic features" section (partner presence + warmth glow).
- Updated `APP_STORE_LISTING.md` for build 5: new promo text, description
  with home/presence/warmth features, What's New, product facts, review
  notes.
- Updated `docs/store/index.html` (Home + Habits feature descriptions)
  and `docs/store/support.html` (presence dot + glow FAQs).
- Bumped `app.json` to build 5 (iOS) / versionCode 2 (Android).
- This audit doc stays as the consistency operating manual for future
  feature work.

---

## Decision log

- **2026-05-07** — Wes Anderson Grand Budapest palette locked in.
- **2026-05-07** — Two-tier border opacity (`/25` outer, `/18` inner).
- **2026-05-07** — `AmbientGlow tone="{feature}"` required on every screen
  of a feature; auth uses `tone="primary"`; home stays bloom-less.
- **2026-05-07** — Semantic states use feature accent (gold = positive)
  + neutral chrome (`hum-border` = cautionary). No emerald/amber.
- **2026-05-07** — Glyph-over-emoji in hero positions and empty states.
- **2026-05-07** — Awards reveal: card + emoji shower only (no overlay
  badge); recipient line in gold between category caps and title.
- **2026-05-07** — Phase 3 entry: shared component review, per-decision
  cadence (batch obvious fixes, ask on forks).
- **2026-05-07** — `TouchableOpacity` migrated to `Pressable` everywhere.
  All 4 holdouts (`Button`, `MoodGrid`, `HabitCard`, `EditHabitSheet`).
- **2026-05-07** — `Card` rewritten with variant-prop API (tone, tier,
  padding, pressable, dashed, bgClassName, flat). Migrate all 30 inline
  cards. Default padding standardised to `p-5` (was `p-6`).

## Decision log (Phase 4a additions)

- **2026-05-07** — Bottom ghost back-buttons: always `back to {destination}`.
  `back`, `go back`, `back to list` deprecated.
- **2026-05-07** — Stack header titles reflect *current screen*, not section.
  Decide subscreens: `pool` / `vote` / `decided` / `history`.
- **2026-05-07** — `hummVoice.ts` is the single source for shared
  microcopy. `errorsVoice`, `navVoice`, `decideVoice` codify the rules.
- **2026-05-07** — Error body separator is middle-dot `\u00b7`. Comma and
  em-dash banned for fragment separation. Em-dash still allowed for
  full-clause quotes inside a sentence (none present in current copy).

## Decision log (Phase 4b additions)

- **2026-05-07** — `lib/motion.ts` is the single source for motion tokens.
  Inline `Easing.bezier(...)` and inline spring configs banned in feature
  code. Add a named token to `lib/motion.ts` if the existing palette
  doesn't fit.
- **2026-05-07** — Reanimated 4 perceptual spring API
  (`{ duration, dampingRatio }`) is canonical. Physics API
  (`{ stiffness, damping }`) reserved for cases where mass/velocity
  matter (none in current code).
- **2026-05-07** — M3 Expressive damping ratios kept on tap-bloom
  surfaces (mood pill, habit check, bracket pick) to preserve playful
  feel after migration. Critical-damped M3 standard tokens used for
  spatial entries (overlays, progress bar fills).
- **2026-05-07** — `ReduceMotion.Never` is required on every celebration
  peak (awards reveal, pick reveal, habit/mood blooms, season overlay).
  Continuous loops (heart breathing, partner pulse) respect the system
  flag — vestibular safety wins for ambient motion.
- **2026-05-07** — All 11 legacy `react-native` `Animated` call sites
  retired. Going forward, any new animation must import from
  `react-native-reanimated`; PR review enforces.

## Phase 4c — Accessibility sweep — DONE (2026-05-07)

### Scope decisions (user-selected strictest on all three axes)

| Axis | Choice |
|------|--------|
| Hit targets | 44pt **visual** minimum |
| Screen-reader labels | Explicit `accessibilityLabel` on **every** `Pressable` |
| Dynamic Type | **Tiered** `maxFontSizeMultiplier` |

### What shipped

- **DESIGN.md** — new Accessibility section: hit targets, labels, dynamic
  type tiers, and contrast rules.
- **Hit target bumps** — `ScreenHeader` back `h-9→h-11`; `HabitCard`
  ellipsis `h-8→h-11`; `HabitsActionBar` add `h-9→h-11`;
  `IntradayTrail`/`DayTrailSlot` close `h-10→h-11`; all pill/chip/
  segmented pressables got `min-h-[44px]`.
- **accessibilityLabel** — ~80 Pressables audited and labelled. `Button`
  defaults `accessibilityLabel={label}`. Modal `stopPropagation` wrappers
  marked `accessible={false}`.
- **Dynamic Type** — removed ~12 anti-pattern `allowFontScaling={false}`
  on non-emoji Text. Applied tiered `maxFontSizeMultiplier` across all
  screens: tight 1.25, body 1.3, long-form 1.5.
- **TypeScript** — `tsc --noEmit` clean.

## Decision log (Phase 4d additions)

- **2026-05-08** — `EmptyState` API extended: `ionicon` prop renders
  Ionicons in a tinted box; `ioniconColor` for hex color. Emoji `icon`
  prop kept for backwards compat.
- **2026-05-08** — `LinkPartnerGate` shared component: standardises the
  "link your partner first" full-screen gate across all features.
  Accepts `backTo` (destination name for ghost CTA) and `tone`
  (AmbientGlow feature tone).
- **2026-05-08** — Empty state CTA rule: every empty state should have a
  `primaryAction` unless the next step is obviously adjacent in the UI
  (e.g., an "add" form directly below, or a back button already visible
  in the header).
- **2026-05-08** — `AmbientGlowTone` exported from `AmbientGlow.tsx` for
  type reuse in `LinkPartnerGate` and future consumers.

## Today's resume notes

- Phase 5 (documentation refresh) shipped 2026-05-08.
- All docs, store listing, and websites updated for build 5.
- **Next**: EAS build + submit.

