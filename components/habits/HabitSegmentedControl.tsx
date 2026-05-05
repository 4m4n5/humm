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
    <View className="flex-row rounded-full border border-hum-border/35 bg-hum-card/40 p-[2px]">
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
            className={`rounded-full px-3 py-1.5 ${on ? 'bg-hum-secondary/22' : ''}`}
          >
            <Text
              className={`text-[12.5px] tracking-[-0.01em] ${
                on ? 'font-medium text-hum-text' : 'font-light text-hum-dim'
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
