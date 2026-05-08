import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AwardCategory } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { theme } from '@/constants/theme';
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
import { navVoice } from '@/constants/hummVoice';

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
      <SafeAreaView className="flex-1 justify-center bg-hum-bg">
        <EmptyState
          ionicon="time-outline"
          ioniconColor={`${theme.gold}B3`}
          title="not yet"
          description="after both submit picks"
          primaryAction={{ label: navVoice.backTo('awards'), onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="gold" />
      <ScreenHeader title="overlap" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <Card tone="gold" tier="inner" className="gap-y-3">
          <View className="flex-row items-center gap-x-2.5">
            <View className="h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hum-surface/55">
              <Ionicons name="checkmark-outline" size={18} color={theme.gold} />
            </View>
            <Text
              className="flex-1 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              maxFontSizeMultiplier={1.25}
            >
              same page · {agreed.length}
            </Text>
          </View>
          {agreed.length === 0 ? (
            <EmptyState
              className="px-0 py-2"
              ionicon="git-merge-outline"
              ioniconColor={`${theme.gold}B3`}
              title="no matches yet"
              description="same-page picks land here first"
            />
          ) : (
            <View className="gap-y-2.5">
              {agreed.map((id) => {
                const meta = displayForCategoryId(couple?.awardCategories, id);
                const nid = ceremony.winners?.[id as keyof typeof ceremony.winners]?.nominationId;
                const n = nid ? nominationById(nominations, nid) : null;
                return (
                  <View
                    key={id}
                    className="flex-row items-start gap-x-3 rounded-[18px] border border-hum-gold/18 bg-hum-card px-4 py-3.5"
                  >
                    <View className="h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hum-surface/55">
                      <Text className="text-[15px] leading-none" allowFontScaling={false}>
                        {meta?.emoji}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1 gap-y-1">
                      <Text
                        className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                        maxFontSizeMultiplier={1.25}
                      >
                        {meta?.label}
                      </Text>
                      <Text
                        className="text-[14px] font-medium leading-[20px] text-hum-text"
                        maxFontSizeMultiplier={1.3}
                      >
                        {n?.title ?? '—'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        <Card className="gap-y-3">
          <View className="flex-row items-center gap-x-2.5">
            <View className="h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hum-surface/55">
              <Ionicons name="git-branch-outline" size={18} color={theme.dim} />
            </View>
            <Text
              className="flex-1 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              maxFontSizeMultiplier={1.25}
            >
              different picks · {contested.length}
            </Text>
          </View>
          {contested.length === 0 ? (
            <EmptyState
              className="px-0 py-2"
              ionicon="checkmark-done-outline"
              ioniconColor={`${theme.gold}B3`}
              title="clear to cheer"
              description="no split picks left in this round"
            />
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
                    className="gap-y-2 rounded-[20px] border border-hum-border/18 bg-hum-card px-4 py-3.5"
                  >
                    <View className="flex-row items-center gap-x-2.5">
                      <View className="h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hum-surface/55">
                        <Text className="text-[15px] leading-none" allowFontScaling={false}>
                          {meta?.emoji}
                        </Text>
                      </View>
                      <Text
                        className="flex-1 text-[15px] font-medium leading-[20px] text-hum-text"
                        maxFontSizeMultiplier={1.3}
                      >
                        {meta?.label}
                      </Text>
                    </View>
                    <Text
                      className="pl-[42px] text-[12px] font-light leading-[18px] text-hum-muted"
                      maxFontSizeMultiplier={1.5}
                    >
                      A · {na?.title ?? '—'}
                    </Text>
                    <Text
                      className="pl-[42px] text-[12px] font-light leading-[18px] text-hum-muted"
                      maxFontSizeMultiplier={1.5}
                    >
                      B · {nb?.title ?? '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {contested.length > 0 ? (
          <Button label="sync split picks" onPress={() => router.push('/awards/resolve')} size="lg" />
        ) : null}

        <Button label={navVoice.backTo('awards')} onPress={() => router.back()} variant="ghost" size="md" />
      </ScrollView>
    </SafeAreaView>
  );
}
