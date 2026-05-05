import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import type { MoodEntry } from '@/types';
import { localDayKey, offsetLocalDayKey } from '@/lib/dateKeys';
import { cardShadow } from '@/constants/elevation';
import { SectionLabel } from '@/components/habits/SectionLabel';

type Props = {
  myEntries: MoodEntry[];
  partnerEntries: MoodEntry[];
};

const DAY_ABBREVS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function last7DayKeys(): string[] {
  const today = localDayKey();
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    keys.push(offsetLocalDayKey(today, -i));
  }
  return keys;
}

/** Seven-day glance — circular dots (no square wells). */
export function WeekStrip({ myEntries, partnerEntries }: Props) {
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

  const LetterRow = (
    <View className="flex-row justify-between">
      {dayKeys.map((dk, i) => {
        const isToday = dk === todayKey;
        return (
          <View key={`l-${dk}`} className="flex-1 items-center">
            <Text
              className={`text-[9px] font-semibold ${isToday ? 'text-hum-primary' : 'text-hum-dim'}`}
              maxFontSizeMultiplier={1.1}
            >
              {DAY_ABBREVS[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const EmojiRow = (getter: (dk: string) => MoodEntry | undefined) => (
    <View className="flex-row justify-between">
      {dayKeys.map((dk) => {
        const e = getter(dk);
        const isToday = dk === todayKey;
        return (
          <View key={dk} className="flex-1 items-center">
            <View
              className={`h-9 w-9 items-center justify-center rounded-full ${
                isToday ? 'border-2 border-hum-primary/30 bg-hum-primary/[0.08]' : 'bg-hum-surface/40'
              }`}
            >
              <Text className="text-[13px]" allowFontScaling={false}>
                {e?.current.emoji ?? '·'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View
      className="gap-y-3 rounded-[28px] border border-hum-border/18 bg-hum-card px-4 py-4"
      style={cardShadow}
    >
      <SectionLabel title="week" />
      {LetterRow}
      <View className="gap-y-2 pt-0.5">
        {EmojiRow((dk) => myMap.get(dk))}
        {EmojiRow((dk) => partnerMap.get(dk))}
      </View>
    </View>
  );
}
