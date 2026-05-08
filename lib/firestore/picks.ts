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
  PickSession,
  PickMatchup,
  PickPair,
  Couple,
  DecisionCategory,
  Decision,
  DecisionOption,
} from '@/types';
import {
  buildBracket,
  nextPlayableMatchupIndex,
  resolveVotes,
  tournamentWinner,
  applyAutoResolutions,
  propagateWinnerToParent,
} from '@/lib/pickLogic';
import {
  generateAllPairs,
  shuffledPairOrder,
  hasUserCompletedAllPairs,
  userPairProgress,
  computeCopelandScores,
  copelandRanking,
  copelandWinner,
  swissTournamentConfig,
  buildFirstSwissRoundPairs,
  buildNextSwissRoundPairs,
  hasUserCompletedRound,
} from '@/lib/copelandRanking';
import { shuffle } from '@/lib/pickLogic';
import { saveDecision, getOptions, saveOptions } from '@/lib/firestore/decisions';

// Collection name + couple field stay as `battles` / `activeBattleId` for backwards
// compatibility with existing data. UI never surfaces those names.
export const picksCol = () => collection(db, 'battles');
export const pickDoc = (id: string) => doc(db, 'battles', id);

const coupleRef = (coupleId: string) => doc(db, 'couples', coupleId);

export async function getPick(id: string): Promise<PickSession | null> {
  const snap = await getDoc(pickDoc(id));
  return snap.exists() ? (snap.data() as PickSession) : null;
}

export function subscribeToPick(
  id: string,
  callback: (pick: PickSession | null) => void,
) {
  return onSnapshot(
    pickDoc(id),
    (snap) => {
      callback(snap.exists() ? (snap.data() as PickSession) : null);
    },
    (err) => {
      console.warn('[picks] subscribeToPick', id, err.code, err.message);
      callback(null);
    },
  );
}

function normalizePickFromSnap(data: PickSession): PickSession {
  const bracket = (data.bracket ?? []).map((m) => ({
    ...m,
    votesByUser: m.votesByUser ?? {},
    revoteRound: m.revoteRound ?? 0,
    decidedByCoinFlip: m.decidedByCoinFlip ?? false,
  }));
  const pairs = data.pairs?.map((p) => ({
    ...p,
    round: typeof p.round === 'number' ? p.round : 0,
    voteByUser: p.voteByUser ?? {},
  }));
  return {
    ...data,
    options: data.options ?? [],
    optionsByUser: data.optionsByUser ?? {},
    readyByUser: data.readyByUser ?? {},
    bracket,
    currentMatchupIndex: data.currentMatchupIndex ?? 0,
    winner: data.winner ?? null,
    ...(pairs ? { pairs } : {}),
  };
}

/**
 * Helper: is this an in-flight vote-mode (Copeland) session?
 * Returns true when pairs are present (new sessions). Old bracket-mode
 * sessions still in flight have an empty/missing `pairs` field and a
 * non-empty `bracket`; those are handled by the legacy `submitMatchupVote`.
 */
export function isVoteModeSession(pick: PickSession): boolean {
  return Array.isArray(pick.pairs) && pick.pairs.length > 0;
}

/**
 * Start a new pick session. Fails if an in-progress (collecting/battling) session exists.
 *
 * If `creatorUid` is provided, the session pool is auto-seeded with the labels
 * from the couple's persistent `decisionOptions` library for this category.
 * Seeded labels are attributed to `creatorUid` so they show up under "you" for
 * the creator and can be removed by them like any other contribution.
 */
export async function createPick(
  coupleId: string,
  category: DecisionCategory,
  creatorUid?: string,
): Promise<string> {
  const cref = coupleRef(coupleId);
  const coupleSnap = await getDoc(cref);
  if (!coupleSnap.exists()) throw new Error('couple not found');
  const couple = coupleSnap.data() as Couple;
  const existingId = couple.activeBattleId ?? null;
  if (existingId) {
    const existing = await getPick(existingId);
    if (!existing) {
      await updateDoc(cref, { activeBattleId: null });
    } else if (existing.status === 'collecting' || existing.status === 'battling') {
      throw new Error('a pick is already in progress');
    } else if (existing.status === 'complete') {
      throw new Error('save or start over from your last pick first');
    }
  }

  // Seed from the per-category library. Best-effort: empty seed if the read fails.
  let seedLabels: string[] = [];
  if (creatorUid) {
    try {
      const lib = await getOptions(coupleId);
      const seen = new Set<string>();
      seedLabels = (lib[category] ?? [])
        .map((o) => o.label.trim())
        .filter((label) => {
          if (!label) return false;
          const key = label.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    } catch (e) {
      console.warn('[picks] seed from library failed', e);
    }
  }

  const ref = doc(picksCol());
  const session: Omit<PickSession, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    id: ref.id,
    coupleId,
    category,
    status: 'collecting',
    options: seedLabels,
    optionsByUser: creatorUid && seedLabels.length > 0 ? { [creatorUid]: [...seedLabels] } : {},
    readyByUser: {},
    pairs: [],
    pairOrderByUser: {},
    pairProgressByUser: {},
    currentRound: 0,
    roundsTotal: 0,
    bracket: [],
    currentMatchupIndex: 0,
    winner: null,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, session);
  await updateDoc(cref, { activeBattleId: ref.id });
  return ref.id;
}

/**
 * Append a label to the per-category library if it's not already there. Fire-and-forget;
 * never throws. Used by the lobby to grow the long-lived library when a partner
 * adds a new option to the session pool.
 */
export async function appendLabelToLibrary(
  coupleId: string,
  category: DecisionCategory,
  label: string,
): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;
  try {
    const current = await getOptions(coupleId);
    const existing = current[category] ?? [];
    const lower = trimmed.toLowerCase();
    if (existing.some((o) => o.label.toLowerCase() === lower)) return;
    const next = [
      ...existing,
      {
        id: Math.random().toString(36).substring(2, 10),
        label: trimmed,
        tags: [],
        lastPickedAt: null,
      },
    ];
    await saveOptions(coupleId, category, next);
  } catch (e) {
    console.warn('[picks] appendLabelToLibrary', e);
  }
}

export async function addPickOption(
  pickId: string,
  uid: string,
  label: string,
): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;

  await runTransaction(db, async (tx) => {
    const ref = pickDoc(pickId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('pick not found');
    const pick = normalizePickFromSnap(snap.data() as PickSession);
    if (pick.status !== 'collecting') throw new Error('options are locked');

    const lower = trimmed.toLowerCase();
    const dup = pick.options.some((o) => o.toLowerCase() === lower);
    if (dup) return;

    const options = [...pick.options, trimmed];
    const optionsByUser = { ...pick.optionsByUser };
    optionsByUser[uid] = [...(optionsByUser[uid] ?? []), trimmed];

    tx.update(ref, { options, optionsByUser });
  });
}

export async function removePickOption(
  pickId: string,
  uid: string,
  label: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = pickDoc(pickId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('pick not found');
    const pick = normalizePickFromSnap(snap.data() as PickSession);
    if (pick.status !== 'collecting') throw new Error('options are locked');

    const mine = pick.optionsByUser[uid] ?? [];
    if (!mine.includes(label)) throw new Error('you can only remove your own options');

    const options = pick.options.filter((o) => o !== label);
    const optionsByUser = { ...pick.optionsByUser, [uid]: mine.filter((o) => o !== label) };

    tx.update(ref, { options, optionsByUser });
  });
}

/**
 * Start the vote. Either partner can call this once 4+ options are in the
 * pool. The system picks between two pairing modes:
 *
 *  • **Full round-robin** (N ≤ 7): all C(N,2) pairs upfront, no sync
 *    barrier — partners advance independently. Same UX as before.
 *  • **Swiss tournament** (N ≥ 8): only round 1 (⌊N/2⌋ random covering
 *    pairs) is generated now. After both partners finish round k, the
 *    next round of Swiss-paired comparisons is appended on the fly. Total
 *    rounds = ceil(log₂N). For N=11 this is 4 × 5 = 20 pairs (vs 55 RR).
 *
 * Idempotent: if already battling, no-op.
 */
export async function readyUp(
  pickId: string,
  uid: string,
  uidA: string,
  uidB: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = pickDoc(pickId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('pick not found');
    const pick = normalizePickFromSnap(snap.data() as PickSession);
    if (pick.status === 'battling') return;
    if (pick.status !== 'collecting') throw new Error('already started');
    if (pick.options.length < 4) throw new Error('add at least 4 options first');

    const cfg = swissTournamentConfig(pick.options.length);
    const pairs: PickPair[] = cfg.useFullRoundRobin
      ? generateAllPairs(pick.options)
      : buildFirstSwissRoundPairs(pick.options, 0);

    const orderIndices = pairs.map((p) => p.index);
    const pairOrderByUser: Record<string, number[]> = {
      [uidA]: shuffle([...orderIndices]),
      [uidB]: shuffle([...orderIndices]),
    };
    const pairProgressByUser: Record<string, number> = {
      [uidA]: 0,
      [uidB]: 0,
    };

    tx.update(ref, {
      status: 'battling',
      pairs,
      pairOrderByUser,
      pairProgressByUser,
      currentRound: 0,
      roundsTotal: cfg.totalRounds,
      // Mark the initiator's intent (kept around for analytics).
      readyByUser: { ...pick.readyByUser, [uid]: true },
      // Legacy bracket fields cleared so old UI code doesn't get confused.
      bracket: [],
      currentMatchupIndex: 0,
    });
  });
}

/**
 * Submit one partner's vote on one pair.
 *
 * Two modes (decided at session start; encoded in `currentRound`/`roundsTotal`):
 *
 *  • **Full RR** (`roundsTotal === 1`): partners advance independently
 *    through every pair. Session completes when both have voted on all.
 *
 *  • **Swiss** (`roundsTotal > 1`): partners vote only on the pairs
 *    scheduled in the current round. As soon as BOTH finish that round,
 *    we either (a) generate the next round's pairs by Swiss-pairing the
 *    current Copeland leader-board, or (b) finalize the session if it was
 *    the last round.
 */
export async function submitPairVote(
  pickId: string,
  uid: string,
  pairIndex: number,
  choice: string,
  uidA: string,
  uidB: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = pickDoc(pickId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('pick not found');
    const pick = normalizePickFromSnap(snap.data() as PickSession);
    if (pick.status !== 'battling') throw new Error('not in voting');
    if (!pick.pairs || pick.pairs.length === 0) {
      throw new Error('no pairs to vote on');
    }
    const pair = pick.pairs.find((p) => p.index === pairIndex);
    if (!pair) throw new Error('invalid pair');

    const guess = choice.trim();
    if (guess !== pair.optionA && guess !== pair.optionB) {
      throw new Error('pick one of the two options');
    }

    const pairs: PickPair[] = pick.pairs.map((p) =>
      p.index === pairIndex
        ? { ...p, voteByUser: { ...p.voteByUser, [uid]: guess } }
        : { ...p, voteByUser: { ...p.voteByUser } },
    );

    const pairProgressByUser = { ...(pick.pairProgressByUser ?? {}) };
    pairProgressByUser[uid] = userPairProgress(pairs, uid);

    const currentRound = pick.currentRound ?? 0;
    const roundsTotal = pick.roundsTotal ?? 1;

    const update: Record<string, unknown> = {
      pairs,
      pairProgressByUser,
    };

    // Did we just close out the current round on both sides?
    const roundAOK = hasUserCompletedRound(pairs, currentRound, uidA);
    const roundBOK = hasUserCompletedRound(pairs, currentRound, uidB);

    if (roundAOK && roundBOK) {
      const isLastRound = currentRound + 1 >= roundsTotal;

      if (isLastRound) {
        // Final tally: also requires both to be done with everything
        // (true for Swiss by construction; for full-RR, equivalent).
        const allA = hasUserCompletedAllPairs(pairs, uidA);
        const allB = hasUserCompletedAllPairs(pairs, uidB);
        if (allA && allB) {
          const scores = computeCopelandScores(pick.options, pairs);
          const ranking = copelandRanking(pick.options, pairs, scores);
          const winner = copelandWinner(ranking);
          update.scores = scores;
          update.ranking = ranking;
          update.winner = winner;
          update.status = 'complete';
        }
      } else {
        // Generate next Swiss round on top of the running scoreboard.
        const scoresSoFar = computeCopelandScores(pick.options, pairs);
        const nextRound = currentRound + 1;
        const newPairs = buildNextSwissRoundPairs(
          pick.options,
          pairs,
          scoresSoFar,
          nextRound,
          pairs.length, // start indices right after the existing tail
        );

        if (newPairs.length === 0) {
          // Defensive: every option already paired with every other.
          // Treat as final and tally.
          const ranking = copelandRanking(pick.options, pairs, scoresSoFar);
          update.scores = scoresSoFar;
          update.ranking = ranking;
          update.winner = copelandWinner(ranking);
          update.status = 'complete';
        } else {
          const allPairs = [...pairs, ...newPairs];
          const newIdxs = newPairs.map((p) => p.index);
          const orderA = pick.pairOrderByUser?.[uidA] ?? [];
          const orderB = pick.pairOrderByUser?.[uidB] ?? [];

          update.pairs = allPairs;
          update.currentRound = nextRound;
          update.pairOrderByUser = {
            ...(pick.pairOrderByUser ?? {}),
            [uidA]: [...orderA, ...shuffle([...newIdxs])],
            [uidB]: [...orderB, ...shuffle([...newIdxs])],
          };
        }
      }
    }

    tx.update(ref, update);
  });
}

function cloneBracket(bracket: PickMatchup[]): PickMatchup[] {
  return bracket.map((m) => ({
    ...m,
    votesByUser: { ...m.votesByUser },
  }));
}

export async function submitMatchupVote(
  pickId: string,
  uid: string,
  matchupIdx: number,
  choice: string,
  uidA: string,
  uidB: string,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = pickDoc(pickId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('pick not found');
    const pick = normalizePickFromSnap(snap.data() as PickSession);
    if (pick.status !== 'battling') throw new Error('not in voting');
    if (pick.currentMatchupIndex !== matchupIdx) {
      throw new Error('not the active matchup');
    }

    const bracket = cloneBracket(pick.bracket);
    const m = bracket[matchupIdx];
    if (!m) throw new Error('invalid matchup');

    const guess = choice.trim();
    const valid = new Set<string>();
    if (m.optionA.trim()) valid.add(m.optionA);
    if (m.optionB !== null && m.optionB.trim()) valid.add(m.optionB);
    if (!valid.has(guess)) throw new Error('pick one of the two options');

    const votesByUser = { ...m.votesByUser, [uid]: guess };
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

export async function cancelPick(coupleId: string, pickId: string): Promise<void> {
  await deleteDoc(pickDoc(pickId));
  await updateDoc(coupleRef(coupleId), { activeBattleId: null });
}

/**
 * Save outcome to decision history, remove pick doc, clear couple.activeBattleId.
 *
 * NOTE: `mode` literal is preserved as `'battle'` for the live-vote path and
 * `'quickspin'` for the solo path, so existing history rows + gamification
 * counters keep rendering. The user-facing label is "pick together" everywhere.
 */
export async function completePickDecision(
  coupleId: string,
  pick: PickSession,
  opts?: { createdByUserId?: string },
): Promise<string> {
  if (!pick.winner) throw new Error('no result to save');
  const isSolo = !!pick.pickedSoloByUserId;
  const decision: Omit<Decision, 'id' | 'createdAt'> = {
    coupleId,
    category: pick.category,
    mode: isSolo ? 'quickspin' : 'battle',
    options: pick.options,
    result: pick.winner,
    vetoedOptions: [],
    ...(opts?.createdByUserId
      ? { createdByUserId: opts.createdByUserId }
      : pick.pickedSoloByUserId
        ? { createdByUserId: pick.pickedSoloByUserId }
        : {}),
  };
  const id = await saveDecision(decision);
  await deleteDoc(pickDoc(pick.id));
  await updateDoc(coupleRef(coupleId), { activeBattleId: null });
  return id;
}

/**
 * Solo "pick for us" path. Both partners must already have contributed to the
 * pool (lobby enforces 4+ options). Picks one winner using a recency-weighted
 * random favoring options not picked recently — same algorithm Quick Spin used.
 *
 * Marks the session `complete` with `pickedSoloByUserId` set; the result screen
 * detects this and renders the solo layout. Save flows through `completePickDecision`
 * which writes a Decision doc with `mode: 'quickspin'`.
 */
export async function solvePickFromPool(
  pickId: string,
  pickerUid: string,
  recentOptionsLib?: Record<DecisionCategory, DecisionOption[]>,
): Promise<{ winner: string }> {
  return runTransaction(db, async (tx) => {
    const ref = pickDoc(pickId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('pick not found');
    const pick = normalizePickFromSnap(snap.data() as PickSession);
    if (pick.status !== 'collecting') throw new Error('options are locked');
    if (pick.options.length < 2) throw new Error('add at least 2 options first');

    const winner = pickRecencyWeighted(pick.options, recentOptionsLib?.[pick.category] ?? []);
    tx.update(ref, {
      status: 'complete',
      winner,
      bracket: [],
      currentMatchupIndex: 0,
      pairs: [],
      pairOrderByUser: {},
      pairProgressByUser: {},
      currentRound: 0,
      roundsTotal: 0,
      pickedSoloByUserId: pickerUid,
    });
    return { winner };
  });
}

/**
 * Recency-weighted random over a labels list. If we have a `DecisionOption[]`
 * library for this category, options not picked in the last 4 weeks get 3× weight;
 * unmatched labels (and everything when the library is empty) get 1× weight.
 */
function pickRecencyWeighted(
  labels: string[],
  library: DecisionOption[],
): string {
  if (labels.length === 0) throw new Error('no options to pick from');
  const now = Date.now();
  const fourWeeksMs = 4 * 7 * 24 * 60 * 60 * 1000;
  const byLabel = new Map<string, DecisionOption>();
  for (const o of library) byLabel.set(o.label.toLowerCase(), o);

  const weighted: string[] = [];
  for (const label of labels) {
    const entry = byLabel.get(label.toLowerCase());
    const lastPicked = entry?.lastPickedAt?.toMillis?.() ?? 0;
    const isRecent = lastPicked > 0 && now - lastPicked < fourWeeksMs;
    const weight = isRecent ? 1 : 3;
    for (let i = 0; i < weight; i++) weighted.push(label);
  }
  const idx = Math.floor(Math.random() * weighted.length);
  return weighted[idx]!;
}

/**
 * Skip saving; start a fresh collecting session (same as new pick for category).
 * If `creatorUid` is supplied, the new session is seeded from the library.
 */
export async function startOverPick(
  coupleId: string,
  oldPickId: string,
  category: DecisionCategory,
  creatorUid?: string,
): Promise<string> {
  await deleteDoc(pickDoc(oldPickId));
  await updateDoc(coupleRef(coupleId), { activeBattleId: null });
  return createPick(coupleId, category, creatorUid);
}
