# Hum - rituals — UI & UX notes

**Purpose:** Direction for layout, motion, and polish — **not** a second theme system. Colors live in `tailwind.config.js` + `constants/theme.ts` (keep them in sync).

**Related:** [`AGENTS.md`](./AGENTS.md) (stack & conventions), [`APPS_AND_FEATURES.md`](./APPS_AND_FEATURES.md) (product), [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) (where mood/habits components live).

---

## Mood tab — UI conventions (current)

Aligned with **balanced density** + **subtle motion**; avoids heavy “boxed quadrant” cards in favor of **pill** chips and soft shells.

| Pattern | Where |
|---------|--------|
| **`rounded-[28px]`** outer shells | `MoodTodayHero`, week strip container, day cards on mood index |
| **`rounded-full` pills** | Horizontal quadrant picker (`MoodGrid`), `MoodChip`, habit-adjacent `SectionLabel` usage on mood index |
| **Floating emoji** | Hero shows large emoji without an inner tray; empty states use dashed **`rounded-full`** + icon |
| **Week dots** | Circular dots; **today** uses a ring — not square wells |
| **`cardShadow` / elevation** | Import from [`constants/elevation.ts`](../constants/elevation.ts) for depth consistent with home tiles where applicable |
| **Home mood row** | `MoodHomeRow` — **no** outer card wrapper; two pressable pill regions + light **`active:opacity-88`** |

**Constants:** sticker definitions + quadrant blurbs live in [`constants/moodStickers.ts`](../constants/moodStickers.ts) (`QuadrantMeta`: `label`, `blurb` — blurbs support a11y hints on the picker).

---

## Principles (owner-aligned)

| Topic | Direction |
|--------|-----------|
| **Density** | **Balanced** — readable spacing; tighten only where lists repeat. |
| **Motion** | **Subtle** — short `active` feedback, light haptics on meaningful actions; avoid long or decorative animations unless a moment deserves it (e.g. awards **cheer** walkthrough). |
| **Brand** | Store name **Hum - rituals**; most UI stays **lowercase**; warm, musical tone; rose/blush primary on dark surfaces. |

---

## Shared primitives

- **Chrome:** [`ScreenTitle`](../components/shared/ScreenTitle.tsx), [`ScreenHeader`](../components/shared/ScreenHeader.tsx)
- **Actions & inputs:** [`Button`](../components/shared/Button.tsx), [`Card`](../components/shared/Card.tsx), [`Input`](../components/shared/Input.tsx)
- **Depth:** [`constants/elevation.ts`](../constants/elevation.ts)

Icons and spinners: use **`theme`** from [`constants/theme.ts`](../constants/theme.ts) for hex values.

---

## UX refinements (1–11 implemented in app)

1. **Wayfinding** — `ScreenHeader` optional `wayfinding` (e.g. `decide · quick spin`) on stack screens; awards hub uses `ceremonyHubPhaseHint()` under the phase strip.
2. **Empty & loading** — `LoadingState` + `EmptyState` (voice + optional CTA); used on history, past seasons, category, nominate, ceremony flows, root load.
3. **Touch targets** — Chevrons in 44pt boxes, quick-spin add/trash/check targets enlarged; tab toggles `min-h-12` on link-partner.
4. **Tab bar** — `Haptics.selectionAsync` on tab press; `tabBarAccessibilityLabel` per tab.
5. **Home hub** — “start here” hero **quick spin**; **more for you both** row (nominate · reasons); decide hub as secondary row (removed duplicate awards promo card).
6. **Quick spin** — Sticky summary bar (`stickyHeaderIndices`); clearer result copy; empty list CTA **add your first option**.
7. **Awards ceremony** — Hub phase hint + `awardsVoice` one-liners on **align** screens (`deliberate`, overlap, resolve) and **cheer** (`reveal.tsx`). Product copy: **nominate · align · cheer** ([terminology](./CEREMONY_TERMINOLOGY.md)).
8. **Reasons** — After draw: side-by-side **three more** + **write one**; **from your partner** on cards; empty draw uses `EmptyState` + CTA.
9. **Profile** — **Ceremonies** count via `subscribeToPastCeremonies`; invite code only before partner link; sign out.
10. **Auth** — `SafeAreaView` + `KeyboardAvoidingView` + scroll padding; expanded `friendlyAuthError` messages; sign-up validation alerts; link-partner tabs as a11y tabs.
11. **Accessibility** — Labels on headers, list rows, quick-spin controls, awards categories; `maxFontSizeMultiplier` on shared text/inputs where noted.

12. **Distinct “styles” later** — Still a larger illustration/layout pass, not recolors only.

---

## Future

Level-unlocked cosmetics ([`BLUEPRINT.md`](../BLUEPRINT.md)) can add accents or icons later; keep token changes deliberate and documented.
