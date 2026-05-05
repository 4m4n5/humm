import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as fbLimit,
  startAfter,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MoodEntry, MoodTimelinePoint, MoodStickerOption } from '@/types';
import { localDayKey, localWeekKey } from '@/lib/dateKeys';

/**
 * Couple mood stickers: one Firestore doc per user per **local** calendar day.
 *
 * - **Doc id:** `${coupleId}_${uid}_${dayKey}` — always use {@link moodEntryId}.
 * - **Reads:** today’s doc may not exist yet; security rules must allow `get` on that path for couple members (see `firestore.mood.rules`, `docs/FIRESTORE_MOOD_RULES.md`).
 * - **Feed query:** `where('coupleId')` + `orderBy('dayKey','desc')` — needs composite index in `firestore.indexes.json`; `allow list` must not over-filter vs query shape.
 * - **Server:** `functions/src/index.ts` notifies partner when `current.stickerId` changes.
 */

// Display contract: 1 anchor (latest) + 4 trail slots in MoodTodayHero.
// Older entries silently roll off once a 6th check-in is added.
const INTRADAY_CAP = 5;

export const moodEntriesCol = () => collection(db, 'moodEntries');

export function moodEntryId(coupleId: string, uid: string, dayKey: string): string {
  return `${coupleId}_${uid}_${dayKey}`;
}

export function moodEntryDoc(coupleId: string, uid: string, dayKey: string) {
  return doc(db, 'moodEntries', moodEntryId(coupleId, uid, dayKey));
}

/**
 * Create or update today's mood entry. Appends to the intraday timeline
 * (capped at INTRADAY_CAP) and updates the `current` pointer.
 * Returns `{ isFirstSaveToday }` so gamification knows whether to grant
 * first-log-today XP.
 */
export async function upsertMoodEntry(
  coupleId: string,
  uid: string,
  sticker: MoodStickerOption,
): Promise<{ isFirstSaveToday: boolean; entry: MoodEntry }> {
  const dayKey = localDayKey();
  const weekKey = localWeekKey();
  const docRef = moodEntryDoc(coupleId, uid, dayKey);
  const now = Timestamp.now();

  const point: MoodTimelinePoint = {
    stickerId: sticker.id,
    emoji: sticker.emoji,
    label: sticker.label,
    quadrant: sticker.quadrant,
    at: now,
  };

  const existing = await getDoc(docRef);

  if (!existing.exists()) {
    const entry: MoodEntry = {
      id: moodEntryId(coupleId, uid, dayKey),
      coupleId,
      uid,
      dayKey,
      weekKey,
      current: point,
      timeline: [point],
      changeCount: 1,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, entry);
    return { isFirstSaveToday: true, entry };
  }

  const data = existing.data() as MoodEntry;
  let timeline = [...data.timeline, point];
  if (timeline.length > INTRADAY_CAP) {
    timeline = timeline.slice(timeline.length - INTRADAY_CAP);
  }

  const updates: Partial<MoodEntry> = {
    current: point,
    timeline,
    changeCount: timeline.length,
    updatedAt: now,
  };
  await updateDoc(docRef, updates as Record<string, unknown>);

  return {
    isFirstSaveToday: false,
    entry: { ...data, ...updates, timeline } as MoodEntry,
  };
}

export function subscribeToMoodEntry(
  coupleId: string,
  uid: string,
  dayKey: string,
  callback: (entry: MoodEntry | null) => void,
) {
  return onSnapshot(
    moodEntryDoc(coupleId, uid, dayKey),
    (snap) => callback(snap.exists() ? (snap.data() as MoodEntry) : null),
    (err) => {
      console.warn('[mood] entry snapshot', err);
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'permission-denied'
      ) {
        console.warn('[mood] Publish moodEntries rules (docs/FIRESTORE_MOOD_RULES.md)');
      }
      callback(null);
    },
  );
}

export function subscribeToCoupleMoodFeed(
  coupleId: string,
  pageSize: number,
  callback: (entries: MoodEntry[]) => void,
) {
  const q = query(
    moodEntriesCol(),
    where('coupleId', '==', coupleId),
    orderBy('dayKey', 'desc'),
    fbLimit(pageSize),
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => d.data() as MoodEntry)),
    (err) => {
      console.warn('[mood] feed snapshot', err);
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'permission-denied'
      ) {
        console.warn('[mood] Publish moodEntries rules (docs/FIRESTORE_MOOD_RULES.md)');
      }
      callback([]);
    },
  );
}

export async function paginateCoupleMood(
  coupleId: string,
  beforeDayKey: string,
  pageSize: number,
): Promise<MoodEntry[]> {
  const q = query(
    moodEntriesCol(),
    where('coupleId', '==', coupleId),
    where('dayKey', '<', beforeDayKey),
    orderBy('dayKey', 'desc'),
    fbLimit(pageSize),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MoodEntry);
}
