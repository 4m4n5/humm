import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { sendPushToUser } from "./push";

/**
 * Firestore-triggered partner notifications via Expo Push API (`expo-server-sdk`).
 * Reads `users/{uid}.fcmToken` (Expo push token) and respects `notificationPreferences`.
 *
 * Deploy: `cd functions && npm run deploy`. Project must match client Firebase config.
 */

admin.initializeApp();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function partnerUidOf(uid: string): Promise<string | null> {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  return snap.data()?.partnerId ?? null;
}

function firstName(displayName?: string): string {
  return (displayName ?? "your partner").split(" ")[0] || "your partner";
}

// ─── Mood ───────────────────────────────────────────────────────────────────

export const onMoodEntryWritten = onDocumentWritten(
  "moodEntries/{docId}",
  async (event) => {
    const after = event.data?.after?.data();
    const before = event.data?.before?.data();
    if (!after) return;

    const afterStickerId = after.current?.stickerId;
    const beforeStickerId = before?.current?.stickerId;
    if (afterStickerId === beforeStickerId) return;

    const actingUid: string = after.uid;
    const partnerUid = await partnerUidOf(actingUid);
    if (!partnerUid) return;

    const actorSnap = await admin.firestore().doc(`users/${actingUid}`).get();
    const name = firstName(actorSnap.data()?.displayName);
    const emoji: string = after.current?.emoji ?? "";

    await sendPushToUser(partnerUid, "mood", `${name} tapped ${emoji}`, {
      screen: "/mood",
    });
  },
);

// ─── Reasons ────────────────────────────────────────────────────────────────

export const onReasonCreated = onDocumentCreated(
  "reasons/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const authorUid: string = data.authorId;
    const partnerUid = await partnerUidOf(authorUid);
    if (!partnerUid) return;

    const authorSnap = await admin.firestore().doc(`users/${authorUid}`).get();
    const name = firstName(authorSnap.data()?.displayName);

    await sendPushToUser(partnerUid, "reasons", `${name} wrote a reason for you`, {
      screen: "/reasons",
    });
  },
);

// ─── Nominations ────────────────────────────────────────────────────────────

export const onNominationCreated = onDocumentCreated(
  "nominations/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const submitterUid: string = data.submittedBy;
    const partnerUid = await partnerUidOf(submitterUid);
    if (!partnerUid) return;

    const snap = await admin.firestore().doc(`users/${submitterUid}`).get();
    const name = firstName(snap.data()?.displayName);

    await sendPushToUser(partnerUid, "awards", `${name} added a nomination`, {
      screen: "/awards",
    });
  },
);

// ─── Battles ────────────────────────────────────────────────────────────────

export const onBattleCreated = onDocumentCreated(
  "battles/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const coupleId: string = data.coupleId;
    const coupleSnap = await admin.firestore().doc(`couples/${coupleId}`).get();
    if (!coupleSnap.exists) return;
    const c = coupleSnap.data()!;
    const uids = [c.user1Id, c.user2Id].filter(Boolean) as string[];

    for (const uid of uids) {
      const userSnap = await admin.firestore().doc(`users/${uid}`).get();
      const partnerUid = userSnap.data()?.partnerId;
      if (!partnerUid) continue;
      const name = firstName(userSnap.data()?.displayName);
      await sendPushToUser(partnerUid, "battle", `${name} started a battle — join in`, {
        screen: "/decide/battle-lobby",
      });
      break;
    }
  },
);

// ─── Decisions (quickspin only) ─────────────────────────────────────────────

export const onDecisionCreated = onDocumentCreated(
  "decisions/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data || data.mode !== "quickspin") return;
    const creatorUid: string = data.createdByUserId;
    if (!creatorUid) return;

    const partnerUid = await partnerUidOf(creatorUid);
    if (!partnerUid) return;

    const snap = await admin.firestore().doc(`users/${creatorUid}`).get();
    const name = firstName(snap.data()?.displayName);

    await sendPushToUser(partnerUid, "decide", `${name} spun the wheel`, {
      screen: "/decide",
    });
  },
);

// ─── Weekly challenge completed ─────────────────────────────────────────────

export const onWeeklyChallengeCompleted = onDocumentUpdated(
  "couples/{coupleId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const xpBefore = before.weeklyChallenge?.xpGranted === true;
    const xpAfter = after.weeklyChallenge?.xpGranted === true;
    if (xpBefore || !xpAfter) return;

    const uids = [after.user1Id, after.user2Id].filter(Boolean) as string[];
    for (const uid of uids) {
      await sendPushToUser(uid, "challenge", "you both nailed this week's challenge 🎉", {
        screen: "/",
      });
    }
  },
);
