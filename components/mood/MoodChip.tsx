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

/** Full pill chips — matches softer mood language (no rounded-rect trays). */
export function MoodChip({
  entry,
  ownerLabel,
  emptyLabel,
  size = 'sm',
  embedded = false,
  className,
}: Props) {
  const s = SIZE[size];
  const pill = 'rounded-full';

  if (!entry) {
    return (
      <View
        className={`flex-1 flex-row items-center justify-center ${pill} ${s.px} ${s.py} ${s.gap} ${
          embedded
            ? 'border border-dashed border-hum-border/28 bg-hum-surface/30'
            : 'border border-dashed border-hum-border/32 bg-hum-surface/25'
        } ${className ?? ''}`}
        accessibilityRole="text"
        accessibilityLabel={emptyLabel ?? `${ownerLabel}: not yet today`}
      >
        <Text className={`${s.emoji} opacity-45`} maxFontSizeMultiplier={1.2}>
          ✦
        </Text>
        <Text
          className={`${s.label} font-medium ${embedded ? 'text-hum-muted' : 'text-hum-dim'}`}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {emptyLabel ?? 'not yet today'}
        </Text>
      </View>
    );
  }

  return (
    <View
      className={`flex-1 flex-row items-center justify-center ${pill} ${s.px} ${s.py} ${s.gap} ${
        embedded
          ? 'border border-hum-petal/22 bg-hum-petal/[0.08]'
          : 'border border-hum-petal/22 bg-hum-card/95'
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
