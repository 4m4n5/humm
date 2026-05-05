import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { EmptyState } from '@/components/shared/EmptyState';
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
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="text-center text-hum-muted">link with your person to see past seasons</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
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
            <TouchableOpacity
              key={c.id}
              onPress={() => router.push(`/awards/past/${c.id}`)}
              className="rounded-[18px] border border-hum-border/18 bg-hum-card px-4 py-3.5 active:opacity-88"
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={`Past season ended ${formatPeriodEnd(c)}, ${winnerCount} winner${winnerCount !== 1 ? 's' : ''}`}
            >
              <Text className="text-[15px] font-medium text-hum-text">season ended {formatPeriodEnd(c)}</Text>
              <Text className="mt-1 text-[12px] font-light tabular-nums text-hum-muted">
                {winnerCount} win{winnerCount !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
