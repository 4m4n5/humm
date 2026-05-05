# Hum — developer guide (onboarding & architecture)

**Audience:** Engineers and AI agents picking up this codebase. Read **[AGENTS.md](./AGENTS.md)** first for product tone and conventions; use this file for **routes, data paths, rules, and feature boundaries**.

**Companion docs:** [SETUP.md](../SETUP.md) · [BLUEPRINT.md](../BLUEPRINT.md) · [DESIGN.md](./DESIGN.md) · [APPS_AND_FEATURES.md](./APPS_AND_FEATURES.md) · [FIRESTORE_MOOD_RULES.md](./FIRESTORE_MOOD_RULES.md)

---

## 1. Quick orientation

| Item | Value |
|------|--------|
| npm package name | `humtum` (`package.json` `name`) |
| Expo **`slug`** (`app.json`) | `humm` — used in Expo dashboard URLs |
| Deep link **scheme** (`app.json`) | `humtum` (`humtum://`) |
| Bundle / application id | `com.humtum.app` |
| Router | **Expo Router** — files under `app/` define URLs |
| Auth gate | `components/AppRoot.tsx` → `(auth)` until signed in + `coupleId` |
| Tabs layout | `app/(tabs)/_layout.tsx` — initializes Firestore-backed stores when `profile.coupleId` exists |

**First run:** copy `.env.example` → `.env`, fill `EXPO_PUBLIC_FIREBASE_*`, then `npm install` and `npx expo start --clear`. Full steps: [SETUP.md](../SETUP.md).

---

## 2. Directory map (what lives where)

```
app/
  _layout.tsx              # Firebase env gate; Suspense → AppRoot
  (auth)/                  # sign-in, sign-up, link-partner
  (tabs)/                  # All main tabs + nested stacks (see §3)

components/
  shared/                  # Button, Card, Input, ScreenHeader, LoadingState, EmptyState
  battle/                  # Bracket UI, coin flip
  gamification/            # GamificationToastHost, celebrations
  mood/                    # MoodTodayHero, MoodGrid, WeekStrip, MoodChip, MoodHomeRow, …

constants/
  theme.ts                 # Hex palette — keep aligned with tailwind `hum-*`
  moodStickers.ts          # Quadrants, sticker options, labels/blurbs
  hummVoice.ts             # Awards / ceremony copy
  challenges.ts            # Weekly challenge pool
  elevation.ts             # Shared shadows (e.g. patterns consumed by mood “cardShadow”)

lib/
  firebase.ts              # App + Auth (RN persistence) + Firestore
  firebaseEnv.ts           # Validates EXPO_PUBLIC_* for boot
  registerExpoPushToken.ts # Writes Expo push token → users/{uid}.fcmToken
  ceremonyReminders.ts     # Local notifications for award windows
  gamificationTriggers.ts  # After-write hooks (mood, habits, battles, …)
  gamificationBadges.ts
  battleLogic.ts           # Pure bracket math
  awardsLogic.ts
  stores/                  # Zustand stores (auth, decisions, nominations, reasons, battle, habit, mood)
  firestore/               # One module per domain (users, couples, moodEntries, habits, …)

types/index.ts             # Canonical TS models — prefer importing from here

functions/                 # Firebase Cloud Functions v2 (TypeScript) — push triggers

firestore.*.rules          # Fragments to merge into Console rules (not a single deployable file in-repo)
firestore.indexes.json     # Composite indexes — deploy via npm run deploy:indexes
```

**Path alias:** `@/` → project root (`tsconfig.json`).

---

## 3. Navigation (Expo Router)

### Stack (root)

| Route group | Purpose |
|-------------|---------|
| `(auth)` | Unauthenticated: sign-in, sign-up, link-partner |
| `(tabs)` | Authenticated + paired: tab navigator |

### Tabs (order matches `app/(tabs)/_layout.tsx`)

| Tab name (UI) | Folder | Notes |
|----------------|--------|--------|
| home | `app/(tabs)/index.tsx` | Hero shortcuts; embeds `MoodHomeRow`, ceremony/decide promos |
| mood | `app/(tabs)/mood/` | Stack: `index` (feed + week), `log` (picker) |
| decide | `app/(tabs)/decide/` | Hub, quick-spin, battle lobby/vote/result, history |
| awards | `app/(tabs)/awards/` | Hub, nominate, category, deliberate/overlap/resolve, reveal, calendar, past |
| reasons | `app/(tabs)/reasons/` | Draw + write |
| habits | `app/(tabs)/habits/` | List + `new` |
| you (profile) | `app/(tabs)/profile/` | Profile, badge teasers, notification-settings, delete-account |

### Deep links from push

`AppRoot` listens for notification taps and `router.push` when `data.screen` is a path (e.g. `/mood`, `/reasons`). Cloud Functions set `data.screen` to match these routes.

---

## 4. Client bootstrap & global side effects

**`components/AppRoot.tsx`**

- Subscribes auth via `useAuthStore().init()`.
- Registers **local** notification handler (`ensureNotificationHandler`).
- On `profile` load: `registerExpoPushToken(uid)` (writes **`users/{uid}.fcmToken`** — field name is legacy “fcm” but value is an **Expo push token**).
- Runs **`migrateLegacyMoodSticker`** once per profile load path for users coming from old `UserProfile.moodSticker`.
- Routes: no Firebase user → sign-in; no `coupleId` → link-partner; else → `(tabs)`.

**`app/(tabs)/_layout.tsx`**

When `profile.coupleId` is set, initializes listeners/actions for:

- `decisionStore`, `nominationsStore`, `reasonStore`, `battleStore`, `habitStore`

(`moodStore.init` runs from **`app/(tabs)/index.tsx`** (home) and **`app/(tabs)/mood/index.tsx`** so `MoodHomeRow` stays live without opening the mood tab.)

Also calls `ensureWeeklyChallengeRotated(coupleId)` **once per mount** of tabs.

---

## 5. Firestore — collections & code ownership

Use **`types/index.ts`** as the schema reference. Primary write/read modules:

| Collection | Module(s) | Indexes (see `firestore.indexes.json`) |
|------------|-----------|----------------------------------------|
| `users` | `lib/firestore/users.ts` | — |
| `couples` | `lib/firestore/couples.ts`, gamification fields | — |
| `decisions` | `lib/firestore/decisions.ts` | `coupleId` + `createdAt`; `coupleId` + `mode`; `coupleId` + `category` |
| `decisionOptions` | `lib/firestore/decisions.ts` — **top-level** `decisionOptions/{coupleId}` (not a subcollection of `couples`) | — |
| `nominations` | `lib/firestore/nominations.ts` | several `coupleId` / `ceremonyId` / nominee variants |
| `ceremonies` | `lib/firestore/ceremonies.ts` | `coupleId` + `status` |
| `reasons` | `lib/firestore/reasons.ts` | `coupleId` + `createdAt`; `coupleId` + `authorId` |
| `battles` | `lib/firestore/battles.ts` | (rules must allow couple members) |
| `habits` | `lib/firestore/habits.ts` | `coupleId` + `createdAt` |
| `habitCheckins` | `lib/firestore/habits.ts` (same module as `habits`) | `coupleId` + `cadence` + `dayKey` / `weekKey`; `coupleId` + `uid` |
| `moodEntries` | `lib/firestore/moodEntries.ts` | `coupleId` + `dayKey` desc |

**`coupleId` convention:** `${user1Id}_${user2Id}` where **`user1Id` is the linker’s uid** and **`user2Id` is the partner’s uid** at link time (`createCouple` in `lib/firestore/couples.ts`). It is **not** lexicographically sorted; mood doc ids embed this same string.

---

## 6. Mood feature (implementation notes)

### Document identity

- **Doc id:** `${coupleId}_${uid}_${dayKey}` where `dayKey` / `weekKey` come from **`lib/dateKeys.ts`** (device-local calendar).
- **Writes:** `upsertMoodEntry` appends to `timeline` (cap 24 intraday), updates `current`.

### Listeners

- **Today’s doc** may **not exist** before first log — rules must allow **`get`** when missing for allowed paths (see mood rules doc).
- **Feed query:** `where('coupleId')` + `orderBy('dayKey', 'desc')` — **`allow list`** must not over-constrain with doc-id vs field mismatches; see [FIRESTORE_MOOD_RULES.md](./FIRESTORE_MOOD_RULES.md).

### UI surfaces

| Component | Role |
|-----------|------|
| `MoodHomeRow` | Home tab strip — partner + you pills, navigates to mood |
| `MoodTodayHero` | Today card with floating emoji, partner slot |
| `MoodGrid` | Quadrant-organized **horizontal pills** (not large quadrant cards) |
| `WeekStrip` | Week dots inside rounded shell |
| `MoodChip` | Compact / full pill variants |

### Client navigation after save

`app/(tabs)/mood/log.tsx` should **`router.replace('/mood')`** (not only `back`) and clear any **“saving”** UI lock in `finally` so the grid does not stay disabled.

### Gamification

`lib/gamificationTriggers.ts` includes hooks after mood writes (badges/XP — align with `constants/badges.ts` / levels).

### Server push

`functions/src/index.ts` — **`onMoodEntryWritten`**: when `current.stickerId` changes, partner receives Expo push with `data.screen: "/mood"`.

---

## 7. Habits feature

- **Models:** `Habit`, `HabitCheckin` in `types/index.ts` (`cadence`: daily | weekly; `scope`: shared | personal).
- **Couple doc:** `habitsModelVersion`, `dailyStreaks`, `jointDailyStreak`, optional mood-adjacent **`bothLoggedDayStreak`** fields — see `Couple` interface.
- **Rules fragment:** `firestore.habits.rules` (merge in Console like mood).
- **Indexes:** `habitCheckins` and `habits` composites in `firestore.indexes.json`.
- **Screens:** `app/(tabs)/habits/index.tsx`, `new.tsx`; store: `lib/stores/habitStore.ts`.

---

## 8. Push notifications

### Client

- Token persistence: **`users/{uid}.fcmToken`** (Expo push token string).
- Preferences: **`users/{uid}.notificationPreferences`** — `reasons`, `mood`, `nominations`, `battles`, `decisions` booleans; omitted/null treated as all on where supported (`functions/src/push.ts` maps **`data.screen`** path segments to these keys). **Weekly challenge** pushes use `screen: "/"`, which yields an empty feature segment — they are **not** gated by the toggles until a `challenge` (or home) key exists in prefs.
- UI: `app/(tabs)/profile/notification-settings.tsx`.
- **Expo Go / simulators:** token registration may no-op or warn — use physical device + EAS dev build for realistic testing.

### Server (`functions/`)

Build: `cd functions && npm install && npm run build`.

Deploy: `npm run deploy` inside `functions/` (requires Firebase CLI logged in, project selected).

**Triggers** (all call `sendPushToUser` → Expo Push API):

| Export | Trigger |
|--------|---------|
| `onMoodEntryWritten` | `moodEntries/{docId}` write |
| `onReasonCreated` | `reasons` create |
| `onNominationCreated` | `nominations` create |
| `onBattleCreated` | `battles` create |
| `onDecisionCreated` | `decisions` create (`mode === 'quickspin'` only) |
| `onWeeklyChallengeCompleted` | `couples/{id}` update when weekly challenge XP flips |

---

## 9. Firestore security rules (repo workflow)

There is **no** checked-in monolithic `firestore.rules`. The repo ships **merge fragments**:

| File | Concern |
|------|---------|
| `firestore.mood.rules` | `moodEntries` helpers + match |
| `firestore.habits.rules` | `habits`, `habitCheckins` |
| `firestore.account-deletion.rules` | Comments / patterns for account deletion + partner unlink |

**Rules are not filters:** collection queries fail if **any** candidate doc fails the rule. Design **`list`** rules for the **query shape**, and enforce stricter checks on **`get`** / **`create`** / **`update`**.

After editing rules in Firebase Console, confirm **`firestore.indexes.json`** is deployed (`npm run deploy:indexes` from repo root).

---

## 10. Design implementation

- **Tokens:** Tailwind `hum-*` in `tailwind.config.js` + **`constants/theme.ts`** hex — keep in sync.
- **Motion:** subtle `active:` opacity / haptics; awards **cheer** may use richer animation (`reveal.tsx` uses RN `Animated` for Expo Go safety where noted in AGENTS).
- **Mood / home polish:** rounded shells (~`rounded-[28px]`), **pill** shapes for selectable moods, shared elevation patterns — see [DESIGN.md](./DESIGN.md).

---

## 11. Scripts (npm)

| Script | Use |
|--------|-----|
| `npm run start` | `expo start --clear` |
| `npm run deploy:indexes` | Deploy Firestore indexes (uses isolated `XDG_CONFIG_HOME` — see SETUP) |
| `npm run firebase:login` | Firebase CLI login with same config workaround |
| `npm run build:android:apk` | EAS preview APK |
| `npm run eas:env:push:preview` | Push `.env` secrets to EAS preview env |

Utility scripts: `scripts/reset-couple-data.mjs`, `recompute-gamification.ts`, demo account creators — read before running against production.

---

## 12. Checklist for new feature work

1. Extend **`types/index.ts`** if the data model changes.
2. Add Firestore accessors under **`lib/firestore/`** using existing patterns (`onSnapshot`, typed converters).
3. Add Zustand slice or extend existing store; subscribe from **`(tabs)/_layout.tsx`** only if the feature needs global eager sync.
4. Add routes under **`app/(tabs)/...`** with `_layout.tsx` stacks as needed.
5. Update **rules** in Console (and fragments in-repo); run **`deploy:indexes`** if queries need composites.
6. If partner-facing events should notify: extend **`functions/src/index.ts`** + respect **`notificationPreferences`** in **`functions/src/push.ts`**.
7. Document behavior in **`docs/APPS_AND_FEATURES.md`** (product) and touch this file or **AGENTS** if architecture shifts.

---

*Last aligned with app tabs: home · mood · decide · awards · reasons · habits · you.*
