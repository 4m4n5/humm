import React, { useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { MoodStickerOption } from '@/types';
import { MOOD_QUADRANTS } from '@/constants/moodStickers';
import { theme } from '@/constants/theme';
import { SectionLabel } from '@/components/habits/SectionLabel';

type Props = {
  currentId: string | null;
  savingId: string | null;
  onSelect: (sticker: MoodStickerOption) => void;
};

function StickerPill({
  sticker,
  selected,
  saving,
  disabled,
  onPress,
}: {
  sticker: MoodStickerOption;
  selected: boolean;
  saving: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  // The currently-set mood can never be reselected — duplicating it would
  // pollute the timeline with a no-op entry. We keep the highlighted style
  // so it still communicates "this is you right now", but it's not tappable
  // and the dim "globally disabled" wash is suppressed (highlight wins).
  const interactionLocked = disabled || selected;
  const showGloballyDimmed = disabled && !saving && !selected;

  // Tap-bloom: when a mood is selected, the emoji breathes outward briefly.
  // Sequence: 1 → 1.22 (snappy spring) → 1 (settle). Tied to a synchronized
  // light haptic so the visual + tactile arrive together.
  const bloom = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(bloom, {
        toValue: 1.22,
        friction: 3.5,
        tension: 220,
        useNativeDriver: true,
      }),
      Animated.spring(bloom, {
        toValue: 1,
        friction: 5,
        tension: 160,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={interactionLocked}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={
        selected ? `${sticker.label}, currently set` : `set mood to ${sticker.label}`
      }
      accessibilityState={{ selected, busy: saving, disabled: interactionLocked }}
      className={`flex-row items-center gap-2 rounded-full border px-3.5 py-2.5 ${
        selected
          ? 'border-hum-secondary/45 bg-hum-secondary/18'
          : 'border-hum-border/18 bg-hum-card'
      } ${showGloballyDimmed ? 'opacity-40' : ''}`}
    >
      {saving ? (
        <ActivityIndicator size="small" color={theme.secondary} />
      ) : (
        <Animated.View style={{ transform: [{ scale: bloom }] }}>
          <Text className="text-[18px] leading-[20px]" allowFontScaling={false}>
            {sticker.emoji}
          </Text>
        </Animated.View>
      )}
      <Text
        className={`text-[13px] tracking-[-0.01em] ${
          selected ? 'font-medium text-hum-text' : 'font-light text-hum-muted'
        }`}
        numberOfLines={1}
        maxFontSizeMultiplier={1.25}
      >
        {sticker.label}
      </Text>
    </TouchableOpacity>
  );
}

export function MoodGrid({ currentId, savingId, onSelect }: Props) {
  return (
    <View className="gap-y-5">
      {MOOD_QUADRANTS.map((q) => (
        <View key={q.quadrant} className="gap-y-3">
          <SectionLabel title={q.label} />
          <View className="flex-row flex-wrap gap-2">
            {q.stickers.map((s) => (
              <StickerPill
                key={s.id}
                sticker={s}
                selected={s.id === currentId}
                saving={s.id === savingId}
                disabled={!!savingId}
                onPress={() => onSelect(s)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
