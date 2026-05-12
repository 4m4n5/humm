import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import Expo, { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

/**
 * One-shot Android push diagnostic. Hit with:
 *   curl -s "https://us-central1-humm-f31c7.cloudfunctions.net/diagnosePush?key=letmein&uid=<UID>"
 *
 * Reports: token presence/validity, sends a test push, then waits 7 seconds
 * and fetches the Expo push RECEIPT for the ticket — receipts (not tickets)
 * are what surface FCM credential / channel / sender-id failures.
 *
 * Temporary diagnostic only — remove after the partner's push pipeline is
 * confirmed working.
 */
export const diagnosePush = onRequest(
  { region: "us-central1", cors: true },
  async (req, res) => {
    if (req.query.key !== "letmein") {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const uid = String(req.query.uid ?? "");
    if (!uid) {
      res.status(400).json({ error: "uid query parameter required" });
      return;
    }

    const result: Record<string, unknown> = { uid };

    const snap = await admin.firestore().doc(`users/${uid}`).get();
    if (!snap.exists) {
      result.error = "user doc not found";
      res.json(result);
      return;
    }

    const data = snap.data() ?? {};
    const token: string | null = data.fcmToken ?? null;
    const partnerId: string | null = data.partnerId ?? null;
    const displayName: string | null = data.displayName ?? null;
    const prefs = data.notificationPreferences ?? null;

    result.displayName = displayName;
    result.partnerId = partnerId;
    result.fcmTokenPresent = !!token;
    result.fcmTokenPrefix = token ? token.slice(0, 30) + "…" : null;
    result.isValidExpoToken = token ? Expo.isExpoPushToken(token) : false;
    result.notificationPreferences = prefs;

    if (!token || !Expo.isExpoPushToken(token)) {
      result.verdict =
        "no valid Expo push token saved on this user — open the app and grant notification permission";
      res.json(result);
      return;
    }

    const expo = new Expo();
    const message: ExpoPushMessage = {
      to: token,
      title: "test push",
      body: "if you can read this on android, the channel + FCM pipeline works",
      sound: "default",
      channelId: "default",
      priority: "high",
      data: { feature: "reminders", screen: "/" },
    };

    let tickets: ExpoPushTicket[] = [];
    try {
      tickets = await expo.sendPushNotificationsAsync([message]);
    } catch (e) {
      result.sendError = (e as Error).message;
      res.json(result);
      return;
    }

    const ticket = tickets[0];
    result.ticket = ticket;

    if (!ticket || ticket.status !== "ok") {
      result.verdict = "Expo rejected the push at ticket stage";
      res.json(result);
      return;
    }

    const ticketId = ticket.id;
    result.ticketId = ticketId;

    // Wait long enough for Expo to attempt FCM delivery (~5 sec is usually enough,
    // give it 7 to be safe).
    await new Promise((r) => setTimeout(r, 7000));

    try {
      const receipts = await expo.getPushNotificationReceiptsAsync([ticketId]);
      result.receipts = receipts;
      const r = receipts[ticketId];
      if (!r) {
        result.verdict =
          "no receipt yet (try again in 30s — Expo can take time to fan out to FCM)";
      } else if (r.status === "ok") {
        result.verdict =
          "Expo says FCM accepted delivery. If notification still doesn't appear: check Android Settings → Hum → Notifications is on, battery optimisation is off, and Do Not Disturb is off";
      } else {
        result.verdict = `FCM-side failure: ${r.message ?? "see details"}`;
      }
    } catch (e) {
      result.receiptError = (e as Error).message;
    }

    res.json(result);
  },
);
