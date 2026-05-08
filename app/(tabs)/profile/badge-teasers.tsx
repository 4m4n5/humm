import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { useAuthStore } from '@/lib/stores/authStore';
import { pickRandomTeasers, BADGE_TEASER_COUNT } from '@/lib/badgeTeasers';
import type { BadgeDefinition } from '@/constants/badges';
import { scrollContentStandard } from '@/constants/screenLayout';
import { theme } from '@/constants/theme';

export default function BadgeTeasersScreen() {
  const { profile } = useAuthStore();
  const [teasers, setTeasers] = useState<BadgeDefinition[]>([]);

  useFocusEffect(
    useCallback(() => {
      const earned = profile?.badges ?? [];
      setTeasers(pickRandomTeasers(earned, BADGE_TEASER_COUNT));
    }, [profile?.badges]),
  );

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="primary" />
      <ScreenHeader title="coming soon" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        {teasers.length === 0 ? (
          <EmptyState
            className="px-0"
            ionicon="sparkles-outline"
            ioniconColor={`${theme.primary}B3`}
            title="all caught for now"
            description="more hints appear as you play"
          />
        ) : (
          <View className="gap-y-4">
            {teasers.map((b) => (
              <View
                key={b.id}
                className="rounded-[20px] border border-hum-border/30 bg-hum-surface/28 px-4 py-3.5"
                accessibilityLabel={`Locked badge hint: ${b.name}. ${b.description}`}
              >
                <View className="flex-row items-start gap-x-3.5">
                  <View className="h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-hum-surface/40">
                    <Text className="text-[26px] leading-none opacity-55" maxFontSizeMultiplier={1.2}>
                      {b.emoji}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1 gap-y-1">
                    <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
                      not yet
                    </Text>
                    <Text
                      className="text-[15px] font-medium tracking-tight text-hum-text/90"
                      maxFontSizeMultiplier={1.3}
                    >
                      {b.name.toLowerCase()}
                    </Text>
                    <Text
                      className="text-[13px] font-light leading-[20px] text-hum-muted"
                      maxFontSizeMultiplier={1.35}
                    >
                      {b.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
