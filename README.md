# humm

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
| **[docs/APPS_AND_FEATURES.md](./docs/APPS_AND_FEATURES.md)** | Living brainstorm: current build, next up, idea parking lot |
| **[SETUP.md](./SETUP.md)** | Machine setup, Firebase, Expo Go, env vars |
| **[BLUEPRINT.md](./BLUEPRINT.md)** | Full spec: data models, flows, costs, phased roadmap |
| **[docs/DESIGN.md](./docs/DESIGN.md)** | UI/UX direction and refinement ideas |

---

## Features (product)

### Decision engine
- **Quick spin** — weighted pick by category (food, activity, movie, other), veto, history, optional Maps nudge for food
- **Battle mode** — realtime bracket: shared pool, synced votes, revote + coin tie-break, saves to history

### Bi-annual awards
Seven categories: nominations, full ceremony flow (deliberation → reveal), text only for now (photos later).

### Because of you
Write reasons for your partner; **draw three random** reasons they’ve written about you. Text only for now (media later).

### Gamification
XP and level shell on profile; badges and challenges **planned**.

---

## Development status

- [x] Blueprint + agent docs
- [x] Phase 1 (partial): Auth, couple link, decide (quick spin, history), home, profile shell
- [x] Phase 2 (v1): **Because** — write reasons + draw 3 about you · **Awards** — ceremonies + nominations (text only)
- [x] Phase 2 (v2): Awards ceremony flow (deliberation, overlap, resolve, reveal, past) — photos / Storage still open
- [ ] Phase 3: Gamification depth
- [ ] Phase 4: Notifications + release builds

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
