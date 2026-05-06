import React from 'react';
import { View, Text } from 'react-native';
import type { MoodEntry } from '@/types';

type Size = 'sm' | 'md';

type Props = {
  entry: MoodEntry | null;
  ownerLabel: string;
  emptyLabel?: string;
  size?: Size;
  embedded?: boolean;
  className?: string;
};

const SIZE: Record<
  Size,
  { gap: string; emoji: string; label: string; py: string; px: string }
> = {
  sm: {
    gap: 'gap-x-2',
    emoji: 'text-[18px]',
    label: 'text-[12px]',
    py: 'py-2.5',
    px: 'px-3.5',
  },
  md: {
    gap: 'gap-x-2.5',
    emoji: 'text-[22px]',
    label: 'text-[13px]',
    py: 'py-3',
    px: 'px-4',
  },
};

export function MoodChip({
  entry,
  ownerLabel,
  emptyLabel,
  size = 'sm',
  embedded = false,
  className,
}: Props) {
  const s = SIZE[size];

  if (!entry) {
    return (
      <View
        className={`flex-1 flex-row items-center justify-center rounded-full ${s.px} ${s.py} ${s.gap} ${
          embedded
            ? 'border border-dashed border-hum-bloom/28 bg-hum-bloom/[0.04]'
            : 'border border-dashed border-hum-border/28 bg-hum-surface/20'
        } ${className ?? ''}`}
        accessibilityRole="text"
        accessibilityLabel={emptyLabel ?? `${ownerLabel}: not yet today`}
      >
        <Text className={`${s.emoji} opacity-35`} maxFontSizeMultiplier={1.2}>
          ✦
        </Text>
        <Text
          className={`${s.label} font-medium text-hum-dim`}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {emptyLabel ?? 'not yet'}
        </Text>
      </View>
    );
  }

  return (
    <View
      className={`flex-1 flex-row items-center justify-center rounded-full ${s.px} ${s.py} ${s.gap} ${
        embedded
          ? 'bg-hum-bloom/[0.12]'
          : 'border border-hum-bloom/20 bg-hum-card/90'
      } ${className ?? ''}`}
      accessibilityRole="text"
      accessibilityLabel={`${ownerLabel}: ${entry.current.label}`}
    >
      <Text className={s.emoji} maxFontSizeMultiplier={1.2}>
        {entry.current.emoji}
      </Text>
      <Text
        className={`${s.label} font-medium leading-[17px] tracking-tight text-hum-text`}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {entry.current.label}
      </Text>
    </View>
  );
}
