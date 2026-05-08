import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { LinkPartnerGate } from '@/components/shared/LinkPartnerGate';
import { useAuthStore } from '@/lib/stores/authStore';
import { subscribeToPastCeremonies } from '@/lib/firestore/ceremonies';
import { Ceremony } from '@/types';
import { scrollContentStandard } from '@/constants/screenLayout';

function formatPeriodEnd(c: Ceremony): string {
  const t = c.periodEnd;
  if (t && typeof t.toDate === 'function') {
    return t.toDate().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return '—';
}

export default function PastCeremoniesScreen() {
  const { profile } = useAuthStore();
  const [list, setList] = useState<Ceremony[]>([]);

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeToPastCeremonies(profile.coupleId, setList);
  }, [profile?.coupleId]);

  if (!profile?.coupleId) {
    return <LinkPartnerGate backTo="awards" tone="gold" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="gold" />
      <ScreenHeader title="archive" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View className="mt-6">
            <EmptyState
              className="px-0"
              title="empty vault"
              description="wrap a season · it shows here"
              primaryAction={{
                label: 'awards',
                onPress: () => router.push('/awards'),
              }}
            />
          </View>
        ) : (
          list.map((c) => {
            const winnerCount = Object.keys(c.winners ?? {}).length;
            return (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/awards/past/${c.id}`)}
              className="min-h-[44px] rounded-[18px] border border-hum-border/18 bg-hum-card px-4 py-3.5 active:opacity-88"
              accessibilityRole="button"
              accessibilityLabel={`Open past award season from ${formatPeriodEnd(c)}, ${winnerCount} winner${
                winnerCount !== 1 ? 's' : ''
              }`}
            >
              <Text className="text-[15px] font-medium text-hum-text" maxFontSizeMultiplier={1.3}>
                season ended {formatPeriodEnd(c)}
              </Text>
              <Text
                className="mt-1 text-[12px] font-light tabular-nums text-hum-muted"
                maxFontSizeMultiplier={1.25}
              >
                {winnerCount} win{winnerCount !== 1 ? 's' : ''}
              </Text>
            </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
