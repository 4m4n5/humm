import type { UserProfile } from '@/types';

/**
 * Reasons tab “deal three” does not stack: you get at most one draw pending.
 * We store how many “by you for partner” reasons you had right after your last draw;
 * when your current count is higher, one deal unlocks.
 *
 * Reads `reasonPartnerCountAtLastDraw` (new) or legacy `becausePartnerReasonCountAtLastDraw`.
 * Legacy profiles only had `becauseDrawsConsumed` (per-draw increments). We map that
 * to an effective checkpoint so stacked credits collapse to one pending deal at most.
 */
export function effectiveReasonPartnerDrawCheckpoint(
  profile: UserProfile | null | undefined,
  byMeCount: number,
): number {
  const cappedByMe = Math.max(0, Math.floor(byMeCount));

  const rawNew =
    profile?.reasonPartnerCountAtLastDraw ?? profile?.becausePartnerReasonCountAtLastDraw;
  if (typeof rawNew === 'number' && Number.isFinite(rawNew) && rawNew >= 0) {
    return Math.min(cappedByMe, Math.floor(rawNew));
  }

  const legacy = profile?.becauseDrawsConsumed;
  const draws =
    typeof legacy === 'number' && Number.isFinite(legacy) && legacy >= 0
      ? Math.floor(legacy)
      : 0;
  return Math.min(cappedByMe, draws);
}

/** True when there is a fresh partner-reason since the last deal (only one deal pending at a time). */
export function reasonsDealThreeUnlocked(byMeCount: number, checkpoint: number): boolean {
  const byMe = Math.max(0, Math.floor(byMeCount));
  const cp = Math.min(Math.max(0, Math.floor(checkpoint)), byMe);
  return byMe > cp;
}
