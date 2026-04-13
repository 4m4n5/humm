import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HEADER_BLOCK_PADDING_TOP, scrollContentStandard } from '@/constants/screenLayout';

/**
 * Shown when a release build was produced without `EXPO_PUBLIC_FIREBASE_*` on EAS.
 * Avoids importing Firebase (which would crash on invalid `initializeApp`).
 */
export function FirebaseMissingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-hum-bg" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          ...scrollContentStandard,
          paddingTop: HEADER_BLOCK_PADDING_TOP,
          gap: 16,
        }}
      >
        <Text className="text-[22px] font-medium text-hum-text" maxFontSizeMultiplier={1.25}>
          can’t reach your data
        </Text>
        <Text className="text-[15px] font-light leading-[23px] text-hum-muted" maxFontSizeMultiplier={1.35}>
          this install is missing firebase config — usually the build didn’t bundle your{' '}
          <Text className="text-hum-primary">EXPO_PUBLIC_FIREBASE_*</Text> vars on expo (eas).
        </Text>
        <Text className="text-[15px] font-light leading-[23px] text-hum-muted" maxFontSizeMultiplier={1.35}>
          fix: on{' '}
          <Text className="font-medium text-hum-text">expo.dev</Text> → your project →{' '}
          <Text className="font-medium text-hum-text">environment variables</Text>, add every key from{' '}
          <Text className="font-medium text-hum-text">.env.example</Text> for the same EAS build profile
          you used. then ship a new build.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
