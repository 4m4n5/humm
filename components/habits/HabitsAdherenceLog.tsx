import React, { useMemo } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { cardShadow } from '@/constants/elevation';
import {
  activeDailyHabits,
  hasDailyCheckin,
  indexHabitCheckins,
} from '@/lib/habitStreakLogic';
import {
  localWeekKey,
  offsetLocalDayKey,
  weekLocalDayKeysFromMonday,
} from '@/lib/dateKeys';
import type { Habit, HabitCheckin } from '@/types';

const WEEKS = 6;
const DAY_LETTERS = ['m', 't', 'w', 't', 'f', 's', 's'] as const;

type Props = {
  habits: Habit[];
  rangeCheckins: HabitCheckin[];
  myUid: string;
  partnerId: string;
  todayKey: string;
};

type Cell = {
  dayKey: string;
  future: boolean;
  isToday: boolean;
  combinedPct: number;
  bothAll: boolean;
  hasObligations: boolean;
};

function buildGrid({
  habits,
  rangeCheckins,
  myUid,
  partnerId,
  todayKey,
}: Props): Cell[][] {
  const dailyCheckins = rangeCheckins.filter((c) => c.cadence === 'daily');
  const keys = indexHabitCheckins(dailyCheckins);

  const dailies = activeDailyHabits(habits);
  const sharedDailies = dailies.filter((h) => h.scope === 'shared');
  const myPersonalDailies = dailies.filter(
    (h) => h.scope === 'personal' && h.createdBy === myUid,
  );
  const partnerPersonalDailies = partnerId
    ? dailies.filter(
        (h) => h.scope === 'personal' && h.createdBy === partnerId,
      )
    : [];

  const myOwed = sharedDailies.length + myPersonalDailies.length;
  const partnerOwed = partnerId
    ? sharedDailies.length + partnerPersonalDailies.length
    : 0;
  const totalOwed = myOwed + partnerOwed;

  const thisMonday = localWeekKey();
  const startMonday = offsetLocalDayKey(thisMonday, -7 * (WEEKS - 1));

  const grid: Cell[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const weekMon = offsetLocalDayKey(startMonday, w * 7);
    const days = weekLocalDayKeysFromMonday(weekMon);
    const row = days.map<Cell>((dk) => {
      const future = dk > todayKey;
      const isToday = dk === todayKey;
      if (future) {
        return {
          dayKey: dk,
          future: true,
          isToday: false,
          combinedPct: 0,
          bothAll: false,
          hasObligations: false,
        };
      }
      let myDone = 0;
      let partnerDone = 0;
      for (const h of sharedDailies) {
        if (hasDailyCheckin(keys, h.id, myUid, dk)) myDone += 1;
        if (partnerId && hasDailyCheckin(keys, h.id, partnerId, dk)) {
          partnerDone += 1;
        }
      }
      for (const h of myPersonalDailies) {
        if (hasDailyCheckin(keys, h.id, myUid, dk)) myDone += 1;
      }
      if (partnerId) {
        for (const h of partnerPersonalDailies) {
          if (hasDailyCheckin(keys, h.id, partnerId, dk)) partnerDone += 1;
        }
      }
      const combinedPct =
        totalOwed > 0 ? (myDone + partnerDone) / totalOwed : 0;
      const bothAll =
        myOwed > 0 &&
        partnerOwed > 0 &&
        myDone === myOwed &&
        partnerDone === partnerOwed;
      return {
        dayKey: dk,
        future: false,
        isToday,
        combinedPct,
        bothAll,
        hasObligations: totalOwed > 0,
      };
    });
    grid.push(row);
  }
  return grid;
}

function cellClasses(cell: Cell): { bg: string; border: string } {
  if (cell.future) {
    return { bg: 'bg-transparent', border: 'border-transparent' };
  }
  if (!cell.hasObligations) {
    return { bg: 'bg-hum-surface/20', border: 'border-transparent' };
  }
  if (cell.bothAll) {
    return {
      bg: 'bg-hum-crimson/75',
      border: cell.isToday ? 'border-hum-crimson' : 'border-transparent',
    };
  }
  let bg: string;
  if (cell.combinedPct === 0) bg = 'bg-hum-surface/20';
  else if (cell.combinedPct < 0.34) bg = 'bg-hum-primary/20';
  else if (cell.combinedPct < 0.67) bg = 'bg-hum-primary/40';
  else if (cell.combinedPct < 1) bg = 'bg-hum-primary/60';
  else bg = 'bg-hum-primary/82';
  return {
    bg,
    border: cell.isToday ? 'border-hum-primary' : 'border-transparent',
  };
}

const GAP = 4;

function HeatmapCell({ cell, size }: { cell: Cell; size: number }) {
  const { bg, border } = cellClasses(cell);
  return (
    <View
      className={`rounded-[4px] border ${bg} ${border}`}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
    />
  );
}

function LegendDot({ bg }: { bg: string }) {
  return <View className={`h-[8px] w-[8px] rounded-[2px] ${bg}`} />;
}

export function HabitsAdherenceLog(props: Props) {
  const { width: screenW } = useWindowDimensions();
  const dailies = useMemo(
    () => activeDailyHabits(props.habits),
    [props.habits],
  );

  const grid = useMemo(() => buildGrid(props), [props]);

  if (dailies.length === 0) return null;

  const cardPadH = 24;
  const scrollPadH = 24;
  const available = screenW - scrollPadH * 2 - cardPadH * 2;
  const cellSize = Math.min(Math.floor((available - GAP * 6) / 7), 34);
  const gridW = cellSize * 7 + GAP * 6;

  return (
    <View className="gap-y-2.5">
      <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
        log
      </Text>
      <View
        accessibilityRole="summary"
        accessibilityLabel="six-week habit adherence heatmap"
        className="items-center overflow-hidden rounded-[22px] border border-hum-border/18 bg-hum-card py-3.5"
        style={cardShadow}
      >
        {/* Day-of-week header */}
        <View className="mb-2 flex-row" style={{ gap: GAP, width: gridW }}>
          {DAY_LETTERS.map((l, i) => (
            <View key={`l-${i}`} style={{ width: cellSize }} className="items-center">
              <Text
                className="text-[9px] font-medium text-hum-dim/40"
                allowFontScaling={false}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>

        {/* Heatmap rows */}
        <View style={{ gap: GAP }}>
          {grid.map((row, ri) => (
            <View key={`r-${ri}`} className="flex-row" style={{ gap: GAP }}>
              {row.map((c) => (
                <HeatmapCell key={c.dayKey} cell={c} size={cellSize} />
              ))}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View className="mt-3 flex-row items-center justify-center gap-x-3">
          <View className="flex-row items-center gap-x-[2.5px]">
            <Text className="mr-0.5 text-[9px] font-light text-hum-dim/40" allowFontScaling={false}>
              less
            </Text>
            <LegendDot bg="bg-hum-surface/25" />
            <LegendDot bg="bg-hum-primary/25" />
            <LegendDot bg="bg-hum-primary/45" />
            <LegendDot bg="bg-hum-primary/70" />
            <Text className="ml-0.5 text-[9px] font-light text-hum-dim/40" allowFontScaling={false}>
              more
            </Text>
          </View>
          <View className="flex-row items-center gap-x-[2.5px]">
            <LegendDot bg="bg-hum-crimson/75" />
            <Text className="ml-0.5 text-[9px] font-light text-hum-dim/40" allowFontScaling={false}>
              both done
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
