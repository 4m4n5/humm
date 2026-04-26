# Hum - rituals — setup guide

Use this to run the app on your machines. Technical overview for agents: [docs/AGENTS.md](./docs/AGENTS.md).

---

## Requirements

- **Node.js** 20 LTS or newer (Expo SDK 54 expects a recent Node)
- **npm** (ships with Node)
- **Expo Go** on phones — must match **Expo SDK 54** (this repo is pinned to `~54.0.0` so it works with the current App Store Expo Go on iOS)

---

## 1. Install dependencies

```bash
cd /path/to/humm
npm install
```

For packages that depend on the native SDK, prefer:

```bash
npx expo install <package-name>
```

---

## 2. Firebase project

1. Open [Firebase Console](https://console.firebase.google.com) → **Add project** → name it (e.g. `humtum` or your product name).
2. **Authentication** → Get started → enable **Email/Password**.
3. **Firestore** → Create database → start in **test mode** for development (lock down rules before any real data you care about).
4. **Storage** (optional for Phase 1): enabling Storage may require the **Blaze** plan. The app does **not** initialize Storage in code yet; skip until you need photos.

### Web app config

**Project settings** → Your apps → **Add app** (Web `</>`) → copy the config values.

---

## 3. Environment variables

```bash
cp .env.example .env
```

Fill `.env`:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Never commit `.env` (it is gitignored).

---

## 4. Run the app

```bash
npx expo start --clear
```

- **iOS:** Camera app → scan QR → opens in Expo Go  
- **Android:** Expo Go → scan QR  
- **Web:** press `w`

If you see **“Project is incompatible with this version of Expo Go”** on iOS, the project SDK and Expo Go are out of sync. This repo targets **SDK 54** to match the App Store Expo Go; upgrade/downgrade the project with `expo` in `package.json` and `npx expo install --fix` only when you understand the tradeoff (see [docs/AGENTS.md](./docs/AGENTS.md)).

---

## 5. First-time pairing

1. Both install Expo Go and run the dev server URL / QR.
2. Person A: **Sign up** → note the **invite code** (also on Profile).
3. Person B: **Sign up** → **Enter their code** on the link screen.
4. You share the same Firestore `coupleId` and decision lists.

---

## 6. Shareable Android APK (EAS Build)

The repo includes **`eas.json`** with a **`preview`** profile that outputs an **APK** (easy to sideload / share). **`production`** builds an **AAB** for Google Play.

### One-time setup

1. **Expo account** — [expo.dev](https://expo.dev) (free tier is enough to get started).
2. **Link the project** (adds `extra.eas.projectId` to `app.json`):

   ```bash
   cd /path/to/humm
   npm install
   npm run eas:login
   npm run eas:init
   ```

3. **Firebase env vars on EAS** — release builds do not read your laptop’s `.env` unless those values are **uploaded to Expo** for the right **environment** (`preview` for shareable APKs).

   **Easiest (recommended):** from the project folder, with a filled **`.env`** (same keys as `.env.example`):

   ```bash
   npm run eas:env:push:preview
   ```

   That runs `eas env:push preview --path .env` and creates/updates variables on the project for the **`preview`** environment (what `eas.json` uses for the APK profile).

   **List what’s set (sanity check):**

   ```bash
   npm run eas:env:list
   ```

   **Or use the website:** [expo.dev](https://expo.dev) → sign in → **Projects** → **Hum - rituals** (slug `humtum`) → **Environment variables** (in the left sidebar). Add each name from `.env.example` manually and assign them to **Preview** (and **Production** later if you use that profile). Names must match exactly, including the `EXPO_PUBLIC_` prefix.

   **Important:** If variables only exist under **Production** but you build with **`preview`**, the APK will not see them — use **`preview`** for `npm run build:android:apk`.

### Build the APK

```bash
npm run build:android:apk
```

When the build finishes, open the link EAS prints (or the Expo dashboard) and **download the `.apk`**. Send that file to your phone; open it to install (you may need to allow “install unknown apps” for the browser or Files app).

### After the first release

- Bump **`expo.version`** in `app.json` for user-visible version.
- Bump **`expo.android.versionCode`** (integer) for every new upload / APK you care to treat as an upgrade.

### App icon

Default icon: **`assets/icon.png`** (1024×1024). Replace it with your own PNG and rebuild.

---

## Firestore indexes

The repo includes `firestore.indexes.json` and `firebase.json`. The Firebase CLI is **not** installed globally; it’s a **dev dependency**, so run commands from the **project folder** (not a parent directory like `github`).

```bash
cd /path/to/humm
npm install
npm run firebase:login      # once per machine (see note below)
npm run deploy:indexes
```

**If `firebase login` crashes** with “update check failed” / “get access to … `~/.config`”: your `~/.config` folder may be owned by `root` (common after some installers). Either fix ownership once (`sudo chown -R $(whoami):staff ~/.config`) or keep using the npm scripts above: they set `XDG_CONFIG_HOME` to `~/.config-humm-firebase` (your user) and `CI=1` so the CLI does not trip over the root-owned directory.

Default project id is set in `.firebaserc` (`humm-f31c7`). If yours differs, run `npx firebase use your-project-id` or edit `.firebaserc`. Wait until indexes finish building in the Firebase console before relying on listeners that need them.

**`reasons`** uses `where('coupleId')` only and sorts in memory. A `coupleId` + `createdAt` composite is still in `firestore.indexes.json` for older clients or console-created queries.

**`nominations`** uses `where('coupleId')` + `where('ceremonyId')` and sorts in memory (plus a legacy triple-field index if an older build used `orderBy('createdAt')`).

**Past `ceremonies`** still uses only `where('coupleId')` and filters/sorts on the client.

**`decisions`** (history) still uses `coupleId` + `orderBy('createdAt')`:

| Collection | Fields |
|------------|--------|
| `decisions` | `coupleId` Ascending, `createdAt` Descending |

---

## Troubleshooting

| Issue | Hint |
|--------|------|
| React / react-dom version mismatch | Run `npx expo install react react-dom react-native` so Expo picks aligned versions |
| Firebase `.cjs` resolution | `metro.config.js` should include `cjs` in `resolver.sourceExts` |
| Path `@/` not resolving | `typescript` should be in `dependencies` (Expo + Metro) |
| `firebase login` / deploy errors on `~/.config` | Run `npm run firebase:login` and `npm run deploy:indexes`, or `sudo chown -R $(whoami):staff ~/.config` |

---

## Sharing ideas & roadmap

Use **[docs/APPS_AND_FEATURES.md](./docs/APPS_AND_FEATURES.md)** so agents and you stay aligned on what to build next.
