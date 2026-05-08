import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AwardCategory } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { nominationsForCategory } from '@/lib/firestore/nominations';
import { authorShortLabel, nomineeShortLabel } from '@/lib/awardsDisplay';
import {
  awardCategoryDescription,
  displayForCategoryId,
  findAwardCategoryRow,
} from '@/lib/awardCategoryConfig';
import { canEditNomination } from '@/lib/nominationEditPolicy';
import { usePartnerName } from '@/lib/usePartnerName';
import { LoadingState } from '@/components/shared/LoadingState';
import { scrollContentWithBottomCTA } from '@/constants/screenLayout';

export default function AwardCategoryScreen() {
  const { category: raw } = useLocalSearchParams<{ category: string }>();
  const { profile } = useAuthStore();
  const { nominations, couple, ceremony } = useNominationsStore();
  const partnerName = usePartnerName();

  const rows = couple?.awardCategories ?? [];
  const row = raw ? findAwardCategoryRow(rows, raw) : undefined;
  const category = raw as AwardCategory | undefined;
  const list = raw ? nominationsForCategory(nominations, raw) : [];

  const display = raw
    ? row
      ? { label: row.label, emoji: row.emoji, description: awardCategoryDescription(row.id) }
      : {
          ...displayForCategoryId(rows, raw),
          description: awardCategoryDescription(raw),
        }
    : null;

  useEffect(() => {
    if (!raw || !couple?.awardCategories) return;
    const exists = !!findAwardCategoryRow(couple.awardCategories, raw);
    if (!exists && list.length === 0) router.back();
  }, [raw, couple?.awardCategories, list.length]);

  if (!raw || !couple) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-hum-bg px-6">
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!display) return null;

  const categoryDisabled = row ? !row.enabled : false;

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="gold" />
      <ScreenHeader title={display.label} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentWithBottomCTA}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-[20px]" allowFontScaling={false}>
            {display.emoji}
          </Text>
          {categoryDisabled ? (
            <Text
              className="text-[11px] font-medium uppercase tracking-wider text-hum-dim"
              maxFontSizeMultiplier={1.25}
            >
              paused
            </Text>
          ) : null}
        </View>
        {display.description ? (
          <Text
            className="text-[14px] font-light leading-5 text-hum-muted"
            maxFontSizeMultiplier={1.5}
          >
            {display.description}
          </Text>
        ) : null}

        {list.length === 0 ? (
          <EmptyState
            className="px-0"
            title={categoryDisabled ? 'paused' : 'no stories yet'}
            description={categoryDisabled ? 'turn on in award categories' : 'add the first story'}
          />
        ) : (
          list.map((n) => {
            const editable =
              !categoryDisabled &&
              !!profile?.uid &&
              canEditNomination(n, profile.uid, couple ?? null, ceremony ?? null);
            return (
              <View
                key={n.id}
                className="flex-row gap-3 rounded-[18px] border border-hum-border/18 bg-hum-card px-4 py-3.5"
              >
                <View className="min-w-0 flex-1 gap-y-2">
                  <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
                    <Text
                      className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-gold"
                      maxFontSizeMultiplier={1.25}
                    >
                      {nomineeShortLabel(n.nomineeId, profile, couple, partnerName)}
                    </Text>
                    <Text className="text-hum-dim text-xs" maxFontSizeMultiplier={1.25}>
                      ·
                    </Text>
                    <Text
                      className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                      maxFontSizeMultiplier={1.25}
                    >
                      by {authorShortLabel(n.submittedBy, profile, couple, partnerName)}
                    </Text>
                  </View>
                  <Text className="text-[15px] font-medium text-hum-text" maxFontSizeMultiplier={1.3}>
                    {n.title}
                  </Text>
                  {n.description ? (
                    <Text
                      className="text-[14px] font-light leading-5 text-hum-muted"
                      maxFontSizeMultiplier={1.5}
                    >
                      {n.description}
                    </Text>
                  ) : null}
                </View>
                {editable ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/awards/nominate',
                        params: { category, nominationId: n.id },
                      })
                    }
                    className="h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center self-center active:opacity-88"
                    accessibilityRole="button"
                    accessibilityLabel={`Edit nomination ${n.title} in ${display.label} category`}
                  >
                    <Text className="text-[12px] font-semibold text-hum-gold" maxFontSizeMultiplier={1.25}>
                      edit
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <View className="border-t border-hum-border/18 bg-hum-bg px-6 pb-8 pt-5">
        {categoryDisabled ? (
          <Button
            label="re-enable in award categories"
            onPress={() => router.push('/awards/manage-categories')}
            size="lg"
          />
        ) : (
          <Button
            label="add nomination"
            onPress={() =>
              router.push({
                pathname: '/awards/nominate',
                params: { category },
              })
            }
            size="lg"
          />
        )}
      </View>
    </SafeAreaView>
  );
}
