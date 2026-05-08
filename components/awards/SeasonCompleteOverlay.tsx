import React, { useEffect } from 'react';
import { Text, Pressable } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MODAL_SHEET_PADDING_H, MODAL_SHEET_PADDING_V } from '@/constants/screenLayout';
import {
  REDUCE_MOTION_NEVER,
  SPRING_EXPRESSIVE_BLOOM,
  SPRING_EXPRESSIVE_ENTRANCE,
} from '@/lib/motion';

const TROPHY_DELAY_MS = 100;

export function SeasonCompleteOverlay(props: {
  xpEach: number;
  visible: boolean;
  onDone: () => void;
  autoDismissMs?: number;
  waitingForPartner?: boolean;
}) {
  const { xpEach, visible, onDone, autoDismissMs = 2800, waitingForPartner } = props;
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);
  const trophy = useSharedValue(0.55);

  useEffect(() => {
    if (!visible) return;
    cancelAnimation(opacity);
    cancelAnimation(scale);
    cancelAnimation(trophy);
    opacity.value = 0;
    scale.value = 0.88;
    trophy.value = 0.55;

    opacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
      reduceMotion: REDUCE_MOTION_NEVER,
    });
    scale.value = withSpring(1, {
      ...SPRING_EXPRESSIVE_ENTRANCE,
      reduceMotion: REDUCE_MOTION_NEVER,
    });
    trophy.value = withDelay(
      TROPHY_DELAY_MS,
      withSpring(1, {
        ...SPRING_EXPRESSIVE_BLOOM,
        reduceMotion: REDUCE_MOTION_NEVER,
      }),
    );

    const t = setTimeout(onDone, autoDismissMs);
    return () => clearTimeout(t);
  }, [visible, autoDismissMs, onDone, opacity, scale, trophy]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophy.value }],
  }));

  if (!visible) return null;

  return (
    <Pressable
      onPress={onDone}
      accessibilityRole="button"
      accessibilityLabel="dismiss season complete celebration"
      className="absolute inset-0 z-[100] items-center justify-center bg-black/75 px-6"
    >
      <Animated.View
        style={[
          {
            paddingHorizontal: MODAL_SHEET_PADDING_H,
            paddingVertical: MODAL_SHEET_PADDING_V,
          },
          cardStyle,
        ]}
        className="w-full max-w-sm overflow-hidden rounded-[22px] border border-hum-border/18 bg-hum-card"
      >
        <Animated.View style={[{ alignSelf: 'center' }, trophyStyle]}>
          <Text className="text-center text-[58px] leading-[66px]">🏆</Text>
        </Animated.View>
        <Text
          className="mt-3 text-center text-xl font-medium text-hum-text"
          maxFontSizeMultiplier={1.25}
        >
          {waitingForPartner ? 'your part is done' : 'you did the thing'}
        </Text>
        <Text
          className="mt-3 text-center text-[15px] font-light leading-[22px] text-hum-muted"
          maxFontSizeMultiplier={1.35}
        >
          {waitingForPartner
            ? 'waiting for your partner to cheer too'
            : `+${xpEach} xp each · tap through`}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
