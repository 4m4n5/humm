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
      className="flex-row items-center justify-center gap-2 rounded-[20px] border border-dashed border-hum-border/30 bg-hum-card/40 py-4"
    >
      <View className="h-8 w-8 items-center justify-center rounded-xl bg-hum-secondary/10">
        <Ionicons name="add" size={18} color={theme.secondary} />
      </View>
      <Text className="text-[13px] font-light text-hum-muted">add habit</Text>
    </Pressable>
  );
}
