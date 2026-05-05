# Hum - rituals — apps & features (living doc)

**Purpose:** One place for **you + agents** to capture what exists, what’s next, and raw ideas. Keep it conversational; use checkboxes and short bullets.

**Related:** Technical detail lives in `[BLUEPRINT.md](../BLUEPRINT.md)`. Agent onboarding: `[AGENTS.md](./AGENTS.md)`. Architecture map: `[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)`. **Award naming (nominate · align · cheer vs `deliberating`):** `[CEREMONY_TERMINOLOGY.md](./CEREMONY_TERMINOLOGY.md)`. **UI / UX notes:** `[DESIGN.md](./DESIGN.md)`.

---

## Product principles

- Fun for two people — skip features that feel like admin work.
- **Hum** / feature labels stay mostly **lowercase** in the UI; warm, musical vibe.
- Prefer simple flows over perfect systems.
- Private couple app — no public discovery, no social graph.
- **UI:** balanced density; **subtle** motion (haptics / light `active` states, not flashy) — see `[DESIGN.md](./DESIGN.md)`.

---

## Shipped or usable now

- Accounts + **link partner** (invite code)
- **Quick Spin** — categories (incl. movie as a spin list), weighted spin, veto, save decision, food → Maps nudge
- **Battle mode (realtime)** — shared option pool (min 4), both ready → single-elimination bracket; each matchup synced in Firestore; split votes revote (then coin); winner saves as `mode: 'battle'` decision; `couples.activeBattleId` + `battles/{id}` doc (`lib/firestore/battles.ts`, `battleStore`, `battle-lobby` / `battle-vote` / `battle-result`)
- **Decision history**
- Home shortcuts + profile **XP**, a quieter **together lately** stats strip (saves, badge count, seasons, spin streak), then **badges** (streaks / weekly challenge mostly under the hood; still grant XP)
- **Gamification (breadth)** — same triggers as above; **couple** doc holds `streaks` + `weeklyChallenge` (mostly feeds XP; spin streak also surfaces in profile soft stats). **`paparazzi`** deferred until nomination photos. **+xp** chip + **level up** / **badge** modals via `GamificationToastHost`
- **Reasons (v1)** — write a text reason for your partner; draw up to 3 random reasons *about you*; live counts
- **Awards (v1)** — **ceremony** doc per couple; nomination window aligned to **calendar H1** (Jan–Jun) or **H2** (Jul–Dec); **nominations** (title + story, nominee me / them / both); browse by category; text only (no photos yet)
- **Awards (v2 ceremony flow)** — **align** (private picks per category, then overlap + resolution on splits) → **cheer** walkthrough (`reveal.tsx`) → **`complete`** archives the ceremony and starts a fresh nominating cycle; **past seasons** list + detail. Firestore statuses remain `deliberating` / `voting` / `complete` — see [CEREMONY_TERMINOLOGY.md](./CEREMONY_TERMINOLOGY.md).
- **Awards polish** — three-step phase strip (nominate · align · cheer), haptics on key steps, **+30 XP** on private-picks submit (grant id `deliberation_picks_submitted`), **+200 XP** (+ badges: opening night / full agreement / overtime) on season wrap, celebration overlay after cheer; **+20 XP** when a contested category first locks in resolution
- **Ceremony calendar** — Awards → **season calendar**: compact **H1/H2** context, **nomination stats** + CTA to the awards hub, **two-phase** bar (nominating vs final **alignment window**, last 14 days before close), milestone rail + optional **local** reminders (alignment window start & ~3d) via `expo-notifications` + `uiPreferencesStore` (`ceremony-calendar.tsx`, `ceremonyCalendar.ts`, `ceremonyReminders.ts`)
- **Quick spin result haptics** — success haptic when the wheel lands; preference defaults on in `uiPreferencesStore` (persisted locally; no profile toggle)
- **Mood** — `moodEntries` collection (doc id `${coupleId}_${uid}_${dayKey}`); intraday timeline with cap; **home** `MoodHomeRow` + **mood tab** hero/week strip/history; quadrant meta + horizontal pill picker in `MoodGrid`; **`subscribeToCoupleMoodFeed`** needs composite index + permissive **`allow list`** rules ([`FIRESTORE_MOOD_RULES.md`](./FIRESTORE_MOOD_RULES.md)); Cloud Function **`onMoodEntryWritten`** notifies partner (respects `notificationPreferences.mood`)
- **Habits** — `habits` + `habitCheckins`; shared vs personal; daily/weekly cadences; couple streak fields (`dailyStreaks`, `jointDailyStreak`, etc.); merge **`firestore.habits.rules`**
- **Push (server)** — Expo token on `users.fcmToken`; toggles in **profile → notification settings** (`notificationPreferences`); Firebase Functions in `functions/src/` (mood, reasons, nominations, battles, quickspin decisions, weekly challenge completion)

---

## In progress / next up (prioritize by dragging ideas up)

*Add dates or notes as you like.*

- Gamification follow-ups — tune copy/thresholds; partner-visible XP numbers; `paparazzi` when photos ship; optional **shared** couple XP (currently per-user only)
- **Push reminders** — broaden coverage (scheduled ceremony nudges vs today’s local-only path); **FCM** naming is legacy — pushes use **Expo Push API** server-side
- **Collaborative spin** — partner sees live spin or confirms result (nice-to-have)
- Sound/haptics on spin result (toggle in settings) — shipped for quick spin; broader sound later

---

## Idea parking lot (unscoped)

*Brainstorm freely. Agents: propose moving items to “next up” only when the owners confirm.*

- Export ceremony recap as image/PDF
- **Awards** — nomination photos (Storage / Blaze)
- **Reasons** — optional photo / media (Storage / Blaze)
- Widget / lock screen glance (iOS/Android, later)
- Trip mode — temporary decision lists

---

## Decisions log

*Record small product decisions so agents don’t re-litigate.*


| Date    | Decision                                                                                                                                                                                |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —       | Stay on **Expo SDK 54** until App Store Expo Go supports newer SDK on iOS.                                                                                                              |
| —       | **Firebase Storage** deferred; Phase 1 text-only where possible.                                                                                                                        |
| —       | **Movie suggest** (standalone vibe-picker UI) **removed** — Decide tab is quick spin + battle only; movie stays a **Quick Spin category**.                                              |
| 2026-04 | **UI direction:** balanced density, subtle motion; single fixed `hum` palette (`tailwind.config.js` + `constants/theme.ts`). UX refinement ideas tracked in `[DESIGN.md](./DESIGN.md)`. |


---

## Notes from owners

*Freeform scratch space.*

- 