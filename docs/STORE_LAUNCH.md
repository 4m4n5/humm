# Store launch guide — Google Play & Apple App Store

This doc is a **practical checklist** for shipping **Hum - rituals** (`com.humtum.app`) as a **paid app** (e.g. **~$3.99 USD**) on both major stores. Fees, UI labels, and policies change—verify numbers and forms in each console before you submit.

**Related:** [SETUP.md](../SETUP.md) (local + EAS env), [eas.json](../eas.json) (build profiles), [.env.example](../.env.example) (Firebase keys).

---

## 1. Costs and accounts

| Item | Typical cost | Notes |
|------|----------------|-------|
| **Google Play developer** | One-time fee (on the order of **$25 USD**) | [Play Console](https://play.google.com/console) — register as an organization or individual. |
| **Apple Developer Program** | **~$99 USD / year** | Required for App Store distribution; [developer.apple.com](https://developer.apple.com/programs/). |
| **Store commission** | **~15–30%** of customer price | Apple and Google offer **small business** programs with **15%** once you qualify (revenue thresholds—check current rules). |
| **Tax / banking** | Varies | Each console wants **tax forms** and **payout bank account** before you get paid. |

You need **both** enrollments only if you want **both** stores.

---

## 2. What you’re selling: “paid app” vs other models

- **Paid download (this doc assumes a one-time price, e.g. ~$3.99 USD):** User pays once to install. Configure in **Play Console** (paid app / one-time price) and **App Store Connect** (paid app + **price tier** matching your US price).
- **Alternatives** you are *not* required to use: subscriptions, in-app purchases (IAP), free + unlock. Changing model later may need new binaries and review.

**Hum today:** no IAP code path in-repo for store billing—the app is “buy once, use Firebase backend.” Store handles the **purchase**; your app still uses **Firebase Auth** after install.

---

## 3. Production builds (Expo / EAS)

### 3.1 Environment variables on EAS

Release binaries **do not** read your laptop `.env` unless variables are defined for the correct **EAS environment**:

- **`preview`** — used by `npm run build:android:apk` (internal APK).
- **`production`** — use for **store-bound** builds (AAB / iOS App Store).

Push Firebase config for **production**:

```bash
cd /path/to/humm
npm run eas:env:push:production
# or: npx eas-cli env:push production --path .env
```

Sanity check:

```bash
npm run eas:env:list   # lists preview; use: npx eas-cli env:list production
```

Every name in [.env.example](../.env.example) should exist for **`production`** before you ship.

### 3.2 Android — Google Play (AAB)

Play requires an **Android App Bundle (.aab)**, not the sideload APK.

From repo root:

```bash
npm run build:android:play
# equivalent: npx eas-cli build -p android --profile production
```

After the build:

- Download the **.aab** from the Expo build page, **or**
- **`npx eas-cli submit -p android --latest`** (configure Play Console API access / service account as EAS docs describe).

**Versioning (Android):**

- User-visible: `expo.version` in [app.json](../app.json).
- Play-internal: `expo.android.versionCode` — **must increase** for every new upload to the same package name ([app.json](../app.json) → `android.versionCode`).

### 3.3 iOS — App Store (IPA)

You need an **iOS production** build with **App Store** distribution (not Ad Hoc for public store).

```bash
npx eas-cli build -p ios --profile production
```

If you only have `preview` / `production` in [eas.json](../eas.json), add or adjust an iOS block under `production` as needed (EAS may prompt on first iOS build). Apple signing: EAS can generate **distribution certificate** and **provisioning profile**—follow CLI prompts.

Submit:

```bash
npx eas-cli submit -p ios --latest
```

Or upload with **Transporter** / **Xcode** using the IPA from EAS.

**Versioning (iOS):**

- **Marketing version:** `expo.version` in `app.json` (e.g. `1.0.1`).
- **Build number (CFBundleVersion):** must **monotonically increase** per upload; EAS often manages via **remote** or local config—see [EAS app version](https://docs.expo.dev/build-reference/app-versions/).

### 3.4 Optional: `eas.json` iOS section

Your current [eas.json](../eas.json) only customizes Android `buildType`. For iOS store builds you may add under `production`:

```json
"ios": {
  "resourceClass": "m-medium"
}
```

Only if EAS recommends it for build timeouts—defaults often suffice.

---

## 4. Google Play Console — detailed checklist

### 4.1 App creation

- Create app → **default language**, **title** (must match listing, e.g. **Hum - rituals**), **short description**, **full description**.
- **App category** (e.g. Lifestyle or Social—pick what fits; be honest).
- **Contact email** (required), optional phone/website.

### 4.2 Store listing assets

- **App icon** — 512×512 PNG (Play); you can derive from [assets/icon.png](../assets/icon.png) if needed.
- **Feature graphic** — 1024×500 (required for many listings).
- **Phone screenshots** — at least **2**; more is better. Use **real device** or emulator frames; show auth, home, decide, awards, reasons, profile.
- **Tablet** screenshots if you declare tablet support ([app.json](../app.json) has `supportsTablet: false` on iOS; align Android if you restrict phones only).

### 4.3 Privacy & policy

- **Privacy policy URL** — **required** if the app accesses sensitive APIs or user data. Hum uses **Firebase Auth**, **Firestore**, optional **push token** on user doc—disclose collection, use, retention, third parties (Google), user rights.
- **Data safety form** (Play) — answer questions that **match** your app and privacy policy: account data, messages/user content (reasons/nominations text), device or other IDs, etc. Update when you add analytics or ads.

### 4.4 Content & compliance

- **Target audience / Families:** If you don’t target children, state that; complete **IARC** / content rating questionnaire truthfully.
- **News apps, COVID, financial, health** declarations—only if applicable (likely **no** for Hum).
- **Government / elections**—usually **no**.

### 4.5 App signing

- Play App **Signing** — Google strongly recommends/enforces; use **Play App Signing** with key uploaded or generated; keep **upload key** backup (EAS often holds signing; download backups from EAS if offered).

### 4.6 Pricing & distribution

- Set **countries/regions**.
- Set app as **Paid** and choose **price** (~$1.99 USD tier); regional prices auto-fill, review them.
- **License testing** — add tester Gmail accounts for **license** checks before going live.

### 4.7 Release tracks

- Start with **internal testing** → **closed** → **open** → **production** as you gain confidence.
- Each track needs the **same or higher** `versionCode` for new AABs.

### 4.8 Review

- Review time varies (hours to days). Rejections often cite **Data safety** mismatches, **missing policy**, or **broken login**. Provide **test account** credentials in Play’s review notes if the app requires sign-in.

---

## 5. App Store Connect — detailed checklist

### 5.1 App record

- **New App** → **Bundle ID** must match Xcode/EAS (`com.humtum.app` per [app.json](../app.json) — confirm in Apple Developer **Identifiers**).
- **SKU** — arbitrary internal id (e.g. `humtum-ios-001`).
- **Name**, **subtitle**, **keywords**, **description**, **promotional text** (optional), **support URL**, **marketing URL** (optional).

### 5.2 Pricing

- **Pricing and Availability** → **Price schedule** → select tier equivalent to your US price (e.g. **$3.99**).
- **Availability** by country.

### 5.3 App Privacy (“nutrition labels”)

Declare **data types** collected/linked to the user, **tracking** (if any), **purposes** (app functionality, analytics, etc.). Align with:

- Firebase Auth (account identifiers).
- Firestore (user-generated content, profile fields).
- Push token stored on user profile (if you use `registerExpoPushToken`).
- **No** ad SDKs in current Hum stack—don’t claim tracking you don’t do.

### 5.4 Screenshots & previews

- **6.7"** and **6.5"** iPhone screenshots are commonly required; check **App Store Connect** for current **required** sizes for your deployment target.
- Optional **App Preview** video.

### 5.5 Build attachment

- In **TestFlight** tab, wait for processing after upload, then select build under **App Store** version.
- **Export compliance** — encryption questions (HTTPS/Firebase typically **exempt** from filing separate CCATS; answer the standard questionnaire truthfully).

### 5.6 Review information

- **Sign-in required** → provide **demo Apple ID** or **demo email/password** Firebase user **and** note that partner linking may need a second account—or provide a **video** walkthrough.
- **Notes** — explain invite-only couple model so reviewers don’t think the app is “broken.”

### 5.7 Review

- Often **24–48 hours**, can be longer; rejections frequently mention **Guideline 2.1** (information needed), **5.1.1** (privacy), or **metadata** mismatches.

---

## 6. Legal & policy (high level — not legal advice)

You should have **written** documents hosted at stable URLs:

1. **Privacy policy** — Must cover:
   - What you collect (email, display name, couple/partner linkage, content users write, device tokens, technical logs if any).
   - **Processors** (e.g. Google Firebase / Google Cloud).
   - Retention, deletion requests, contact email.
   - **EEA/UK** users: lawful basis and rights (high level).
2. **Terms of use / EULA** — Especially for **paid** apps: acceptable use, account termination, limitation of liability (jurisdiction-specific—consider a short consult with a lawyer for paid consumer apps).
3. **Children** — If the app is **not** for under-13, say so in policy and store questionnaires.

Link the **privacy policy URL** in **both** consoles and inside the app if stores or guidelines require **in-app** access (Apple often expects easy discovery; a **Profile** or **About** link is typical).

---

## 7. Hum-specific technical notes

| Area | Store / review relevance |
|------|---------------------------|
| **Firebase** | In Firebase Console → Project settings → Your apps, register **iOS** (`com.humtum.app`) and **Android** (`com.humtum.app`) if you changed bundle/package from an older id—reuse the same Web SDK keys in `.env` / EAS env, or add platform apps as Firebase documents. Disclose Google as infrastructure; ensure **Firestore security rules** are production-tight—not test mode. |
| **Invite codes** | Explain in review notes: two-person linking; reviewers may need **two test accounts**. |
| **Expo Notifications** | Local ceremony reminders; remote push later may need **FCM** setup and extra disclosure. |
| **Photos (image picker)** | [app.json](../app.json) already has a `photosPermission` string; ensure it matches actual use (nominations/reasons when you ship photos). |
| **No ads in repo** | Don’t declare **advertising ID** / tracking unless you add SDKs. |

---

## 8. Suggested order of operations

1. Enroll **Play** + **Apple** developer programs.
2. Host **privacy policy** (and terms) at public URLs.
3. **`eas:env:push:production`** from a complete `.env`.
4. **`build:android:play`** → internal testing on Play.
5. **iOS `eas build`** → **TestFlight** internal testing.
6. Complete **Data safety** + **App privacy** forms to match policy.
7. Screenshots + descriptions + pricing tier (e.g. **$3.99**).
8. **Submit** for review (Play production + App Store).
9. After approval, **release** and monitor **crashes** (Play Vitals, Xcode Organizer / third-party crash tools if you add them later).

---

## 9. Useful links

- [Expo — Submit to app stores](https://docs.expo.dev/submit/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Apple Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play policy center](https://play.google.com/about/developer-content-policy/)

---

## 10. Repo cross-links

| File | Role |
|------|------|
| [app.json](../app.json) | `version`, `android.versionCode`, `ios.bundleIdentifier`, `android.package`, icons/splash |
| [eas.json](../eas.json) | `preview` (APK) vs `production` (AAB default) |
| [package.json](../package.json) | `build:android:apk`, `build:android:play`, `eas:env:*` scripts |
| [SETUP.md](../SETUP.md) | EAS login, `env:push`, Firebase local setup |

---

*Last drafted for Hum - rituals (`com.humtum.app`, Expo slug `humtum`, Expo SDK 54, Firebase, EAS). Re-check store consoles and Expo docs when you actually submit.*
