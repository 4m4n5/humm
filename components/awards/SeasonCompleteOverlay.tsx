import React, { useEffect, useRef } from 'react';
import { Text, Pressable, Animated, Easing } from 'react-native';
import { MODAL_SHEET_PADDING_H, MODAL_SHEET_PADDING_V } from '@/constants/screenLayout';

export function SeasonCompleteOverlay(props: {
  xpEach: number;
  visible: boolean;
  onDone: () => void;
  autoDismissMs?: number;
}) {
  const { xpEach, visible, onDone, autoDismissMs = 2800 } = props;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const trophy = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    scale.setValue(0.88);
    trophy.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(trophy, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    const t = setTimeout(onDone, autoDismissMs);
    return () => clearTimeout(t);
  }, [visible, autoDismissMs, onDone, opacity, scale, trophy]);

  if (!visible) return null;

  const trophyScale = trophy.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  return (
    <Pressable
      onPress={onDone}
      className="absolute inset-0 z-[100] items-center justify-center bg-black/75 px-6"
    >
      <Animated.View
        style={[
          {
            opacity,
            transform: [{ scale }],
            paddingHorizontal: MODAL_SHEET_PADDING_H,
            paddingVertical: MODAL_SHEET_PADDING_V,
          },
        ]}
        className="w-full max-w-sm overflow-hidden rounded-[22px] border border-hum-border/18 bg-hum-card"
      >
        <Animated.View
          style={{
            transform: [{ scale: trophyScale }],
            alignSelf: 'center',
          }}
        >
          <Text className="text-center text-[58px] leading-[66px]">🏆</Text>
        </Animated.View>
        <Text
          className="mt-3 text-center text-xl font-medium text-hum-text"
          maxFontSizeMultiplier={1.25}
        >
          you did the thing
        </Text>
        <Text
          className="mt-3 text-center text-[15px] font-light leading-[22px] text-hum-muted"
          maxFontSizeMultiplier={1.35}
        >
          +{xpEach} xp each · tap through
        </Text>
      </Animated.View>
    </Pressable>
  );
}
