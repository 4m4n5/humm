import * as admin from "firebase-admin";
import Expo, { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

const expo = new Expo();

/**
 * Canonical feature keys used as the gate against `users/{uid}.notificationPreferences`.
 * Must match the keys in the client `NotificationPreferences` type.
 */
export type NotificationFeature =
  | "mood"
  | "habits"
  | "decide"
  | "reasons"
  | "awards"
  | "weeklyChallenge"
  | "reminders";

export interface PushOptions {
  /** Pref-gate key. If the user has set `notificationPreferences[feature] === false`, the send is skipped. */
  feature: NotificationFeature;
  /** Optional deep-link route. Stored under `data.screen` so the client can navigate on tap. */
  screen?: string;
  /** Extra `data` keys passed through to the Expo push payload (must be string-valued). */
  extra?: Record<string, string>;
}

/**
 * Send a push to a user via their Expo push token (`users/{uid}.fcmToken`).
 * Respects per-feature `notificationPreferences` and clears stale tokens on `DeviceNotRegistered`.
 */
export async function sendPushToUser(
  uid: string,
  title: string,
  body: string,
  opts: PushOptions,
): Promise<void> {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  if (!snap.exists) return;

  const token: string | null = snap.data()?.fcmToken ?? null;
  if (!token || !Expo.isExpoPushToken(token)) return;

  const prefs = snap.data()?.notificationPreferences ?? null;
  if (prefs && prefs[opts.feature] === false) return;

  const data: Record<string, string> = {
    feature: opts.feature,
    ...(opts.screen ? { screen: opts.screen } : {}),
    ...(opts.extra ?? {}),
  };

  const message: ExpoPushMessage = {
    to: token,
    title,
    body,
    data,
    sound: "default",
  };

  try {
    const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync([message]);
    for (const ticket of tickets) {
      if (ticket.status === "error") {
        if (ticket.details?.error === "DeviceNotRegistered") {
          await admin.firestore().doc(`users/${uid}`).update({ fcmToken: null });
        }
      }
    }
  } catch (err) {
    console.error("[push] sendPushToUser failed:", uid, err);
  }
}
