import { M3_EMPHASIZED } from '@/lib/motion';

/**
 * Motion tokens for the pick-reveal card animation.
 *
 * Single card, text cycles through options with a vertical slide,
 * decelerates, then settles on the winner with a gentle pop. Border
 * and glow transition smoothly on the UI thread.
 *
 * Re-exports `M3_EMPHASIZED` so existing call sites in `PickRevealAnimated`
 * keep working without churn.
 */

export { M3_EMPHASIZED };

export const SPRING = {
  /** Settle-pop when the winner lands. Used in a `withSequence` of two
   *  springs (1 → 1.035 → 1), so each leg must settle cleanly within its
   *  duration — too much bounce (ζ < 0.6) compounds across legs and reads
   *  as wobble. Calibrated 2026-05-07 to one visible breath per leg. */
  landPop: { duration: 520, dampingRatio: 0.7 },
} as const;

export const TIMING = {
  /** Brief anticipation pause before flipping starts (card micro-shrinks). */
  anticipationMs: 180,
  /** Anticipation card scale — slight "inhale" before the action. */
  anticipationScale: 0.97,

  /** Total number of label flips before revealing the winner. */
  flipCount: 14,
  /** First flip delay (ms) — fast. */
  flipStartMs: 55,
  /** Final flip delay (ms) — noticeably slow, building suspense. */
  flipEndMs: 260,

  /** Per-flip label slide distance (translateY, px). Small — just enough
   *  to create a "rolling ticker" feel without being dramatic. */
  flipSlideY: 6,
  /** Per-flip opacity trough. */
  flipOpacityTrough: 0.35,

  /** Hold time after the winner appears before onFinish fires.
   *  Calibrated 2026-05-07 — peak-end dwell, but short enough that the
   *  user-driven flow regains control before it drags. */
  holdMs: 1500,

  /** Duration for the card border/bg color transition on landing. */
  landColorMs: 600,

  /** Reduce-motion fallback durations. */
  reducedMotionMs: 300,
  reducedMotionHoldMs: 700,
} as const;

/** Winner card scale pop. */
export const LAND = {
  peak: 1.035,
  rest: 1,
} as const;

/**
 * Returns the delay before the next flip, ramping from start→end.
 * Uses a custom curve that's nearly linear for the first 60% then
 * decelerates sharply in the last 40% — the "almost there" beat.
 */
export function flipDelay(flip: number): number {
  const t = Math.min(1, flip / Math.max(1, TIMING.flipCount - 1));
  // Slow ramp for first 60%, then steep deceleration.
  const eased = t < 0.6
    ? t * 0.4 / 0.6 // linear-ish through 0.4
    : 0.4 + (1 - Math.pow(1 - (t - 0.6) / 0.4, 2.5)) * 0.6;
  return (
    TIMING.flipStartMs +
    (TIMING.flipEndMs - TIMING.flipStartMs) * eased
  );
}

/** Haptic on the back half of the sequence, every 3rd flip. */
export function shouldTickHaptic(flip: number): boolean {
  return flip > TIMING.flipCount / 2 && flip % 3 === 0;
}
