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
  /** Fraction of shared habits the current user completed (0–1). */
  myPct: number;
  /** True when both partners finished all shared habits for the day. */
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

  const sharedDailies = activeDailyHabits(habits).filter(
    (h) => h.scope === 'shared',
  );

  const myOwed = sharedDailies.length;
  const partnerOwed = partnerId ? sharedDailies.length : 0;

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
          myPct: 0,
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
      const myPct = myOwed > 0 ? myDone / myOwed : 0;
      const bothAll =
        myOwed > 0 &&
        partnerOwed > 0 &&
        myDone === myOwed &&
        partnerDone === partnerOwed;
      return {
        dayKey: dk,
        future: false,
        isToday,
        myPct,
        bothAll,
        hasObligations: myOwed > 0,
      };
    });
    grid.push(row);
  }
  return grid;
}

// Inline rgba so colors are guaranteed — NativeWind can miss dynamic class strings.
const CELL_NONE = 'rgba(46,41,56,0.35)';       // hum-border at 35%
const CELL_SOME = 'rgba(232,160,154,0.40)';     // hum-primary at 40%
const CELL_DONE = 'rgba(232,160,154,0.85)';     // hum-primary at 85%
const CELL_BOTH = 'rgba(210,115,115,0.75)';     // hum-crimson at 75%
const BORDER_PRIMARY = '#E8A09A';
const BORDER_CRIMSON = '#D27373';

function cellStyle(cell: Cell): { bg: string; borderColor: string } {
  if (cell.future) return { bg: 'transparent', borderColor: 'transparent' };
  if (!cell.hasObligations) return { bg: CELL_NONE, borderColor: 'transparent' };
  if (cell.bothAll) {
    return { bg: CELL_BOTH, borderColor: cell.isToday ? BORDER_CRIMSON : 'transparent' };
  }
  const bg = cell.myPct >= 1 ? CELL_DONE : cell.myPct > 0 ? CELL_SOME : CELL_NONE;
  return { bg, borderColor: cell.isToday ? BORDER_PRIMARY : 'transparent' };
}

const GAP = 4;

function HeatmapCell({ cell, size }: { cell: Cell; size: number }) {
  const { bg, borderColor } = cellStyle(cell);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: bg,
        borderColor,
      }}
      accessibilityElementsHidden
    />
  );
}

function LegendDot({ color }: { color: string }) {
  return <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />;
}

export function HabitsAdherenceLog(props: Props) {
  const { width: screenW } = useWindowDimensions();
  const sharedDailies = useMemo(
    () => activeDailyHabits(props.habits).filter((h) => h.scope === 'shared'),
    [props.habits],
  );

  const grid = useMemo(() => buildGrid(props), [props]);

  if (sharedDailies.length === 0) return null;

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
                maxFontSizeMultiplier={1.25}
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
        <View className="mt-3 flex-row items-center justify-center gap-x-4">
          <View className="flex-row items-center gap-x-1.5">
            <LegendDot color={CELL_NONE} />
            <Text className="text-[9px] font-light text-hum-dim" maxFontSizeMultiplier={1.25}>
              none
            </Text>
          </View>
          <View className="flex-row items-center gap-x-1.5">
            <LegendDot color={CELL_SOME} />
            <Text className="text-[9px] font-light text-hum-dim" maxFontSizeMultiplier={1.25}>
              some
            </Text>
          </View>
          <View className="flex-row items-center gap-x-1.5">
            <LegendDot color={CELL_DONE} />
            <Text className="text-[9px] font-light text-hum-dim" maxFontSizeMultiplier={1.25}>
              you done
            </Text>
          </View>
          <View className="flex-row items-center gap-x-1.5">
            <LegendDot color={CELL_BOTH} />
            <Text className="text-[9px] font-light text-hum-dim" maxFontSizeMultiplier={1.25}>
              both done
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
