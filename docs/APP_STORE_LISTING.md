# App Store listing — Hum - rituals (`com.humtum.app`)

Single reference for **App Store Connect** metadata, URLs, privacy, review, and assets. **Apple changes limits and required screenshot slots** — always verify against [App Store Connect Help](https://developer.apple.com/help/app-store-connect/) and [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/) before submit.

**Not legal advice:** Have a lawyer review privacy policy and paid-app terms before you charge money.

**Operator (listed on hosted pages):** Aman Shrivastava · **Support email:** `aman.srivastava999@gmail.com` · **Policy/support pages last updated:** April 25, 2026 (`docs/store/`).

**Binary source of truth:** [`app.json`](../app.json) — name, version, iOS bundle ID, build number, orientation, dark UI, plugins (Firebase client, `expo-image-picker`, `expo-notifications`).

---

## 0. At-a-glance (copy into Connect)


| Connect / Apple field                | Value                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **App name** (≤30)                   | `Hum - rituals`                                                                                                      |
| **Subtitle** (≤30)                   | `Private rituals for two`                                                                                            |
| **Bundle ID**                        | `com.humtum.app` (must match Apple Developer identifier + EAS/Xcode)                                                 |
| **SKU** (internal, unique)           | e.g. `humtum-ios-001`                                                                                                |
| **Primary language**                 | English (U.S.)                                                                                                       |
| **Marketing version** (user-visible) | `1.0.0` (from `expo.version`)                                                                                        |
| **Build** (`CFBundleVersion`)        | `1` — must increase every upload (see EAS / Xcode)                                                                   |
| **Privacy Policy URL**               | `https://4m4n5.github.io/humm/store/privacy.html`                                                                    |
| **Support URL**                      | `https://4m4n5.github.io/humm/store/support.html`                                                                    |
| **Marketing URL** (optional)         | `https://4m4n5.github.io/humm/store/index.html`                                                                      |
| **Copyright**                        | `© 2026 Aman Shrivastava`                                                                                            |
| **Category (primary)**               | **Lifestyle** (recommended: couple rituals, not a public social network)                                             |
| **Category (secondary)**             | **Entertainment** or **Social Networking** only if you are comfortable with that framing; **Lifestyle** alone is OK. |
| **License agreement**                | Apple’s standard EULA unless you supply a custom one                                                                 |


**GitHub Pages:** Repo is `github.com:4m4n5/humm`. Pages must be enabled with source **`/docs`** so the paths above return **200** over **https**. If your username or repo name differs, replace `4m4n5` / `humm` in URLs. Private repo: confirm [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

**Pricing:** Paid one-time (e.g. **~$3.99 USD**) — set **Price schedule** in Connect; complete **Paid Applications Agreement**, tax, and banking first.

---

## 1. Where this doc maps in App Store Connect


| Connect area                              | What to fill                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **App Information**                       | Localizable name, subtitle, category, content rights, age rating workflow                                                            |
| **Pricing and Availability**              | Price tier, countries                                                                                                                |
| **App Privacy**                           | Data types, tracking, purposes (Section 10)                                                                                          |
| **Prepare for Submission** (per platform) | Screenshots, description, keywords, promotional text, What’s New, support/marketing URLs, build, routing app coverage file if needed |
| **App Review Information**                | Sign-in required, demo accounts, notes (Section 12), contact phone (optional)                                                        |
| **Version release**                       | Manual vs automatic after approval                                                                                                   |


---

## 2. Promotional text (≤170 characters, editable without full review)

**Primary (169 chars):**

```
Little rituals for two: weighted spins, live battles, shared awards seasons, and reasons to love each other—invite-only, just you and your person.
```

**Shorter (112 chars):**

```
Invite your person. Spin decisions, run a live battle, pass an awards season, trade reasons—private by design.
```

---

## 3. Description (full store text, ≤4000 characters)

Paste as **Description**; trim trailing paragraph if you want a shorter listing.

```
Hum - rituals is a calm, private space for you and your partner—not a social network.

WHAT YOU DO TOGETHER
• Home — jump into what matters today.
• Decide — Quick spin: pick a category, set weights, spin, veto if you need a redo, save the pick to history. Food picks can nudge you toward Maps when you’re ready to go.
• Decide — Battle: build a shared pool, run a live bracket together, revote on ties, let a coin finish the story. Results land in history.
• Awards — Nominate little stories across categories for each season. When you’re ready, move through align (private picks), resolve any overlaps, cheer the winners, and keep past seasons in the vault. Calendar view shows where you are in the season.
• Reasons — Write a reason you love them; when the moment’s right, draw three random reasons they’ve written about you.
• You — XP, level, badges, and a soft snapshot of how you’re showing up together.

WHO IT’S FOR
Two people who already chose each other. You’ll link accounts with a short invite code.

WHAT IT ISN’T
No public feed, no discovery, no ads in this build—just the two of you and your rituals.

Requires a free Firebase-backed account. An internet connection is needed for sync. Optional photo access is used only when you attach images in flows that support it.
```

---

## 4. Keywords (100 characters, comma-separated, no spaces after commas)

**Suggested (99 chars):**

```
couple,partner,love,relationship,private,decisions,spin,battle,awards,reasons,ritual,date,together
```

**Alternate (98 chars):**

```
couple,relationship,partner,private,spin,decide,battle,awards,reasons,love,rituals,two,home
```

Do not stuff competitor names or abuse Apple trademarks.

---

## 5. Alternate subtitles (all ≤30 characters)

- `Private rituals for two` *(recommended)*  
- `Decisions, love, small wins`  
- `For you and your person`

---

## 6. What’s New (version 1.0.0 — first release)

```
First App Store release: decide together (quick spin + battle), awards seasons with nominate → align → cheer, reasons write & draw, profile XP and badges, partner linking with invite codes.
```

---

## 7. Product facts for honest metadata (from shipped build)

Use these so **description**, **screenshots**, and **App Privacy** stay aligned with the binary (`[APPS_AND_FEATURES.md](./APPS_AND_FEATURES.md)`, `[app.json](../app.json)`):


| Topic                    | Fact                                                                                                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Accounts**             | Email/password via **Firebase Auth**; partner link via **invite code**.                                                                                                                                                                 |
| **Sync**                 | **Firestore**; internet required.                                                                                                                                                                                                       |
| **Orientation / device** | **Portrait**; iOS `**supportsTablet`: false** — phone-only iOS experience; no iPad-optimized UI.                                                                                                                                        |
| **Appearance**           | `**userInterfaceStyle`: dark** — capture screenshots in dark mode.                                                                                                                                                                      |
| **Decide**               | Quick spin (categories, weights, veto, history); **Battle** (realtime pool + bracket, tie revote, coin).                                                                                                                                |
| **Awards**               | Seasons (e.g. H1/H2 calendar context); nominate → **align** → **cheer**; past seasons. Internal Firestore statuses may still say `deliberating` — user-facing copy is “align” (`[CEREMONY_TERMINOLOGY.md](./CEREMONY_TERMINOLOGY.md)`). |
| **Reasons**              | Write text for partner; draw up to three random lines about you.                                                                                                                                                                        |
| **Profile**              | XP, level, badges, together-style stats strip.                                                                                                                                                                                          |
| **Notifications**        | `**expo-notifications`**: optional **local** ceremony / alignment reminders from awards calendar; declare if you store **push tokens** for remote delivery.                                                                             |
| **Photos**               | `**expo-image-picker`** with permission string: *“Hum uses your photos for nominations and reasons.”* Declare **Photo Library** when the build requests it; purpose: **App functionality**.                                             |
| **Ads / tracking**       | No ad SDKs in repo; **App Tracking Transparency** typically **No** unless you add cross-app tracking.                                                                                                                                   |
| **In-app purchases**     | None in current product model if the app is **paid upfront** only—don’t enable IAP metadata you don’t use.                                                                                                                              |


---

## 8. Screenshots (real UI only)

Apple expects screenshots that **match the app’s general UI** (chrome, typography, flows). See **[Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/)** for **required sizes** for your deployment target.

### 8.1 How to capture

- **Xcode Simulator** (e.g. device class that maps to **6.7" / 6.9"** accepted portrait sizes such as **1290 × 2796** — verify Apple’s current table), **⌘S** to Desktop, then crop/export if needed.  
- Repo marketing captures live under `**docs/store/images/*`* (`screen-01.png` …) as a **reference order** for your store set—**re-export** at Connect-required pixel dimensions before upload.  
- **Dark mode**, **readable status bar**, **no real personal emails** on screen (demo accounts).

### 8.2 Suggested story order (3–8 strong shots)

1. **Home** — four tiles + profile row.
2. **Quick spin** — category + wheel / pre-spin.
3. **Quick spin result** or **decision history**.
4. **Battle** — lobby or live bracket.
5. **Awards hub** — season + phase strip + categories.
6. **Nominate** — story list or add nomination.
7. **Reasons** — write or “draw three”.
8. **You / profile** — XP + badges.
9. **Ceremony calendar** or **align** (optional).
10. **Link partner** (optional, only if it looks polished).

**Tips:** Display Zoom **Default**; dismiss notifications; same **build** you submit for review.

---

## 9. App Preview (optional)

- **15–30 s**, same device class as screenshots.  
- Flow: home → quick spin → result → awards hub → reason line.  
- No unlicensed music.

---

## 10. App Privacy questionnaire (nutrition labels)

Answer **for the build you upload**. Typical mapping for **Firebase Auth + Firestore + optional push token + image picker + local notifications**:


| Data type                                                         | Collected?                           | Linked to user? | Used for                   | Third-party sharing                                                        |
| ----------------------------------------------------------------- | ------------------------------------ | --------------- | -------------------------- | -------------------------------------------------------------------------- |
| **Email address**                                                 | Yes                                  | Yes             | Account, app functionality | Google (Firebase)                                                          |
| **Name / profile**                                                | If you collect display names         | Yes             | App functionality          | Firebase                                                                   |
| **User content** (decisions, awards text, reasons, ceremony data) | Yes                                  | Yes             | App functionality          | Firebase                                                                   |
| **Identifiers** (Firebase UID; device push token if stored)       | Yes                                  | Yes             | Account, notifications     | Firebase / APNs                                                            |
| **Photos**                                                        | Only if user picks images            | Yes             | App functionality          | Stored/processed per your implementation (often Firebase / on-device only) |
| **Usage / diagnostics**                                           | Only if you add analytics/crash SDKs | —               | —                          | —                                                                          |


**Tracking:** **No** unless you enable cross-app tracking.  
**Photos:** Match **NSPhotoLibraryUsageDescription** / purpose string to actual flows.

After any SDK or backend change, **re-run** the privacy questionnaire and update the hosted privacy policy.

---

## 11. Age rating (content description)

- **Violence / horror / gambling / substances:** generally **None** for shipped UI.  
- **User-generated content:** Reasons and nominations are **freeform text** — Apple may expect disclosure of **infrequent** or **frequent** mature themes depending on definitions; be **conservative**.  
- Many couple apps land **12+** or higher when UGC is unrestricted; **read Apple’s current definitions** question-by-question.

---

## 12. App Review Information — notes (paste into Connect)

Replace bracketed credentials with **working disposable** Firebase users in **production** rules.

```
COUPLE-ONLY PRODUCT
Hum - rituals is invite-only for two linked accounts. There is no public feed or discovery.

DEMO FOR REVIEW
Email: [REVIEWER_EMAIL]
Password: [REVIEWER_PASSWORD]

Optional second account (partner flow):
Email: [PARTNER_EMAIL]
Password: [PARTNER_PASSWORD]
Linking: Sign in as user A → profile shows invite code → sign out → sign in as user B → link-partner → enter code.

FEATURES TO TRY
Home → Quick spin (category, weights, spin, save). Awards → categories / add nomination text. Reasons → write one line, then draw three. Battle → needs two signed-in clients (two simulators or two devices) for realtime bracket.

PUSH NOTIFICATIONS
Optional. Allow helps if you test ceremony nudges. Local reminders can be scheduled from the awards calendar.

PHOTOS
Permission appears when attaching images in supported flows (image picker).

NETWORK & ACCOUNT
Requires network for Firebase sync. Email/password sign-in.

CONTACT
aman.srivastava999@gmail.com
```

**Contact email (Connect field):** `aman.srivastava999@gmail.com`  
**Phone:** optional.

---

## 13. Encryption / export compliance

Expo/React Native apps using **HTTPS** (e.g. Firebase) typically answer Apple’s **standard encryption** questions as **using encryption exempt from filing** — answer **truthfully** in Connect per [Apple’s export compliance docs](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations). If you add non-exempt cryptography, re-evaluate.

---

## 14. Hosted privacy policy (already live under `docs/store/`)

Your public policy is `**privacy.html`** at the **Privacy Policy URL** above. Keep it in sync with Connect’s **App Privacy** answers.

For **redundancy / lawyer drafts**, a Markdown template was previously kept in this file; prefer editing the **HTML** source of truth: `[docs/store/privacy.html](./store/privacy.html)`. If you maintain a separate Markdown policy, ensure **same** collection/use/retention/Firebase/Google/contact details.

---

## 15. Content rights & third-party content

- **Apple content rights:** You own or have rights to **app binary and assets**; for **UGC**, users submit content—disclose moderation approach if asked.  
- **No** Apple Music / third-party music in default flows unless licensed.

---

## 16. Game Center, Sign in with Apple, other

- **Game Center:** No (unless you add it).  
- **Sign in with Apple:** Only required when you offer certain third-party logins; **email/password only** is a common pattern—confirm current Apple rules when you add more providers.

---

## 17. Checklist before Submit

- **Screenshots** for every **required** iPhone size Connect shows for this binary.  
- **Support** + **Privacy** URLs return **https 200** (no login wall).  
- **App Privacy** matches Firebase + push + photos + UGC.  
- **Paid Applications** agreement, **banking**, **tax** (if paid).  
- **Demo accounts** work on **production** Firebase + Firestore rules.  
- **Marketing version** and **build number** match uploaded IPA and `[app.json](../app.json)` / EAS.  
- **Age rating** questionnaire matches freeform text features.  
- **What’s New** and **Description** match shipped features.  
- **Export compliance** answered.

---

## 18. After 1.0.0

- Bump `**expo.version`** for user-visible version; increment `**ios.buildNumber**` (and Android `versionCode`) per store rules.  
- Update **What’s New**, screenshots only when UI meaningfully changes.  
- Revisit **App Privacy** whenever you add analytics, crash reporting, ads, or new data types.

---

## 19. Related repo docs


| Doc                                                    | Use                                               |
| ------------------------------------------------------ | ------------------------------------------------- |
| `[STORE_LAUNCH.md](./STORE_LAUNCH.md)`                 | Play + Apple costs, EAS builds, broader checklist |
| `[store/README.md](./store/README.md)`                 | Enabling GitHub Pages from `/docs`                |
| `[APPS_AND_FEATURES.md](./APPS_AND_FEATURES.md)`       | Shipped features for accurate copy                |
| `[AWARDS_SEASON_RULES.md](./AWARDS_SEASON_RULES.md)`   | Awards season behavior detail                     |
| `[CEREMONY_TERMINOLOGY.md](./CEREMONY_TERMINOLOGY.md)` | User-facing “align” vs internal status names      |


---

*Hum - rituals · `com.humtum.app` · Expo slug `humm` · Listing pack updated April 11, 2026.*