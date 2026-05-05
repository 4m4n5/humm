import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

type Props = {
  onPress: () => void;
};

export function InlineAddHabitTile({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="add habit"
      className="flex-row items-center justify-center gap-2.5 rounded-[20px] border border-dashed border-hum-secondary/20 bg-hum-card/30 py-4"
    >
      <View className="h-8 w-8 items-center justify-center rounded-full border border-hum-secondary/15 bg-hum-secondary/8">
        <Ionicons name="add" size={17} color={theme.secondary} />
      </View>
      <Text className="text-[13px] font-light tracking-wide text-hum-dim">add habit</Text>
    </Pressable>
  );
}
