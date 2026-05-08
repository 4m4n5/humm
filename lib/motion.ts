import { Easing, ReduceMotion } from 'react-native-reanimated';

/**
 * Shared motion tokens — Material Design 3 + M3 Expressive.
 *
 * Source of truth for app-wide animation timing and easing. Feature-specific
 * motion files (e.g. `pickRevealMotion.ts`) re-export or extend these.
 *
 * Do not inline these curves in component files. If a value here doesn't fit,
 * add a new named token here so the design language stays small and legible.
 *
 * References:
 *  - M3 motion tokens: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
 *  - M3 Expressive: https://m3.material.io/styles/motion/overview/expressive
 *  - Apple HIG (motion): https://developer.apple.com/design/human-interface-guidelines/motion
 */

// ─── easings ───────────────────────────────────────────────────────────────

/** M3 emphasized — spatial entrances (card lands, sheet opens). */
export const M3_EMPHASIZED = Easing.bezier(0.2, 0, 0, 1);

/** M3 emphasized decelerate — entries from off-screen. */
export const M3_EMPHASIZED_DECEL = Easing.bezier(0.05, 0.7, 0.1, 1);

/** M3 emphasized accelerate — exits leaving the screen. */
export const M3_EMPHASIZED_ACCEL = Easing.bezier(0.3, 0, 0.8, 0.15);

/** M3 standard — small UI changes, color transitions. */
export const M3_STANDARD = Easing.bezier(0.2, 0, 0, 1);

// ─── springs (Reanimated 4 perceptual API) ─────────────────────────────────
//
// Reanimated 4's `withSpring` is a discriminated union: pass either
// `{ stiffness, damping }` (physics) OR `{ duration, dampingRatio }`
// (perceptual). We use the perceptual form everywhere so design tokens
// read like spec ("how long, how much bounce") rather than physics.
//
//   dampingRatio < 0.7 = visible bounce (celebratory)
//   dampingRatio ≈ 0.9 = critically damped (clean settle)
//   dampingRatio = 1   = no overshoot (snappy/utilitarian)
//
// Source: Reanimated 4 docs, withSpring SpringConfig.

/** M3 fast spatial — quick UI position changes. Critically damped. */
export const SPRING_FAST_SPATIAL = { duration: 460, dampingRatio: 0.8 } as const;

/** M3 default spatial — standard cards, sheets, modal entries. */
export const SPRING_DEFAULT_SPATIAL = { duration: 550, dampingRatio: 0.85 } as const;

/** M3 slow spatial — large surfaces, deliberate. */
export const SPRING_SLOW_SPATIAL = { duration: 800, dampingRatio: 0.9 } as const;

/**
 * Expressive bloom — tap-feedback with visible bounce.
 * Use for celebratory micro-interactions (mood pick, habit check, bracket
 * pick). Lower damping ratio = more bounce = more delight. Calibrated to
 * preserve the long-lingering after-glow of the original (legacy
 * `Animated`) springs that had ζ ≈ 0.12 (and hence a ~1.7s settling time).
 */
export const SPRING_EXPRESSIVE_BLOOM = { duration: 480, dampingRatio: 0.5 } as const;

/**
 * Expressive settle — after a bloom returns to rest, this softens the
 * landing without snapping. Pair with `SPRING_EXPRESSIVE_BLOOM` in a sequence.
 * Long duration deliberately — the settle is the dopamine after-glow.
 */
export const SPRING_EXPRESSIVE_SETTLE = { duration: 750, dampingRatio: 0.75 } as const;

/**
 * Expressive entrance — overlays, hero cards, lighter entries.
 * Slightly underdamped for a single visible breath on entry. Longer than
 * spec because reveal moments are "peak-end" — the user's mind anchors
 * here and shorter-than-expected motion reads as cheap.
 */
export const SPRING_EXPRESSIVE_ENTRANCE = { duration: 720, dampingRatio: 0.65 } as const;

/**
 * Rich reveal — the deepest peak moments where the card IS the
 * dopamine hit (awards reveal, decide static result). Longer dwell +
 * lower damping ratio = a richer, more deliberate breath. Reserve for
 * once-per-flow moments; using this everywhere flattens the hierarchy.
 */
export const SPRING_RICH_REVEAL = { duration: 950, dampingRatio: 0.55 } as const;

// ─── timings (NN/g 100–400ms guidance) ─────────────────────────────────────

/** Quick UI feedback (chip toggle, color flip). */
export const TIMING_QUICK_MS = 140;

/** Standard transition (fade, color change, banner). */
export const TIMING_STANDARD_MS = 240;

/** Emphasized entry (modal, overlay). */
export const TIMING_EMPHASIZED_MS = 320;

/** Slow expressive (hero card on celebration). */
export const TIMING_EXPRESSIVE_MS = 480;

// ─── reduce-motion envelope ────────────────────────────────────────────────

/**
 * Force animation to play even when iOS Reduce Motion is on. Reserve for
 * subtle motion that respects HIG (≤5% scale, opacity changes). Snapping
 * to final value reads as broken UI for tap-feedback blooms — those should
 * always animate.
 *
 * For larger motion (parallax, zoom, slide), respect the system flag by
 * leaving `reduceMotion` unset (defaults to `ReduceMotion.System`).
 */
export const REDUCE_MOTION_NEVER = ReduceMotion.Never;
