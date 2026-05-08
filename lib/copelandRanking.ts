import { PickPair } from '@/types';
import { shuffle } from '@/lib/pickLogic';

/**
 * Copeland round-robin scoring for two-voter joint decisions.
 *
 * Why Copeland? It's the simplest Condorcet-compliant method: an option
 * that beats every other option head-to-head wins. With two voters, every
 * pair either agrees (2-0) or splits (1-1). Agreement contributes ±1 to
 * the relevant options' scores; splits contribute 0 (tie). The aggregate
 * across all C(N,2) pairs forms a meaningful joint preference ranking.
 *
 * See plan: research from Copeland's method, Condorcet criteria, and
 * social choice theory (round-robin maximizes information for small N).
 */

/**
 * Generate all unique unordered pairs of options (full round-robin).
 * For N options returns C(N,2) = N*(N-1)/2 pairs.
 * Pairs preserve `options` insertion order (optionA index < optionB index).
 * All pairs assigned round 0 (single-batch RR mode).
 */
export function generateAllPairs(options: string[]): PickPair[] {
  const out: PickPair[] = [];
  let idx = 0;
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      out.push({
        index: idx++,
        optionA: options[i],
        optionB: options[j],
        round: 0,
        voteByUser: {},
      });
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Swiss tournament — for N ≥ 8 we cut the comparison count from C(N,2) to
// ceil(log₂N) · ⌊N/2⌋ via a Swiss-system approach. Round 1 is a random
// covering (each option appears in one pair). Round k+1 pairs each option
// against the next item with the closest current Copeland score, skipping
// pairs that already played. Theory: ceil(log₂N) rounds is the standard
// minimum to identify the top finisher in a Swiss tournament (sports +
// chess organizing literature).
//
// Size targets:
//   N=8  →  3 rounds × 4 = 12 pairs (vs 28 RR)
//   N=11 →  4 rounds × 5 = 20 pairs (vs 55 RR)
//   N=16 →  4 rounds × 8 = 32 pairs (vs 120 RR)
// ───────────────────────────────────────────────────────────────────────────

const SWISS_THRESHOLD = 8;

export interface PickRoundConfig {
  /** True ⇒ generate every C(N,2) pair upfront (no sync barrier between rounds). */
  useFullRoundRobin: boolean;
  /** Total rounds across the whole session. 1 for full-RR mode. */
  totalRounds: number;
  /** Pairs scheduled per round (only meaningful in Swiss mode). */
  pairsPerRound: number;
  /** Total pairs across the whole session — used for vote-cost preview. */
  totalPairs: number;
}

export function swissTournamentConfig(N: number): PickRoundConfig {
  if (N < 2) {
    return {
      useFullRoundRobin: true,
      totalRounds: 1,
      pairsPerRound: 0,
      totalPairs: 0,
    };
  }
  if (N < SWISS_THRESHOLD) {
    const total = (N * (N - 1)) / 2;
    return {
      useFullRoundRobin: true,
      totalRounds: 1,
      pairsPerRound: total,
      totalPairs: total,
    };
  }
  const rounds = Math.ceil(Math.log2(N));
  const perRound = Math.floor(N / 2);
  return {
    useFullRoundRobin: false,
    totalRounds: rounds,
    pairsPerRound: perRound,
    totalPairs: rounds * perRound,
  };
}

/**
 * Round 1 of a Swiss tournament: random covering. Each option appears in
 * exactly one pair (one bye if N is odd). Returns ⌊N/2⌋ pairs, indexed
 * starting at `startIndex` and tagged with `round: 0`.
 */
export function buildFirstSwissRoundPairs(
  options: string[],
  startIndex: number = 0,
): PickPair[] {
  const indexOf = new Map<string, number>();
  options.forEach((o, i) => indexOf.set(o, i));

  const shuffled = shuffle([...options]);
  const pairs: PickPair[] = [];
  let idx = startIndex;
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1];
    const ai = indexOf.get(a) ?? 0;
    const bi = indexOf.get(b) ?? 0;
    pairs.push({
      index: idx++,
      optionA: ai < bi ? a : b,
      optionB: ai < bi ? b : a,
      round: 0,
      voteByUser: {},
    });
  }
  return pairs;
}

/**
 * Round k≥1 of a Swiss tournament. Sort all options by current Copeland
 * score descending (ties → original insertion order). Greedily pair leader
 * with the next available option that hasn't already played them; second
 * with the next, etc. Skips already-played match-ups so we never repeat a
 * comparison. Returns up to ⌊N/2⌋ pairs.
 */
export function buildNextSwissRoundPairs(
  options: string[],
  prevPairs: PickPair[],
  scores: Record<string, number>,
  roundNumber: number,
  startIndex: number,
): PickPair[] {
  const indexOf = new Map<string, number>();
  options.forEach((o, i) => indexOf.set(o, i));

  const sortedDesc = [...options].sort((a, b) => {
    const sa = scores[a] ?? 0;
    const sb = scores[b] ?? 0;
    if (sa !== sb) return sb - sa;
    return (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0);
  });

  const played = new Set<string>();
  for (const p of prevPairs) {
    played.add(pairKey(p.optionA, p.optionB));
  }

  const used = new Set<number>();
  const out: PickPair[] = [];
  let idx = startIndex;

  for (let i = 0; i < sortedDesc.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < sortedDesc.length; j++) {
      if (used.has(j)) continue;
      const a = sortedDesc[i];
      const b = sortedDesc[j];
      if (played.has(pairKey(a, b))) continue;
      const ai = indexOf.get(a) ?? 0;
      const bi = indexOf.get(b) ?? 0;
      out.push({
        index: idx++,
        optionA: ai < bi ? a : b,
        optionB: ai < bi ? b : a,
        round: roundNumber,
        voteByUser: {},
      });
      used.add(i);
      used.add(j);
      break;
    }
  }

  return out;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

/**
 * Pairs that belong to a given round (legacy pairs without `round` are
 * treated as round 0).
 */
export function pairsInRound(pairs: PickPair[], round: number): PickPair[] {
  return pairs.filter((p) => (p.round ?? 0) === round);
}

/**
 * Has this user voted on every pair scheduled in `round`?
 */
export function hasUserCompletedRound(
  pairs: PickPair[],
  round: number,
  uid: string,
): boolean {
  const r = pairsInRound(pairs, round);
  if (r.length === 0) return false;
  return r.every(
    (p) =>
      typeof p.voteByUser[uid] === 'string' && p.voteByUser[uid].length > 0,
  );
}

/**
 * Count how many pairs in `round` this user has voted on.
 */
export function userRoundProgress(
  pairs: PickPair[],
  round: number,
  uid: string,
): number {
  let n = 0;
  for (const p of pairsInRound(pairs, round)) {
    if (p.voteByUser[uid]) n++;
  }
  return n;
}

/**
 * Independent random ordering of pair indices for one partner. Each partner
 * gets their own shuffle so order effects don't bias the joint ranking.
 */
export function shuffledPairOrder(pairCount: number): number[] {
  const order = Array.from({ length: pairCount }, (_, i) => i);
  return shuffle(order);
}

/**
 * Has this user voted on every pair?
 */
export function hasUserCompletedAllPairs(
  pairs: PickPair[],
  uid: string,
): boolean {
  if (pairs.length === 0) return false;
  return pairs.every((p) => typeof p.voteByUser[uid] === 'string' && p.voteByUser[uid].length > 0);
}

/**
 * Number of pairs this user has voted on.
 */
export function userPairProgress(pairs: PickPair[], uid: string): number {
  let n = 0;
  for (const p of pairs) {
    if (p.voteByUser[uid]) n++;
  }
  return n;
}

/**
 * Compute Copeland scores from completed pair votes.
 *
 * For each pair (A vs B):
 *   - both voters chose A   →  A: +1, B: −1
 *   - both voters chose B   →  B: +1, A: −1
 *   - split (1-1)           →  no change (tie)
 *
 * Pairs with fewer than 2 voters are ignored (treated as not yet decided).
 * Returns score map keyed by option label.
 */
export function computeCopelandScores(
  options: string[],
  pairs: PickPair[],
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const opt of options) scores[opt] = 0;

  for (const pair of pairs) {
    const votes = Object.values(pair.voteByUser);
    if (votes.length < 2) continue;
    const [v1, v2] = votes;
    if (v1 === v2) {
      const winner = v1;
      const loser = winner === pair.optionA ? pair.optionB : pair.optionA;
      if (winner in scores) scores[winner] += 1;
      if (loser in scores) scores[loser] -= 1;
    }
    // split → 0, no change
  }

  return scores;
}

/**
 * For tiebreaking: did both partners agree on this head-to-head?
 * Returns the agreed-upon winner, or null if split or incomplete.
 */
export function pairwiseDirectWinner(
  pairs: PickPair[],
  a: string,
  b: string,
): string | null {
  const pair = pairs.find(
    (p) =>
      (p.optionA === a && p.optionB === b) ||
      (p.optionA === b && p.optionB === a),
  );
  if (!pair) return null;
  const votes = Object.values(pair.voteByUser);
  if (votes.length < 2) return null;
  if (votes[0] !== votes[1]) return null;
  return votes[0];
}

/**
 * Sort options by Copeland score, breaking ties by:
 *   1. Direct head-to-head agreement (if any).
 *   2. Stable insertion order (deterministic; both partners see same result).
 */
export function copelandRanking(
  options: string[],
  pairs: PickPair[],
  scores: Record<string, number>,
): string[] {
  const indexOf = new Map<string, number>();
  options.forEach((o, i) => indexOf.set(o, i));

  const sorted = [...options].sort((a, b) => {
    const sa = scores[a] ?? 0;
    const sb = scores[b] ?? 0;
    if (sa !== sb) return sb - sa;
    const head = pairwiseDirectWinner(pairs, a, b);
    if (head === a) return -1;
    if (head === b) return 1;
    // Split or missing — fall back to stable insertion order.
    return (indexOf.get(a) ?? 0) - (indexOf.get(b) ?? 0);
  });
  return sorted;
}

/**
 * Top of the ranking. Returns null when ranking is empty.
 */
export function copelandWinner(ranking: string[]): string | null {
  return ranking[0] ?? null;
}

/**
 * Convenience: number of pairs both partners voted on (used to decide
 * whether the session is ready to be scored).
 */
export function pairsWithBothVotes(pairs: PickPair[]): number {
  return pairs.filter((p) => Object.keys(p.voteByUser).length >= 2).length;
}

/**
 * Per-pair agreement summary (for the result screen highlights).
 *   - 'agree'    : both partners chose the same side
 *   - 'split'    : partners chose opposite sides
 *   - 'pending'  : at least one vote missing
 */
export type PairOutcome = 'agree' | 'split' | 'pending';

export function pairOutcome(pair: PickPair): PairOutcome {
  const votes = Object.values(pair.voteByUser);
  if (votes.length < 2) return 'pending';
  return votes[0] === votes[1] ? 'agree' : 'split';
}
