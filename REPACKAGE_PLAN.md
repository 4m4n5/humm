# Repackage plan: Hum (dev.aaam.hum)

Date started: 2026-05-12.
Goal: Resubmit the app under a clean App Store / Play Store record
with a new bundle ID, new branding asset (D2h candlelight wave), and
no history with the prior "simulated gambling" rejection. Same code,
same Firebase backend, same content.

## Locked decisions (Phase 0)

- **Display name**: `Hum`
- **Bundle ID / Android package**: `dev.aaam.hum`
- **App Store subtitle**: `for couples`
- **Old app fate**: withdrawn ✓ (user pulled the pending review on
  2026-05-12 before this plan was written).
- **Device family**: iPhone only. No iPad support. (`supportsTablet`
  is already `false` in `app.json`; just enforce in App Store Connect
  device family selection and skip the iPad screenshot tier.)
- **Metadata strategy**: regenerate everything from scratch in the
  new App Store Connect record. Don't copy any old screenshots, copy,
  or descriptions — fresh slate.
- **Firebase strategy**: keep the existing `humm-f31c7` project; add
  new Android + iOS app entries against the new bundle. No data
  migration. Both old + new builds can coexist on the same backend.
- **Icon**: `D2h candlelight` (rose stroke + warm coral outer halo).
- **Color tokens (`hum-*` in tailwind.config)**: keep as-is. They're
  internal CSS class names, not user-visible.

---

## Phase guide & sign-off gates

Each phase ends at a sign-off where the user confirms "looks good,
proceed" before the next phase begins. Phases marked `(USER)` need
manual UI clicks the agent can't do; everything else can be scripted.

### Phase 1 — Icon finalize (~15 min)

- [ ] Delete every option SVG/PNG except `icon-option-D2h-*`
- [ ] Rename D2h SVG to `icon-master.svg` as the canonical source
- [ ] Render to required sizes:
  - 1024x1024 → `assets/icon.png` (App Store, primary)
  - Android adaptive icon: foreground (transparent bg, just the wave
    + glow) → `assets/adaptive-icon.png`
- [ ] Verify the candlelight glow renders correctly at 60pt (search
    result size)
- [ ] Commit: `chore(brand): set D2h candlelight wave as app icon`
- [ ] **SIGN-OFF**: user confirms icon looks correct on render

### Phase 2 — Code & config rename (~30 min)

Identifiers ONLY. No user-facing copy beyond what's in `app.json`.

- [ ] `app.json`:
  - `name`: `"Hum - rituals"` → `"Hum"`
  - `slug`: `"humm"` → `"hum"`
  - `scheme`: `"humtum"` → `"hum"`
  - `ios.bundleIdentifier`: `"com.humtum.app"` → `"dev.aaam.hum"`
  - `android.package`: `"com.humtum.app"` → `"dev.aaam.hum"`
  - `ios.buildNumber`: reset to `"1"` (fresh app record)
  - `android.versionCode`: reset to `1` (fresh app record)
  - `version`: keep `"1.0.0"` (fresh app, fresh version line)
  - Plugin photos permission string: `"Hum uses your photos for
    nominations and reasons."` (already says "Hum", stays)
- [ ] `package.json`: `"name": "humtum"` → `"name": "hum"`
- [ ] `.firebaserc`: keep `humm-f31c7` (project rename is not needed
    and would break Firestore data access)
- [ ] Search for user-visible strings that say `"Hum -"`, `"rituals"`,
    or `"humm"` anywhere in `app/`, `components/`, `constants/`, `lib/`
    — update to `"Hum"`
- [ ] Search for any remaining user-visible `battle / bracket / spin /
    wheel` strings in JSX text content (NOT identifiers)
- [ ] Verify the support / privacy / marketing URLs in
    `docs/APP_STORE_LISTING.md`:
  - Support: `https://aaam.dev/hum/support.html` ✓ (already)
  - Privacy: `https://aaam.dev/hum/privacy.html` ✓ (already)
  - Marketing: `https://aaam.dev/hum/` ✓ (already)
- [ ] Commit: `chore(brand): rename to Hum + dev.aaam.hum bundle`
- [ ] **SIGN-OFF**: user reviews the diff before next phase

### Phase 3 — Firebase reconfigure (~15 min, USER does UI)

- [ ] `(USER)` Firebase Console → project `humm-f31c7`
- [ ] `(USER)` "Add app" → Android, package `dev.aaam.hum`,
    nickname "Hum (Android)"
- [ ] `(USER)` "Add app" → iOS, bundle `dev.aaam.hum`,
    nickname "Hum (iOS)"
- [ ] `(USER)` Download new `google-services.json` (it now contains
    BOTH old `com.humtum.app` and new `dev.aaam.hum` Android packages
    — this is fine, Firebase merges them)
- [ ] `(USER)` Download `GoogleService-Info.plist` for iOS (Expo's
    Firebase JS SDK doesn't strictly need this if all auth+data go
    through the JS SDK — confirm during Phase 7 smoke test that push
    notifications work)
- [ ] Replace `google-services.json` at repo root
- [ ] Commit: `chore(firebase): register dev.aaam.hum app entries`
- [ ] **SIGN-OFF**: user confirms files in place, no broken Firestore
    rules

### Phase 4 — Apple Developer + App Store Connect (~30 min, USER)

- [ ] `(USER)` developer.apple.com → Identifiers → "+" → App IDs →
    App → Bundle ID `dev.aaam.hum` → enable capability "Push
    Notifications"
- [ ] `(USER)` appstoreconnect.apple.com → My Apps → "+" → New App:
  - Platform: iOS
  - Name: `Hum`
  - Primary Language: English (US)
  - Bundle ID: `dev.aaam.hum` (selectable from dropdown after Apple
    Developer step)
  - SKU: `AAAMHUM001` (any unique string never used in your account)
  - User Access: Full Access
  - **Device family: iPhone only. Do NOT tick iPad.** (App Store
    Connect derives this from the build's UIDeviceFamily, which Expo
    sets from `ios.supportsTablet: false`. Verify after first build
    upload.)
- [ ] `(USER)` Google Play Console → "Create app":
  - App name: `Hum`
  - Default language: English (US)
  - App or game: App
  - Free or paid: Free
  - Declarations + content rating: complete (no gambling, no ads
    unless added later)
  - Package name (set on first APK upload, locked after):
    `dev.aaam.hum`
- [ ] **SIGN-OFF**: confirm new app records exist on both stores

### Phase 4.5 — Withdraw old iOS review

- [x] `(USER)` Done 2026-05-12. Old `Hum - rituals` review withdrawn.

### Phase 5 — EAS new project (~15 min)

- [ ] Run `npx eas-cli init` from `humm/` repo (creates new EAS
    project tied to the new slug)
- [ ] Update `app.json` `extra.eas.projectId` to new value
- [ ] Configure iOS push notification key for `dev.aaam.hum`:
    `npx eas-cli credentials --platform ios` (use existing APNs key or
    generate fresh)
- [ ] Configure Android FCM v1: upload `service-account.json` from
    Firebase project for the new Android app entry
- [ ] Commit: `chore(eas): wire new project id for dev.aaam.hum`
- [ ] **SIGN-OFF**: user confirms eas project id is correct

### Phase 6 — Build (~30–60 min wait)

- [ ] `npx eas-cli build --platform all --profile production`
- [ ] iOS auto-uploads to App Store Connect via EAS submit (or run
    `npx eas-cli submit --platform ios --latest` once build is ready)
- [ ] Android `.aab` for Play Console + optional `.apk` for sideload
    smoke test (use `--profile preview` for APK)
- [ ] **SIGN-OFF**: builds finished, no errors

### Phase 7 — Smoke test (~30 min, USER on device)

- [ ] `(USER)` iOS: install via TestFlight (after first
    App Store Connect processing completes)
- [ ] `(USER)` Android: install APK on device
- [ ] Verify:
  - [ ] App icon shows D2h candlelight on home screen
  - [ ] Splash screen renders without artifacts
  - [ ] Sign up new account → link partner code → couple linked
  - [ ] Log a mood, write a reason, complete a habit
  - [ ] Push notification received from partner action
  - [ ] No crashes during 5-min usage
- [ ] **SIGN-OFF**: smoke test green

### Phase 8 — Regenerate metadata & screenshots from scratch (~60–90 min)

Fresh slate. Old screenshots and copy are not reused.

- [ ] Delete `screenshots/6.7/` and `screenshots/ipad-13/`
    entirely (we only need 6.9" iPhone tier; Apple auto-scales for
    smaller iPhones, and iPad isn't supported)
- [ ] Wipe and regenerate `screenshots/6.9/` — fresh Maestro flow
    against the new build, after Phase 7 confirms the rename took
- [ ] Wipe and regenerate `screenshots/android-phone/` for Play
    Console
- [ ] Rewrite `docs/APP_STORE_LISTING.md` from scratch:
  - Title: `Hum`
  - Subtitle: `for couples`
  - Promotional text, description, keywords (audit for ANY
    "battle / bracket / spin / wheel / tournament / draw / odds /
    lottery" residue — must be zero)
  - Copyright: `2026 aaam.dev`
  - Support URL: `https://aaam.dev/hum/support.html`
  - Privacy URL: `https://aaam.dev/hum/privacy.html`
  - Marketing URL: `https://aaam.dev/hum/`
- [ ] `(USER)` Upload all metadata + screenshots to the NEW App Store
    Connect record (fresh upload, nothing carried over)
- [ ] `(USER)` Same for Google Play Console
- [ ] **SIGN-OFF**: fresh metadata reviewed and ready to submit

### Phase 9 — Submit (~15 min)

- [ ] `(USER)` App Store Connect → Submit for Review
- [ ] `(USER)` Google Play Console → Send for Review
- [ ] Note submission IDs for tracking

### Phase 10 — Cleanup & docs (~30 min, after approval or in parallel)

- [ ] Delete `assets/brand/icon-option-*` for all options that aren't
    D2h (already done in Phase 1; this is a re-check)
- [ ] Update `README.md`, `BLUEPRINT.md`, `SETUP.md`,
    `docs/DEVELOPER_GUIDE.md`, `docs/STORE_LAUNCH.md`,
    `docs/APP_STORE_LISTING.md`, `docs/AGENTS.md` to reference new
    bundle/name throughout
- [ ] Update `aaam.dev/hum/index.html` to reflect new App Store URL
    (after approval)
- [ ] Commit: `docs: complete Hum repackage handover`
- [ ] Optional: rename GitHub repo `humm` → `hum` (separate concern,
    breaks no clones because GitHub keeps redirects)

---

## Risk register

- **Apple may notice the same content under a new bundle and reject
  for the same reason.** Mitigation: removed every gambling-adjacent
  user-visible string in earlier consistency sweeps; verify in Phase 2.
- **iOS push notifications break after Firebase iOS app re-add.**
  Mitigation: smoke test in Phase 7 specifically tests this.
- **Old `humm-f31c7` Firestore data is invisible to new bundle's
  Firebase SDK.** Mitigation: same project, same config, same
  collection — data is fully shared. Both bundles read/write the same
  Firestore.
- **Existing users can't migrate from old app to new app.**
  Mitigation: not a concern; the old app never went live to real
  users (was stuck in review).
