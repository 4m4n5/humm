# humm — context for AI agents & contributors

This file is the **entry point** for anyone (human or agent) working on the repo. Read it before changing code.

---

## What this app is

**humm** (always lowercase in UI copy) is a **private app for two people** (the owners and their partner). It is not a public consumer product.

Goals:

- Reduce decision paralysis (food, activity, movie, other — all as Quick Spin lists; no separate movie-picker flow).
- Support a **twice-yearly** relationship “award ceremony”: **nominations + full ceremony cycle** (nominating → deliberation → voting/overlap + resolution → reveal → archive + new cycle). **Nomination photos** still deferred.
- **Gamification** — per-user **XP/level** + **badges** on profile, soft **stats** band (saves, seasons, spin streak). Badge evaluators batch **`mergeBadges`** per user where possible to limit Firestore writes. **Weekly challenge** pool is three symmetric goals (`constants/challenges.ts`). Couple **streaks** + **weekly challenge** on `couples/*` mostly under the hood (still grant XP). Code: `lib/firestore/gamification.ts`, `lib/gamificationTriggers.ts`, `lib/gamificationBadges.ts`, `lib/firestore/coupleGamification.ts`, `components/gamification/GamificationToastHost.tsx`. **`paparazzi`** not auto-awarded until photos exist.
- **Because of you** — write reasons for your partner; **draw three random** reasons about you (text only for now).

Tone: warm, playful, musical metaphor (humming together). Prefer **lowercase** labels in navigation and many headings unless a proper noun needs caps.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| App | **Expo SDK 54** (React Native + **Expo Router** file-based routes); **expo-notifications** for local award-season reminders (see `lib/ceremonyReminders.ts`) |
| Why SDK 54? | **Expo Go from the iOS App Store** supports SDK 54. SDK 55 on iPhone requires TestFlight or a dev build. |
| Styling | **NativeWind v4** (Tailwind). Tokens: `hum` in [`tailwind.config.js`](../tailwind.config.js); raw hex for icons/spinners: [`constants/theme.ts`](../constants/theme.ts) — **keep in sync**. UX direction: [`docs/DESIGN.md`](./DESIGN.md). |
| State | **Zustand** (`lib/stores/*`); local UI prefs (spin haptics, ceremony reminder toggle + scheduled season id) in `uiPreferencesStore.ts` (AsyncStorage); **Battle** live session in `battleStore` (Firestore `battles/{id}` via `couples.activeBattleId`) |
| Backend | **Firebase**: Auth (email/password), **Firestore** (users, couples, ceremonies, nominations, reasons, decisions, options, **battles**). **Storage is not initialized** in code (Spark plan / optional Phase 2). |
| Android release | **EAS Build**: `eas.json` — **`preview`** → shareable **APK**; **`production`** → Play **AAB**. Icon `assets/icon.png`. Set `EXPO_PUBLIC_*` on EAS (not only local `.env`). See [SETUP.md § 6](../SETUP.md). |

---

## Repo map

```
app/
  _layout.tsx           # Auth gate: sign-in → link partner → tabs
  (auth)/               # sign-in, sign-up, link-partner
  (tabs)/               # home, decide/*, awards, because, profile
components/shared/      # Button, Input, Card, ScreenTitle, ScreenHeader
components/battle/      # BracketProgress, CoinFlip (battle mode)
constants/              # categories, levels, badges, hummVoice (awards copy), theme (hex)
lib/
  firebase.ts           # App, Auth, Firestore init
  stores/               # authStore, decisionStore, nominationsStore, reasonStore, battleStore
  firestore/            # users, couples, ceremonies, nominations, reasons, decisions, battles
  battleLogic.ts        # Pure bracket builder + matchup helpers (no Firestore)
  ceremonyCalendar.ts   # Season milestones + H1/H2 copy helpers
  ceremonyReminders.ts  # Local notification schedule/cancel for award window
types/index.ts          # Shared TypeScript models
docs/
  AGENTS.md             # This file
  APPS_AND_FEATURES.md  # Living brainstorm with the owners
  DESIGN.md             # UI / UX direction and refinement ideas
```

---

## Environment

- Copy `.env.example` → `.env` (gitignored). All Firebase keys must be prefixed with `EXPO_PUBLIC_` for Expo.
- **Firestore:** Composite indexes live in [`firestore.indexes.json`](../firestore.indexes.json) — deploy with `firebase deploy --only firestore:indexes` when queries change. **`battles`** collection must be allowed in security rules for the couple’s two user IDs (same scoping pattern as `decisions` / `ceremonies`). **`nominations`** uses `coupleId` + `ceremonyId` (see `lib/firestore/nominations.ts`). **`decisions`** uses `coupleId` + `mode` for battle badge counts (`grantBattleCompletionRewards`); also `coupleId` + `category` for Foodie / Night In counts. **`reasons`:** `coupleId` + `authorId` for reason badges. **`ceremonies`:** `coupleId` + `status` for completed-season counts. **`couples`:** allow writes to optional `streaks` and `weeklyChallenge` for the two partner UIDs (same as other couple fields). There is no `firestore.rules` file in-repo — rules live in Firebase Console or your deploy pipeline; keep them aligned with these fields. **`react-native-reanimated`:** keep the Babel plugin last in `babel.config.js` (Expo / navigator stack). Awards **reveal** uses RN `Animated` only so Expo Go won’t crash on Reanimated worklets at import time.

---

## Conventions

1. **Dependencies**: Use `npx expo install <pkg>` for anything tied to the Expo SDK (including `react`, `react-dom`, `react-native`). See `.cursor/rules/expo-setup.mdc`.
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
| **Awards**: deliberation, overlap, resolution, reveal, past archive, cycle advance (`lib/firestore/ceremonies.ts`, `lib/awardsLogic.ts`, `app/(tabs)/awards/*`) | Done (v2 flow; text only; haptics on key steps) |
| **Gamification**: XP (`grantXp`), deliberation/battle/ceremony grants, Quick Spin / nomination / reason / resolution XP, streaks + weekly challenge on couple doc (mostly under hood), badge evaluators (`lib/gamificationBadges.ts`), celebrations host; **profile** leads with **XP + badges**, plus a softer **“together lately”** stats band (`ProfileSoftStats`, `getDecisionCountForCouple`) | Done |
| **Awards**: nomination photos | Not started |
| **Because**: write + draw 3 random (text) | Done (v1) |
| **Because**: optional media on reasons | Not started |
| Push notifications, Cloud Functions | Not started |
| Firebase Storage (photos) | Deferred (Blaze plan) |

**Future idea (documented in blueprint):** collaborative Quick Spin — partner sees or confirms spin; currently spins are local UX + saved outcome in Firestore.

---

## Where to look next

- **Deep product + data model + costs + phases**: [`../BLUEPRINT.md`](../BLUEPRINT.md)
- **Setup on a machine**: [`../SETUP.md`](../SETUP.md)
- **Ideas backlog / brainstorm**: [`APPS_AND_FEATURES.md`](./APPS_AND_FEATURES.md)

When in doubt, prefer updating `docs/APPS_AND_FEATURES.md` or this file over scattering notes in random markdown files.
