import React from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { HabitsView } from '@/lib/stores/habitStore';

type Props = {
  value: HabitsView;
  onChange: (v: HabitsView) => void;
};

const TABS: { id: HabitsView; label: string }[] = [
  { id: 'daily', label: 'today' },
  { id: 'weekly', label: 'week' },
];

export function HabitSegmentedControl({ value, onChange }: Props) {
  return (
    <View className="flex-row rounded-full border border-hum-border/25 bg-hum-card/45 p-[3px]">
      {TABS.map((t) => {
        const on = value === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => {
              if (!on) void Haptics.selectionAsync();
              onChange(t.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            className={`rounded-full px-3.5 py-[7px] ${on ? 'bg-hum-primary/20' : ''}`}
          >
            <Text
              className={`text-[12px] tracking-wide ${
                on ? 'font-semibold text-hum-text' : 'font-light text-hum-dim'
              }`}
              allowFontScaling={false}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
