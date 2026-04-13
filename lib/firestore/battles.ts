import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  BattleSession,
  BattleMatchup,
  Couple,
  DecisionCategory,
  Decision,
} from '@/types';
import {
  buildBracket,
  nextPlayableMatchupIndex,
  resolveVotes,
  tournamentWinner,
  applyAutoResolutions,
  propagateWinnerToParent,
} from '@/lib/battleLogic';
import { saveDecision } from '@/lib/firestore/decisions';

export const battlesCol = () => collection(db, 'battles');
export const battleDoc = (id: string) => doc(db, 'battles', id);

const coupleRef = (coupleId: string) => doc(db, 'couples', coupleId);

export async function getBattle(id: string): Promise<BattleSession | null> {
  const snap = await getDoc(battleDoc(id));
  return snap.exists() ? (snap.data() as BattleSession) : null;
}

export function subscribeToBattle(
  id: string,
  callback: (battle: BattleSession | null) => void,
) {
  return onSnapshot(battleDoc(id), (snap) => {
    callback(snap.exists() ? (snap.data() as BattleSession) : null);
  });
}

function normalizeBattleFromSnap(data: BattleSession): BattleSession {
  const bracket = (data.bracket ?? []).map((m) => ({
    ...m,
    votesByUser: m.votesByUser ?? {},
    revoteRound: m.revoteRound ?? 0,
    decidedByCoinFlip: m.decidedByCoinFlip ?? false,
  }));
  return {
    ...data,
    options: data.options ?? [],
    optionsByUser: data.optionsByUser ?? {},
    readyByUser: data.readyByUser ?? {},
    bracket,
    currentMatchupIndex: data.currentMatchupIndex ?? 0,
    winner: data.winner ?? null,
  };
}

/**
 * Start a new battle session. Fails if an in-progress (collecting/battling) battle exists.
 */
export async function createBattle(
  coupleId: string,
  category: DecisionCategory,
): Promise<string> {
  const cref = coupleRef(coupleId);
  const coupleSnap = await getDoc(cref);
  if (!coupleSnap.exists()) throw new Error('Couple not found');
  const couple = coupleSnap.data() as Couple;
  const existingId = couple.activeBattleId ?? null;
  if (existingId) {
    const existing = await getBattle(existingId);
    if (!existing) {
      await updateDoc(cref, { activeBattleId: null });
    } else if (existing.status === 'collecting' || existing.status === 'battling') {
      throw new Error('a battle is already in progress');
    } else if (existing.status === 'complete') {
      throw new Error('save or rematch from your last battle before starting a new one');
    }
  }

  const ref = doc(battlesCol());
  const session: Omit<BattleSession, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    id: ref.id,
    coupleId,
    category,
    status: 'collecting',
    options: [],
    optionsByUser: {},
    readyByUser: {},
    bracket: [],
    currentMatchupIndex: 0,
    winner: null,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, session);
  await updateDoc(cref, { activeBattleId: ref.id });
  return ref.id;
}

export async function addBattleOption(
  battleId: string,
  uid: string,
  label: string,
): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;

  await runTransaction(db, async (tx) => {
    const ref = battleDoc(battleId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Battle not found');
    const battle = normalizeBattleFromSnap(snap.data() as BattleSession);
    if (battle.status !== 'collecting') throw new Error('options are locked');

    const lower = trimmed.toLowerCase();
    const dup = battle.options.some((o) => o.toLowerCase() === lower);
    if (dup) return;

    const options = [...battle.options, trimmed];
    const optionsByUser = { ...battle.optionsByUser };
    optionsByUser[uid] = [...(optionsByUser[uid] ?? []), trimmed];

    tx.update(ref, { options, optionsByUser });
  });
}

export async function removeBattleOption(
  battleId: string,
  uid: string,
  label: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = battleDoc(battleId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Battle not found');
    const battle = normalizeBattleFromSnap(snap.data() as BattleSession);
    if (battle.status !== 'collecting') throw new Error('options are locked');

    const mine = battle.optionsByUser[uid] ?? [];
    if (!mine.includes(label)) throw new Error('you can only remove your own options');

    const options = battle.options.filter((o) => o !== label);
    const optionsByUser = { ...battle.optionsByUser, [uid]: mine.filter((o) => o !== label) };

    tx.update(ref, { options, optionsByUser });
  });
}

export async function readyUp(
  battleId: string,
  uid: string,
  uidA: string,
  uidB: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = battleDoc(battleId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Battle not found');
    const battle = normalizeBattleFromSnap(snap.data() as BattleSession);
    if (battle.status !== 'collecting') throw new Error('already started');
    if (battle.options.length < 4) throw new Error('add at least 4 options first');

    const readyByUser = { ...battle.readyByUser, [uid]: true };
    const update: Record<string, unknown> = { readyByUser };

    if (readyByUser[uidA] && readyByUser[uidB]) {
      const { bracket } = buildBracket(battle.options);
      const bracketSize = bracket.length + 1;
      applyAutoResolutions(bracket, bracketSize);
      const nextIdx = nextPlayableMatchupIndex(bracket);
      update.status = 'battling';
      update.bracket = bracket;
      update.currentMatchupIndex = nextIdx === -1 ? 0 : nextIdx;
      update.readyByUser = readyByUser;
    }

    tx.update(ref, update);
  });
}

function cloneBracket(bracket: BattleMatchup[]): BattleMatchup[] {
  return bracket.map((m) => ({
    ...m,
    votesByUser: { ...m.votesByUser },
  }));
}

export async function submitMatchupVote(
  battleId: string,
  uid: string,
  matchupIdx: number,
  choice: string,
  uidA: string,
  uidB: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = battleDoc(battleId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Battle not found');
    const battle = normalizeBattleFromSnap(snap.data() as BattleSession);
    if (battle.status !== 'battling') throw new Error('not in battle');
    if (battle.currentMatchupIndex !== matchupIdx) {
      throw new Error('not the active matchup');
    }

    const bracket = cloneBracket(battle.bracket);
    const m = bracket[matchupIdx];
    if (!m) throw new Error('invalid matchup');

    const pick = choice.trim();
    const valid = new Set<string>();
    if (m.optionA.trim()) valid.add(m.optionA);
    if (m.optionB !== null && m.optionB.trim()) valid.add(m.optionB);
    if (!valid.has(pick)) throw new Error('pick one of the two options');

    const votesByUser = { ...m.votesByUser, [uid]: pick };
    m.votesByUser = votesByUser;

    const va = votesByUser[uidA];
    const vb = votesByUser[uidB];
    if (!va || !vb) {
      bracket[matchupIdx] = m;
      tx.update(ref, { bracket });
      return;
    }

    const res = resolveVotes(m, va, vb, m.revoteRound);
    if (res.type === 'revote') {
      m.votesByUser = {};
      m.revoteRound = (m.revoteRound ?? 0) + 1;
      bracket[matchupIdx] = m;
      tx.update(ref, { bracket });
      return;
    }

    m.winner = res.winner;
    m.votesByUser = {};
    m.revoteRound = 0;
    m.decidedByCoinFlip = res.type === 'coin';
    bracket[matchupIdx] = m;

    const bracketSize = bracket.length + 1;
    propagateWinnerToParent(bracket, bracketSize, m.round, m.position, res.winner);
    applyAutoResolutions(bracket, bracketSize);

    let tw = tournamentWinner(bracket);
    let nextIdx = nextPlayableMatchupIndex(bracket);
    if (!tw && nextIdx === -1) {
      applyAutoResolutions(bracket, bracketSize);
      tw = tournamentWinner(bracket);
      nextIdx = nextPlayableMatchupIndex(bracket);
    }

    if (tw) {
      tx.update(ref, {
        bracket,
        status: 'complete',
        winner: tw,
        currentMatchupIndex: matchupIdx,
      });
    } else {
      tx.update(ref, {
        bracket,
        currentMatchupIndex: nextIdx === -1 ? matchupIdx : nextIdx,
      });
    }
  });
}

export async function cancelBattle(coupleId: string, battleId: string): Promise<void> {
  await deleteDoc(battleDoc(battleId));
  await updateDoc(coupleRef(coupleId), { activeBattleId: null });
}

/**
 * Save outcome to decision history, remove battle doc, clear couple.activeBattleId.
 */
export async function completeBattleDecision(
  coupleId: string,
  battle: BattleSession,
): Promise<string> {
  if (!battle.winner) throw new Error('no winner to save');
  const decision: Omit<Decision, 'id' | 'createdAt'> = {
    coupleId,
    category: battle.category,
    mode: 'battle',
    options: battle.options,
    result: battle.winner,
    vetoedOptions: [],
  };
  const id = await saveDecision(decision);
  await deleteDoc(battleDoc(battle.id));
  await updateDoc(coupleRef(coupleId), { activeBattleId: null });
  return id;
}

/**
 * Skip saving; start a fresh collecting session (same as new battle for category).
 */
export async function rematchBattle(
  coupleId: string,
  oldBattleId: string,
  category: DecisionCategory,
): Promise<string> {
  await deleteDoc(battleDoc(oldBattleId));
  await updateDoc(coupleRef(coupleId), { activeBattleId: null });
  return createBattle(coupleId, category);
}
