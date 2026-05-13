# App Store listing — Hum: for two (`dev.aaam.hum`)

Single reference for **App Store Connect** metadata, URLs, privacy, review, and assets.

**Operator:** aaam.dev · **Support email:** `support@aaam.dev`

**Binary source of truth:** [`app.json`](../app.json) — name, version, iOS bundle ID, build number, orientation, dark UI, plugins (`expo-router`, `expo-font`, `expo-image-picker`, `expo-notifications`). Firebase is wired via **`EXPO_PUBLIC_*`** env vars at runtime.

---

## 0. At-a-glance (copy into Connect)


| Connect / Apple field                | Value                                                        |
| ------------------------------------ | ------------------------------------------------------------ |
| **App name** (≤30)                   | `Hum: for two`                                               |
| **Subtitle** (≤30)                   | `for couples`                                                |
| **Bundle ID**                        | `dev.aaam.hum`                                               |
| **SKU** (internal, unique)           | `AAAMHUM001`                                                 |
| **Primary language**                 | English (U.S.)                                               |
| **Marketing version** (user-visible) | `1.0.0` (from `expo.version`)                                |
| **Build** (`CFBundleVersion`)        | `2`                                                          |
| **Privacy Policy URL**               | `https://aaam.dev/hum/privacy.html`                          |
| **Support URL**                      | `https://aaam.dev/hum/support.html`                          |
| **Marketing URL** (optional)         | `https://aaam.dev/hum/`                                      |
| **Copyright**                        | `© 2026 aaam.dev`                                            |
| **Category (primary)**               | **Lifestyle**                                                |
| **Category (secondary)**             | —                                                            |
| **License agreement**                | Apple's standard EULA                                        |


**Pricing:** Paid one-time (~$3.99 USD) — set Price schedule in Connect; complete Paid Applications Agreement, tax, and banking first.

---

## 1. Promotional text (≤170 characters, editable without full review)

```
Mood check-ins, shared habits, decisions made together, awards seasons, and reasons to love each other—private by design, just you and your person.
```

---

## 2. Description (≤4000 characters)

```
Hum is a calm, private space for you and your partner—not a social network.

WHAT YOU DO TOGETHER
• Home — a time-aware greeting, your partner's live presence, and quick access to everything. The ambient glow warms as your streaks grow.
• Mood — check in with how you're feeling, multiple times a day if you like. See your partner's mood in real time, track a seven-day strip, and celebrate "in sync" moments when you both feel the same way.
• Habits — create daily or weekly habits, shared or personal. Track completion side-by-side, watch a six-week heatmap fill in, and build joint streaks. When you both finish all shared habits for the day, enjoy a celebration.
• Decide — build a shared pool of ideas across categories. Vote together round by round, or tap "pick for us" to let the app choose one when you can't both be there. Saves to history.
• Awards — nominate little stories across categories for each season. When you're ready, align on the winners together and keep past seasons in the vault.
• Reasons — write a reason you love them; when the moment's right, reveal three reasons they've written about you.
• You — XP, level, badges, weekly challenges, and a soft snapshot of how you're showing up together.

WHO IT'S FOR
Two people who already chose each other. You'll link accounts with a short invite code.

WHAT IT ISN'T
No public feed, no discovery, no ads—just the two of you.

Requires a free account. An internet connection is needed for sync.
```

---

## 3. Keywords (100 characters, comma-separated)

```
couple,partner,relationship,love,mood,tracker,habits,decide,awards,reasons,together,sync,private
```

---

## 4. What's New (version 1.0.0)

```
First release of Hum: for two. Mood check-ins, shared habits, decisions together, awards seasons, and reasons—all private, just for you and your person.
```

---

## 5. Screenshots

**Device tier:** 6.9" iPhone only (Apple auto-scales for smaller iPhones). No iPad.

**Story order (capture from new build in dark mode):**

1. **Home** — greeting + partner presence + ambient glow
2. **Mood** — check-in picker + partner sync strip
3. **Habits** — shared habit board + streaks + heatmap
4. **Decide** — shared pool + vote together / pick for us
5. **Awards** — season hub + nominations
6. **Reasons** — write / reveal three
7. **You** — XP + badges + challenges

Screenshots live in `screenshots/6.9/` (01-home.png through 07-you.png).

---

## 6. App Privacy questionnaire


| Data type                         | Collected? | Linked to user? | Used for           | Third-party sharing |
| --------------------------------- | ---------- | --------------- | ------------------ | ------------------- |
| **Email address**                 | Yes        | Yes             | Account            | Google (Firebase)   |
| **User content** (mood, habits, decisions, awards, reasons) | Yes | Yes | App functionality | Firebase            |
| **Identifiers** (Firebase UID, push token) | Yes | Yes          | Account, notifications | Firebase / APNs  |
| **Photos**                        | Only if user picks images | Yes | App functionality | On-device / Firebase |


**Tracking:** No.

---

## 7. Age rating

- Violence / horror / gambling / substances: **None**
- User-generated content: **Infrequent/Mild** (freeform text between two linked partners only)
- Recommended rating: **4+** or **12+** depending on Apple's UGC interpretation

---

## 8. App Review Information

```
COUPLE-ONLY PRODUCT
Hum is invite-only for two linked accounts. There is no public feed or discovery.

DEMO FOR REVIEW (pre-linked couple — same password on both)
Primary account:  demo@hum.app  /  humtumapp@demo
Partner account: partner.demo@hum.app  /  humtumapp@demo

Use the partner sign-in on a second simulator or device for Decide → vote together and to see real-time mood/habit sync. Everything else (including "pick for us") works signed in as the primary account only.

FEATURES TO TRY
Home → greeting changes by time of day; partner presence dot; ambient glow warms with streaks. Mood → tap mood tab, pick an emoji, save; switch to partner to see real-time sync and "in sync" celebration. Habits → check off shared habits on both accounts to trigger joint celebration; heatmap shows shared-habit completion. Decide → pick a category, the pool auto-seeds, then either "lock in & vote" (needs partner) or "pick for us" (solo). Awards → categories / nominations. Reasons → write one line, then reveal three.

ACCOUNT DELETION (Guideline 5.1.1(v))
Sign in → bottom tab "you" → scroll to bottom → red "delete account" → enter password → confirm. Deletes all user data from Firestore, removes Firebase Auth user, signs out.

PUSH NOTIFICATIONS
Optional. Helps test daily reminders and partner activity pings.

NETWORK & ACCOUNT
Requires network for Firebase sync. Email/password sign-in.

CONTACT
support@aaam.dev
```

---

## 9. Encryption / export compliance

Standard HTTPS (Firebase). Exempt from filing. `ITSAppUsesNonExemptEncryption: false` set in `app.json` infoPlist.

---

## 10. Infrastructure & accounts

| Service | Account / value |
|---|---|
| **Domain** | `aaam.dev` (Cloudflare Registrar) |
| **Email** | `support@aaam.dev` → forwards to `aamd3v@gmail.com` |
| **Website** | Cloudflare Pages, project `aaam-dev`, repo `github.com/4m4n5/aaam.dev` |
| **App repo** | `github.com/4m4n5/humm` |
| **Apple Developer** | Individual account, Team ID `D92AD98B9B` |
| **App Store Connect** | App ID `6768805132`, Bundle ID `dev.aaam.hum`, Name: "Hum: for two" |
| **EAS** | Project ID `5f57f843-c55c-4e2e-a8a1-101b9b9db2fa`, slug `hum`, owner `4m4n5` |
| **Firebase** | Project `humm-f31c7`, env vars via `EXPO_PUBLIC_*` in EAS environments |

### Live URLs

| Purpose | URL |
|---|---|
| **Support** | `https://aaam.dev/hum/support.html` |
| **Privacy** | `https://aaam.dev/hum/privacy.html` |
| **Marketing** | `https://aaam.dev/hum/` |
| **Studio landing** | `https://aaam.dev` |

---

## 11. Checklist before Submit

- [ ] Screenshots for 6.9" iPhone uploaded to Connect
- [ ] Support + Privacy URLs return https 200 (no login wall)
- [ ] App Privacy matches Firebase + push + photos + UGC data
- [ ] Account deletion flow works (profile → delete → password → confirm)
- [ ] Paid Applications agreement, banking, tax completed
- [ ] Demo accounts work on production Firebase
- [ ] Marketing version and build number match uploaded IPA
- [ ] Age rating questionnaire completed
- [ ] What's New and Description match shipped features
- [ ] Export compliance answered
- [ ] No gambling/battle/spin/wheel/bracket language anywhere in metadata

---

*Hum: for two · `dev.aaam.hum` · Expo slug `hum` · Listing updated May 12, 2026.*
