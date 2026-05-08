import { PickMatchup } from '@/types';

/** Fisher–Yates shuffle (deterministic seed not needed for gameplay) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** Start index of each round in a flat bracket (round 0 = first games, last round = final). */
export function computeRoundStarts(bracketSize: number): number[] {
  const starts: number[] = [];
  let idx = 0;
  let m = bracketSize / 2;
  while (m >= 1) {
    starts.push(idx);
    idx += m;
    m >>= 1;
  }
  return starts;
}

export function matchupGlobalIndex(
  round: number,
  position: number,
  bracketSize: number,
): number {
  return computeRoundStarts(bracketSize)[round] + position;
}

export function parentMatchup(
  round: number,
  position: number,
): { round: number; position: number } | null {
  const parentRound = round + 1;
  // final is when bracket has one matchup in that round — parent of final's children doesn't exist
  // We detect "no parent" when we can't find parent in bracket (caller checks bounds)
  return { round: parentRound, position: Math.floor(position / 2) };
}

export function globalIndexToRoundPos(
  globalIdx: number,
  bracketSize: number,
): { round: number; position: number } {
  const starts = computeRoundStarts(bracketSize);
  for (let r = starts.length - 1; r >= 0; r--) {
    const start = starts[r];
    const nextStart = r + 1 < starts.length ? starts[r + 1] : Infinity;
    if (globalIdx >= start && globalIdx < nextStart) {
      return { round: r, position: globalIdx - start };
    }
  }
  return { round: 0, position: 0 };
}

/**
 * Build first-round slots: `bracketSize` leaves, `byePairs` games are one real option vs bye.
 */
export function buildFirstRoundSlots(
  optionLabels: string[],
  bracketSize: number,
): (string | null)[] {
  const n = optionLabels.length;
  const shuffled = shuffle([...optionLabels]);
  const byePairs = bracketSize - n;
  const slots: (string | null)[] = new Array(bracketSize).fill(null);
  const pairIndices = shuffle(
    Array.from({ length: bracketSize / 2 }, (_, i) => i),
  );
  const byePairSet = new Set(pairIndices.slice(0, byePairs));
  let ri = 0;
  for (let p = 0; p < bracketSize / 2; p++) {
    const i = p * 2;
    if (byePairSet.has(p)) {
      slots[i] = shuffled[ri++] ?? null;
      slots[i + 1] = null;
    } else {
      slots[i] = shuffled[ri++]!;
      slots[i + 1] = shuffled[ri++]!;
    }
  }
  return slots;
}

function emptyMatchup(round: number, position: number): PickMatchup {
  return {
    round,
    position,
    optionA: '',
    optionB: '',
    votesByUser: {},
    revoteRound: 0,
    winner: null,
    decidedByCoinFlip: false,
  };
}

/**
 * Allocate flat bracket (length = bracketSize - 1) with round/position on each cell.
 */
export function allocateEmptyBracket(bracketSize: number): PickMatchup[] {
  const bracket: PickMatchup[] = [];
  let r = 0;
  let m = bracketSize / 2;
  while (m >= 1) {
    for (let p = 0; p < m; p++) {
      bracket.push(emptyMatchup(r, p));
    }
    r++;
    m >>= 1;
  }
  return bracket;
}

/** Fill round 0 from leaf slots; inner rounds stay '' until propagation. */
export function seedRoundZero(
  bracket: PickMatchup[],
  bracketSize: number,
  slots: (string | null)[],
): void {
  const r0Count = bracketSize / 2;
  for (let p = 0; p < r0Count; p++) {
    const idx = p;
    const a = slots[p * 2];
    const b = slots[p * 2 + 1];
    const m = bracket[idx];
    m.optionA = a ?? '';
    m.optionB = b;
  }
}

export function propagateWinnerToParent(
  bracket: PickMatchup[],
  bracketSize: number,
  childRound: number,
  childPosition: number,
  winner: string,
): void {
  const parent = parentMatchup(childRound, childPosition);
  if (!parent) return;
  const starts = computeRoundStarts(bracketSize);
  if (parent.round >= starts.length) return;
  const pi = starts[parent.round] + parent.position;
  if (pi < 0 || pi >= bracket.length) return;
  const parentM = bracket[pi];
  if (childPosition % 2 === 0) {
    parentM.optionA = winner;
  } else {
    parentM.optionB = winner;
  }
}

/** Bye or missing side: return instant winner label, or null if not auto-resolvable. */
export function autoWinnerForMatchup(m: PickMatchup): string | null {
  if (m.winner) return null;
  const a = m.optionA.trim();
  const bSide = m.optionB;
  if (bSide === null) {
    if (a) return a;
    return null;
  }
  const b = bSide.trim();
  if (a && !b) return a;
  if (!a && b) return b;
  return null;
}

/**
 * Resolve all bye / half-filled auto wins and propagate until stable.
 */
export function applyAutoResolutions(bracket: PickMatchup[], bracketSize: number): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < bracket.length; i++) {
      const m = bracket[i];
      if (m.winner) continue;
      const w = autoWinnerForMatchup(m);
      if (w) {
        m.winner = w;
        propagateWinnerToParent(bracket, bracketSize, m.round, m.position, w);
        changed = true;
      }
    }
  }
}

/**
 * Build full bracket from option labels (min 4). Returns { bracket, bracketSize }.
 */
export function buildBracket(optionLabels: string[]): {
  bracket: PickMatchup[];
  bracketSize: number;
} {
  const n = optionLabels.length;
  if (n < 4) {
    throw new Error('need at least 4 options');
  }
  const bracketSize = nextPowerOfTwo(n);
  const slots = buildFirstRoundSlots(optionLabels, bracketSize);
  const bracket = allocateEmptyBracket(bracketSize);
  seedRoundZero(bracket, bracketSize, slots);
  applyAutoResolutions(bracket, bracketSize);
  return { bracket, bracketSize };
}

export type ResolveVotesResult =
  | { type: 'agree'; winner: string }
  | { type: 'revote' }
  | { type: 'coin'; winner: string };

/**
 * Both partners have voted (pick is exactly optionA or optionB string).
 * revoteRound: after disagree, increment; tiebreaker fires when revoteRound >= 2 and still disagree.
 */
export function resolveVotes(
  m: PickMatchup,
  pickA: string,
  pickB: string,
  revoteRound: number,
): ResolveVotesResult {
  const valid = new Set<string>();
  if (m.optionA.trim()) valid.add(m.optionA);
  if (m.optionB !== null && m.optionB.trim()) valid.add(m.optionB);
  if (!valid.has(pickA) || !valid.has(pickB)) {
    return { type: 'revote' };
  }
  if (pickA === pickB) {
    return { type: 'agree', winner: pickA };
  }
  if (revoteRound < 2) {
    return { type: 'revote' };
  }
  const opts = [...valid];
  const winner = opts[Math.floor(Math.random() * opts.length)]!;
  return { type: 'coin', winner };
}

export function isMatchupPlayable(m: PickMatchup): boolean {
  if (m.winner) return false;
  const w = autoWinnerForMatchup(m);
  if (w) return false;
  const a = m.optionA.trim();
  if (!a) return false;
  if (m.optionB === null) return false;
  const b = m.optionB.trim();
  return !!b;
}

/** First index in bracket order that needs human votes, or -1 if none (before complete). */
export function nextPlayableMatchupIndex(bracket: PickMatchup[]): number {
  for (let i = 0; i < bracket.length; i++) {
    if (isMatchupPlayable(bracket[i])) return i;
  }
  return -1;
}

export function isBracketComplete(bracket: PickMatchup[]): boolean {
  if (bracket.length === 0) return false;
  return bracket.every((m) => m.winner != null && m.winner.trim() !== '');
}

export function tournamentWinner(bracket: PickMatchup[]): string | null {
  if (!isBracketComplete(bracket)) return null;
  const last = bracket[bracket.length - 1];
  return last.winner;
}

export function bracketProgress(
  bracket: PickMatchup[],
  currentIdx: number,
): {
  totalMatchups: number;
  decided: number;
  currentRound: number;
  totalRounds: number;
  matchInRound: number;
  matchupsInRound: number;
} {
  const totalMatchups = bracket.length;
  const decided = bracket.filter((m) => m.winner).length;
  const maxRound = bracket.reduce((acc, m) => Math.max(acc, m.round), 0);
  const totalRounds = maxRound + 1;
  const cur = bracket[currentIdx];
  const currentRound = cur?.round ?? 0;
  const matchupsInRound = bracket.filter((m) => m.round === currentRound).length;
  const matchInRound =
    cur == null ? 0 : bracket.filter((m) => m.round === currentRound && m.position <= cur.position)
        .length;
  return {
    totalMatchups,
    decided,
    currentRound,
    totalRounds,
    matchInRound,
    matchupsInRound,
  };
}

/** Clear votes on a matchup for a new revote. */
export function clearedVotesMatchup(m: PickMatchup): PickMatchup {
  return {
    ...m,
    votesByUser: {},
  };
}
