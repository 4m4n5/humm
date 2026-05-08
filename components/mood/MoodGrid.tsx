import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { MoodStickerOption } from '@/types';
import { MOOD_QUADRANTS } from '@/constants/moodStickers';
import { theme } from '@/constants/theme';
import { SectionLabel } from '@/components/shared/SectionLabel';
import {
  REDUCE_MOTION_NEVER,
  SPRING_EXPRESSIVE_BLOOM,
  SPRING_EXPRESSIVE_SETTLE,
} from '@/lib/motion';

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
  // Sequence: 1 → 1.22 (expressive bloom) → 1 (settle). Tied to a synchronized
  // light haptic so the visual + tactile arrive together.
  const bloom = useSharedValue(1);

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Cancel any in-flight bloom so rapid taps don't compound and wobble.
    cancelAnimation(bloom);
    bloom.value = withSequence(
      withSpring(1.22, { ...SPRING_EXPRESSIVE_BLOOM, reduceMotion: REDUCE_MOTION_NEVER }),
      withSpring(1, { ...SPRING_EXPRESSIVE_SETTLE, reduceMotion: REDUCE_MOTION_NEVER }),
    );
    onPress();
  };

  const bloomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bloom.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={interactionLocked}
      accessibilityRole="button"
      accessibilityLabel={
        selected ? `${sticker.label}, currently set` : `set mood to ${sticker.label}`
      }
      accessibilityState={{ selected, busy: saving, disabled: interactionLocked }}
      className={`min-h-[44px] flex-row items-center gap-2 rounded-full border px-3.5 ${
        selected
          ? 'border-hum-bloom/45 bg-hum-bloom/18'
          : 'border-hum-border/18 bg-hum-card'
      } ${showGloballyDimmed ? 'opacity-40' : ''} ${interactionLocked ? '' : 'active:opacity-88'}`}
    >
      {saving ? (
        <ActivityIndicator size="small" color={theme.bloom} />
      ) : (
        <Animated.View style={bloomStyle}>
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
    </Pressable>
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
