import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const PARTICLE_COUNT = 18;
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
    drift: (Math.random() - 0.5) * 60,
    delay: Math.random() * 400,
    size: 14 + Math.random() * 12,
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
          toValue: -320,
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
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.delay(DURATION - 900),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 620,
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
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1400),
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
      className="items-center gap-1 rounded-3xl bg-hum-card/95 px-7 py-4"
    >
      <Text className="text-[32px]" allowFontScaling={false}>🎉</Text>
      <Text className="text-[15px] font-medium text-hum-text">in sync!</Text>
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
