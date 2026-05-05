import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { reasonsVoice } from '@/constants/hummVoice';

/**
 * Sibling celebration to `InSyncCelebration` (habits). Same architectural
 * shape so both moments feel like they live in the same family, but tuned
 * to feel _more_ generous, not gentler — writing for your person should
 * land at least as exciting as a co-completed habit.
 *
 *   - denser shower (22 vs habits' 18) → abundance reads as generosity
 *   - taller, faster arc (translateY -380 over 2200ms) → punchier launch
 *   - tighter timing window (delays up to 300ms) → unified opening burst
 *   - heart-forward palette + petal-tinted badge → unmistakably "reasons"
 *   - subtle per-particle rotation → petals/notes tumbling, not just rising
 *   - badge pops with an over-shoot spring + heart anchor (💖) for warmth
 */

const PARTICLE_COUNT = 22;
const EMOJIS = ['💖', '💕', '💞', '💝', '🌹', '✨', '💗', '💌', '✦'];
const DURATION = 2200;

type Particle = {
  emoji: string;
  startX: number;
  drift: number;
  delay: number;
  size: number;
  spin: number;
};

function makeParticles(screenWidth: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }).map(() => ({
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!,
    startX: Math.random() * (screenWidth - 32),
    // Slightly more sway than habits for a "petals tumbling up" feel,
    // but tight enough that the upward arc still dominates.
    drift: (Math.random() - 0.5) * 75,
    delay: Math.random() * 300,
    size: 16 + Math.random() * 16,
    spin: (Math.random() - 0.5) * 18,
  }));
}

function FloatingParticle({ p }: { p: Particle }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(p.delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -380,
          duration: DURATION,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: p.drift,
          duration: DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: p.spin,
          duration: DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 240,
            useNativeDriver: true,
          }),
          Animated.delay(DURATION - 880),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 640,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [translateY, translateX, opacity, rotate, p.delay, p.drift, p.spin]);

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

function CenterBadge() {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(160),
      Animated.parallel([
        // Snappier overshoot than habits → the badge "pops" rather than blooms.
        Animated.spring(scale, {
          toValue: 1,
          friction: 3.5,
          tension: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1300),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        alignSelf: 'center',
        top: '38%',
        opacity,
        transform: [{ scale }],
      }}
      className="items-center gap-1.5 rounded-3xl border border-hum-petal/40 bg-hum-card/95 px-7 py-4"
    >
      <Text className="text-[40px]" allowFontScaling={false}>
        💖
      </Text>
      <Text
        className="text-[15px] font-medium tracking-tight text-hum-text"
        allowFontScaling={false}
      >
        {reasonsVoice.rewardMomentHint}
      </Text>
    </Animated.View>
  );
}

type Props = {
  visible: boolean;
  onFinished: () => void;
};

export function ReasonWrittenCelebration({ visible, onFinished }: Props) {
  const { width } = useWindowDimensions();
  const particles = useMemo(
    () => (visible ? makeParticles(width) : []),
    [visible, width],
  );

  useEffect(() => {
    if (!visible) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const t = setTimeout(onFinished, DURATION + 600);
    return () => clearTimeout(t);
  }, [visible, onFinished]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 z-40"
      style={{ overflow: 'hidden' }}
    >
      {particles.map((p, i) => (
        <FloatingParticle key={i} p={p} />
      ))}
      <CenterBadge />
    </View>
  );
}
