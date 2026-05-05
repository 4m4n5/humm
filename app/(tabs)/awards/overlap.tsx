import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AwardCategory } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { displayForCategoryId, enabledAwardCategoryIds } from '@/lib/awardCategoryConfig';
import {
  agreedCategoryList,
  contestedCategories,
  nominationById,
} from '@/lib/awardsLogic';
import { hapticMedium } from '@/lib/haptics';
import { LoadingState } from '@/components/shared/LoadingState';
import { scrollContentStandard } from '@/constants/screenLayout';

export default function OverlapScreen() {
  const { nominations, ceremony, couple } = useNominationsStore();
  const enabledIds = enabledAwardCategoryIds(couple?.awardCategories ?? []);

  const uidA = couple?.user1Id;
  const uidB = couple?.user2Id;

  const { agreed, contested } = useMemo(() => {
    if (!ceremony || !uidA || !uidB) {
      return { agreed: [] as string[], contested: [] as string[] };
    }
    return {
      agreed: agreedCategoryList(ceremony, nominations, uidA, uidB, enabledIds),
      contested: contestedCategories(ceremony, nominations, uidA, uidB, enabledIds),
    };
  }, [ceremony, nominations, uidA, uidB, enabledIds]);

  const celebratedRef = useRef(false);
  useEffect(() => {
    if (ceremony?.status !== 'voting' || agreed.length === 0 || celebratedRef.current) return;
    celebratedRef.current = true;
    void hapticMedium();
  }, [ceremony?.status, agreed.length]);

  if (!ceremony || !uidA || !uidB) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-hum-bg">
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (ceremony.status !== 'voting') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="mb-4 text-center text-[14px] text-hum-muted">after both submit picks</Text>
        <Button label="back to awards" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="overlap" subtitle="match · split" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-y-3 rounded-[22px] border border-hum-border/18 bg-emerald-950/10 p-5">
          <View className="flex-row items-center gap-x-2.5">
            <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-900/35">
              <Text className="text-[14px] leading-none">✓</Text>
            </View>
            <Text className="flex-1 text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">
              same page · {agreed.length}
            </Text>
          </View>
          {agreed.length === 0 ? (
            <Text className="text-[13px] font-light text-hum-muted">no matches yet</Text>
          ) : (
            <View className="gap-y-2.5">
              {agreed.map((id) => {
                const meta = displayForCategoryId(couple?.awardCategories, id);
                const nid = ceremony.winners?.[id as keyof typeof ceremony.winners]?.nominationId;
                const n = nid ? nominationById(nominations, nid) : null;
                return (
                  <View
                    key={id}
                    className="flex-row items-start gap-x-3 rounded-[18px] border border-emerald-900/14 bg-emerald-950/14 px-4 py-3.5"
                  >
                    <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-950/40">
                      <Text className="text-[15px] leading-none">{meta?.emoji}</Text>
                    </View>
                    <View className="min-w-0 flex-1 gap-y-1">
                      <Text className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">
                        {meta?.label}
                      </Text>
                      <Text className="text-[14px] font-medium leading-snug text-hum-text">
                        {n?.title ?? '—'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View className="gap-y-3 rounded-[22px] border border-hum-border/18 bg-amber-950/12 p-5">
          <View className="flex-row items-center gap-x-2.5">
            <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-900/18">
              <Text className="text-[14px] leading-none">◇</Text>
            </View>
            <Text className="flex-1 text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">
              different picks · {contested.length}
            </Text>
          </View>
          {contested.length === 0 ? (
            <Text className="text-[13px] font-light text-hum-muted">clear to cheer</Text>
          ) : (
            <View className="gap-y-2.5">
              {contested.map((id) => {
                const meta = displayForCategoryId(couple?.awardCategories, id);
                const cat = id as AwardCategory;
                const a = ceremony.picksByUser?.[uidA]?.[cat];
                const b = ceremony.picksByUser?.[uidB]?.[cat];
                const na = a ? nominationById(nominations, a) : null;
                const nb = b ? nominationById(nominations, b) : null;
                return (
                  <View
                    key={id}
                    className="gap-y-2 rounded-[20px] border border-amber-900/22 bg-amber-950/18 px-4 py-3.5"
                  >
                    <View className="flex-row items-center gap-x-2.5">
                      <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-950/35">
                        <Text className="text-[15px] leading-none">{meta?.emoji}</Text>
                      </View>
                      <Text className="flex-1 text-[15px] font-medium leading-snug text-hum-text">
                        {meta?.label}
                      </Text>
                    </View>
                    <Text className="pl-[42px] text-[12px] font-light leading-[18px] text-hum-muted">
                      A · {na?.title ?? '—'}
                    </Text>
                    <Text className="pl-[42px] text-[12px] font-light leading-[18px] text-hum-muted">
                      B · {nb?.title ?? '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {contested.length > 0 ? (
          <Button label="sync split picks" onPress={() => router.push('/awards/resolve')} size="lg" />
        ) : null}

        <Button label="back" onPress={() => router.back()} variant="secondary" size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}
