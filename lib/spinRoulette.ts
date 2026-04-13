/**
 * Single source of truth for quick spin + battle tiebreaker roulette timing and reveal motion.
 * Keep both flows in sync so they feel like the same interaction.
 */
export const SPIN_ROULETTE = {
  /** Delay before the next label swap while still “fast” */
  initialSpeedMs: 98,
  /** How many ticks at the end ease slower (wider = longer, gentler decel) */
  slowdownWindowTicks: 16,
  /** Ms added to the delay each tick inside the window — lower = less steep ramp */
  slowdownStepMs: 22,
  /** More ticks overall so the fast segment lasts longer before decel */
  totalTicksBase: 34,
  totalTicksJitter: 12,
  revealSpring: {
    tension: 50,
    friction: 6,
    useNativeDriver: true as const,
  },
  revealScaleStart: 0.5,
  revealScaleEnd: 1,
  /** Light haptic every N completed ticks while rolling (1 = every tick) */
  tickHapticEveryNTicks: 3,
  tickPulseSpring: {
    tension: 520,
    friction: 15,
    useNativeDriver: true as const,
  },
  tickPulseScaleFrom: 0.92,
  tickPulseScaleTo: 1,
} as const;

export function rouletteTotalTicks(): number {
  return (
    SPIN_ROULETTE.totalTicksBase +
    Math.floor(Math.random() * SPIN_ROULETTE.totalTicksJitter)
  );
}

/** Call after each completed tick (after incrementing tick count). Updates delay for the next tick. */
export function rouletteSpeedAfterTick(
  speed: number,
  ticksCompleted: number,
  totalTicks: number,
): number {
  if (ticksCompleted > totalTicks - SPIN_ROULETTE.slowdownWindowTicks) {
    return speed + SPIN_ROULETTE.slowdownStepMs;
  }
  return speed;
}

export function shouldRouletteTickHaptic(ticksCompleted: number): boolean {
  const n = SPIN_ROULETTE.tickHapticEveryNTicks;
  if (n <= 0) return false;
  return ticksCompleted % n === 0;
}
