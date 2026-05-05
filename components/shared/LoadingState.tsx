import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  /** Optional contextual message — shown only when explicitly provided. */
  message?: string;
};

/** Quiet spinner. The motion is the message; only show text when there's something specific to say. */
export function LoadingState({ message }: Props) {
  return (
    <View
      className="items-center justify-center px-8 py-12"
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'loading'}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator color={theme.primary} size="small" />
      {message ? (
        <Text
          className="mt-4 text-center text-[13px] font-light leading-[20px] text-hum-muted"
          maxFontSizeMultiplier={1.4}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
