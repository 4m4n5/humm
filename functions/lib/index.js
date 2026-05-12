"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnosePush = exports.dailyReminderTick = exports.onWeeklyChallengeCompleted = exports.onCoupleWritten = exports.onCeremonyUpdated = exports.onHabitCheckinCreated = exports.onHabitCreated = exports.onDecisionCreated = exports.onPickCreated = exports.onNominationCreated = exports.onReasonCreated = exports.onMoodEntryWritten = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const push_1 = require("./push");
const dailyReminders_1 = require("./dailyReminders");
Object.defineProperty(exports, "dailyReminderTick", { enumerable: true, get: function () { return dailyReminders_1.dailyReminderTick; } });
const diagnosePush_1 = require("./diagnosePush");
Object.defineProperty(exports, "diagnosePush", { enumerable: true, get: function () { return diagnosePush_1.diagnosePush; } });
/**
 * Firestore-triggered partner notifications via Expo Push API (`expo-server-sdk`).
 * Reads `users/{uid}.fcmToken` (Expo push token) and respects `notificationPreferences`.
 *
 * Deploy: `cd functions && npm run deploy`. Project must match client Firebase config.
 */
admin.initializeApp();
// ─── Helpers ────────────────────────────────────────────────────────────────
async function partnerUidOf(uid) {
    var _a, _b;
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    return (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.partnerId) !== null && _b !== void 0 ? _b : null;
}
function firstName(displayName) {
    return (displayName !== null && displayName !== void 0 ? displayName : "your partner").split(" ")[0] || "your partner";
}
async function firstNameOf(uid) {
    var _a;
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    return firstName((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.displayName);
}
// ─── Mood ───────────────────────────────────────────────────────────────────
exports.onMoodEntryWritten = (0, firestore_1.onDocumentWritten)("moodEntries/{docId}", async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const after = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after) === null || _b === void 0 ? void 0 : _b.data();
    const before = (_d = (_c = event.data) === null || _c === void 0 ? void 0 : _c.before) === null || _d === void 0 ? void 0 : _d.data();
    if (!after)
        return;
    const afterStickerId = (_e = after.current) === null || _e === void 0 ? void 0 : _e.stickerId;
    const beforeStickerId = (_f = before === null || before === void 0 ? void 0 : before.current) === null || _f === void 0 ? void 0 : _f.stickerId;
    if (afterStickerId === beforeStickerId)
        return;
    const actingUid = after.uid;
    const partnerUid = await partnerUidOf(actingUid);
    if (!partnerUid)
        return;
    const name = await firstNameOf(actingUid);
    const emoji = (_h = (_g = after.current) === null || _g === void 0 ? void 0 : _g.emoji) !== null && _h !== void 0 ? _h : "";
    await (0, push_1.sendPushToUser)(partnerUid, "mood", `${name} tapped ${emoji}`, {
        feature: "mood",
        screen: "/mood",
    });
});
// ─── Reasons ────────────────────────────────────────────────────────────────
exports.onReasonCreated = (0, firestore_1.onDocumentCreated)("reasons/{docId}", async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const authorUid = data.authorId;
    const partnerUid = await partnerUidOf(authorUid);
    if (!partnerUid)
        return;
    const name = await firstNameOf(authorUid);
    await (0, push_1.sendPushToUser)(partnerUid, "reasons", `${name} wrote a reason for you`, {
        feature: "reasons",
        screen: "/reasons",
    });
});
// ─── Awards: Nominations ────────────────────────────────────────────────────
exports.onNominationCreated = (0, firestore_1.onDocumentCreated)("nominations/{docId}", async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const submitterUid = data.submittedBy;
    const partnerUid = await partnerUidOf(submitterUid);
    if (!partnerUid)
        return;
    const name = await firstNameOf(submitterUid);
    await (0, push_1.sendPushToUser)(partnerUid, "awards", `${name} added a nomination`, {
        feature: "awards",
        screen: "/awards",
    });
});
// ─── Pick Together (live vote) ─────────────────────────────────────────────
//
// Firestore collection name `battles` is preserved for backwards compat with
// existing in-flight sessions; user-facing copy says "pick together".
exports.onPickCreated = (0, firestore_1.onDocumentCreated)("battles/{docId}", async (event) => {
    var _a, _b, _c;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const coupleId = data.coupleId;
    const coupleSnap = await admin.firestore().doc(`couples/${coupleId}`).get();
    if (!coupleSnap.exists)
        return;
    const c = coupleSnap.data();
    const uids = [c.user1Id, c.user2Id].filter(Boolean);
    for (const uid of uids) {
        const userSnap = await admin.firestore().doc(`users/${uid}`).get();
        const partnerUid = (_b = userSnap.data()) === null || _b === void 0 ? void 0 : _b.partnerId;
        if (!partnerUid)
            continue;
        const name = firstName((_c = userSnap.data()) === null || _c === void 0 ? void 0 : _c.displayName);
        await (0, push_1.sendPushToUser)(partnerUid, "decide", `${name} started a pick — join in`, {
            feature: "decide",
            screen: "/decide/pick-lobby",
        });
        break;
    }
});
// ─── Decisions (quickspin solo path) ───────────────────────────────────────
//
// `mode: 'quickspin'` literal is preserved on Decision docs for backwards compat
// (history rendering + gamification counters) — UI never shows "spin".
exports.onDecisionCreated = (0, firestore_1.onDocumentCreated)("decisions/{docId}", async (event) => {
    var _a;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data || data.mode !== "quickspin")
        return;
    const creatorUid = data.createdByUserId;
    if (!creatorUid)
        return;
    const partnerUid = await partnerUidOf(creatorUid);
    if (!partnerUid)
        return;
    const name = await firstNameOf(creatorUid);
    const result = data.result;
    const body = result ? `${name} picked: ${result}` : `${name} made a pick`;
    await (0, push_1.sendPushToUser)(partnerUid, "decide", body, {
        feature: "decide",
        screen: "/decide",
    });
});
// ─── Habits ─────────────────────────────────────────────────────────────────
exports.onHabitCreated = (0, firestore_1.onDocumentCreated)("habits/{docId}", async (event) => {
    var _a, _b, _c;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const creatorUid = data.createdBy;
    if (!creatorUid)
        return;
    const partnerUid = await partnerUidOf(creatorUid);
    if (!partnerUid)
        return;
    const name = await firstNameOf(creatorUid);
    const emoji = (_b = data.emoji) !== null && _b !== void 0 ? _b : "";
    const title = (_c = data.title) !== null && _c !== void 0 ? _c : "a new habit";
    const body = emoji
        ? `${name} added ${emoji} ${title}`
        : `${name} added ${title}`;
    await (0, push_1.sendPushToUser)(partnerUid, "habits", body, {
        feature: "habits",
        screen: "/habits",
    });
});
exports.onHabitCheckinCreated = (0, firestore_1.onDocumentCreated)("habitCheckins/{docId}", async (event) => {
    var _a, _b, _c;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const actingUid = data.uid;
    if (!actingUid)
        return;
    const partnerUid = await partnerUidOf(actingUid);
    if (!partnerUid)
        return;
    const habitId = data.habitId;
    let title = "a habit";
    let emoji = "";
    if (habitId) {
        const habitSnap = await admin.firestore().doc(`habits/${habitId}`).get();
        const h = habitSnap.data();
        if (h) {
            title = (_b = h.title) !== null && _b !== void 0 ? _b : title;
            emoji = (_c = h.emoji) !== null && _c !== void 0 ? _c : "";
        }
    }
    const name = await firstNameOf(actingUid);
    const body = emoji
        ? `${name} checked off ${emoji} ${title}`
        : `${name} checked off ${title}`;
    await (0, push_1.sendPushToUser)(partnerUid, "habits", body, {
        feature: "habits",
        screen: "/habits",
    });
});
// ─── Awards: Ceremony lifecycle ─────────────────────────────────────────────
/**
 * Watches `ceremonies/{id}` updates and emits up to three classes of partner pings:
 *  • deliberation submitted — `picksSubmitted[uid]` flips false→true (only one partner notified)
 *  • resolution category locked — a new key appears in `winners`
 *  • ceremony completed — `status` transitions to `complete` (both partners notified)
 */
exports.onCeremonyUpdated = (0, firestore_1.onDocumentUpdated)("ceremonies/{docId}", async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const before = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before) === null || _b === void 0 ? void 0 : _b.data();
    const after = (_d = (_c = event.data) === null || _c === void 0 ? void 0 : _c.after) === null || _d === void 0 ? void 0 : _d.data();
    if (!before || !after)
        return;
    const coupleId = after.coupleId;
    if (!coupleId)
        return;
    const coupleSnap = await admin.firestore().doc(`couples/${coupleId}`).get();
    if (!coupleSnap.exists)
        return;
    const c = coupleSnap.data();
    const uids = [c.user1Id, c.user2Id].filter(Boolean);
    if (uids.length === 0)
        return;
    // 1) Deliberation submitted — picksSubmitted[uid] flipped to true
    const submittedBefore = (_e = before.picksSubmitted) !== null && _e !== void 0 ? _e : {};
    const submittedAfter = (_f = after.picksSubmitted) !== null && _f !== void 0 ? _f : {};
    for (const uid of uids) {
        const wasSubmitted = submittedBefore[uid] === true;
        const isSubmitted = submittedAfter[uid] === true;
        if (!wasSubmitted && isSubmitted) {
            const partnerUid = uids.find((u) => u !== uid);
            if (partnerUid) {
                const name = await firstNameOf(uid);
                await (0, push_1.sendPushToUser)(partnerUid, "awards", `${name} submitted their picks`, { feature: "awards", screen: "/awards" });
            }
        }
    }
    // 2) Resolution category locked — a new key appeared in winners
    const winnersBefore = (_g = before.winners) !== null && _g !== void 0 ? _g : {};
    const winnersAfter = (_h = after.winners) !== null && _h !== void 0 ? _h : {};
    const newlyLocked = Object.keys(winnersAfter).filter((k) => !(k in winnersBefore));
    if (newlyLocked.length > 0) {
        const label = newlyLocked.length === 1
            ? "a category was locked in"
            : `${newlyLocked.length} categories were locked in`;
        for (const uid of uids) {
            await (0, push_1.sendPushToUser)(uid, "awards", label, {
                feature: "awards",
                screen: "/awards",
            });
        }
    }
    // 3) Ceremony completed — status transitioned to "complete"
    if (before.status !== "complete" && after.status === "complete") {
        for (const uid of uids) {
            await (0, push_1.sendPushToUser)(uid, "awards", "the ceremony is complete 🎉", { feature: "awards", screen: "/awards" });
        }
    }
});
// ─── Couple linked ──────────────────────────────────────────────────────────
/**
 * Couple-linked welcome ping. Detects the moment both `user1Id` and `user2Id`
 * become populated on the couple doc (covers both create-with-both-set and
 * create-then-link-later flows). Bypasses category prefs (uses `awards` channel
 * sparingly — fires at most once per couple).
 */
exports.onCoupleWritten = (0, firestore_1.onDocumentWritten)("couples/{coupleId}", async (event) => {
    var _a, _b, _c, _d;
    const before = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before) === null || _b === void 0 ? void 0 : _b.data();
    const after = (_d = (_c = event.data) === null || _c === void 0 ? void 0 : _c.after) === null || _d === void 0 ? void 0 : _d.data();
    if (!after)
        return;
    const wasLinked = !!((before === null || before === void 0 ? void 0 : before.user1Id) && (before === null || before === void 0 ? void 0 : before.user2Id));
    const isLinked = !!(after.user1Id && after.user2Id);
    if (wasLinked || !isLinked)
        return;
    const uids = [after.user1Id, after.user2Id];
    const names = await Promise.all(uids.map(firstNameOf));
    for (let i = 0; i < uids.length; i++) {
        const partnerName = names[1 - i];
        await (0, push_1.sendPushToUser)(uids[i], "humm", `you and ${partnerName} are linked — welcome 💞`, { feature: "awards", screen: "/" });
    }
});
// ─── Weekly challenge completed ─────────────────────────────────────────────
exports.onWeeklyChallengeCompleted = (0, firestore_1.onDocumentUpdated)("couples/{coupleId}", async (event) => {
    var _a, _b, _c, _d, _e, _f;
    const before = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before) === null || _b === void 0 ? void 0 : _b.data();
    const after = (_d = (_c = event.data) === null || _c === void 0 ? void 0 : _c.after) === null || _d === void 0 ? void 0 : _d.data();
    if (!before || !after)
        return;
    const xpBefore = ((_e = before.weeklyChallenge) === null || _e === void 0 ? void 0 : _e.xpGranted) === true;
    const xpAfter = ((_f = after.weeklyChallenge) === null || _f === void 0 ? void 0 : _f.xpGranted) === true;
    if (xpBefore || !xpAfter)
        return;
    const uids = [after.user1Id, after.user2Id].filter(Boolean);
    for (const uid of uids) {
        await (0, push_1.sendPushToUser)(uid, "challenge", "you both nailed this week's challenge 🎉", {
            feature: "weeklyChallenge",
            screen: "/",
        });
    }
});
//# sourceMappingURL=index.js.map