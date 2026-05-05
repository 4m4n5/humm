import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AwardCategory } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { nominationsForCategory } from '@/lib/firestore/nominations';
import { submitDeliberationPicks } from '@/lib/firestore/ceremonies';
import { enabledAwardCategoryIds } from '@/lib/awardCategoryConfig';
import { categoriesWithNominations } from '@/lib/awardsLogic';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { grantDeliberationSubmitXp } from '@/lib/firestore/gamification';
import { enqueueGamificationToasts } from '@/lib/stores/xpFeedbackStore';
import { LoadingState } from '@/components/shared/LoadingState';
import { awardsVoice } from '@/constants/hummVoice';
import { usePartnerName } from '@/lib/usePartnerName';
import { scrollContentStandard } from '@/constants/screenLayout';

export default function DeliberateScreen() {
  const { profile } = useAuthStore();
  const { nominations, ceremony, couple } = useNominationsStore();
  const partnerName = usePartnerName();
  const [picks, setPicks] = useState<Partial<Record<AwardCategory, string>>>({});
  const [saving, setSaving] = useState(false);

  const uidA = couple?.user1Id;
  const uidB = couple?.user2Id;

  const enabledIds = enabledAwardCategoryIds(couple?.awardCategories ?? []);
  const required = useMemo(
    () => categoriesWithNominations(nominations, enabledIds),
    [nominations, enabledIds],
  );
  const enabledRows = (couple?.awardCategories ?? []).filter((r) => r.enabled);

  if (!profile?.uid || !couple || !ceremony || !uidA || !uidB) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-hum-bg px-6">
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (ceremony.status !== 'deliberating') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="mb-4 text-center text-[14px] text-hum-muted">wrong phase</Text>
        <Button label="back to awards" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const mySubmitted = !!ceremony.picksSubmitted?.[profile.uid];
  const partnerSubmitted =
    profile.uid === uidA
      ? !!ceremony.picksSubmitted?.[uidB]
      : !!ceremony.picksSubmitted?.[uidA];

  const canSubmit = required.every((cat) => !!picks[cat]);

  async function onSubmit() {
    if (!profile?.uid || !ceremony || !uidA || !uidB) return;
    setSaving(true);
    try {
      await submitDeliberationPicks(
        ceremony.id,
        profile.uid,
        picks,
        nominations,
        uidA,
        uidB,
      );
      const delib = await grantDeliberationSubmitXp(profile.uid).catch(() => null);
      if (delib) {
        enqueueGamificationToasts(delib.xp ? [delib.xp] : [], delib.newBadges);
      }
      await hapticSuccess();
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'couldn’t save picks';
      Alert.alert('couldn’t save', msg);
    } finally {
      setSaving(false);
    }
  }

  function setPick(cat: AwardCategory, nominationId: string) {
    void hapticLight();
    setPicks((p) => ({ ...p, [cat]: nominationId }));
  }

  if (mySubmitted) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScreenHeader title="alignment" subtitle="picks in" />
        <View className="flex-1 justify-center px-8">
          <Text className="text-center text-[14px] font-light leading-[22px] text-hum-muted">
            {partnerSubmitted ? `both in · awards → overlap` : `their turn · yours stay hidden`}
          </Text>
          <Button label="back to awards" onPress={() => router.back()} className="mt-8" />
        </View>
      </SafeAreaView>
    );
  }

  if (required.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScreenHeader title="alignment" subtitle="no stories yet" />
        <View className="flex-1 justify-center px-8">
          <Text className="text-center text-[14px] text-hum-muted">add a nomination first</Text>
          <Button label="back to awards" onPress={() => router.back()} className="mt-6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="your picks" subtitle="one per category" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-[10px] font-medium uppercase tracking-[0.24em] text-hum-dim"
          maxFontSizeMultiplier={1.25}
        >
          {awardsVoice.alignPickerHint(partnerName).toUpperCase()}
        </Text>

        {enabledRows.map((cat) => {
          const inCat = nominationsForCategory(nominations, cat.id);
          if (inCat.length === 0) return null;
          return (
            <View key={cat.id} className="gap-y-3">
              <View className="flex-row items-center gap-x-2.5 py-0.5">
                <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hum-surface/55">
                  <Text className="text-[15px] leading-none">{cat.emoji}</Text>
                </View>
                <Text className="flex-1 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
                  {cat.label}
                </Text>
              </View>
              {inCat.map((n) => {
                const selected = picks[cat.id] === n.id;
                return (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => setPick(cat.id, n.id)}
                    className={`rounded-[20px] border px-4 py-3.5 ${
                      selected ? 'border-hum-primary/20 bg-hum-primary/8' : 'border-hum-border/18 bg-hum-card'
                    }`}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.label}: ${n.title}`}
                    accessibilityState={{ selected }}
                  >
                    <Text className="text-[15px] font-medium text-hum-text">{n.title}</Text>
                    {n.description ? (
                      <Text className="mt-1 text-[13px] font-light text-hum-muted" numberOfLines={3}>
                        {n.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        <Button
          label="lock in my picks"
          onPress={onSubmit}
          loading={saving}
          disabled={!canSubmit}
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
