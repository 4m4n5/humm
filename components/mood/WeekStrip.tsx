import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import type { MoodEntry } from '@/types';
import { localDayKey, offsetLocalDayKey } from '@/lib/dateKeys';
import { cardShadow } from '@/constants/elevation';

type Props = {
  myEntries: MoodEntry[];
  partnerEntries: MoodEntry[];
  myLabel: string;
  partnerLabel: string;
};

const SHORT_DAY = ['s', 'm', 't', 'w', 't', 'f', 's'];

function dayLetterFromKey(dk: string): string {
  const [y, m, d] = dk.split('-').map(Number);
  return SHORT_DAY[new Date(y, m - 1, d).getDay()]!;
}

function last7DayKeys(): string[] {
  const today = localDayKey();
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    keys.push(offsetLocalDayKey(today, -i));
  }
  return keys;
}

function Cell({
  emoji,
  inSync,
}: {
  emoji: string | undefined;
  inSync: boolean;
}) {
  const filled = !!emoji;
  return (
    <View className="flex-1 items-center">
      <View
        className={`h-[34px] w-[34px] items-center justify-center rounded-[11px] ${
          filled
            ? inSync
              ? 'bg-hum-primary/22'
              : 'bg-hum-bg/55'
            : 'bg-hum-bg/30'
        }`}
      >
        {filled ? (
          <Text className="text-[16px]" allowFontScaling={false}>
            {emoji}
          </Text>
        ) : (
          <View
            className="rounded-full bg-hum-dim/30"
            style={{ height: 3, width: 3 }}
          />
        )}
      </View>
    </View>
  );
}

export function WeekStrip({ myEntries, partnerEntries, myLabel, partnerLabel }: Props) {
  const dayKeys = useMemo(last7DayKeys, []);
  const myMap = useMemo(() => {
    const m = new Map<string, MoodEntry>();
    for (const e of myEntries) m.set(e.dayKey, e);
    return m;
  }, [myEntries]);
  const partnerMap = useMemo(() => {
    const m = new Map<string, MoodEntry>();
    for (const e of partnerEntries) m.set(e.dayKey, e);
    return m;
  }, [partnerEntries]);

  const todayKey = localDayKey();

  return (
    <View
      className="overflow-hidden rounded-[22px] border border-hum-secondary/20 bg-hum-card px-4 py-4"
      style={cardShadow}
    >
      <View className="gap-y-3.5">
        {/* day letters */}
        <View className="flex-row items-center gap-x-2.5">
          <View className="w-12" />
          <View className="flex-1 flex-row justify-between">
            {dayKeys.map((dk) => {
              const isToday = dk === todayKey;
              return (
                <View key={`l-${dk}`} className="flex-1 items-center">
                  <Text
                    className={`text-[10px] ${
                      isToday
                        ? 'font-semibold text-hum-secondary'
                        : 'font-light text-hum-dim/60'
                    }`}
                    allowFontScaling={false}
                  >
                    {dayLetterFromKey(dk)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* mood rows — today is signaled solely by the illuminated letter above */}
        <View className="gap-y-2">
          <Row
            label={myLabel}
            dayKeys={dayKeys}
            entries={myMap}
            partnerEntries={partnerMap}
          />
          <Row
            label={partnerLabel}
            dayKeys={dayKeys}
            entries={partnerMap}
            partnerEntries={myMap}
          />
        </View>
      </View>
    </View>
  );
}

function Row({
  label,
  dayKeys,
  entries,
  partnerEntries,
}: {
  label: string;
  dayKeys: string[];
  entries: Map<string, MoodEntry>;
  partnerEntries: Map<string, MoodEntry>;
}) {
  return (
    <View className="flex-row items-center gap-x-2.5">
      <Text
        className="w-12 pl-1 text-[11px] font-light lowercase tracking-[-0.005em] text-hum-dim"
        numberOfLines={1}
      >
        {label}
      </Text>
      <View className="flex-1 flex-row justify-between">
        {dayKeys.map((dk) => {
          const me = entries.get(dk);
          const them = partnerEntries.get(dk);
          const inSync =
            !!me && !!them && me.current.stickerId === them.current.stickerId;
          return (
            <Cell key={dk} emoji={me?.current.emoji} inSync={inSync} />
          );
        })}
      </View>
    </View>
  );
}

