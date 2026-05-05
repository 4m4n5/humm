import {
  deleteField,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Couple } from '@/types';
import { coupleDoc } from '@/lib/firestore/couples';
import { habitsCol, habitCheckinsCol } from '@/lib/firestore/habits';

const BATCH_MAX = 450;

export class LegacyPurgeError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LegacyPurgeError';
  }
}

/**
 * Hard cutover: delete all habits + habitCheckins for the couple and bump `habitsModelVersion`
 * to 2, clearing v1 streak fields. No-op if already on v2.
 */
export async function purgeLegacyHabitsIfNeeded(coupleId: string): Promise<'already' | 'purged' | 'partial'> {
  const cref = coupleDoc(coupleId);
  const snap = await getDoc(cref);
  if (!snap.exists()) return 'already';
  const c = snap.data() as Couple;
  if (c.habitsModelVersion === 2) return 'already';

  try {
    for (;;) {
      const qy = query(habitsCol(), where('coupleId', '==', coupleId), limit(BATCH_MAX));
      const s = await getDocs(qy);
      if (s.empty) break;
      const batch = writeBatch(db);
      for (const d of s.docs) batch.delete(d.ref);
      await batch.commit();
      if (s.size < BATCH_MAX) break;
    }

    for (;;) {
      const qy = query(habitCheckinsCol(), where('coupleId', '==', coupleId), limit(BATCH_MAX));
      const s = await getDocs(qy);
      if (s.empty) break;
      const batch = writeBatch(db);
      for (const d of s.docs) batch.delete(d.ref);
      await batch.commit();
      if (s.size < BATCH_MAX) break;
    }

    const verifyHabits = await getDocs(query(habitsCol(), where('coupleId', '==', coupleId), limit(1)));
    const verifyCheckins = await getDocs(query(habitCheckinsCol(), where('coupleId', '==', coupleId), limit(1)));
    const partial = !verifyHabits.empty || !verifyCheckins.empty;

    await updateDoc(cref, {
      habitsModelVersion: 2,
      habitStreaks: deleteField(),
      jointHabitStreak: deleteField(),
      lastJointHabitDayKey: deleteField(),
    });

    return partial ? 'partial' : 'purged';
  } catch (e) {
    throw new LegacyPurgeError('Legacy habits purge failed', e);
  }
}
