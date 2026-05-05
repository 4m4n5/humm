import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const PARTICLE_COUNT = 22;
const EMOJIS = ['✨', '💛', '🤝', '🌟', '💜', '✦'];
const DURATION = 2200;

type Particle = {
  emoji: string;
  startX: number;
  drift: number;
  delay: number;
  size: number;
};

function makeParticles(screenWidth: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }).map(() => ({
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!,
    startX: Math.random() * (screenWidth - 32),
    // Tighter sway than reasons → sparkles shoot upward, they don't tumble.
    drift: (Math.random() - 0.5) * 60,
    delay: Math.random() * 300,
    size: 16 + Math.random() * 16,
  }));
}

function FloatingParticle({ p }: { p: Particle }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

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
  }, [translateY, translateX, opacity, p.delay, p.drift]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 80,
        left: p.startX,
        opacity,
        transform: [{ translateY }, { translateX }],
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
        // Snappier overshoot than the previous pass → the badge pops in.
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
      className="items-center gap-1.5 rounded-3xl border border-hum-secondary/40 bg-hum-card/95 px-7 py-4"
    >
      <Text className="text-[40px]" allowFontScaling={false}>🎉</Text>
      <Text
        className="text-[15px] font-medium tracking-tight text-hum-text"
        allowFontScaling={false}
      >
        in sync!
      </Text>
    </Animated.View>
  );
}

type Props = {
  visible: boolean;
  onFinished: () => void;
};

export function InSyncCelebration({ visible, onFinished }: Props) {
  const { width } = useWindowDimensions();
  const particles = useMemo(() => (visible ? makeParticles(width) : []), [visible, width]);

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
