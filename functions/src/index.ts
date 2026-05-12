import * as admin from "firebase-admin";
import {
  onDocumentWritten,
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { sendPushToUser } from "./push";
import { dailyReminderTick } from "./dailyReminders";
import { diagnosePush } from "./diagnosePush";

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

async function firstNameOf(uid: string): Promise<string> {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  return firstName(snap.data()?.displayName);
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

    const name = await firstNameOf(actingUid);
    const emoji: string = after.current?.emoji ?? "";

    await sendPushToUser(partnerUid, "mood", `${name} tapped ${emoji}`, {
      feature: "mood",
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

    const name = await firstNameOf(authorUid);

    await sendPushToUser(partnerUid, "reasons", `${name} wrote a reason for you`, {
      feature: "reasons",
      screen: "/reasons",
    });
  },
);

// ─── Awards: Nominations ────────────────────────────────────────────────────

export const onNominationCreated = onDocumentCreated(
  "nominations/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const submitterUid: string = data.submittedBy;
    const partnerUid = await partnerUidOf(submitterUid);
    if (!partnerUid) return;

    const name = await firstNameOf(submitterUid);

    await sendPushToUser(partnerUid, "awards", `${name} added a nomination`, {
      feature: "awards",
      screen: "/awards",
    });
  },
);

// ─── Pick Together (live vote) ─────────────────────────────────────────────
//
// Firestore collection name `battles` is preserved for backwards compat with
// existing in-flight sessions; user-facing copy says "pick together".

export const onPickCreated = onDocumentCreated(
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
      await sendPushToUser(partnerUid, "decide", `${name} started a pick — join in`, {
        feature: "decide",
        screen: "/decide/pick-lobby",
      });
      break;
    }
  },
);

// ─── Decisions (quickspin solo path) ───────────────────────────────────────
//
// `mode: 'quickspin'` literal is preserved on Decision docs for backwards compat
// (history rendering + gamification counters) — UI never shows "spin".

export const onDecisionCreated = onDocumentCreated(
  "decisions/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data || data.mode !== "quickspin") return;
    const creatorUid: string = data.createdByUserId;
    if (!creatorUid) return;

    const partnerUid = await partnerUidOf(creatorUid);
    if (!partnerUid) return;

    const name = await firstNameOf(creatorUid);
    const result: string | undefined = data.result;
    const body = result ? `${name} picked: ${result}` : `${name} made a pick`;

    await sendPushToUser(partnerUid, "decide", body, {
      feature: "decide",
      screen: "/decide",
    });
  },
);

// ─── Habits ─────────────────────────────────────────────────────────────────

export const onHabitCreated = onDocumentCreated(
  "habits/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const creatorUid: string = data.createdBy;
    if (!creatorUid) return;
    const partnerUid = await partnerUidOf(creatorUid);
    if (!partnerUid) return;

    const name = await firstNameOf(creatorUid);
    const emoji: string = data.emoji ?? "";
    const title: string = data.title ?? "a new habit";
    const body = emoji
      ? `${name} added ${emoji} ${title}`
      : `${name} added ${title}`;

    await sendPushToUser(partnerUid, "habits", body, {
      feature: "habits",
      screen: "/habits",
    });
  },
);

export const onHabitCheckinCreated = onDocumentCreated(
  "habitCheckins/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const actingUid: string = data.uid;
    if (!actingUid) return;
    const partnerUid = await partnerUidOf(actingUid);
    if (!partnerUid) return;

    const habitId: string | undefined = data.habitId;
    let title = "a habit";
    let emoji = "";
    if (habitId) {
      const habitSnap = await admin.firestore().doc(`habits/${habitId}`).get();
      const h = habitSnap.data();
      if (h) {
        title = h.title ?? title;
        emoji = h.emoji ?? "";
      }
    }
    const name = await firstNameOf(actingUid);
    const body = emoji
      ? `${name} checked off ${emoji} ${title}`
      : `${name} checked off ${title}`;

    await sendPushToUser(partnerUid, "habits", body, {
      feature: "habits",
      screen: "/habits",
    });
  },
);

// ─── Awards: Ceremony lifecycle ─────────────────────────────────────────────

/**
 * Watches `ceremonies/{id}` updates and emits up to three classes of partner pings:
 *  • deliberation submitted — `picksSubmitted[uid]` flips false→true (only one partner notified)
 *  • resolution category locked — a new key appears in `winners`
 *  • ceremony completed — `status` transitions to `complete` (both partners notified)
 */
export const onCeremonyUpdated = onDocumentUpdated(
  "ceremonies/{docId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const coupleId: string = after.coupleId;
    if (!coupleId) return;
    const coupleSnap = await admin.firestore().doc(`couples/${coupleId}`).get();
    if (!coupleSnap.exists) return;
    const c = coupleSnap.data()!;
    const uids = [c.user1Id, c.user2Id].filter(Boolean) as string[];
    if (uids.length === 0) return;

    // 1) Deliberation submitted — picksSubmitted[uid] flipped to true
    const submittedBefore: Record<string, boolean> = before.picksSubmitted ?? {};
    const submittedAfter: Record<string, boolean> = after.picksSubmitted ?? {};
    for (const uid of uids) {
      const wasSubmitted = submittedBefore[uid] === true;
      const isSubmitted = submittedAfter[uid] === true;
      if (!wasSubmitted && isSubmitted) {
        const partnerUid = uids.find((u) => u !== uid);
        if (partnerUid) {
          const name = await firstNameOf(uid);
          await sendPushToUser(
            partnerUid,
            "awards",
            `${name} submitted their picks`,
            { feature: "awards", screen: "/awards" },
          );
        }
      }
    }

    // 2) Resolution category locked — a new key appeared in winners
    const winnersBefore: Record<string, unknown> = before.winners ?? {};
    const winnersAfter: Record<string, unknown> = after.winners ?? {};
    const newlyLocked = Object.keys(winnersAfter).filter(
      (k) => !(k in winnersBefore),
    );
    if (newlyLocked.length > 0) {
      const label =
        newlyLocked.length === 1
          ? "a category was locked in"
          : `${newlyLocked.length} categories were locked in`;
      for (const uid of uids) {
        await sendPushToUser(uid, "awards", label, {
          feature: "awards",
          screen: "/awards",
        });
      }
    }

    // 3) Ceremony completed — status transitioned to "complete"
    if (before.status !== "complete" && after.status === "complete") {
      for (const uid of uids) {
        await sendPushToUser(
          uid,
          "awards",
          "the ceremony is complete 🎉",
          { feature: "awards", screen: "/awards" },
        );
      }
    }
  },
);

// ─── Couple linked ──────────────────────────────────────────────────────────

/**
 * Couple-linked welcome ping. Detects the moment both `user1Id` and `user2Id`
 * become populated on the couple doc (covers both create-with-both-set and
 * create-then-link-later flows). Bypasses category prefs (uses `awards` channel
 * sparingly — fires at most once per couple).
 */
export const onCoupleWritten = onDocumentWritten(
  "couples/{coupleId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after) return;

    const wasLinked = !!(before?.user1Id && before?.user2Id);
    const isLinked = !!(after.user1Id && after.user2Id);
    if (wasLinked || !isLinked) return;

    const uids = [after.user1Id, after.user2Id] as string[];
    const names = await Promise.all(uids.map(firstNameOf));
    for (let i = 0; i < uids.length; i++) {
      const partnerName = names[1 - i];
      await sendPushToUser(
        uids[i],
        "humm",
        `you and ${partnerName} are linked — welcome 💞`,
        { feature: "awards", screen: "/" },
      );
    }
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
        feature: "weeklyChallenge",
        screen: "/",
      });
    }
  },
);

// ─── Daily reminders (scheduled) ────────────────────────────────────────────

export { dailyReminderTick };

// ─── One-shot diagnostic (TEMPORARY — remove after debugging) ───────────────

export { diagnosePush };
