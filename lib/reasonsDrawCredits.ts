import type { UserProfile } from '@/types';

/**
 * Reasons tab “deal three” does not stack: you get at most one draw pending.
 * We store how many “by you for partner” reasons you had right after your last draw;
 * when your current count is higher, one deal unlocks.
 *
 * Reads ONLY the canonical `reasonPartnerCountAtLastDraw`. Legacy fields
 * (`becausePartnerReasonCountAtLastDraw`, `becauseDrawsConsumed`) are
 * intentionally ignored — they were prone to drifting above current
 * `byMe.length` (renames + semantic shifts across releases).
 *
 * Self-healing: if the stored checkpoint EXCEEDS current `byMe.length`
 * (data drift from older code paths, deletions, or rename leftovers),
 * treat the field as corrupt and return `0`. The next successful draw
 * overwrites the corrupted value with the current count, so accounts
 * heal themselves on next reason write. The cost is a single bonus
 * unlock for affected accounts, which is strictly nicer than the
 * "stuck forever" failure mode (`min(byMe, raw)` collapsing to `byMe`
 * and making `byMe > cp` always false).
 */
export function effectiveReasonPartnerDrawCheckpoint(
  profile: UserProfile | null | undefined,
  byMeCount: number,
): number {
  const cappedByMe = Math.max(0, Math.floor(byMeCount));
  const raw = profile?.reasonPartnerCountAtLastDraw;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    const floored = Math.floor(raw);
    if (floored > cappedByMe) return 0;
    return floored;
  }
  return 0;
}

/** True when there is a fresh partner-reason since the last deal (only one deal pending at a time). */
export function reasonsDealThreeUnlocked(byMeCount: number, checkpoint: number): boolean {
  const byMe = Math.max(0, Math.floor(byMeCount));
  const cp = Math.min(Math.max(0, Math.floor(checkpoint)), byMe);
  return byMe > cp;
}
