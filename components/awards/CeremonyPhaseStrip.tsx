import React from 'react';
import { View, Text } from 'react-native';
import { CeremonyStatus } from '@/types';
import { theme } from '@/constants/theme';

type PhaseKey = 'nominate' | 'align' | 'cheer';

const PHASES: { key: PhaseKey; emoji: string; word: string }[] = [
  { key: 'nominate', emoji: '✍️', word: 'nominate' },
  { key: 'align', emoji: '🤝', word: 'align' },
  { key: 'cheer', emoji: '✨', word: 'cheer' },
];

function activePhase(
  status: CeremonyStatus | undefined,
  revealUnlocked: boolean,
): PhaseKey {
  if (!status || status === 'nominating') return 'nominate';
  if (status === 'deliberating') return 'align';
  if (status === 'voting') return revealUnlocked ? 'cheer' : 'align';
  if (status === 'complete') return 'cheer';
  return 'nominate';
}

export function CeremonyPhaseStrip(props: {
  status: CeremonyStatus | undefined;
  revealUnlocked: boolean;
}) {
  const allDone = props.status === 'complete';
  const current = activePhase(props.status, props.revealUnlocked);
  const currentIdx = PHASES.findIndex((p) => p.key === current);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`awards ceremony progress: ${PHASES.find((p) => p.key === current)?.word ?? current} phase`}
      className="bg-transparent px-4 py-3.5"
    >
      <View className="flex-row gap-x-0.5">
        {PHASES.map((p, i) => {
          const on = !allDone && p.key === current;
          const done = allDone || i < currentIdx;
          return (
            <View key={p.key} className="min-w-0 flex-1 items-center gap-y-1.5">
              <View className="h-9 w-full items-center justify-center">
                <Text
                  className={on ? 'text-xl' : 'text-lg'}
                  style={[
                    on ? { transform: [{ scale: 1.06 }] } : undefined,
                    !on && !done ? { opacity: 0.32 } : undefined,
                  ]}
                >
                  {p.emoji}
                </Text>
              </View>
              <Text
                className="text-center text-[10px] font-medium uppercase leading-[13px] tracking-[0.26em]"
                style={{
                  color: on ? theme.gold : done ? theme.muted : `${theme.dim}66`,
                }}
                maxFontSizeMultiplier={1.2}
              >
                {p.word}
              </Text>
              <View
                className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full"
                style={{ backgroundColor: `${theme.border}40` }}
              >
                {done ? (
                  <View
                    className="h-full w-full rounded-full"
                    style={{ backgroundColor: `${theme.muted}40` }}
                  />
                ) : on ? (
                  <View
                    className="h-full w-full rounded-full"
                    style={{ backgroundColor: `${theme.gold}B3` }}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
