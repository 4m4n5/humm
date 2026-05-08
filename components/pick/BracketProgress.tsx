import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PickMatchup } from '@/types';
import { bracketProgress } from '@/lib/pickLogic';
import { theme } from '@/constants/theme';
import { REDUCE_MOTION_NEVER } from '@/lib/motion';

type Props = {
  bracket: PickMatchup[];
  currentIdx: number;
};

const PULSE_HALF_MS = 550;

function PulseDot({ active }: { active: boolean }) {
  const o = useSharedValue(1);

  useEffect(() => {
    if (active) {
      o.value = 1;
      o.value = withRepeat(
        withSequence(
          withTiming(0.35, {
            duration: PULSE_HALF_MS,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: REDUCE_MOTION_NEVER,
          }),
          withTiming(1, {
            duration: PULSE_HALF_MS,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: REDUCE_MOTION_NEVER,
          }),
        ),
        -1,
      );
      return () => {
        cancelAnimation(o);
        o.value = 1;
      };
    }
    cancelAnimation(o);
    o.value = 1;
    return undefined;
  }, [active, o]);

  const animStyle = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Animated.View
      style={animStyle}
      className="h-2.5 w-2.5 rounded-full bg-hum-primary"
    />
  );
}

export function BracketProgress({ bracket, currentIdx }: Props) {
  if (bracket.length === 0) return null;
  const prog = bracketProgress(bracket, currentIdx);
  const cur = bracket[currentIdx];

  return (
    <View className="gap-y-3 px-1">
      <Text
        className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
        maxFontSizeMultiplier={1.25}
      >
        round {prog.currentRound + 1} · match {prog.matchInRound} of {prog.matchupsInRound}
      </Text>
      <View className="flex-row flex-wrap items-center justify-center gap-1.5">
        {bracket.map((m, i) => {
          const decided = !!m.winner;
          const active = i === currentIdx && !decided && cur != null;
          return (
            <View
              key={`${m.round}-${m.position}`}
              className="h-2.5 w-2.5 items-center justify-center"
            >
              {decided ? (
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: theme.secondary }}
                />
              ) : active ? (
                <PulseDot active />
              ) : (
                <View className="h-2 w-2 rounded-full bg-hum-border/50" />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
