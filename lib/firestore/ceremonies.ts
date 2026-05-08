import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AwardCategory, Ceremony, Couple, Nomination } from '@/types';
import {
  allEnabledCategoriesHaveNominations,
  allRequiredWinnersPresent,
  computeAgreedWinners,
  periodEndMs,
  validateDeliberationPicks,
} from '@/lib/awardsLogic';
import {
  enabledAwardCategoryIds,
  mergeCoupleAwardCategoryDefaults,
} from '@/lib/awardCategoryConfig';
import { recordAwardCategoryHistoryForCompletedCeremony } from '@/lib/firestore/awardCategories';
import { fetchNominationsForCeremony } from '@/lib/firestore/nominations';
import {
  ceremonyPeriodMatchesHalfYear,
  getCalendarHalfYearBounds,
} from '@/lib/ceremonyCalendar';

const coupleRef = (id: string) => doc(db, 'couples', id);

function coupleFromSnap(coupleId: string, data: Record<string, unknown>): Couple {
  return { ...data, id: coupleId } as Couple;
}

async function fetchCouple(coupleId: string): Promise<Couple | null> {
  const snap = await getDoc(coupleRef(coupleId));
  return snap.exists() ? coupleFromSnap(coupleId, snap.data()!) : null;
}

export const ceremoniesCol = () => collection(db, 'ceremonies');
export const ceremonyDoc = (id: string) => doc(db, 'ceremonies', id);

export async function createCeremony(coupleId: string): Promise<string> {
  const { start, end } = getCalendarHalfYearBounds(new Date());

  const ref = doc(ceremoniesCol());
  await setDoc(ref, {
    id: ref.id,
    coupleId,
    periodStart: Timestamp.fromDate(start),
    periodEnd: Timestamp.fromDate(end),
    status: 'nominating',
    ceremonyDate: null,
    winners: {},
    picksByUser: {},
    picksSubmitted: {},
    resolutionPicksByUser: {},
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCeremony(id: string): Promise<Ceremony | null> {
  const snap = await getDoc(ceremonyDoc(id));
  return snap.exists() ? (snap.data() as Ceremony) : null;
}

export function subscribeToCeremony(
  id: string,
  callback: (ceremony: Ceremony | null) => void,
) {
  return onSnapshot(
    ceremonyDoc(id),
    (snap) => {
      callback(snap.exists() ? (snap.data() as Ceremony) : null);
    },
    (err) => {
      console.warn('[ceremonies] subscribeToCeremony', id, err.code, err.message);
      callback(null);
    },
  );
}

/** Completed ceremonies for this couple, newest period end first. */
export function subscribeToPastCeremonies(
  coupleId: string,
  callback: (ceremonies: Ceremony[]) => void,
) {
  const q = query(ceremoniesCol(), where('coupleId', '==', coupleId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as Ceremony)
        .filter((c) => c.status === 'complete')
        .sort((a, b) => periodEndMs(b) - periodEndMs(a));
      callback(list);
    },
    (err) => {
      console.warn('[ceremonies] subscribeToPastCeremonies', err.code, err.message);
      callback([]);
    },
  );
}

/** Ensures the couple has a valid active ceremony document (for existing couples too). */
export async function ensureActiveCeremonyForCouple(coupleId: string): Promise<string> {
  const couple = await fetchCouple(coupleId);
  if (!couple) throw new Error('Couple not found');

  if (couple.activeCeremonyId) {
    const existing = await getCeremony(couple.activeCeremonyId);
    if (existing) {
      if (
        existing.status === 'nominating' &&
        !ceremonyPeriodMatchesHalfYear(existing, new Date())
      ) {
        const { start, end } = getCalendarHalfYearBounds(new Date());
        await updateDoc(ceremonyDoc(existing.id), {
          periodStart: Timestamp.fromDate(start),
          periodEnd: Timestamp.fromDate(end),
        });
      }
      return couple.activeCeremonyId;
    }
  }

  const ceremonyId = await createCeremony(coupleId);
  await updateDoc(coupleRef(coupleId), { activeCeremonyId: ceremonyId });
  return ceremonyId;
}

/**
 * Starts alignment (`deliberating`). Nomination coverage is checked only for **enabled** award
 * categories on the couple doc at call time — paused/disabled categories never need nominations
 * to start, and nominations stored under disabled ids are ignored for this gate.
 */
export async function startDeliberation(ceremonyId: string): Promise<void> {
  const snap = await getDoc(ceremonyDoc(ceremonyId));
  if (!snap.exists()) throw new Error('Ceremony not found');
  const c = snap.data() as Ceremony;
  if (c.status !== 'nominating') {
    throw new Error('alignment can only start during the nominating phase');
  }
  const coupleRaw = await fetchCouple(c.coupleId);
  if (!coupleRaw) throw new Error('Couple not found');
  const couple = mergeCoupleAwardCategoryDefaults(coupleRaw);
  const enabled = enabledAwardCategoryIds(couple.awardCategories ?? []);
  if (enabled.length === 0) {
    throw new Error('add at least one award category first');
  }
  const noms = await fetchNominationsForCeremony(c.coupleId, ceremonyId);
  if (!allEnabledCategoriesHaveNominations(noms, enabled)) {
    throw new Error(
      'add at least one nomination in every enabled category before starting alignment',
    );
  }
  await updateDoc(ceremonyDoc(ceremonyId), {
    status: 'deliberating',
    picksByUser: {},
    picksSubmitted: {},
    resolutionPicksByUser: {},
    winners: {},
  });
}

export async function submitDeliberationPicks(
  ceremonyId: string,
  uid: string,
  picks: Partial<Record<AwardCategory, string>>,
  nominations: Nomination[],
  uidA: string,
  uidB: string,
): Promise<void> {
  const preSnap = await getDoc(ceremonyDoc(ceremonyId));
  if (!preSnap.exists()) throw new Error('Ceremony not found');
  const pre = preSnap.data() as Ceremony;
  const coupleRaw = await fetchCouple(pre.coupleId);
  if (!coupleRaw) throw new Error('Couple not found');
  const couple = mergeCoupleAwardCategoryDefaults(coupleRaw);
  const enabled = enabledAwardCategoryIds(couple.awardCategories ?? []);
  const labels = Object.fromEntries((couple.awardCategories ?? []).map((r) => [r.id, r.label]));
  const err = validateDeliberationPicks(picks, nominations, enabled, labels);
  if (err) throw new Error(err);

  await runTransaction(db, async (tx) => {
    const ref = ceremonyDoc(ceremonyId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Ceremony not found');
    const c = snap.data() as Ceremony;
    if (c.status !== 'deliberating') throw new Error('Not in alignment');

    const picksByUser = { ...(c.picksByUser ?? {}), [uid]: picks };
    const picksSubmitted = { ...(c.picksSubmitted ?? {}), [uid]: true };

    const updatePayload: Record<string, unknown> = {
      picksByUser,
      picksSubmitted,
    };

    if (picksSubmitted[uidA] && picksSubmitted[uidB]) {
      const merged: Ceremony = { ...c, picksByUser, picksSubmitted };
      const agreed = computeAgreedWinners(merged, nominations, uidA, uidB, enabled);
      updatePayload.winners = { ...(c.winners ?? {}), ...agreed };
      updatePayload.status = 'voting';
      updatePayload.resolutionPicksByUser = {};
    }

    tx.update(ref, updatePayload);
  });
}

export async function submitResolutionPick(
  ceremonyId: string,
  uid: string,
  category: AwardCategory,
  nominationId: string,
  nominations: Nomination[],
  uidA: string,
  uidB: string,
): Promise<boolean> {
  const nom = nominations.find((n) => n.id === nominationId && n.category === category);
  if (!nom) throw new Error('that nomination is not in this category');

  return runTransaction(db, async (tx) => {
    const ref = ceremonyDoc(ceremonyId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Ceremony not found');
    const c = snap.data() as Ceremony;
    if (c.status !== 'voting') throw new Error('Not in resolution');

    const hadWinnerForCategory = !!(c.winners?.[category]);

    const res: Record<string, Partial<Record<AwardCategory, string>>> = {
      ...(c.resolutionPicksByUser ?? {}),
    };
    res[uid] = { ...res[uid], [category]: nominationId };

    const pickA = res[uidA]?.[category];
    const pickB = res[uidB]?.[category];

    const winners = { ...(c.winners ?? {}) };

    if (pickA && pickB && pickA === pickB) {
      const winnerNom = nominations.find((n) => n.id === pickA && n.category === category);
      if (winnerNom) {
        winners[category] = {
          nominationId: pickA,
          agreedBy: [uidA, uidB],
          nomineeId: winnerNom.nomineeId,
        };
      }
    }

    tx.update(ref, {
      resolutionPicksByUser: res,
      winners,
    });

    const nowWinner = winners[category];
    return !hadWinnerForCategory && !!nowWinner;
  });
}

/** Mark that a user has finished the cheer/reveal walkthrough. */
export async function markCheerCompleted(ceremonyId: string, uid: string): Promise<void> {
  await updateDoc(ceremonyDoc(ceremonyId), {
    [`cheerCompletedBy.${uid}`]: true,
  });
}

export async function completeCeremonyAndAdvance(
  coupleId: string,
  ceremonyId: string,
  nominations: Nomination[],
): Promise<void> {
  const snap = await getDoc(ceremonyDoc(ceremonyId));
  if (!snap.exists()) throw new Error('Ceremony not found');
  const c = snap.data() as Ceremony;
  const coupleRaw = await fetchCouple(coupleId);
  if (!coupleRaw) throw new Error('Couple not found');
  const couple = mergeCoupleAwardCategoryDefaults(coupleRaw);
  const enabled = enabledAwardCategoryIds(couple.awardCategories ?? []);
  if (!allRequiredWinnersPresent(nominations, c.winners ?? {}, enabled)) {
    throw new Error(
      'every enabled category with nominations needs a winner before you can wrap the season',
    );
  }
  const historyIds = [...new Set(nominations.map((n) => n.category))];
  await updateDoc(ceremonyDoc(ceremonyId), {
    status: 'complete',
    ceremonyDate: serverTimestamp(),
  });
  await recordAwardCategoryHistoryForCompletedCeremony(coupleId, historyIds);
  const newId = await createCeremony(coupleId);
  await updateDoc(coupleRef(coupleId), { activeCeremonyId: newId });
}
