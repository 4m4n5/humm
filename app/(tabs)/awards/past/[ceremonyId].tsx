import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AwardCategory, Ceremony, Couple, Nomination } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { subscribeToCeremony } from '@/lib/firestore/ceremonies';
import { subscribeToNominations } from '@/lib/firestore/nominations';
import { subscribeToCouple } from '@/lib/firestore/couples';
import { nominationById } from '@/lib/awardsLogic';
import { displayForCategoryId } from '@/lib/awardCategoryConfig';
import { scrollContentStandard } from '@/constants/screenLayout';
import { navVoice } from '@/constants/hummVoice';
import { theme } from '@/constants/theme';

export default function PastCeremonyDetailScreen() {
  const { ceremonyId } = useLocalSearchParams<{ ceremonyId: string }>();
  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [couple, setCouple] = useState<Couple | null>(null);

  useEffect(() => {
    if (!ceremonyId || typeof ceremonyId !== 'string') return;
    return subscribeToCeremony(ceremonyId, setCeremony);
  }, [ceremonyId]);

  useEffect(() => {
    if (!ceremonyId || typeof ceremonyId !== 'string' || !ceremony?.coupleId) return;
    return subscribeToNominations(ceremony.coupleId, ceremonyId, setNominations);
  }, [ceremonyId, ceremony?.coupleId]);

  useEffect(() => {
    if (!ceremony?.coupleId) return;
    return subscribeToCouple(ceremony.coupleId, setCouple);
  }, [ceremony?.coupleId]);

  if (!ceremonyId || typeof ceremonyId !== 'string') {
    return (
      <SafeAreaView className="flex-1 justify-center bg-hum-bg">
        <EmptyState
          ionicon="alert-circle-outline"
          ioniconColor={`${theme.gold}B3`}
          title="missing ceremony"
          description="this link may be outdated"
          primaryAction={{ label: navVoice.backTo('archive'), onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  if (!ceremony) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-hum-bg">
        <AmbientGlow tone="gold" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  const winners = ceremony.winners ?? {};
  const rows = couple?.awardCategories ?? [];
  const order = rows.map((r) => r.id);
  const hasWinner = (id: string) =>
    nominations.some((n) => n.category === id) && !!winners[id as AwardCategory];
  const primary = order.filter(hasWinner);
  const extra = Object.keys(winners).filter(
    (id) => !primary.includes(id) && hasWinner(id),
  );
  const orderedCats = [...primary, ...extra];

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="gold" />
      <ScreenHeader title="past season" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <Button label={navVoice.backTo('archive')} onPress={() => router.back()} variant="ghost" size="md" />

        {orderedCats.length === 0 ? (
          <EmptyState
            className="px-0"
            ionicon="ribbon-outline"
            ioniconColor={`${theme.gold}B3`}
            title="no winners this round"
            description="nothing was crowned in this archive"
          />
        ) : (
          orderedCats.map((catId) => {
            const meta = displayForCategoryId(couple?.awardCategories, catId);
            const w = winners[catId as AwardCategory];
            const nom = w ? nominationById(nominations, w.nominationId) : null;
            return (
              <View
                key={catId}
                className="gap-y-3 rounded-[18px] border border-hum-border/18 bg-hum-card px-4 py-3.5"
              >
                <View className="flex-row items-center gap-x-2.5">
                  <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hum-surface/55">
                    <Text className="text-[15px] leading-none" allowFontScaling={false}>
                      {meta.emoji}
                    </Text>
                  </View>
                  <Text
                    className="flex-1 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                    maxFontSizeMultiplier={1.25}
                  >
                    {meta.label}
                  </Text>
                </View>
                <Text
                  className="text-[15px] font-medium leading-[20px] text-hum-text"
                  maxFontSizeMultiplier={1.3}
                >
                  {nom?.title ?? '—'}
                </Text>
                {nom?.description ? (
                  <Text
                    className="text-[14px] font-light leading-5 text-hum-muted"
                    maxFontSizeMultiplier={1.5}
                  >
                    {nom.description}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
