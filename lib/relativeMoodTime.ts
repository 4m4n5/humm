import { moodVoice } from '@/constants/hummVoice';
import { localDayKey, previousLocalDayKey } from '@/lib/dateKeys';

/**
 * Warm, lowercase “when was this set” phrasing for mood stickers.
 * Stays in the app’s Hum voice: “just now”, “an hour ago”, “yesterday”, etc.
 *
 * `nowMs` is injectable for tests / stable renders.
 */
export function relativeMoodTime(whenMs: number, nowMs: number = Date.now()): string {
  const delta = Math.max(0, nowMs - whenMs);

  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return moodVoice.relativeJustNow;
  if (minutes < 60) return moodVoice.relativeMinutes(minutes);

  const hours = Math.round(delta / 3_600_000);
  if (hours < 6) return moodVoice.relativeHours(hours);

  const whenKey = localDayKey(new Date(whenMs));
  const todayKey = localDayKey(new Date(nowMs));
  if (whenKey === todayKey) return moodVoice.relativeToday;
  if (previousLocalDayKey(todayKey) === whenKey) return moodVoice.relativeYesterday;

  const days = Math.max(2, Math.round(delta / 86_400_000));
  return moodVoice.relativeOlder(days);
}
