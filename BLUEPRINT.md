# humm — App Blueprint

> **Status:** Living spec — Phase 1 partially implemented in-app; this document remains the source of truth for data models, costs, and long-term roadmap.  
> **App name:** `humm` *(like the sound you make when a song gets stuck in your head)*  
> **Audience:** Exactly two users — a private couple app  
> **Platforms:** iOS · Android · Web (single codebase)

**See also:** [docs/AGENTS.md](./docs/AGENTS.md) (repo map & agent context) · [docs/APPS_AND_FEATURES.md](./docs/APPS_AND_FEATURES.md) (brainstorm / backlog) · [docs/CEREMONY_TERMINOLOGY.md](./docs/CEREMONY_TERMINOLOGY.md) (award ceremony: **nominate · align · cheer** vs `deliberating` in Firestore)

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Tech Stack](#2-tech-stack)
3. [App Architecture](#3-app-architecture)
4. [Data Models](#4-data-models)
5. [Feature 1 — Decision Engine](#5-feature-1--decision-engine)
6. [Feature 2 — Award Ceremony](#6-feature-2--award-ceremony) · [terminology doc](./docs/CEREMONY_TERMINOLOGY.md)
7. [Feature 3 — Gamification](#7-feature-3--gamification)
8. [Feature 4 — Reasons](#8-feature-4--reasons)
9. [Navigation Structure](#9-navigation-structure)
10. [Notifications & Scheduling](#10-notifications--scheduling)
11. [Cost Analysis](#11-cost-analysis)
12. [Development Phases](#12-development-phases)
13. [Key Technical Decisions](#13-key-technical-decisions)

---

## 1. Project Identity

| Field | Value |
|---|---|
| App Name | `humm` *(like the sound you make when a song gets stuck in your head)* |
| Project folder | `humm` |
| Users | Exactly 2 (you + your wife) |
| Nature | Private, invite-only, no public listing needed |
| Primary Language | TypeScript |

The 2-user constraint is architecturally significant — it eliminates the need for scaling infrastructure and makes the Firebase free tier sufficient indefinitely.

---

## 2. Tech Stack

### Recommended: Expo (React Native) + Firebase

#### Frontend — Expo

| Why | Detail |
|---|---|
| True cross-platform | Single codebase → iOS, Android, Web |
| OTA updates | Push JS changes without app store re-submit |
| Managed workflow | No native Xcode/Android Studio required for most features |
| TypeScript-first | Full type safety across the stack |
| EAS (Expo Application Services) | Handles cloud builds + distribution |

#### Backend — Firebase

| Service | Used For |
|---|---|
| Firebase Auth | Email/password or magic link login |
| Firestore | Real-time database, 2-device sync via `onSnapshot` |
| Firebase Storage | Photo uploads for nominations, profiles |
| Cloud Functions | Scheduled ceremony reminders, triggered logic |
| FCM / APNs | Push notifications to both devices |

The Firebase **Spark (free) plan** covers 2 users indefinitely with comfortable headroom across all services.

#### Alternative Stack (open-source/self-hosted preference)

- **Supabase** — PostgreSQL + Realtime + Auth + Storage on Railway (~$5/month)
- Same Expo frontend, swap Firebase SDK for Supabase client
- Trade-off: more control, slightly more setup, small monthly cost

---

## 3. App Architecture

```
┌─────────────────────────────────────────┐
│           Expo App (Client)             │
│   ┌──────┐  ┌─────────┐  ┌─────────┐  │
│   │ iOS  │  │ Android │  │  Web    │  │
│   └──────┘  └─────────┘  └─────────┘  │
└────────────────────┬────────────────────┘
                     │ Firebase SDK
┌────────────────────▼────────────────────┐
│              Firebase Backend           │
│                                         │
│  ┌──────────┐   ┌─────────────────┐    │
│  │ Firebase │   │   Firestore DB  │    │
│  │   Auth   │   │  (real-time)    │    │
│  └──────────┘   └─────────────────┘    │
│                                         │
│  ┌──────────┐   ┌─────────────────┐    │
│  │ Firebase │   │ Cloud Functions │    │
│  │ Storage  │   │  (cron + hooks) │    │
│  └──────────┘   └────────┬────────┘    │
│                           │             │
│                  ┌────────▼────────┐   │
│                  │  FCM / APNs     │   │
│                  │ (push notifs)   │   │
│                  └─────────────────┘   │
└─────────────────────────────────────────┘
```

### Key Architectural Principles

- **Real-time sync:** Both partners see each other's changes instantly via Firestore `onSnapshot` listeners — no polling, no refresh buttons
- **Offline-first:** Firestore's local cache means the app works offline and syncs when reconnected
- **Security rules:** Firestore security rules ensure each user can only read/write their couple's data
- **Serverless:** No server to maintain — Cloud Functions handle all scheduled/triggered logic

---

## 4. Data Models

### Firestore Collections

```
users/{userId}
  displayName:      string
  avatarUrl:        string | null
  partnerId:        string | null        // other user's ID
  coupleId:         string | null        // shared couple document ID
  fcmToken:         string | null        // push notification token
  xp:               number
  level:            number
  badges:           string[]             // badge IDs earned
  createdAt:        Timestamp

couple/{coupleId}
  user1Id:          string
  user2Id:          string
  inviteCode:       string               // used to link two accounts
  createdAt:        Timestamp
  activeCeremonyId: string | null
  activeBattleId:   string | null        // in-progress battle session doc (if any)

battles/{battleId}
  coupleId, category, status: 'collecting' | 'battling' | 'complete'
  options: string[], optionsByUser: { [uid]: string[] }, readyByUser: { [uid]: boolean }
  bracket: BattleMatchup[] (flat single-elim tree), currentMatchupIndex, winner, createdAt

decisions/{decisionId}
  coupleId:         string
  category:         'food' | 'activity' | 'movie' | 'other'
  mode:             'quickspin' | 'battle' | 'weighted'
  options:          string[]             // list of options entered
  result:           string               // winning option
  vetoedBy:         string[]             // userIds who used veto
  createdAt:        Timestamp

decisionOptions/{coupleId}/options/{category}
  items: [
    { label: string, tags: string[], lastPickedAt: Timestamp | null }
  ]
  // Persistent option lists per category, used for Quick Spin and weighted history

nominations/{nominationId}
  coupleId:         string
  ceremonyId:       string
  category:         AwardCategory        // see enum below
  nomineeId:        string | 'both'      // userId or 'both'
  submittedBy:      string               // userId
  title:            string
  description:      string
  photoUrl:         string | null
  eventDate:        Timestamp | null     // when it happened
  createdAt:        Timestamp

ceremonies/{ceremonyId}
  coupleId:         string
  periodStart:      Timestamp
  periodEnd:        Timestamp
  status:           'nominating' | 'deliberating' | 'voting' | 'complete'   // product: nominate → align → cheer; see docs/CEREMONY_TERMINOLOGY.md
  ceremonyDate:     Timestamp | null     // scheduled ceremony event date
  winners: {
    [category: AwardCategory]: {
      nominationId:  string
      agreedBy:      string[]            // both userIds when consensus reached
      nomineeId:     string | 'both'
    }
  }
  createdAt:        Timestamp
  // Also on the same doc (see types/Ceremony in repo): picksByUser, picksSubmitted,
  // resolutionPicksByUser — no separate deliberations/ subcollection in the shipped app.

reasons/{reasonId}
  coupleId:         string
  authorId:         string               // the person who wrote it
  aboutId:          string               // the person it's about (the other partner)
  text:             string               // e.g. "you always…"
  mediaUrl:         string | null        // optional photo or video
  mediaType:        'photo' | 'video' | null
  createdAt:        Timestamp

gamification/{coupleId}
  xpLog: [
    { userId: string, amount: number, reason: string, earnedAt: Timestamp }
  ]
  streaks: {
    decisionStreak:     number
    nominationStreak:   number           // nominations per month streak
    ceremonyStreak:     number           // ceremonies completed on time
    lastDecisionDate:   Timestamp | null
    lastNominationDate: Timestamp | null
  }
  weeklyChallenge: {
    id:           string
    description:  string
    issuedAt:     Timestamp
    expiresAt:    Timestamp
    completedBy:  string[]              // userIds who completed
    coupleReward: number                // XP awarded when both complete
  } | null
```

### AwardCategory Enum

```typescript
type AwardCategory =
  | 'best_found_food'
  | 'best_purchase'
  | 'sexy_time_initiation'
  | 'best_planning'
  | 'best_surprise'
  | 'best_movie'
  | 'best_fight_resolution'
```

### Firestore Security Rules (sketch)

```javascript
// Users can only read/write their own data and their couple's data
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}
match /couple/{coupleId} {
  allow read, write: if request.auth.uid in [resource.data.user1Id, resource.data.user2Id];
}
match /nominations/{nominationId} {
  allow read, write: if isCoupleчлен(resource.data.coupleId);
}
// ... similar for decisions, ceremonies, gamification
```

---

## 5. Feature 1 — Decision Engine

### Overview

Resolves decision paralysis by providing structured, fun ways to pick between options. Designed to handle food decisions first, extensible to activities, movies, and more.

**Current app (trimmed Decide tab):** only **Quick Spin** and **Battle mode** are exposed. A former standalone **movie suggest** flow (vibe tags → curated list → add to spin) was removed to reduce clutter; **Movie** remains a normal **Quick Spin** category with default options in Firestore. **Battle mode** is implemented: shared option pool, Firestore-synced bracket (`battles/{battleId}` + `couples.activeBattleId`), head-to-head votes with revote + coin tie-break, winner saved as `decisions` with `mode: 'battle'`.

---

### Mode 1: Quick Spin

**Use case:** "We can't decide what to eat tonight."

**Flow:**
1. Navigate to Decide → Quick Spin
2. Select category (Food, Activity, Movie, Other)
3. App shows a spinning wheel / card shuffle animation over the saved options list for that category
4. Either partner can hit **Veto** once — the result re-spins (each person gets 1 veto per session)
5. After both vetoes used or either partner accepts, result is locked and saved to history
6. For Food: tapping the result deep-links to Google Maps or Yelp for that cuisine/restaurant

**Weighted Logic:**
- Options not picked in the last 4+ weeks are weighted higher
- Options picked in the last 2 weeks are weighted lower
- Creates natural variety without being fully random

---

### Mode 2: Battle Mode

**Use case:** "We're in Tokyo — what should we do today?" (custom options, real discussion needed)

**Flow:**
1. Both partners add options to a shared pool (min 4, no max)
2. App generates a bracket of head-to-head matchups
3. Each matchup is shown to both partners simultaneously — each picks their preferred
4. If both agree → winner advances. If they disagree → both see the split and vote again (max 2 rounds per matchup)
5. Persistent tie-break: animated coin flip, result is final
6. Bracket resolves to a winner

**UI:** Real-time — partner's vote shows as a pulsing indicator while waiting, reveals once both voted.

---

### Mode 3: Weighted History *(Phase 2)*

- Full history view of past decisions
- Shows frequency distribution: "You've had Italian 4 times in the last 6 weeks"
- "Suggest something different" button that filters out recently picked options

---

### Food-Specific Features

| Feature | Detail |
|---|---|
| Cuisine tags | Italian, Thai, Mexican, Japanese, Indian, American, Mediterranean, Korean, etc. |
| "Not today" exclusions | Temporarily remove an option from today's spin without deleting it |
| Restaurant mode | Store specific restaurant names under a cuisine, spin picks a restaurant |
| Maps integration | Tap result → opens Google Maps / Yelp for that cuisine or restaurant name |
| Add/edit options | Either partner can manage the options list for each category |

---

### Decision History

- Scrollable list of all past decisions
- Shows: date, category, mode used, options that were vetoed, final result
- Tap any entry to see full details
- "Pick this again" shortcut to re-use an option

---

## 6. Feature 2 — Award Ceremony

### Product language vs implementation

In the app, the ceremony is **nominate · align · cheer**. **Align** covers private picks, overlap, and resolution until every winner matches; **cheer** is the walkthrough and wrap-up. Firestore still uses `ceremony.status` values **`nominating` → `deliberating` → `voting` → `complete`** (see [docs/CEREMONY_TERMINOLOGY.md](./docs/CEREMONY_TERMINOLOGY.md) for the full mapping and legacy code identifiers).

### Overview

A bi-annual (twice per year) awards ceremony for the relationship. Both partners nominate memorable moments throughout the half-year, **align** on favorites (privately, then together where they differ), then **cheer** the winners in a shared walkthrough.

---

### Ceremony Lifecycle

```
[Nominate — nominating]
    ↓  (last ~14 days before period end: alignment window on calendar)
[Reminder Push Notification sent to both]
    ↓
[Align — private picks (Firestore: deliberating)]
  Each person picks one winner per category; no peeking until both submit
    ↓  (once both submit picks → Firestore: voting)
[Align — overlap + resolution (still voting)]
  App shows matches vs splits; same winning tap locks each split category
    ↓  (all categories have agreed winners → cheer unlocks)
[Cheer — walkthrough (still voting until wrap)]
  Category-by-category moments, then season completes (Firestore: complete)
    ↓
[Next cycle — fresh nominating]
```

---

### Award Categories

| Category | Description |
|---|---|
| Best Found Food | A meal, dish, or restaurant one or both of you discovered |
| Best Purchase | A buy that turned out to be great — any size |
| Sexy Time Initiation | The most creative or memorable initiation |
| Best Planning | Trip, date, event — whoever planned it best |
| Best Surprise | An unexpected gesture, gift, or moment |
| Best Movie | A movie watched together that was a standout |
| Best Fight Resolution | How a disagreement was resolved especially well |

---

### Nomination Flow

**Adding a nomination:**
- Either partner can add nominations at any time during the 6-month window
- Form fields:
  - Category (required)
  - Nominee: You / Partner / Both (required)
  - Title — short headline for this nomination (required)
  - Description — the story / why it deserves the award (required)
  - Photo — optional, attach from camera roll or camera
  - Event date — when it happened (optional)
- Nominations are visible to both partners immediately upon submission *(Phase 1)*
- Notification sent to partner: "Your partner just added a nomination in [category]!"

**Browsing nominations:**
- Grid or list view, filterable by category and nominee
- Both partners see all nominations
- Nomination count per category shown on the Awards tab

**Phase 2 — Blind Nominations:**
- Toggle in settings to hide nominations until **alignment** starts (private picks)
- Adds surprise element to the ceremony

---

### Alignment flow (private picks + overlap + resolution)

**Trigger:** 2 weeks before the ceremony date (or 2 weeks before the 6-month mark if no ceremony date set)

**Step 1 — Independent picks:**
- Each partner privately ranks their top 1–3 nominations per category
- Cannot see partner's picks until both have submitted
- App shows progress: "You've submitted picks for 4/7 categories. Partner: 2/7."
- Nudge notification if incomplete after 3 days

**Step 2 — Overlap:**
Once both partners submit all picks, the app shows:

```
✅ Full Agreement (3 categories)
   Best Movie: "Oppenheimer night" — both picked this #1

⚡ Needs Discussion (4 categories)
   Best Found Food: You picked "Ramen discovery" — Partner picked "Street tacos trip"
   Best Planning: You picked "Kyoto itinerary" — Partner picked "Anniversary dinner"
   ...
```

**Step 3 — Resolution:**
For each contested category:
- See each other's picks side by side with descriptions/photos
- AI talking point surfaced: *"You both agree this was a great year for food — your top picks are different nights out. Which memory means more to you?"*
- Options: **Concede** (accept partner's pick), **Re-vote** (each person votes again after discussion), **It's Both** (award goes to 'both' for a tie)
- App tracks which categories are resolved; ceremony unlocks when all 7 are resolved

---

### Cheer screen (winner walkthrough)

**Presentation:**
- Full-screen cinematic mode
- Category-by-category moments with card flip animation
- Each moment shows: category name, winner card (nominee name, title, description, photo)
- Confetti / celebration animation
- Background music option (device media)

**After ceremony:**
- All 7 winners saved permanently under this ceremony
- Each winner card is shareable as an image (generated via `react-native-view-shot`)
- Ceremony archived in "Past Ceremonies" with full record

**Ceremony summary card:**
- Full ceremony recap shareable as a single image or PDF
- "Ceremony #1 — [Date]" with all 7 winners listed

---

### Ceremony Scheduling

- App auto-schedules ceremony dates at 6-month intervals from couple creation date
- Partners can adjust the ceremony date within a 2-week window
- Ceremony history stored forever: Ceremony #1, #2, #3...

---

## 7. Feature 3 — Gamification

### Philosophy

The goal is to make engagement feel rewarding, not obligatory. Everything is shared as a couple — there's no competition between partners, only collaboration. The gamification should feel like "us leveling up together."

---

### Relationship XP + Levels

**XP earning events:**

| Action | XP |
|---|---|
| Add a nomination | +10 |
| Make a decision together (any mode) | +5 |
| Submit alignment picks (private phase) | +30 |
| Resolve a contested category | +20 |
| Complete a full ceremony | +200 |
| Daily check-in (open the app) | +2 |
| Complete a weekly challenge | +50 (couple reward) |
| First nomination in a new category | +15 |

**Levels (couple-shared, displayed on both profiles):**

| Level | Name | XP Required |
|---|---|---|
| 1 | Just Started | 0 |
| 2 | Getting Cozy | 100 |
| 3 | Dynamic Duo | 300 |
| 4 | Power Couple | 700 |
| 5 | Unstoppable | 1,500 |
| 6 | Legends | 3,000 |
| 7+ | Hall of Fame | 5,000+ |

Level-ups unlock cosmetic themes (color palettes, app icon variants).

---

### Streaks

| Streak | Rule | Display |
|---|---|---|
| Decision Streak | Used the decision tool at least once per week | "🔥 4-week streak" |
| Nomination Streak | At least 1 nomination submitted per calendar month | "📝 3-month streak" |
| Ceremony Streak | Completed every scheduled ceremony without missing | "🏆 2 ceremonies on time" |

Streaks are couple-level (either partner's action counts). Breaking a streak shows a gentle recovery prompt, not a penalty.

---

### Badges & Achievements

**Decision Badges:**

| Badge | Condition |
|---|---|
| First Spin | Made your first Quick Spin decision |
| Decisive | 100 decisions made total |
| Battle-Tested | Completed 10 Battle Mode sessions |
| Veto King/Queen | Used a veto that changed the outcome 5 times |

**Nomination Badges:**

| Badge | Condition |
|---|---|
| Historian | Submitted 50 nominations across all ceremonies |
| Category Completionist | Submitted at least 1 nomination in every category in a single cycle |
| Paparazzi | Added a photo to 10 nominations |

**Ceremony Badges:**

| Badge | Condition |
|---|---|
| Opening Night | Completed your first ceremony |
| Clean Sweep | One person won all 7 categories in a single ceremony |
| Full Agreement | 100% overlap in alignment — no contested categories |
| Overtime | Resolved 3+ contested categories in a single ceremony |
| Back-to-Back | Completed 2 ceremonies in a row on schedule |

**Special Badges:**

| Badge | Condition |
|---|---|
| Early Bird | Submitted all 7 nomination categories with 2 months to spare |
| Night In | Made 20 movie decisions |
| Foodie | Made 50 food decisions |

Badges are displayed on both profiles and in the Trophy Case.

---

### Weekly Challenges

Issued every Monday, expire Sunday. Both partners must complete for the couple to earn the XP reward.

**Example challenges:**
- "Add 3 nominations this week"
- "Try a cuisine you haven't had in the last month (use Quick Spin)"
- "Use Battle Mode for a decision"
- "Add a photo to a nomination"
- "Both open the app every day this week"
- "Make a decision using the Weighted History suggestion"
- "Write 3 reasons about your partner this week"
- "Add a photo to a reason"

Challenge generation: start with a curated set of ~30 challenges, rotate weekly based on what hasn't been done recently.

**Phase 2:** AI-generated personalized challenges based on app history.

---

### Trophy Case

- Visual shelf UI (bookcase/cabinet aesthetic) displaying all earned badges and past ceremony winner cards
- Tapping a badge shows: badge name, description, when it was earned
- Tapping a ceremony trophy shows: the full ceremony recap for that period
- Both partners share the same Trophy Case

---

## 8. Feature 4 — Reasons

### Overview

A private collection of reasons each partner has written about why they love the other. After you write one for them, you can draw three random reasons they’ve written about you — a pick-me-up on good days and bad ones.

The feature name on screen: **"reasons"** — always lowercase, keeping the humm aesthetic.

---

### Writing a Reason

- Either partner can add a reason anytime
- Form fields:
  - The reason (required) — free text, any wording they want
  - Optional media — attach a photo or short video from camera roll
- No categories, no structure — just honest, freeform thoughts
- The reason is immediately visible to the other partner in their feed

---

### Reading Your Reasons

- Dedicated screen: **"why they love you"**
- Tap a button to shuffle and surface 3 random reasons written *about you* by your partner
- Smooth card animation on each cheer moment
- Can tap any card to expand and see full text + media
- "Show me more" reshuffles to 3 new ones
- All reasons also browsable in a full scrollable list (sorted newest first)

---

### Both Directions

- Each person has their own inbox of reasons written about them
- Each person has their own list of reasons they've written about their partner
- Profile screen shows count: "You've written 24 reasons. They've written 31 reasons."

---

### Gamification Tie-ins

- Writing a reason earns XP (+8)
- Badge: **"Songwriter"** — written 10 reasons
- Badge: **"Poet"** — written 50 reasons
- Badge: **"Dedicated"** — written at least 1 reason per month for 3 months straight
- Home dashboard shows a subtle prompt if no reason has been written in 2+ weeks: *"When did you last tell them why?"*

---

## 9. Navigation Structure

```
App Shell (authenticated)
│
├── Tab 1: Home
│   ├── Couple level + XP progress bar
│   ├── Active streak indicators
│   ├── Active weekly challenge card
│   ├── Ceremony countdown / status card
│   │   (e.g., "Award season opens in 43 days" or "Alignment open!")
│   └── Recent decisions (last 3)
│
├── Tab 2: Decide
│   ├── Quick Spin
│   │   ├── Category selector
│   │   ├── Options list (add/remove items)
│   │   ├── Spin animation + veto controls
│   │   └── Result screen → Maps deep-link
│   ├── Battle Mode
│   │   ├── Options entry (both partners)
│   │   ├── Bracket matchups (real-time)
│   │   └── Winner announced
│   └── History
│       └── Scrollable log of past decisions
│
├── Tab 3: Awards
│   ├── Nominate (add new nomination)
│   │   └── Nomination form
│   ├── Nominations Browser
│   │   ├── Filter by category / nominee
│   │   └── Nomination cards grid
│   ├── Ceremony
│   │   ├── [Nominate] Status + progress by category
│   │   ├── [Align — private] Submit/view picks (`deliberating`)
│   │   ├── [Align — sync] Overlap + resolution (`voting`)
│   │   └── [Cheer] Animated walkthrough, then complete
│   └── Past Ceremonies
│       └── Trophy Case + ceremony archives
│
├── Tab 4: reasons
│   ├── "why they love you" — shuffle 3 random reasons card view
│   ├── Write a reason (add new)
│   ├── All reasons written about you (scrollable)
│   └── Reasons you've written (scrollable)
│
├── Tab 5: Profile
│   ├── Your profile (avatar, name, XP, level)
│   ├── Partner profile (read-only)
│   ├── Badges grid (yours + partner's)
│   ├── Couple stats (total decisions, nominations, etc.)
│   └── Settings
│       ├── Notifications preferences
│       ├── Ceremony date adjustment
│       ├── Theme / appearance
│       └── Account management
│
└── Auth Screens (unauthenticated)
    ├── Welcome / Sign Up
    ├── Sign In
    └── Couple Linking (invite code flow)
```

---

## 9. Notifications & Scheduling

All scheduling handled via **Firebase Cloud Functions** (cron jobs + Firestore triggers).

### Scheduled Notifications

| Trigger | Timing | Message |
|---|---|---|
| Ceremony countdown | 2 weeks before 6-month mark | "Award season is coming up! Now's a great time to add nominations." |
| Alignment picks open | When status flips to `deliberating` | "Alignment is open! Submit your picks for each category." |
| Picks reminder | 3 days into private picks with no picks from a user | "Your partner has submitted their picks — it's your turn!" |
| Both picks in | When second partner submits picks | "Both picks are in! Time to see where you agree and disagree." |
| Resolution reminder | 2 days before ceremony with unresolved categories | "You've got unresolved categories — discuss and finalize before the ceremony!" |
| Decision nudge | 7 days with no decisions made | "Haven't used the decision engine in a while — need help deciding something?" |
| Weekly challenge | Every Monday 9am | "New weekly challenge: [description]. Complete it together for XP!" |
| Challenge expiry | Sunday 6pm if incomplete | "Last chance to complete this week's challenge before it expires!" |
| Nomination added | Real-time Firestore trigger | "Your partner just added a nomination in [category] — check it out!" |
| Reason added | Real-time Firestore trigger | "Your partner just told you why ♪" |
| Reason nudge | 14 days with no new reason written | "When did you last tell them why?" |
| Level up | When couple XP crosses a threshold | "You leveled up to [level name]! 🎉" |

### Notification Channels
- **FCM (Android)** — Firebase Cloud Messaging directly
- **APNs (iOS)** — via Firebase Cloud Messaging with APNs integration
- **Web Push** — via FCM Web SDK
- Notification preferences stored per user; each type can be individually toggled

---

## 10. Cost Analysis

### Distribution Strategy

For a private 2-person app, **no App Store or Google Play public listing is required.** This significantly reduces cost and friction.

| Platform | Distribution Method | Cost |
|---|---|---|
| iOS | TestFlight (private beta) | $99/year Apple Developer account |
| iOS (cheaper) | Direct IPA install (AltStore / sideload) | $0 (but reinstall required every 7 days for free) |
| Android | Direct APK sideload | $0 |
| Android (optional) | Google Play internal track | $25 one-time |
| Web | Vercel or Netlify | Free tier sufficient |

---

### Tier 1 — Completely Free

| Service | Plan | Cost |
|---|---|---|
| Firebase (Auth + Firestore + Storage + Functions) | Spark (free) | $0/month |
| Expo EAS Build | Free tier (limited monthly builds) | $0/month |
| Web hosting | Vercel free | $0/month |
| Android distribution | APK sideload | $0 |
| iOS distribution | Skip native iOS or use AltStore sideload | $0 |

**Total: $0/month**

*Limitation: No reliable iOS native push notifications without Apple Developer account. Web app works fine on iOS Safari.*

---

### Tier 2 — Recommended (~$8–10/month)

| Service | Plan | Cost |
|---|---|---|
| Firebase Blaze (pay-as-you-go) | With $10 budget cap — actual usage ~$0–2/month for 2 users | ~$0–2/month |
| Apple Developer Account | Required for TestFlight + native iOS push | $99/year (~$8/month) |
| Expo EAS Build | Free tier | $0/month |
| Web hosting | Vercel free | $0/month |
| Android | APK sideload | $0 |

**Total: ~$8–10/month**

*This is the recommended tier. Covers everything including native iOS app + push notifications.*

---

### Tier 3 — Full Polish (~$40/month)

| Service | Plan | Cost |
|---|---|---|
| Firebase Blaze | ~$0–2/month for 2 users | ~$2/month |
| Apple Developer | $99/year | ~$8/month |
| Expo EAS Production | Unlimited builds, faster queues, app store submissions | $29/month |
| Custom domain (web) | Namecheap / Cloudflare | ~$1/month |

**Total: ~$40/month**

*Only worth it if you're actively developing/rebuilding frequently and need fast build queues.*

---

### Recommendation

**Start on Tier 1.** Run entirely free during development. Move to **Tier 2 when:**
- You want native iOS push notifications for ceremony/nomination alerts
- You want the app on both phones via TestFlight without sideloading

The app will cost ~$0 to operate given 2 users. Firebase free tier has 1GB Firestore storage and 10GB file storage — you would need thousands of high-res photos before hitting limits.

---

## 11. Development Phases

### Phase 1 — Foundation + Decision Engine (Weeks 1–2)

**Goal:** Functional app skeleton with working decision tool

- [ ] Expo project init with TypeScript, Expo Router, NativeWind
- [ ] Firebase project setup (Auth, Firestore, Storage, Functions scaffold)
- [ ] Auth screens: Sign Up, Sign In, Forgot Password
- [ ] Couple linking flow: user A generates invite code → user B enters code → couple document created
- [ ] Tab navigation shell (Home, Decide, Awards, Profile)
- [ ] Decision Engine: Quick Spin with food categories
- [ ] Options list management (add/remove cuisine options)
- [ ] Decision history log
- [ ] Basic Home dashboard (placeholder content)

**Deliverable:** Both partners can log in, link accounts, and use Quick Spin for food decisions.

---

### Phase 2 — Award Ceremony Core (Weeks 3–4)

**Goal:** Full nominations + ceremony lifecycle working end-to-end

- [ ] Nomination form (all fields, photo upload)
- [ ] Nominations browser (filter by category/nominee)
- [ ] Ceremony document auto-created on couple linking (6-month cycle)
- [ ] Ceremony status state machine (nominating → deliberating → voting → complete) — product labels: nominate · align · cheer ([terminology](./docs/CEREMONY_TERMINOLOGY.md))
- [ ] Alignment (private picks) screen: submit picks per category (`deliberate.tsx` route)
- [ ] Overlap analysis screen: agreements vs. contested
- [ ] Resolution flow: concede / re-vote per contested category
- [ ] Cheer walkthrough screen (animated, category by category; route `reveal.tsx`)
- [ ] Past ceremonies archive

**Deliverable:** Full award ceremony can be run from nominations through alignment to cheer / wrap.

---

### Phase 3 — Gamification (Week 5)

**Goal:** XP, levels, badges, and weekly challenges live

- [ ] XP tracking and awarding on all trigger events
- [ ] Level calculation and level-up notification
- [ ] Badges system: define all badge conditions, award automatically
- [ ] Streaks tracking (decision, nomination, ceremony)
- [ ] Weekly challenge system (curated challenge pool, Monday rotation)
- [ ] Trophy Case screen
- [ ] Profile screen with stats, badges, level display
- [ ] Home dashboard updated with XP bar, streaks, challenge card

**Deliverable:** Full gamification layer working, compelling reason to engage weekly.

---

### Phase 4 — Notifications + Polish + Deploy (Week 6)

**Goal:** Push notifications live, app deployed to both phones

- [ ] Cloud Functions: all scheduled notification triggers
- [ ] Cloud Functions: Firestore-triggered notifications (nomination added, picks submitted)
- [ ] FCM setup for Android push
- [ ] APNs setup via Firebase for iOS push (requires Apple Dev account)
- [x] Battle Mode for decisions *(shipped in app; push/notifications still TBD)*
- [ ] Maps/Yelp deep-link integration for food decisions
- [ ] Shareable ceremony winner cards (`react-native-view-shot`)
- [ ] TestFlight distribution (iOS) + APK build (Android)
- [ ] Web deployment to Vercel
- [ ] Expo EAS build configuration for all platforms

**Deliverable:** Fully deployed app on both phones and web, notifications working.

---

### Phase 5+ — Future Features (Ongoing)

- [ ] Blind nominations mode (toggle — hide nominations until alignment / private picks)
- [ ] AI-generated alignment talking points (via OpenAI API)
- [ ] AI-personalized weekly challenges
- [ ] Shared bucket list / trip planning module
- [ ] Photo albums per ceremony (gallery of all nomination photos)
- [ ] Couple timeline / scrapbook (all events logged over time)
- [ ] Collaborative Quick Spin — both partners see the spin in real-time, each gets a veto, result locks only when both accept. Uses Firestore real-time doc for spin state sync.
- [ ] AI-suggested decisions based on history ("You haven't tried Ethiopian in a while")
- [ ] Mood-based filtering for decisions ("I want something light tonight")
- [ ] More award categories (user-configurable)
- [ ] Annual year-in-review screen (stats summary)
- [ ] Cosmetic themes unlocked by levels (dark mode variants, accent colors)

---

## 13. Key Technical Decisions

### Libraries & Frameworks

| Concern | Choice | Reason |
|---|---|---|
| Framework | Expo (managed workflow) | Simplest cross-platform setup, OTA updates |
| Navigation | Expo Router | File-based routing, works for native + web, URL support |
| Styling | NativeWind (Tailwind CSS) | `hum-*` tokens in Tailwind + `constants/theme.ts` (synced); UX notes in `docs/DESIGN.md` |
| State management | Zustand | Lightweight, no boilerplate, works well with Expo |
| Real-time data | Firestore `onSnapshot` | Built-in real-time, offline cache, no extra setup |
| Animations | Reanimated 3 | Native-thread animations for ceremony cheer walkthrough, gamification effects |
| Image picker | Expo ImagePicker | Managed, works on all platforms |
| Shareable images | `react-native-view-shot` | Capture React Native views as images → share sheet |
| Push notifications | Expo Notifications + FCM | Cross-platform push, works with Firebase |
| Icons | `@expo/vector-icons` | Included with Expo, covers all needed icons |

### Architecture Decisions

**Couple-scoped data:**
All data is scoped under a `coupleId`. Firestore security rules enforce that only users belonging to the couple can read/write. This means even if someone gets hold of another user's UID, they can't access the couple's data without being linked to that couple.

**Real-time vs. pull:**
Nominations, ceremony status, alignment picks (stored while `deliberating` / `voting`), and gamification all use `onSnapshot` listeners. This means Partner A submitting private picks immediately syncs to Partner B in the app without any refresh. This is the primary reason Firebase/Firestore was chosen over a traditional REST API.

**No server:**
Cloud Functions are used only for scheduled reminders and triggered notifications — not for data fetching. The client reads/writes Firestore directly. This keeps the architecture simple and eliminates the need to maintain any server infrastructure.

**Ceremony state machine:**
The ceremony lifecycle is a strict state machine (`nominating` → `deliberating` → `voting` → `complete`). In product copy this is **nominate → align → cheer**; **`deliberating`** is only the private-picks slice of **align**. Transitions are triggered by Cloud Functions (time-based) or by the app (e.g. both partners submitted picks). Invalid transitions are rejected by Firestore security rules. See [docs/CEREMONY_TERMINOLOGY.md](./docs/CEREMONY_TERMINOLOGY.md).

**Invite code flow:**
Since there are exactly 2 users, the couple-linking flow is: User A signs up → gets a 6-character invite code → shares it with User B (text, copy-paste, etc.) → User B enters it during onboarding → both are linked. The invite code document expires after 48 hours.

---

## Appendix: Folder Structure (Proposed)

```
hum/
├── app/                          # Expo Router pages
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── link-partner.tsx
│   ├── (tabs)/
│   │   ├── index.tsx             # Home
│   │   ├── decide/
│   │   │   ├── index.tsx         # Decide home
│   │   │   ├── quick-spin.tsx
│   │   │   ├── battle.tsx
│   │   │   ├── battle-lobby.tsx
│   │   │   ├── battle-vote.tsx
│   │   │   ├── battle-result.tsx
│   │   │   └── history.tsx
│   │   ├── awards/
│   │   │   ├── index.tsx         # Awards home / ceremony status
│   │   │   ├── nominate.tsx
│   │   │   ├── nominations.tsx
│   │   │   ├── deliberate.tsx   # private picks UI; route name legacy (product: alignment)
│   │   │   ├── ceremony.tsx
│   │   │   └── past.tsx
│   │   ├── reasons/
│   │   │   ├── index.tsx         # Write + draw three about you
│   │   │   └── write.tsx         # Add a reason
│   │   └── profile/
│   │       ├── index.tsx
│   │       └── settings.tsx
│   └── _layout.tsx
├── components/                   # Reusable UI components
│   ├── decisions/
│   ├── awards/
│   ├── gamification/
│   └── shared/
├── lib/
│   ├── firebase.ts               # Firebase init
│   ├── firestore/                # Collection helpers
│   │   ├── users.ts
│   │   ├── decisions.ts
│   │   ├── nominations.ts
│   │   ├── ceremonies.ts
│   │   ├── reasons.ts
│   │   └── gamification.ts
│   └── stores/                   # Zustand stores
│       ├── authStore.ts
│       ├── decisionStore.ts
│       ├── ceremonyStore.ts
│       └── reasonsStore.ts
├── functions/                    # Firebase Cloud Functions
│   ├── src/
│   │   ├── notifications.ts      # Scheduled notification triggers
│   │   ├── ceremonies.ts         # Ceremony lifecycle automation
│   │   └── challenges.ts         # Weekly challenge generation
│   └── package.json
├── constants/
│   ├── categories.ts             # Award categories enum + display names
│   ├── badges.ts                 # Badge definitions
│   └── levels.ts                 # XP level thresholds
├── assets/
├── BLUEPRINT.md                  # This document
├── README.md
├── app.json                      # Expo config
├── package.json
└── tsconfig.json
```

---

*Blueprint version 1.0 — written April 2026*  
*App name: humm — always lowercase, like the quiet melody between two people*  
*Next step: Run `Phase 1` implementation starting with Expo project initialization*
