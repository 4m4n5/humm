import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { HEADER_BLOCK_PADDING_TOP } from '@/constants/screenLayout';
import { containsDevanagari } from '@/lib/containsDevanagari';

type Props = {
  title: string;
  subtitle?: string;
};

/** Stack screens: floating back control + same title/subtitle rhythm as ScreenTitle. */
export function ScreenHeader({ title, subtitle }: Props) {
  const titleIsDevanagari = containsDevanagari(title);

  const titleEl = (
    <Text
      className="text-[30px] font-extralight leading-[36px] tracking-[-0.02em] text-hum-text"
      maxFontSizeMultiplier={1.35}
    >
      {title}
    </Text>
  );

  return (
    <View className="px-6 pb-6" style={{ paddingTop: HEADER_BLOCK_PADDING_TOP }}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel="go back"
        accessibilityHint="previous screen"
        className="-ml-1 mb-5 h-9 w-9 items-center justify-center rounded-full bg-hum-surface/55 active:opacity-70"
      >
        <Ionicons name="chevron-back" size={19} color={theme.text} style={{ opacity: 0.85 }} />
      </Pressable>
      <View className="gap-y-2">
        {titleIsDevanagari ? (
          <View className="-mb-1.5 pt-1.5">{titleEl}</View>
        ) : (
          titleEl
        )}
        {subtitle ? (
          <Text
            className="w-full self-stretch pr-1 text-[14px] font-light leading-[22px] tracking-[0.01em] text-hum-muted"
            maxFontSizeMultiplier={1.4}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
