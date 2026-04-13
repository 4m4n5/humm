/**
 * Build-time Firebase web config (inlined from `EXPO_PUBLIC_*` in EAS / local `.env`).
 * Kept separate from `lib/firebase.ts` so the root layout can check env before importing Firebase.
 */
export function isFirebaseEnvComplete(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET &&
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  );
}
