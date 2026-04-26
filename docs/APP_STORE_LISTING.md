# App Store listing — Hum - rituals (`com.humtum.app`)

Copy-paste pack for **App Store Connect** step 5 (metadata, privacy, review). **Apple’s official screenshot sizes** change; always verify against [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/) before upload.

**Not legal advice:** Have a lawyer review the privacy policy and terms before you charge money.

---

## 1. Core identity (App Information)

| Field | Value | Notes |
|--------|--------|--------|
| **Name** (30 chars max) | `Hum - rituals` | 14 characters — OK. |
| **Subtitle** (30 chars max) | `Private rituals for two` | 24 characters — OK. |
| **Bundle ID** | `com.humtum.app` | Must match Xcode / EAS / `app.json`. |

### Alternate subtitles (pick one, all ≤30)

- `Private rituals for two` *(recommended)*  
- `Decisions, love, small wins`  
- `For you and your person`  

---

## 2. Promotional text (≤170 characters, editable often without full review)

```
Little rituals for two: weighted spins, live battles, shared awards seasons, and reasons to love each other—invite-only, just you and your person.
```
*(169 characters)*

Shorter option:

```
Invite your person. Spin decisions, run a live battle, pass an awards season, trade reasons—private by design.
```
*(112 characters)*

---

## 3. Description (App Store; up to ~4000 characters)

Use this as your **full description** (you can trim the last paragraph if you want shorter):

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

## 4. Keywords (100 characters total, comma-separated, no spaces)

Apple: **no** competitor names, no “Apple” terms abuse; single words or short phrases separated by commas.

**Suggested string (99 characters):**

```
couple,partner,love,relationship,private,decisions,spin,battle,awards,reasons,ritual,date,together
```

**Alternate (98 characters):**

```
couple,relationship,partner,private,spin,decide,battle,awards,reasons,love,rituals,two,home
```

---

## 5. What’s New (version 1.0.0 first release)

```
First App Store release: decide together (quick spin + battle), awards seasons with nominate → align → cheer, reasons write & draw, profile XP and badges, partner linking with invite codes.
```

---

## 6. URLs you must host (GitHub Pages is enough)

Static pages for this repo live under **`docs/store/`** (see **[`docs/store/README.md`](./store/README.md)** for enabling GitHub Pages from the **`/docs`** folder).

After Pages is on, your URLs will look like:

| Field | Example (replace `USER` / `REPO`) |
|--------|-----------------------------------|
| **Support URL** | `https://USER.github.io/REPO/store/support.html` |
| **Privacy Policy URL** | `https://USER.github.io/REPO/store/privacy.html` |
| **Marketing URL** (optional) | `https://USER.github.io/REPO/store/index.html` |

Repo **`docs/store/`** pages already list **Aman Shrivastava**, **aman.srivastava999@gmail.com**, and last updated **April 25, 2026** — use those GitHub Pages URLs in Connect. Edit the HTML when anything changes.

**GitHub Pages** is sufficient for Apple/Google as long as the URLs are **https** and return **200**. For **private** repos, confirm [current GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits); a **public** repo + Pages is the usual free path.

---

## 7. Screenshots — Apple does **not** accept synthetic marketing-only art for the primary set

Screenshots must **reflect the actual app UI** (same general chrome, fonts, flows). You generate them locally:

### 7.1 Official size reference

Always check: **[Screenshot specifications — App Store Connect](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/)**

As of drafting, teams commonly export **at least one** of these **portrait** sets (Connect shows which slots are mandatory for your deployment target):

| Role | Typical portrait size (px) | How to get it |
|------|------------------------------|----------------|
| **Primary “largest iPhone” slot** | e.g. **1290 × 2796** (among accepted sizes for the 6.7" / 6.9" class) | **Xcode Simulator** → *iPhone 15 Pro Max* (or another model whose screenshot export matches an accepted size), run release build or dev client, **⌘S** saves to Desktop. |
| **Second class** if Connect asks | e.g. **1284 × 2778** (6.5" class) | Simulator *iPhone 14 Plus* / sizes listed in Apple’s table, or scale carefully from master. |

If Connect only asks for **one** display family for your app, still upload **3–8** strong shots for conversion.

### 7.2 Recommended shot list (same order on the store)

Capture **dark mode**, **status bar visible**, **no personal emails** visible (use demo accounts).

1. **Home** — four tiles + profile row (shows breadth).  
2. **Quick spin** — category + wheel / pre-spin (exciting moment).  
3. **Quick spin result** or **history** — shows outcome / saved memory.  
4. **Decide → Battle** — lobby or bracket (shows “live together”).  
5. **Awards hub** — season card + phase strip + categories (core differentiator).  
6. **Nominate / category** — story list or empty state + “add nomination”.  
7. **Reasons** — hero (“draw three”) or write screen.  
8. **You / profile** — XP + cred strip + badges (trust + depth).  
9. **Ceremony calendar** or **align** — shows season seriousness (optional).  
10. **Link partner** or **sign in** — only if it looks premium; otherwise skip.

**Tips:** Turn on **Display Zoom → Default** on device; hide notification banners; use same **build** you submit for review.

---

## 8. App Preview (optional video)

- **15–30 s**, same device class as screenshots.  
- Show: home → quick spin → result → awards hub → one reason card.  
- No copyrighted music unless licensed.

---

## 9. Privacy policy (host at your **Privacy Policy URL**)

Replace `YOUR_EMAIL`, `YOUR_SUPPORT_URL`, and jurisdiction text as needed.

```markdown
# Privacy Policy — Hum - rituals

**Last updated:** [DATE]

Hum - rituals (“we”, “the app”) is operated by [YOUR LEGAL NAME OR COMPANY]. This policy describes how we handle information when you use the mobile app.

## Who the app is for

The app is intended for **two adults** who choose to link their accounts. It is not directed at children under 13.

## Information we collect

**Account and profile**
- Email address and password (for sign-in), or credentials from any future sign-in methods we add.
- Display name and in-app profile data you provide.
- Invite codes used to link two accounts.

**Content you create**
- Text and other content you enter in features such as **Decisions**, **Awards** (nominations and ceremony data), and **Reasons**.
- Optional **photos** if you use features that request photo library access.

**Technical and operational**
- **Device tokens** for push notifications if you grant permission (stored with your profile for delivery through Apple/Google infrastructure).
- **Diagnostic and security** data as collected by our infrastructure providers (e.g. authentication events, IP address, device type) to operate and secure the service.

## How we use information

- To provide sync between you and your partner, run ceremonies, show history, and improve reliability and security.
- To send **local** or **remote** notifications if you opt in (e.g. reminders related to in-app events).

We do **not** sell your personal information. We do **not** run a public social graph inside this app.

## Where data is processed

We use **Google Firebase** (Authentication, Firestore database, and related Google Cloud services) to host backend data. Data may be processed in the United States and other countries where Google operates. See Google’s privacy documentation for more on their subprocessors.

## Retention and deletion

We retain your data while your account exists and as needed to operate the service. You may request deletion of your account and associated personal data by contacting us at **YOUR_EMAIL**. Some information may remain in backups for a limited period.

## Security

We use industry-standard transport encryption (HTTPS) for client communication with Firebase. You are responsible for keeping your password confidential.

## Changes

We may update this policy from time to time. We will post the new policy at the same URL and update the “Last updated” date.

## Contact

**YOUR_EMAIL**  
**YOUR_SUPPORT_URL**
```

---

## 10. App Privacy questionnaire (App Store Connect → App privacy)

Answer **truthfully** for **your** build. Below is a **typical** mapping for this codebase (Firebase Auth + Firestore + optional Expo push token + image picker + local notifications). **Adjust** if you add analytics, crash reporters, or ads.

| Data type | Collected? | Linked to user? | Used for | Third-party sharing |
|-----------|------------|-----------------|----------|---------------------|
| **Contact info** (email) | Yes | Yes | App functionality, account management | Firebase (processor) |
| **User content** (reasons, nominations, decisions, profile fields) | Yes | Yes | App functionality | Firebase |
| **Identifiers** (user ID, device push token if enabled) | Yes | Yes | App functionality, notifications | Firebase / Apple push infrastructure |
| **Usage data** | Only if you add analytics later | — | — | — |
| **Diagnostics** | If Firebase/Google collects minimal diagnostics | Often yes at infra level | Security / operations | Google |

**Tracking:** Usually **No**, you do not enable App Tracking Transparency for cross-app tracking in this stack.

**Photos:** Declare if **Photo Library** access is requested (`expo-image-picker`); purpose: **App functionality** (attach images to nominations/reasons when you ship that path).

---

## 11. Age rating (questionnaire)

Typical honest answers for this app:

- **Cartoon / realistic violence:** None or infrequent (unless your battle copy uses strong metaphors—keep literal violence **No**).  
- **Profanity / mature themes:** None or infrequent (user-generated text could contain anything—if UGC is freeform, disclose **Infrequent** or **Frequent** for “mature/suggestive themes” per Apple’s definitions; many couple apps pick **12+** or **17+** if UGC is unrestricted—**consult Apple’s definitions**).  
- **Gambling:** No.  
- **Controlled substances:** No.  
- **Horror:** No.  

If users can type **anything** in reasons/nominations, Apple may expect a **higher** rating or **moderation**—be conservative.

---

## 12. Review notes (paste into App Store Connect)

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
Home → Quick spin (pick category, spin, save). Awards → browse categories / add nomination text. Reasons → write one line, then draw three. Decide → Battle requires both devices or two accounts in two simulators.

PUSH NOTIFICATIONS
Optional. If prompted, Allow is helpful but not required for core flows. Local ceremony reminders may be scheduled from the awards calendar screen.

PHOTOS
Photo permission appears when using flows that attach images, if enabled in your build.

NETWORK
Requires network for Firebase sync.
```

Replace bracketed credentials with **real disposable** test accounts in your Firebase project.

---

## 13. Copyright / trade name

```
© [YEAR] [YOUR LEGAL NAME OR COMPANY]. All rights reserved.
```

---

## 14. Checklist before you click Submit

- [ ] **Screenshots** uploaded for every **required** display size Connect shows for your binary.  
- [ ] **Support** + **Privacy** URLs live over **https**.  
- [ ] **App Privacy** answers match Firebase + push + photos + UGC.  
- [ ] **Paid Applications** agreement + **banking** + **tax** complete (for paid app).  
- [ ] **Demo accounts** work on production Firebase rules.  
- [ ] **Build** in Connect matches **marketing version** and **build number** from `app.json` / EAS.

---

*Generated for Hum - rituals (`com.humtum.app`). Update dates, emails, URLs, and privacy details before submission.*
