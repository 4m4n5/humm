import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  message?: string;
};

/** Spinner + minimal label — prefer layout over quirky copy. */
export function LoadingState({
  message = 'loading…',
}: Props) {
  return (
    <View
      className="items-center justify-center gap-4 px-8 py-12"
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator color={theme.primary} size="large" />
      <Text
        className="text-center text-[14px] font-light leading-[22px] text-hum-muted"
        maxFontSizeMultiplier={1.4}
      >
        {message}
      </Text>
    </View>
  );
}
