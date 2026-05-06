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
 * shared-habits-completed celebrations. Two axes of variability keep the
 * moment fresh across many fires:
 *
 *   1. **Intensity** — how *much* shower (count, arc height, duration).
 *      Three preset levels: gentle / standard / lavish.
 *   2. **Pattern** — *where* the particles come from (spray / fountain /
 *      sides / burst). If unspecified, a fresh pattern is rolled each fire,
 *      so a user who triggers this five times in a row sees five different
 *      launch shapes.
 *
 * On top of the structural variability, every fire jitters duration, arc
 * height, particle drift, rotation and emoji-subset selection — so even two
 * fires of the same intensity + pattern read as distinct moments.
 *
 * Designed to be wrapped by domain-specific celebrations (with their own
 * center badges and emoji vocabularies) rather than used directly.
 */

export type ShowerIntensity = 'gentle' | 'standard' | 'lavish';
export type ShowerPattern = 'spray' | 'fountain' | 'sides' | 'burst';

const INTENSITY_CONFIG: Record<
  ShowerIntensity,
  {
    count: [number, number]; // [min, max] — a random count is rolled each fire
    baseDuration: number;
    arcHeight: number;
    sizeMin: number;
    sizeRange: number;
    /** Max stagger window (ms) for per-particle delay. */
    delaySpread: number;
  }
> = {
  gentle: {
    count: [18, 26],
    baseDuration: 1900,
    arcHeight: 320,
    sizeMin: 14,
    sizeRange: 14,
    delaySpread: 450,
  },
  standard: {
    count: [34, 48],
    baseDuration: 2200,
    arcHeight: 420,
    sizeMin: 15,
    sizeRange: 18,
    delaySpread: 550,
  },
  lavish: {
    count: [56, 76],
    baseDuration: 2600,
    arcHeight: 520,
    sizeMin: 16,
    sizeRange: 24,
    delaySpread: 700,
  },
};

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const ALL_PATTERNS: ShowerPattern[] = ['spray', 'fountain', 'sides', 'burst'];

type Particle = {
  emoji: string;
  startX: number;
  drift: number;
  delay: number;
  size: number;
  spin: number;
  /** Per-particle vertical reach scalar (0.7 → 1.15) for organic uneven arcs. */
  rise: number;
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
 * Build particles for the chosen pattern. Each pattern shapes startX and
 * drift so the launch silhouette differs while sharing the same upward arc.
 */
function makeParticles(
  width: number,
  intensity: ShowerIntensity,
  pattern: ShowerPattern,
  emojiPool: string[],
  spinEnabled: boolean,
): Particle[] {
  const cfg = INTENSITY_CONFIG[intensity];
  const particleCount = randInt(cfg.count[0], cfg.count[1]);

  // Grab a fresh subset of emojis each fire so the palette feels rotated.
  const subsetSize = intensity === 'lavish' ? 8 : intensity === 'gentle' ? 5 : 6;
  const subset = pickSubset(emojiPool, subsetSize);

  return Array.from({ length: particleCount }).map(() => {
    const emoji = subset[Math.floor(Math.random() * subset.length)]!;
    let startX: number;
    let drift: number;

    switch (pattern) {
      case 'fountain': {
        const center = width / 2;
        const span = width * 0.45;
        startX = center - span / 2 + Math.random() * span;
        drift = (Math.random() - 0.5) * 70;
        break;
      }
      case 'sides': {
        const fromLeft = Math.random() < 0.5;
        startX = fromLeft
          ? Math.random() * (width * 0.28)
          : width * 0.72 + Math.random() * (width * 0.28);
        drift = fromLeft
          ? 20 + Math.random() * 120
          : -(20 + Math.random() * 120);
        break;
      }
      case 'burst': {
        const center = width / 2;
        const span = width * 0.22;
        startX = center - span / 2 + Math.random() * span;
        drift = (startX < center ? -1 : 1) * (50 + Math.random() * 100);
        break;
      }
      case 'spray':
      default: {
        startX = Math.random() * (width - 32);
        drift = (Math.random() - 0.5) * 110;
        break;
      }
    }

    return {
      emoji,
      startX,
      drift,
      delay: Math.random() * cfg.delaySpread,
      size: cfg.sizeMin + Math.random() * cfg.sizeRange,
      spin: spinEnabled ? (Math.random() - 0.5) * 30 : 0,
      rise: 0.6 + Math.random() * 0.55,
    };
  });
}

function FloatingParticle({
  p,
  durationMs,
  arcHeight,
}: {
  p: Particle;
  durationMs: number;
  arcHeight: number;
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
          toValue: -arcHeight * p.rise,
          duration: durationMs,
          easing: Easing.out(Easing.quad),
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
            duration: 240,
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(durationMs - 880, 0)),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 640,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [translateY, translateX, opacity, rotate, p, durationMs, arcHeight]);

  const rotateInterp = rotate.interpolate({
    inputRange: [-30, 30],
    outputRange: ['-30deg', '30deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 80,
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
  /** Whether particles tumble as they rise. Default true. */
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
  const { width } = useWindowDimensions();

  // Roll a fresh pattern, duration and arc height every time `visible`
  // toggles on. Memoizing on `visible` (not pattern/intensity) means each
  // fire is structurally distinct — same intensity, different shape.
  const fireConfig = useMemo(() => {
    if (!visible) return null;
    const chosenPattern: ShowerPattern =
      pattern ?? ALL_PATTERNS[Math.floor(Math.random() * ALL_PATTERNS.length)]!;
    const cfg = INTENSITY_CONFIG[intensity];
    const durationMs = Math.round(jitter(cfg.baseDuration, 0.12));
    const arcHeight = Math.round(jitter(cfg.arcHeight, 0.18));
    const particles = makeParticles(width, intensity, chosenPattern, emojiPool, spin);
    return { particles, durationMs, arcHeight, durationTotal: durationMs };
  }, [visible, intensity, pattern, width, emojiPool, spin]);

  useEffect(() => {
    if (!visible || !fireConfig) return;
    if (haptic === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (haptic === 'medium') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (haptic === 'light') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const cfg = INTENSITY_CONFIG[intensity];
    const total = cfg.delaySpread + fireConfig.durationTotal + 500;
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
        <FloatingParticle
          key={i}
          p={p}
          durationMs={fireConfig.durationMs}
          arcHeight={fireConfig.arcHeight}
        />
      ))}
      {children}
    </View>
  );
}
