# Awards season — implementation rules (editable spec)

This document describes **what the app actually enforces** today (Firestore helpers, validation, and primary UI paths). Product copy uses **nominate · align · cheer**; stored ceremony statuses are **`nominating` → `deliberating` → `voting` → `complete`**. See [CEREMONY_TERMINOLOGY.md](./CEREMONY_TERMINOLOGY.md) for the mapping.

When you change product rules, update **both** this file and the referenced code paths (listed in each section).

---

## 1. Ceremony document & lifecycle

### 1.1 Creation

- A ceremony is created with:
  - `periodStart` / `periodEnd`: civil **half-year** for “today” (local calendar):
    - **H1:** Jan 1 00:00:00.000 — Jun 30 23:59:59.999  
    - **H2:** Jul 1 00:00:00.000 — Dec 31 23:59:59.999  
  - `status: 'nominating'`
  - `ceremonyDate: null`
  - `winners`, `picksByUser`, `picksSubmitted`, `resolutionPicksByUser`: empty objects
- **Code:** `lib/firestore/ceremonies.ts` — `createCeremony`

### 1.2 Active ceremony on the couple

- `couples.activeCeremonyId` points at the **current** season.
- `ensureActiveCeremonyForCouple`:
  - If there is an active ceremony whose `status === 'nominating'` and whose `periodStart`/`periodEnd` do **not** match the current half-year (within ±2 days, timezone drift), those two fields are **rewritten** to the current half. Status and other fields are unchanged.
  - If there is no valid active ceremony doc, a **new** ceremony is created and `activeCeremonyId` is set.
- **Code:** `lib/firestore/ceremonies.ts` — `ensureActiveCeremonyForCouple`; half match: `lib/ceremonyCalendar.ts` — `ceremonyPeriodMatchesHalfYear`

### 1.3 Nominations belong to a ceremony

- Each nomination has `coupleId` + `ceremonyId` (must match the couple’s active ceremony for the live jar).
- Subscriptions load nominations for `(coupleId, activeCeremonyId)`.
- **Code:** `lib/firestore/nominations.ts`, `lib/stores/nominationsStore.ts`

---

## 2. Calendar vs. enforcement (critical)

### 2.1 “Alignment window” on the calendar (14 days)

- **Constant:** `ALIGNMENT_WINDOW_DAYS = 14` (`lib/ceremonyCalendar.ts`).
- **Alignment window start:** `periodEnd` minus 14 **calendar days** (same local `Date` arithmetic as `setDate(getDate() - 14)`).
- Used for:
  - Season progress bar segments (`getSeasonBarSegments`)
  - Milestones on the ceremony calendar (`buildCeremonyMilestones`: “Alignment”, “Last call” = 3 days before `periodEnd`, “Closes”)
  - Copy helpers (`alignmentStartsSummary`, `alignmentWindowDayIndex`)
  - Local notifications (`lib/ceremonyReminders.ts`): schedule at **14 days before** and **3 days before** `periodEnd` (if still in the future and ceremony not `complete`)
- **`getSeasonPhase(now, ceremony)`** (`'nominations' | 'alignment' | 'ended'`) is implemented in `ceremonyCalendar.ts` but **is not referenced elsewhere in the app** as of this doc — i.e. **phase on the calendar does not gate buttons or writes**.

### 2.2 What actually gates behavior

- **Runtime flow is driven almost entirely by `ceremony.status`**, not by whether `now` is inside the 14-day alignment window or after `periodEnd`.
- **Exception:** gamification “on time” for ceremony streak uses **real time** vs `periodEnd` (see §7).

### 2.3 After `periodEnd` (calendar “ended”)

- UI helpers treat `now >= periodEnd` as **season ended** for calendar copy and skip scheduling past-due reminders.
- There is **no** automatic flip of `ceremony.status` when the calendar end passes; a couple can still be stuck in `nominating` / `deliberating` / `voting` across the boundary unless they complete the flow.

---

## 3. Status: `nominating` (product: nominate)

### 3.1 Allowed / intended behavior

- **Start alignment** (`startDeliberation`):
  - **Requires:** `status === 'nominating'`.
  - **Effect:** `status → 'deliberating'`; clears `picksByUser`, `picksSubmitted`, `resolutionPicksByUser`, `winners`.
  - **Errors:** wrong status → *“Alignment can only start during the nominating phase.”*
- **Also requires:** `allEnabledCategoriesHaveNominations(nominations, enabledCategoryIds)` where `enabledCategoryIds` comes from the couple’s **enabled** award category rows (`couple.awardCategories` merged with defaults) **at the moment `startDeliberation` runs**. Paused/disabled categories are omitted from that list, so they never need nominations to start alignment. Otherwise: *“Add at least one nomination in every enabled category before starting alignment.”*
- **UI:** Awards hub shows “start alignment” only in `nominating`, **disabled** until that same condition holds (and at least one enabled category exists).
- **Code:** `lib/firestore/ceremonies.ts` — `startDeliberation`; `lib/awardsLogic.ts` — `allEnabledCategoriesHaveNominations`; `app/(tabs)/awards/index.tsx`

### 3.1b Couple award categories

- Stored on **`couples/{id}`**: optional `awardCategories` (`id`, `label`, `emoji`, `enabled`) and `awardCategoryIdsUsedInCompleteSeasons` (ids that had nominations in a **completed** ceremony).
- Legacy couples with missing `awardCategories` get the seven defaults in memory (`mergeCoupleAwardCategoryDefaults`); new couples persist defaults on create.
- **Disable / remove:** If the id is in `awardCategoryIdsUsedInCompleteSeasons`, disable (`enabled: false`) so the hub can show a **paused** category. If not, the row is **removed** from `awardCategories`. **Only while the active ceremony is `nominating`:** pausing/removing mid–`deliberating`/`voting` would shrink `enabledAwardCategoryIds` and could drop contested categories from `allRequiredWinnersPresent`, letting the season wrap without agreement — blocked by `assertAwardCategoryPauseOrRemoveAllowed` (`lib/awardsSeasonCategoryGuards.ts`) + manage UI.
- **Edit label/emoji** and **enable** (turn on) a paused category: allowed in any ceremony phase.
- **UI:** `app/(tabs)/awards/manage-categories.tsx`; mutations: `lib/firestore/awardCategories.ts`; merge/helpers: `lib/awardCategoryConfig.ts`
- On ceremony complete, nomination category ids for that season are `arrayUnion`’d into `awardCategoryIdsUsedInCompleteSeasons` (`recordAwardCategoryHistoryForCompletedCeremony`).

### 3.2 Nominations

- **Adding nominations:** Firestore `addNomination` does **not** check `ceremony.status`. The nominate screen only requires `ceremony.id` for **new** rows; **paused** (disabled) categories block new/edit via UI until re-enabled.
- **Editing nominations:** Allowed only when `canEditNomination` is true:
  - `ceremony.status === 'nominating'`
  - Nomination matches current `ceremony.id` and `couple.id`
  - **User-authored:** editor must be `submittedBy`
  - **Seeded / starter:** either partner may edit (`lib/nominationEditPolicy.ts`)
- **Implication:** In principle, **new nominations can still be written while `deliberating` or `voting`** if something navigates to nominate without a status check; **editing** is what hard-stops after nominating ends.

### 3.3 Not possible (enforced)

- `startDeliberation` if status is not `nominating`.
- Editing nominations (via policy) when status ≠ `nominating`.

---

## 4. Status: `deliberating` (product: align — secret picks)

### 4.1 Submit picks (`submitDeliberationPicks`)

- **Requires:** `status === 'deliberating'` (transaction throws *“Not in alignment”* otherwise).
- **Validation (`validateDeliberationPicks`):**
  - For **every** **enabled** category that has **≥1** nomination (`categoriesWithNominations(nominations, enabledCategoryIds)`), the payload must include a `picks[category]` **nomination id** that exists in that category’s nominations. Enabled ids are read from the couple doc (same merge as `startDeliberation`).
  - Missing category → *“Pick something for {cat}.”*
  - Wrong id → *“Invalid pick — try again.”*
- **Per user:** `picksByUser[uid]` and `picksSubmitted[uid] = true` are set.
- **When both partners have submitted** (in the same transaction after the second submit):
  - `computeAgreedWinners`: for each category with nominations, if both picked the **same** nomination id and that id exists in-category, write `winners[category]` with `nominationId`, `agreedBy: [uidA, uidB]`, `nomineeId` from the nomination.
  - `status → 'voting'`
  - `resolutionPicksByUser` reset to `{}`
- **Categories with zero nominations** are skipped (no pick required, no winner row).
- **Code:** `lib/firestore/ceremonies.ts`, `lib/awardsLogic.ts`

### 4.2 UI

- Deliberate screen: if `status !== 'deliberating'`, shows *“not in alignment right now.”*
- After current user has submitted (`picksSubmitted[uid]`): read-only confirmation; no in-app way to change picks (resubmit path not exposed).

### 4.3 Not possible (enforced)

- Submitting picks when status ≠ `deliberating`.
- Submitting an incomplete pick set (missing any category that has nominations).
- Picking a nomination id that is not in that category.

---

## 5. Status: `voting` (product: align overlap + sync splits; cheer when ready)

This status means “post–secret-picks”: show overlap, resolve disagreements, then reveal when every **required** category has a winner.

### 5.1 Agreed vs contested (derived, not separate statuses)

- **Contested categories** (`contestedCategories`): has nominations, **no** `winners[cat]` yet, both users picked **different** ids (both non-empty).
- **Agreed list** (`agreedCategoryList`): keys from `computeAgreedWinners` (same as overlap “matches”).
- **Code:** `lib/awardsLogic.ts`

### 5.2 Resolution picks (`submitResolutionPick`)

- **Requires:** `status === 'voting'` (*“Not in resolution”* otherwise).
- **Requires:** nomination id exists in `nominations` for that `category`.
- **Writes:** merge `resolutionPicksByUser[uid][category] = nominationId`.
- **Winner rule:** when **both** users have chosen the **same** `nominationId` for that category, set `winners[category]` (same shape as deliberation winner).
- If they keep choosing different ids, **no** winner for that category until they match.
- **Code:** `lib/firestore/ceremonies.ts`

### 5.3 When is “cheer” (reveal) allowed?

- **UI gate:** `status === 'voting'` **and** `allRequiredWinnersPresent(nominations, winners, enabledCategoryIds)`:
  - For every enabled category that has nominations this season, `winners[cat]` must exist; `enabledCategoryIds.length === 0` yields false.
- **Code:** `app/(tabs)/awards/reveal.tsx`, `lib/awardsLogic.ts` — `allRequiredWinnersPresent`

### 5.4 Completing the season (`completeCeremonyAndAdvance`)

- **Requires:** `allRequiredWinnersPresent` (enabled categories with nominations only) — else *“Every enabled category with nominations needs a winner before you can wrap the season.”*
- **Effect:**
  - `status → 'complete'`
  - `ceremonyDate` set to server time
  - **New** ceremony created for the couple (new half-year bounds for **now**)
  - `activeCeremonyId` → new ceremony id
- **Code:** `lib/firestore/ceremonies.ts` — `completeCeremonyAndAdvance`

### 5.5 UI route guards

- **Overlap / resolve:** require `status === 'voting'` or show a friendly “wrong phase” message.
- **Resolve** with zero contested: shows “all synced” empty state.

### 5.6 Not possible (enforced)

- Resolution picks when status ≠ `voting`.
- `completeCeremonyAndAdvance` while any category with nominations lacks a winner.

---

## 6. Status: `complete` (product: wrapped / past)

- Listed in **past** ceremonies: `subscribeToPastCeremonies` filters `status === 'complete'`, sorted by `periodEnd` descending.
- Ceremony reminders are **not** scheduled for `complete` ceremonies.
- **Code:** `lib/firestore/ceremonies.ts`, `lib/ceremonyReminders.ts`

---

## 7. Gamification hooks (awards-related)

- **After user-authored nomination saved:** XP, nomination streak, weekly challenge progress, nomination badges (uses `ceremony.periodEnd` in badge evaluation where relevant). Seeded rows excluded from some counts via `isUserAuthoredNomination`.
- **After deliberation submit:** `grantDeliberationSubmitXp` (client-side grant helper).
- **After resolution locks a category** (transaction returned `true` when category newly gained a winner): `afterResolutionCategoryLocked` → contested-category XP.
- **After full ceremony complete:** couple ceremony streak update with **on-time** = `Date.now() <= periodEndMs + 7 days` grace; ceremony completion XP/badges; `afterCeremonyFullyCompleted`.
- **Code:** `lib/gamificationTriggers.ts`, `lib/firestore/coupleGamification.ts` — `updateCoupleStreakAfterCeremonyComplete`

---

## 8. Category inventory

- **Defaults** for labels, emojis, and descriptions of the original seven categories live in `constants/categories.ts` (`AWARD_CATEGORIES`).
- **Per couple**, the live list is `couple.awardCategories` (custom `label` / `emoji`, stable `id`). Logic uses **enabled** ids from that list (plus Firestore reads in `ceremonies.ts` for writes).

---

## 9. Quick reference — errors and messages

| Situation | Source |
|-----------|--------|
| Add at least one nomination in every enabled category before starting alignment | `startDeliberation` |
| Add at least one award category first | `startDeliberation` (zero enabled categories) |
| Alignment can only start during nominating | `startDeliberation` |
| Not in alignment | `submitDeliberationPicks` |
| Pick something for {cat} / Invalid pick | `validateDeliberationPicks` |
| Not in resolution | `submitResolutionPick` |
| Nomination not in category | `submitResolutionPick` (precheck) |
| Every enabled category with nominations needs a winner before you can wrap the season | `completeCeremonyAndAdvance` |
| Ceremony / couple not found | various `getDoc` paths |

---

## 10. Files to edit when changing rules

| Concern | Primary files |
|--------|----------------|
| Half-year bounds | `lib/ceremonyCalendar.ts` — `getCalendarHalfYearBounds` |
| 14-day / 3-day calendar & reminders | `lib/ceremonyCalendar.ts`, `lib/ceremonyReminders.ts` |
| Status transitions & ceremony fields | `lib/firestore/ceremonies.ts` |
| Pick / winner / contested math | `lib/awardsLogic.ts` |
| When pause/remove categories is allowed | `lib/awardsSeasonCategoryGuards.ts`, `lib/firestore/awardCategories.ts` |
| Edit policy | `lib/nominationEditPolicy.ts` |
| Hub + screens | `app/(tabs)/awards/*.tsx` |
| Copy / phase strip | `constants/hummVoice.ts`, `components/awards/CeremonyPhaseStrip.tsx` |
