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
exports.dailyReminderTick = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const push_1 = require("./push");
function localTimeParts(now, timezone) {
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).formatToParts(now);
        const get = (t) => { var _a, _b; return (_b = (_a = parts.find((p) => p.type === t)) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ""; };
        let hour = parseInt(get("hour"), 10);
        if (Number.isNaN(hour))
            return null;
        if (hour === 24)
            hour = 0;
        const minute = parseInt(get("minute"), 10);
        if (Number.isNaN(minute))
            return null;
        const year = get("year");
        const month = get("month");
        const day = get("day");
        if (!year || !month || !day)
            return null;
        return { hour, minute, dayKey: `${year}-${month}-${day}` };
    }
    catch (_a) {
        return null;
    }
}
/** Snap "HH:MM" to the half-hour slot it falls into. Returns slot start as "HH:MM". */
function snapToHalfHourSlot(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!m)
        return null;
    const h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (Number.isNaN(h) || Number.isNaN(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) {
        return null;
    }
    const total = h * 60 + mm;
    const slot = Math.floor(total / 30) * 30;
    const sh = String(Math.floor(slot / 60)).padStart(2, "0");
    const sm = String(slot % 60).padStart(2, "0");
    return `${sh}:${sm}`;
}
function currentSlotFromParts(p) {
    const total = p.hour * 60 + p.minute;
    const slot = Math.floor(total / 30) * 30;
    const sh = String(Math.floor(slot / 60)).padStart(2, "0");
    const sm = String(slot % 60).padStart(2, "0");
    return `${sh}:${sm}`;
}
async function userHasMoodToday(uid, dayKey) {
    const q = await admin
        .firestore()
        .collection("moodEntries")
        .where("uid", "==", uid)
        .where("dayKey", "==", dayKey)
        .limit(1)
        .get();
    return !q.empty;
}
async function userHasHabitCheckinToday(uid, dayKey) {
    const q = await admin
        .firestore()
        .collection("habitCheckins")
        .where("uid", "==", uid)
        .where("dayKey", "==", dayKey)
        .limit(1)
        .get();
    return !q.empty;
}
exports.dailyReminderTick = (0, scheduler_1.onSchedule)({
    schedule: "every 30 minutes",
    timeZone: "Etc/UTC",
}, async () => {
    const now = new Date();
    // Pull every user that has any dailyReminders config. Firestore inequality
    // (`!= null`) is fine here — collection is small for couple-app scale.
    const snap = await admin
        .firestore()
        .collection("users")
        .where("dailyReminders", "!=", null)
        .get();
    const ops = [];
    for (const doc of snap.docs) {
        const data = doc.data();
        const reminders = data.dailyReminders;
        if (!reminders)
            continue;
        const tz = reminders.timezone || "UTC";
        const parts = localTimeParts(now, tz);
        if (!parts)
            continue;
        const currentSlot = currentSlotFromParts(parts);
        const uid = doc.id;
        const moodCfg = reminders.mood;
        if (moodCfg === null || moodCfg === void 0 ? void 0 : moodCfg.enabled) {
            const userSlot = snapToHalfHourSlot(moodCfg.localTime);
            if (userSlot && userSlot === currentSlot) {
                ops.push((async () => {
                    if (await userHasMoodToday(uid, parts.dayKey))
                        return;
                    await (0, push_1.sendPushToUser)(uid, "mood check-in", "how are you feeling right now?", { feature: "reminders", screen: "/mood" });
                })());
            }
        }
        const habitsCfg = reminders.habits;
        if (habitsCfg === null || habitsCfg === void 0 ? void 0 : habitsCfg.enabled) {
            const userSlot = snapToHalfHourSlot(habitsCfg.localTime);
            if (userSlot && userSlot === currentSlot) {
                ops.push((async () => {
                    if (await userHasHabitCheckinToday(uid, parts.dayKey))
                        return;
                    await (0, push_1.sendPushToUser)(uid, "habits", "a quick check-in keeps the streak alive", { feature: "reminders", screen: "/habits" });
                })());
            }
        }
    }
    await Promise.allSettled(ops);
});
//# sourceMappingURL=dailyReminders.js.map