# Hum - rituals — context for AI agents & contributors

This file is the **entry point** for anyone (human or agent) working on the repo. Read it before changing code.

**Deep onboarding:** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — full route map, Firestore ownership table, rules fragments, Cloud Functions triggers.

---

## What this app is

**Hum - rituals** (`com.humtum.app`, Expo **`slug`** `humm` in `app.json`, npm package name `humtum`) is a **private app for two people** (the owners and their partner). In-app navigation copy stays **lowercase** where this doc says so; auth hero uses the full store name.

Goals:

- Reduce decision paralysis (food, activity, movie, other — all as Quick Spin lists; no separate movie-picker flow).
- Support a **twice-yearly** relationship “award ceremony”: **nominations + full ceremony cycle** — product **nominate · align · cheer**; Firestore **`nominating` → `deliberating` → `voting` → `complete`** (see [CEREMONY_TERMINOLOGY.md](./CEREMONY_TERMINOLOGY.md)). **Nomination photos** still deferred.
- **Gamification** — per-user **XP/level** + **badges** on profile, soft **stats** band (saves, seasons, spin streak). Badge evaluators batch **`mergeBadges`** per user where possible to limit Firestore writes. **Weekly challenge** pool is three symmetric goals (`constants/challenges.ts`). Couple **streaks** + **weekly challenge** on `couples/*` mostly under the hood (still grant XP). Code: `lib/firestore/gamification.ts`, `lib/gamificationTriggers.ts`, `lib/gamificationBadges.ts`, `lib/firestore/coupleGamification.ts`, `components/gamification/GamificationToastHost.tsx`. **`paparazzi`** not auto-awarded until photos exist.
- **Reasons** — write reasons you love your partner; **draw three random** reasons about you (text only for now).
- **Mood** — lightweight quadrant stickers per day (`moodEntries`), mirrored with partner on home + mood tab; server push when partner logs (`functions`).
- **Habits** — shared or personal daily/weekly check-ins (`habits`, `habitCheckins`) with streak semantics on `couples`.

Tone: warm, playful, musical metaphor (humming together). Prefer **lowercase** labels in navigation and many headings unless a proper noun needs caps.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| App | **Expo SDK 54** (React Native + **Expo Router** file-based routes); **expo-notifications** — local award-window reminders (`lib/ceremonyReminders.ts`) + Expo push token → Firestore (`lib/registerExpoPushToken.ts`); server pushes via **Firebase Functions** + Expo Push API (`functions/src/`) |
| Why SDK 54? | **Expo Go from the iOS App Store** supports SDK 54. SDK 55 on iPhone requires TestFlight or a dev build. |
| Styling | **NativeWind v4** (Tailwind). Tokens: `hum` in [`tailwind.config.js`](../tailwind.config.js); raw hex for icons/spinners: [`constants/theme.ts`](../constants/theme.ts) — **keep in sync**. UX direction: [`docs/DESIGN.md`](./DESIGN.md). |
| State | **Zustand** (`lib/stores/*`); local UI prefs (spin haptics, ceremony reminder toggle + scheduled season id) in `uiPreferencesStore.ts` (AsyncStorage); **Battle** live session in `battleStore` (Firestore `battles/{id}` via `couples.activeBattleId`) |
| Backend | **Firebase**: Auth (email/password), **Firestore** (users, couples, ceremonies, nominations, reasons, decisions, **`decisionOptions`** top-level docs, **battles**, **`habits`**, **`habitCheckins`**, **`moodEntries`**). **Storage is not initialized** in code (Spark plan / optional Phase 2). **Cloud Functions** in `functions/` for partner pushes.
| Android release | **EAS Build**: `eas.json` — **`preview`** → shareable **APK**; **`production`** → Play **AAB**. Icon `assets/icon.png`. Set `EXPO_PUBLIC_*` on EAS (not only local `.env`). See [SETUP.md § 6](../SETUP.md). |

---

## Repo map

```
app/
  _layout.tsx           # Firebase env complete → lazy AppRoot
  (auth)/               # sign-in, sign-up, link-partner
  (tabs)/               # home, mood/*, decide/*, awards/*, reasons/*, habits/*, profile/*
components/shared/      # Button, Input, Card, ScreenTitle, ScreenHeader
components/pick/        # BracketProgress, PickReveal, PickRevealAnimated (pick-together)
components/mood/        # MoodTodayHero, MoodGrid, WeekStrip, MoodChip, MoodHomeRow, …
constants/              # categories, levels, badges, moodStickers, hummVoice, theme (hex), elevation
lib/
  firebase.ts           # App, Auth, Firestore init
  registerExpoPushToken.ts
  stores/               # authStore, decisionStore, nominationsStore, reasonStore, battleStore, habitStore, moodStore
  firestore/            # users, couples, ceremonies, nominations, reasons, decisions (incl. decisionOptions docs), battles, habits & habitCheckins, moodEntries
  battleLogic.ts        # Pure bracket builder + matchup helpers (no Firestore)
  ceremonyCalendar.ts   # Season milestones + H1/H2 copy helpers
  ceremonyReminders.ts  # Local notification schedule/cancel for award window
  gamificationTriggers.ts  # After-write XP/badges (incl. mood, habits)
types/index.ts          # Shared TypeScript models
functions/src/          # Cloud Functions v2 — Expo push on mood/reasons/nominations/battle/decision/couple challenge
firestore.*.rules       # Fragments (mood, habits, account-deletion) — merge in Console
docs/
  AGENTS.md                 # This file
  DEVELOPER_GUIDE.md        # Routes, collections, rules workflow, functions
  APPS_AND_FEATURES.md      # Living brainstorm with the owners
  CEREMONY_TERMINOLOGY.md   # Awards: product names vs Firestore status / legacy APIs
  DESIGN.md                 # UI / UX direction and refinement ideas
  FIRESTORE_MOOD_RULES.md   # Mood rules deployment notes
```

---

## Environment

- Copy `.env.example` → `.env` (gitignored). All Firebase keys must be prefixed with `EXPO_PUBLIC_` for Expo.
- **Firestore:** Composite indexes live in [`firestore.indexes.json`](../firestore.indexes.json) — deploy with `npm run deploy:indexes` when queries change. **`battles`** collection must be allowed in security rules for the couple’s two user IDs (same scoping pattern as `decisions` / `ceremonies`). **`nominations`** uses `coupleId` + `ceremonyId` (see `lib/firestore/nominations.ts`). **`decisions`** uses `coupleId` + `mode` for battle badge counts (`grantBattleCompletionRewards`); also `coupleId` + `category` for Foodie / Night In counts. **`reasons`:** `coupleId` + `authorId` for reason badges. **`ceremonies`:** `coupleId` + `status` for completed-season counts. **`couples`:** allow writes to optional `streaks`, `weeklyChallenge`, habit streak fields, mood streak fields for the two partner UIDs. **`moodEntries`** / **`habits`** / **`habitCheckins`:** merge fragments [`firestore.mood.rules`](../firestore.mood.rules), [`firestore.habits.rules`](../firestore.habits.rules); see [FIRESTORE_MOOD_RULES.md](./FIRESTORE_MOOD_RULES.md). There is no full `firestore.rules` in-repo — rules live in Firebase Console or your deploy pipeline. For **account deletion** (client-side wipes), merge the commented fragment in [`firestore.account-deletion.rules`](../firestore.account-deletion.rules) so deletes and partner-unlink updates are permitted. **`react-native-reanimated`:** keep the Babel plugin last in `babel.config.js` (Expo / navigator stack). Awards **cheer** walkthrough (`reveal.tsx`) uses RN `Animated` only so Expo Go won’t crash on Reanimated worklets at import time.

---

## Conventions

1. **Dependencies**: Use `npx expo install <pkg>` for anything tied to the Expo SDK (including `react`, `react-dom`, `react-native`). Align versions with [SETUP.md](../SETUP.md) / Expo SDK 54 release notes if installs drift.
2. **Path alias**: `@/` → project root (from `tsconfig.json`).
3. **Firebase Auth on native**: `lib/firebase.ts` uses `require('firebase/auth')` for `getReactNativePersistence` + AsyncStorage.
4. **Metro**: `metro.config.js` adds `'cjs'` to `sourceExts` for Firebase.
5. **No scope creep**: Match existing patterns; do not rename the `hum-*` Tailwind tokens unless doing a dedicated design-token migration (update both Tailwind and `constants/theme.ts`).
6. **Awards copy**: Ceremony-flow button labels and voting hints are centralized in [`constants/hummVoice.ts`](../constants/hummVoice.ts); extend there when adding new awards messaging so tone stays consistent.

---

## Implementation status (high level)

| Area | Status |
|------|--------|
| Auth (sign up / in), couple link via invite code | Done |
| Home tab, profile (XP bar, soft stats band, badges, sign out; invite code only until partner linked) | Done |
| **Decide**: Quick Spin, categories, options in Firestore, history | Done |
| **Decide**: Battle Mode (real-time bracket) | Done — hub `battle.tsx`, lobby / vote / result screens, `lib/firestore/battles.ts` + `lib/battleLogic.ts`, `components/battle/*` |
| **Awards**: nominations (text), browse by category, active ceremony (**calendar H1/H2** window via `getCalendarHalfYearBounds`), **season calendar** + optional local reminders | Done (v1 + calendar) |
| **Awards**: alignment (private picks, overlap, resolve), cheer walkthrough, past archive, cycle advance (`lib/firestore/ceremonies.ts`, `lib/awardsLogic.ts`, `app/(tabs)/awards/*`) | Done (v2 flow; text only; haptics on key steps) |
| **Gamification**: XP (`grantXp`), alignment-submit / battle / ceremony grants (some API ids still say `deliberation_*` — see [CEREMONY_TERMINOLOGY.md](./CEREMONY_TERMINOLOGY.md)), Quick Spin / nomination / reason / resolution XP, streaks + weekly challenge on couple doc (mostly under hood), badge evaluators (`lib/gamificationBadges.ts`), celebrations host; **profile** leads with **XP + badges**, plus a softer **“together lately”** stats band (`ProfileSoftStats`, `getDecisionCountForCouple`) | Done |
| **Awards**: nomination photos | Not started |
| **Reasons**: write + draw 3 random (text) | Done (v1) |
| **Reasons**: optional media on reasons | Not started |
| **Mood** — quadrant stickers, daily entries (`moodEntries`), home row + tab UI, partner feed, gamification hooks | Done |
| **Habits** — shared/personal daily & weekly, check-ins, couple streak fields | Done |
| Push notifications | **Partially shipped** — client token + preferences (`profile/notification-settings`); **Cloud Functions** send Expo pushes on mood/reason/nomination/battle/quickspin/challenge |
| Firebase Storage (photos) | Deferred (Blaze plan) |

**Future idea (documented in blueprint):** collaborative Quick Spin — partner sees or confirms spin; currently spins are local UX + saved outcome in Firestore.

---

## Where to look next

- **Routes, collections, rules fragments, functions**: [`./DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md)
- **Deep product + data model + costs + phases**: [`../BLUEPRINT.md`](../BLUEPRINT.md)
- **Award ceremony naming (product vs code)**: [`./CEREMONY_TERMINOLOGY.md`](./CEREMONY_TERMINOLOGY.md)
- **Setup on a machine**: [`../SETUP.md`](../SETUP.md)
- **Play / App Store release (paid app, EAS, policies)**: [`./STORE_LAUNCH.md`](./STORE_LAUNCH.md)
- **Ideas backlog / brainstorm**: [`APPS_AND_FEATURES.md`](./APPS_AND_FEATURES.md)

When in doubt, prefer updating `docs/APPS_AND_FEATURES.md` or this file over scattering notes in random markdown files. For **award ceremony naming** (nominate / align / cheer vs `deliberating` in Firestore), update **`docs/CEREMONY_TERMINOLOGY.md`** and keep `constants/hummVoice.ts` in sync.
