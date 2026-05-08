import React, { useEffect, useMemo, useCallback, memo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export type ShowerIntensity = 'gentle' | 'standard' | 'lavish';
export type ShowerPattern = 'fountain' | 'rain' | 'sides' | 'burst';

const INTENSITY_CONFIG: Record<
  ShowerIntensity,
  {
    count: [number, number];
    baseDuration: number;
    arcHeight: number;
    sizeMin: number;
    sizeRange: number;
    delaySpread: number;
  }
> = {
  gentle: {
    count: [12, 18],
    baseDuration: 2700,
    arcHeight: 400,
    sizeMin: 22,
    sizeRange: 14,
    delaySpread: 360,
  },
  standard: {
    count: [18, 26],
    baseDuration: 3500,
    arcHeight: 550,
    sizeMin: 24,
    sizeRange: 16,
    delaySpread: 460,
  },
  lavish: {
    count: [30, 42],
    baseDuration: 3900,
    arcHeight: 650,
    sizeMin: 26,
    sizeRange: 20,
    delaySpread: 560,
  },
};

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const ALL_PATTERNS: ShowerPattern[] = ['fountain', 'rain', 'sides', 'burst'];

type ParticleDirection = 'up' | 'down' | 'horizontal';

type Particle = {
  emoji: string;
  startLeft: number;
  startTop: number;
  driftX: number;
  delay: number;
  size: number;
  spin: number;
  rise: number;
  direction: ParticleDirection;
};

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

function makeParticles(
  width: number,
  height: number,
  intensity: ShowerIntensity,
  pattern: ShowerPattern,
  emojiPool: string[],
  spinEnabled: boolean,
): Particle[] {
  const cfg = INTENSITY_CONFIG[intensity];
  const particleCount = randInt(cfg.count[0], cfg.count[1]);
  const subsetSize = intensity === 'lavish' ? 8 : intensity === 'gentle' ? 5 : 6;
  const subset = pickSubset(emojiPool, subsetSize);

  return Array.from({ length: particleCount }).map(() => {
    const emoji = subset[Math.floor(Math.random() * subset.length)]!;
    let startLeft: number;
    let startTop: number;
    let driftX: number;
    let direction: ParticleDirection;

    switch (pattern) {
      case 'fountain': {
        direction = 'up';
        const center = width / 2;
        const span = width * 0.55;
        startLeft = center - span / 2 + Math.random() * span;
        startTop = height + 20 + Math.random() * 30;
        driftX = (Math.random() - 0.5) * 100;
        break;
      }
      case 'rain': {
        direction = 'down';
        startLeft = Math.random() * (width - 32);
        startTop = -(30 + Math.random() * 40);
        driftX = (Math.random() - 0.5) * 100;
        break;
      }
      case 'sides': {
        direction = 'horizontal';
        const fromLeft = Math.random() < 0.5;
        startLeft = fromLeft ? -(20 + Math.random() * 20) : width + Math.random() * 20;
        startTop = height * 0.15 + Math.random() * (height * 0.6);
        driftX = fromLeft
          ? 160 + Math.random() * 220
          : -(160 + Math.random() * 220);
        break;
      }
      case 'burst': {
        direction = 'up';
        const center = width / 2;
        const span = width * 0.25;
        startLeft = center - span / 2 + Math.random() * span;
        startTop = height + 20 + Math.random() * 20;
        driftX = (startLeft < center ? -1 : 1) * (80 + Math.random() * 180);
        break;
      }
    }

    return {
      emoji,
      startLeft,
      startTop,
      driftX,
      delay: Math.pow(Math.random(), 2.2) * cfg.delaySpread,
      size: cfg.sizeMin + Math.random() * cfg.sizeRange,
      spin: spinEnabled ? (Math.random() - 0.5) * 30 : 0,
      rise: 0.7 + Math.random() * 0.55,
      direction,
    };
  });
}

const EASE_OUT_EXP = Easing.out(Easing.exp);
const EASE_IN_QUAD = Easing.in(Easing.quad);
const EASE_INOUT_SIN = Easing.inOut(Easing.sin);

const FloatingParticle = memo(function FloatingParticle({
  p,
  durationMs,
  arcHeight,
  screenH,
}: {
  p: Particle;
  durationMs: number;
  arcHeight: number;
  screenH: number;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    const riseFrac = 0.38;
    const fallFrac = 0.62;

    scale.value = withDelay(
      p.delay,
      withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.back(1.6)),
        reduceMotion: ReduceMotion.Never,
      }),
    );

    switch (p.direction) {
      case 'up': {
        const peakY = -arcHeight * p.rise;
        const landY = peakY + arcHeight * 0.55;
        translateY.value = withDelay(
          p.delay,
          withSequence(
            withTiming(peakY, {
              duration: durationMs * riseFrac,
              easing: EASE_OUT_EXP,
              reduceMotion: ReduceMotion.Never,
            }),
            withTiming(landY, {
              duration: durationMs * fallFrac,
              easing: EASE_IN_QUAD,
              reduceMotion: ReduceMotion.Never,
            }),
          ),
        );
        break;
      }
      case 'down': {
        const fallDist = Math.max(arcHeight * p.rise, screenH * 0.65);
        const phase1Y = fallDist * 0.62;
        translateY.value = withDelay(
          p.delay,
          withSequence(
            withTiming(phase1Y, {
              duration: durationMs * riseFrac,
              easing: EASE_OUT_EXP,
              reduceMotion: ReduceMotion.Never,
            }),
            withTiming(fallDist, {
              duration: durationMs * fallFrac,
              easing: EASE_IN_QUAD,
              reduceMotion: ReduceMotion.Never,
            }),
          ),
        );
        break;
      }
      case 'horizontal': {
        const drift = 50 + Math.random() * 80;
        translateY.value = withDelay(
          p.delay,
          withSequence(
            withTiming(drift * 0.62, {
              duration: durationMs * riseFrac,
              easing: EASE_OUT_EXP,
              reduceMotion: ReduceMotion.Never,
            }),
            withTiming(drift, {
              duration: durationMs * fallFrac,
              easing: EASE_IN_QUAD,
              reduceMotion: ReduceMotion.Never,
            }),
          ),
        );
        break;
      }
    }

    const xEasing = p.direction === 'horizontal' ? EASE_OUT_EXP : EASE_INOUT_SIN;
    translateX.value = withDelay(
      p.delay,
      withTiming(p.driftX, {
        duration: durationMs,
        easing: xEasing,
        reduceMotion: ReduceMotion.Never,
      }),
    );

    rotate.value = withDelay(
      p.delay,
      withTiming(p.spin, {
        duration: durationMs,
        easing: EASE_INOUT_SIN,
        reduceMotion: ReduceMotion.Never,
      }),
    );

    const fadeInMs = 200;
    const fadeOutMs = 550;
    const holdMs = Math.max(durationMs - fadeInMs - fadeOutMs, 0);

    opacity.value = withDelay(
      p.delay,
      withSequence(
        withTiming(1, { duration: fadeInMs, reduceMotion: ReduceMotion.Never }),
        withDelay(
          holdMs,
          withTiming(0, { duration: fadeOutMs, reduceMotion: ReduceMotion.Never }),
        ),
      ),
    );
  }, [translateY, translateX, opacity, rotate, scale, p, durationMs, arcHeight, screenH]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: p.startTop,
          left: p.startLeft,
        },
        animStyle,
      ]}
    >
      <Text style={{ fontSize: p.size }} allowFontScaling={false}>
        {p.emoji}
      </Text>
    </Animated.View>
  );
});

type Props = {
  visible: boolean;
  onFinished: () => void;
  emojiPool: string[];
  intensity?: ShowerIntensity;
  pattern?: ShowerPattern;
  spin?: boolean;
  children?: React.ReactNode;
  haptic?: 'success' | 'medium' | 'light' | 'none';
  /** Change this value to force a fresh particle batch even when `visible` stays true. */
  fireKey?: string | number;
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
  fireKey,
}: Props) {
  const { width, height } = useWindowDimensions();

  const fireConfig = useMemo(() => {
    if (!visible) return null;
    const chosenPattern: ShowerPattern =
      pattern ?? ALL_PATTERNS[Math.floor(Math.random() * ALL_PATTERNS.length)]!;
    const cfg = INTENSITY_CONFIG[intensity];
    const durationMs = Math.round(jitter(cfg.baseDuration, 0.10));
    const arcHeight = Math.round(jitter(cfg.arcHeight, 0.15));
    const particles = makeParticles(
      width, height, intensity, chosenPattern, emojiPool, spin,
    );
    return { particles, durationMs, arcHeight, durationTotal: durationMs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, fireKey]);

  const fireHaptic = useCallback(() => {
    if (haptic === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (haptic === 'medium') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (haptic === 'light') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [haptic]);

  useEffect(() => {
    if (!visible || !fireConfig) return;
    const hapticTimer = setTimeout(fireHaptic, 120);
    const cfg = INTENSITY_CONFIG[intensity];
    const total = cfg.delaySpread + fireConfig.durationTotal + 300;
    const t = setTimeout(onFinished, total);
    return () => {
      clearTimeout(t);
      clearTimeout(hapticTimer);
    };
  }, [visible, fireConfig, onFinished, fireHaptic, intensity]);

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
          screenH={height}
        />
      ))}
      {children}
    </View>
  );
}
