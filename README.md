# Hum - rituals

> *Like the sound you make when a song gets stuck in your head — that quiet melody that just plays between two people.*

A **private** cross-platform app for two — built for partners, not the App Store at large.

**Platforms:** iOS · Android · Web  
**Stack:** Expo (SDK 54) + React Native + Firebase  
**Users:** 2 (invite-only)

---

## Docs for humans & agents

| Doc | Use |
|-----|-----|
| **[docs/AGENTS.md](./docs/AGENTS.md)** | **Start here** — repo map, stack, conventions, implementation status |
| **[docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)** | **Architecture** — Expo routes, Firestore modules, rules fragments, Cloud Functions, feature boundaries |
| **[docs/APPS_AND_FEATURES.md](./docs/APPS_AND_FEATURES.md)** | Living brainstorm: current build, next up, idea parking lot |
| **[SETUP.md](./SETUP.md)** | Machine setup, Firebase, Expo Go, env vars |
| **[BLUEPRINT.md](./BLUEPRINT.md)** | Full spec: data models, flows, costs, phased roadmap |
| **[docs/CEREMONY_TERMINOLOGY.md](./docs/CEREMONY_TERMINOLOGY.md)** | Awards: **nominate · align · cheer** vs Firestore `deliberating` / legacy code names |
| **[docs/DESIGN.md](./docs/DESIGN.md)** | UI/UX direction and refinement ideas |
| **[docs/FIRESTORE_MOOD_RULES.md](./docs/FIRESTORE_MOOD_RULES.md)** | Deploying **moodEntries** rules (`firestore.mood.rules`) |
| **[docs/STORE_LAUNCH.md](./docs/STORE_LAUNCH.md)** | Play Store & App Store launch (EAS, AAB/IPA, paid-app pricing — see doc, privacy, checklists) |
| **[docs/APP_STORE_LISTING.md](./docs/APP_STORE_LISTING.md)** | App Store Connect metadata, URLs, screenshots checklist |
| **[docs/AWARDS_SEASON_RULES.md](./docs/AWARDS_SEASON_RULES.md)** | Awards ceremony rules as enforced in code (`ceremonies`, validations) |

---

## Features (product)

### Decision engine
- **Quick spin** — weighted pick by category (food, activity, movie, other), veto, history, optional Maps nudge for food
- **Battle mode** — realtime bracket: shared pool, synced votes, revote + coin tie-break, saves to history

### Bi-annual awards
Seven categories: nominations, full ceremony flow (**nominate → align → cheer**; see [terminology](./docs/CEREMONY_TERMINOLOGY.md)), text only for now (photos later).

### Reasons
Write reasons you love your partner; **draw three random** reasons they’ve written about you. Text only for now (media later).

### Mood & habits
- **Mood** — daily quadrant sticker (`moodEntries`), partner mirrored state on home + mood tab, history feed; optional partner push via Cloud Functions.
- **Habits** — shared or personal daily/weekly routines with check-ins and streak fields on the couple doc.

### Gamification
XP and level on profile; badges and weekly challenges **shipped** (see `lib/gamification*`); tune thresholds over time.

### Push (partner alerts)
Expo push token stored on `users`; per-feature toggles in profile; **Firebase Functions** send pushes for mood, reasons, nominations, battles, quick spins, and weekly challenge completion.

---

## Development status

- [x] Blueprint + agent docs + developer guide
- [x] Phase 1 (partial): Auth, couple link, decide (quick spin, history), home, profile shell
- [x] Phase 2 (v1): **Reasons** — write for them + draw 3 about you · **Awards** — ceremonies + nominations (text only)
- [x] Phase 2 (v2): Awards ceremony flow (alignment: private picks, overlap, resolve, cheer walkthrough, past) — photos / Storage still open
- [x] **Mood** + **Habits** tabs + Firestore + rules fragments + indexes
- [x] Gamification breadth (XP, badges, weekly challenge, couple streak hooks)
- [~] Push: client registration + **Cloud Functions** triggers — tune copy/coverage; scheduled ceremony pushes remain optional vs local reminders
- [ ] Phase 4 polish: store releases; deeper notification scheduling if desired

---

## Getting started

```bash
cd humm
cp .env.example .env   # fill Firebase web config (EXPO_PUBLIC_*)
npm install
npx expo start --clear
```

- **iPhone:** Use **Expo Go** from the App Store (supports **SDK 54** for this project).
- **Web:** press `w` in the terminal.

Details: [SETUP.md](./SETUP.md).

### Android APK (shareable build)

EAS is configured for an **APK** (`preview` profile). See **[SETUP.md § 6](./SETUP.md)** — log in, `eas init`, set `EXPO_PUBLIC_*` secrets on EAS, then `npm run build:android:apk`.

---

*Personal project — not for public distribution.*
