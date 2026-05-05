import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { MoodStickerOption } from '@/types';
import { MOOD_QUADRANTS } from '@/constants/moodStickers';
import { theme } from '@/constants/theme';
import { SectionLabel } from '@/components/habits/SectionLabel';

type Props = {
  currentId: string | null;
  savingId: string | null;
  onSelect: (sticker: MoodStickerOption) => void;
};

const ROW_STYLE: StyleProp<ViewStyle> = {
  flexGrow: 0,
  paddingRight: 24,
  gap: 8,
};

/** Picker — pills only (no boxed trays); quadrants are spacing + label, not nested cards. */
export function MoodGrid({ currentId, savingId, onSelect }: Props) {
  return (
    <View className="gap-y-7">
      {MOOD_QUADRANTS.map((q) => (
        <View key={q.quadrant} className="gap-y-2.5">
          <SectionLabel title={q.label} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ROW_STYLE}
          >
            {q.stickers.map((s) => {
              const selected = s.id === currentId;
              const saving = s.id === savingId;
              const disabled = !!savingId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => onSelect(s)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`set mood to ${s.label}`}
                  accessibilityHint={q.blurb}
                  accessibilityState={{ selected, busy: saving }}
                  className={`flex-row items-center gap-x-2 rounded-full border px-4 py-2.5 active:opacity-88 ${
                    selected
                      ? 'border-hum-primary/45 bg-hum-primary/[0.12]'
                      : 'border-hum-border/20 bg-hum-surface/25'
                  } ${disabled && !saving ? 'opacity-35' : ''}`}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text className="text-[24px] leading-none" allowFontScaling={false}>
                      {s.emoji}
                    </Text>
                  )}
                  <Text
                    className={`max-w-[84px] text-[12px] font-medium leading-[15px] tracking-tight ${
                      selected ? 'text-hum-text' : 'text-hum-muted'
                    }`}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.25}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}
