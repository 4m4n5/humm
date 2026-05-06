import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { BattleMatchup } from '@/types';
import { bracketProgress } from '@/lib/battleLogic';
import { theme } from '@/constants/theme';

type Props = {
  bracket: BattleMatchup[];
  currentIdx: number;
};

function PulseDot({ active }: { active: boolean }) {
  const o = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(o, {
            toValue: 0.35,
            duration: 550,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(o, {
            toValue: 1,
            duration: 550,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    o.setValue(1);
    return undefined;
  }, [active, o]);

  return (
    <Animated.View
      style={{ opacity: o }}
      className="h-2.5 w-2.5 rounded-full bg-hum-spark"
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
