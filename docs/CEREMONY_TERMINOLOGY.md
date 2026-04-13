# Award ceremony: product language vs implementation

This doc keeps **in-app copy**, **specs**, and **code** aligned. Product names are **nominate · align · cheer**; some identifiers stay legacy for Firestore and TypeScript stability.

## Product phases (what users see)

| Phase | Meaning |
|-------|--------|
| **Nominate** | Collect stories per category (`ceremony.status === 'nominating'`). |
| **Align** | Everything until every category has a locked winner both agreed on: private picks, overlap, and split resolution (`deliberating` + most of `voting`). |
| **Cheer** | Winners are ready; walk through moments together, then wrap the season (`voting` when reveal-ready, then `complete`). |

The awards hub **phase strip** is three steps: **nominate → align → cheer**. Subflows (overlap, sync split picks) are still **alignment** in copy.

## Firestore / types (do not rename casually)

| Stored value / field | Role |
|---------------------|------|
| `CeremonyStatus`: `'nominating' \| 'deliberating' \| 'voting' \| 'complete'` | Single source of truth for transitions and rules. **`deliberating`** = private picks only; **`voting`** = overlap + resolution + reveal readiness. |
| `ceremonies/{id}.picksByUser`, `picksSubmitted`, `resolutionPicksByUser`, `winners` | Embedded on the ceremony doc (no separate `deliberations/` collection in the shipped app). |

Changing status string literals requires **migrations + security rules** updates.

## Code names kept for compatibility

These are **implementation** names; UI strings live in `constants/hummVoice.ts` and screens.

| Legacy name | Why it remains |
|-------------|----------------|
| `startDeliberation`, `submitDeliberationPicks`, `validateDeliberationPicks` | Firestore writes and call sites; renaming is a wide refactor. |
| `grantDeliberationSubmitXp`, `XP_REWARDS.deliberation_picks_submitted` | XP reason strings / grants. |
| `deliberationDisagreementCount`, reward meta `deliberationDisagreements` | Ceremony completion rewards and badges. |
| Route file `app/(tabs)/awards/deliberate.tsx` | Deep links and router paths; changing breaks bookmarks. |

## Calendar helpers

- **`ALIGNMENT_WINDOW_DAYS`** (14): last days of the season on the calendar UI.
- Milestone id **`alignment_start`** in `buildCeremonyMilestones` (older specs used `deliberation_start`; timeline filters use `alignment_start`).

## Related files

- Voice & hub hints: `constants/hummVoice.ts`
- Phase strip: `components/awards/CeremonyPhaseStrip.tsx`
- Ceremony CRUD: `lib/firestore/ceremonies.ts`
- Types: `types/index.ts` → `Ceremony`, `CeremonyStatus`
