import * as admin from "firebase-admin";
import Expo, { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

const expo = new Expo();

/**
 * Send a push notification to a user via their Expo push token stored in
 * `users/{uid}.fcmToken`. Handles `DeviceNotRegistered` by clearing stale tokens.
 */
export async function sendPushToUser(
  uid: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  if (!snap.exists) return;

  const token: string | null = snap.data()?.fcmToken ?? null;
  if (!token || !Expo.isExpoPushToken(token)) return;

  const prefs = snap.data()?.notificationPreferences ?? null;
  if (prefs && data?.screen) {
    const feature = data.screen.replace(/^\//, "").split("/")[0];
    // Empty `feature` (e.g. screen "/") skips this gate — weekly challenge push is not tied to NotificationPreferences keys yet.
    if (feature && prefs[feature] === false) return;
  }

  const message: ExpoPushMessage = {
    to: token,
    title,
    body,
    data: data ?? {},
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
