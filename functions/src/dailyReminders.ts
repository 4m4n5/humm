import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { sendPushToUser } from "./push";

/**
 * Daily mood + habit reminder scheduler.
 *
 * Runs every 30 minutes. For each user with `dailyReminders` configured, computes
 * the user's local time in their stored IANA tz, snaps to the current half-hour
 * slot, and fires a reminder push when:
 *   • the user has the relevant reminder enabled,
 *   • the current slot matches the user's chosen `localTime`, and
 *   • the user has not already logged that thing today (skip-if-logged).
 *
 * Half-hour granularity intentionally matches the cron cadence so each user
 * receives at most one mood + one habit reminder per day. The skip-if-logged
 * guard means an active user is never nagged.
 */

interface DailyReminderConfig {
  enabled: boolean;
  localTime: string;
}

interface DailyRemindersDoc {
  mood?: DailyReminderConfig;
  habits?: DailyReminderConfig;
  timezone?: string;
}

interface LocalTimeParts {
  hour: number;
  minute: number;
  dayKey: string;
}

function localTimeParts(now: Date, timezone: string): LocalTimeParts | null {
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
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    let hour = parseInt(get("hour"), 10);
    if (Number.isNaN(hour)) return null;
    if (hour === 24) hour = 0;
    const minute = parseInt(get("minute"), 10);
    if (Number.isNaN(minute)) return null;
    const year = get("year");
    const month = get("month");
    const day = get("day");
    if (!year || !month || !day) return null;
    return { hour, minute, dayKey: `${year}-${month}-${day}` };
  } catch {
    return null;
  }
}

/** Snap "HH:MM" to the half-hour slot it falls into. Returns slot start as "HH:MM". */
function snapToHalfHourSlot(hhmm: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
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

function currentSlotFromParts(p: LocalTimeParts): string {
  const total = p.hour * 60 + p.minute;
  const slot = Math.floor(total / 30) * 30;
  const sh = String(Math.floor(slot / 60)).padStart(2, "0");
  const sm = String(slot % 60).padStart(2, "0");
  return `${sh}:${sm}`;
}

async function userHasMoodToday(uid: string, dayKey: string): Promise<boolean> {
  const q = await admin
    .firestore()
    .collection("moodEntries")
    .where("uid", "==", uid)
    .where("dayKey", "==", dayKey)
    .limit(1)
    .get();
  return !q.empty;
}

async function userHasHabitCheckinToday(uid: string, dayKey: string): Promise<boolean> {
  const q = await admin
    .firestore()
    .collection("habitCheckins")
    .where("uid", "==", uid)
    .where("dayKey", "==", dayKey)
    .limit(1)
    .get();
  return !q.empty;
}

export const dailyReminderTick = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "Etc/UTC",
  },
  async () => {
    const now = new Date();

    // Pull every user that has any dailyReminders config. Firestore inequality
    // (`!= null`) is fine here — collection is small for couple-app scale.
    const snap = await admin
      .firestore()
      .collection("users")
      .where("dailyReminders", "!=", null)
      .get();

    const ops: Promise<unknown>[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const reminders: DailyRemindersDoc | undefined = data.dailyReminders;
      if (!reminders) continue;
      const tz = reminders.timezone || "UTC";
      const parts = localTimeParts(now, tz);
      if (!parts) continue;
      const currentSlot = currentSlotFromParts(parts);
      const uid = doc.id;

      const moodCfg = reminders.mood;
      if (moodCfg?.enabled) {
        const userSlot = snapToHalfHourSlot(moodCfg.localTime);
        if (userSlot && userSlot === currentSlot) {
          ops.push(
            (async () => {
              if (await userHasMoodToday(uid, parts.dayKey)) return;
              await sendPushToUser(
                uid,
                "mood check-in",
                "how are you feeling right now?",
                { feature: "reminders", screen: "/mood" },
              );
            })(),
          );
        }
      }

      const habitsCfg = reminders.habits;
      if (habitsCfg?.enabled) {
        const userSlot = snapToHalfHourSlot(habitsCfg.localTime);
        if (userSlot && userSlot === currentSlot) {
          ops.push(
            (async () => {
              if (await userHasHabitCheckinToday(uid, parts.dayKey)) return;
              await sendPushToUser(
                uid,
                "habits",
                "a quick check-in keeps the streak alive",
                { feature: "reminders", screen: "/habits" },
              );
            })(),
          );
        }
      }
    }

    await Promise.allSettled(ops);
  },
);
