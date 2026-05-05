import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Shared "emoji shower" primitive that powers both the reasons-written and
 * shared-habits-completed celebrations.
 *
 * Particles originate from a (random per fire) top edge of the screen and
 * **fall** under gravity-like easing toward the bottom — like petals or
 * confetti raining down. Two axes of variability keep the moment fresh
 * across many fires:
 *
 *   1. **Intensity** — how *much* shower (count, fall duration, size).
 *      Three preset levels: gentle / standard / lavish.
 *   2. **Pattern** — *which edge* the particles come from (top / top-left
 *      corner / top-right corner / both top corners). If unspecified, a
 *      fresh pattern is rolled each fire so a user who triggers this five
 *      times in a row sees five different rain shapes.
 *
 * On top of the structural variability, every fire jitters duration, fall
 * distance, particle drift, rotation and emoji-subset selection — so even
 * two fires of the same intensity + pattern read as distinct moments.
 *
 * Designed to be wrapped by domain-specific celebrations (with their own
 * center badges and emoji vocabularies) rather than used directly.
 */

export type ShowerIntensity = 'gentle' | 'standard' | 'lavish';
export type ShowerPattern = 'top' | 'top-left' | 'top-right' | 'top-corners';

/** Speed multiplier — fall durations are divided by this. Tuned to 1.2x. */
const SPEED = 1.2;

const INTENSITY_CONFIG: Record<
  ShowerIntensity,
  {
    count: number;
    baseDuration: number;
    sizeMin: number;
    sizeRange: number;
    /** Max stagger window (ms) for the rain to pour in over time. */
    delaySpread: number;
  }
> = {
  // Counts ~doubled vs. the previous "rise upward" version. Durations
  // baked-in below are then divided by SPEED for the 1.2x snap.
  gentle: {
    count: 24,
    baseDuration: 1900,
    sizeMin: 14,
    sizeRange: 12,
    delaySpread: 480,
  },
  standard: {
    count: 44,
    baseDuration: 2200,
    sizeMin: 16,
    sizeRange: 16,
    delaySpread: 620,
  },
  lavish: {
    count: 72,
    baseDuration: 2500,
    sizeMin: 18,
    sizeRange: 22,
    delaySpread: 780,
  },
};

const ALL_PATTERNS: ShowerPattern[] = [
  'top',
  'top-left',
  'top-right',
  'top-corners',
];

type Particle = {
  emoji: string;
  startX: number;
  /** Vertical start offset relative to the top edge (always negative or 0). */
  startY: number;
  drift: number;
  delay: number;
  size: number;
  spin: number;
  /** Per-particle fall scalar (0.85 → 1.15) for organic uneven rain. */
  fall: number;
};

/** Pick `n` distinct items from a pool, falling back to repeats if pool < n. */
function pickSubset<T>(pool: T[], n: number): T[] {
  if (pool.length === 0) return [];
  if (pool.length <= n) return [...pool];
  const copy = [...pool];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

function jitter(base: number, frac: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * frac);
}

/**
 * Build particles for the chosen pattern. Each pattern shapes startX, the
 * vertical pre-roll (startY) and horizontal drift so the *origin edge*
 * differs while every particle still falls toward the bottom.
 */
function makeParticles(
  width: number,
  intensity: ShowerIntensity,
  pattern: ShowerPattern,
  emojiPool: string[],
  spinEnabled: boolean,
): Particle[] {
  const cfg = INTENSITY_CONFIG[intensity];
  // Grab a fresh subset of emojis each fire so the palette feels rotated.
  const subsetSize = intensity === 'lavish' ? 7 : intensity === 'gentle' ? 4 : 6;
  const subset = pickSubset(emojiPool, subsetSize);

  return Array.from({ length: cfg.count }).map(() => {
    const emoji = subset[Math.floor(Math.random() * subset.length)]!;
    let startX: number;
    let startY: number;
    let drift: number;

    switch (pattern) {
      case 'top-left': {
        // Cluster near the top-left corner, drifting right and down. A small
        // vertical stagger (-80 → 0) keeps them from launching as a single
        // line.
        startX = Math.random() * (width * 0.3);
        startY = -80 - Math.random() * 60;
        drift = 40 + Math.random() * (width * 0.35);
        break;
      }
      case 'top-right': {
        // Mirror of top-left.
        startX = width * 0.7 + Math.random() * (width * 0.3) - 24;
        startY = -80 - Math.random() * 60;
        drift = -(40 + Math.random() * (width * 0.35));
        break;
      }
      case 'top-corners': {
        // Twin streams from both top corners, drifting toward the center
        // as they fall — reads as two ribbons converging.
        const fromLeft = Math.random() < 0.5;
        startX = fromLeft
          ? Math.random() * (width * 0.25)
          : width * 0.75 + Math.random() * (width * 0.25) - 24;
        startY = -60 - Math.random() * 80;
        drift = fromLeft
          ? 30 + Math.random() * 110
          : -(30 + Math.random() * 110);
        break;
      }
      case 'top':
      default: {
        // Even rain across the whole top edge with mild sway.
        startX = Math.random() * (width - 32);
        startY = -50 - Math.random() * 80;
        drift = (Math.random() - 0.5) * 70;
        break;
      }
    }

    return {
      emoji,
      startX,
      startY,
      drift,
      delay: Math.random() * cfg.delaySpread,
      size: cfg.sizeMin + Math.random() * cfg.sizeRange,
      // Slightly more spin while falling — emoji confetti tumbling in air.
      spin: spinEnabled ? (Math.random() - 0.5) * 28 : 0,
      // Some drops fall a little short, some overshoot — natural unevenness.
      fall: 0.85 + Math.random() * 0.3,
    };
  });
}

function FallingParticle({
  p,
  durationMs,
  fallDistance,
}: {
  p: Particle;
  durationMs: number;
  fallDistance: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(p.delay),
      Animated.parallel([
        Animated.timing(translateY, {
          // Positive translateY → downward fall.
          toValue: fallDistance * p.fall,
          duration: durationMs,
          // Ease-in feels like gravity: starts slow, accelerates downward.
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: p.drift,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: p.spin,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(durationMs - 700, 0)),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [translateY, translateX, opacity, rotate, p, durationMs, fallDistance]);

  const rotateInterp = rotate.interpolate({
    inputRange: [-30, 30],
    outputRange: ['-30deg', '30deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        // Anchor to the top edge; startY pre-rolls particles slightly above.
        top: p.startY,
        left: p.startX,
        opacity,
        transform: [
          { translateY },
          { translateX },
          { rotate: rotateInterp },
        ],
      }}
    >
      <Text style={{ fontSize: p.size }} allowFontScaling={false}>
        {p.emoji}
      </Text>
    </Animated.View>
  );
}

type Props = {
  visible: boolean;
  onFinished: () => void;
  /** Emoji pool — a fresh subset is selected per fire. */
  emojiPool: string[];
  /** Default `'standard'`. */
  intensity?: ShowerIntensity;
  /** Override pattern. If omitted, a random pattern is chosen each fire. */
  pattern?: ShowerPattern;
  /** Whether particles tumble as they fall. Default true. */
  spin?: boolean;
  /** Optional element painted above the particles (e.g. a center badge). */
  children?: React.ReactNode;
  /**
   * Haptic flavor when the shower fires. Default `'success'`. Pass `'none'`
   * if the caller is firing its own haptic pattern.
   */
  haptic?: 'success' | 'medium' | 'light' | 'none';
};

export function EmojiShower({
  visible,
  onFinished,
  emojiPool,
  intensity = 'standard',
  pattern,
  spin = true,
  children,
  haptic = 'success',
}: Props) {
  const { width, height } = useWindowDimensions();

  // Roll a fresh pattern, duration and fall distance every time `visible`
  // toggles on. Memoizing on `visible` (not pattern/intensity) means each
  // fire is structurally distinct — same intensity, different shape.
  const fireConfig = useMemo(() => {
    if (!visible) return null;
    const chosenPattern: ShowerPattern =
      pattern ?? ALL_PATTERNS[Math.floor(Math.random() * ALL_PATTERNS.length)]!;
    const cfg = INTENSITY_CONFIG[intensity];
    // Apply 1.2x speed-up (shorter duration = faster fall) plus ±8% jitter.
    const durationMs = Math.round(jitter(cfg.baseDuration / SPEED, 0.08));
    // Particles must travel further than the screen height so they exit
    // cleanly off the bottom edge. Add a buffer for jittered start offsets.
    const fallDistance = Math.round(jitter(height + 200, 0.05));
    const particles = makeParticles(
      width,
      intensity,
      chosenPattern,
      emojiPool,
      spin,
    );
    return { particles, durationMs, fallDistance };
  }, [visible, intensity, pattern, width, height, emojiPool, spin]);

  useEffect(() => {
    if (!visible || !fireConfig) return;
    if (haptic === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (haptic === 'medium') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (haptic === 'light') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Total visible time = max delay + fall duration + fade-out tail.
    const cfg = INTENSITY_CONFIG[intensity];
    const total = cfg.delaySpread + fireConfig.durationMs + 400;
    const t = setTimeout(onFinished, total);
    return () => clearTimeout(t);
  }, [visible, fireConfig, onFinished, haptic, intensity]);

  if (!visible || !fireConfig) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 z-40"
      style={{ overflow: 'hidden' }}
    >
      {fireConfig.particles.map((p, i) => (
        <FallingParticle
          key={i}
          p={p}
          durationMs={fireConfig.durationMs}
          fallDistance={fireConfig.fallDistance}
        />
      ))}
      {children}
    </View>
  );
}
