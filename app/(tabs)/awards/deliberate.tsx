import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AwardCategory } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
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
import { awardsVoice, errorsVoice, navVoice } from '@/constants/hummVoice';
import { usePartnerName } from '@/lib/usePartnerName';
import { scrollContentStandard } from '@/constants/screenLayout';
import { theme } from '@/constants/theme';

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
      <SafeAreaView className="flex-1 justify-center bg-hum-bg">
        <EmptyState
          ionicon="lock-closed-outline"
          ioniconColor={`${theme.gold}B3`}
          title="wrong phase"
          description="private picks open during deliberation"
          primaryAction={{ label: navVoice.backTo('awards'), onPress: () => router.back() }}
        />
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
      const msg = e instanceof Error ? e.message : errorsVoice.tryAgain;
      Alert.alert(errorsVoice.couldntSave, msg);
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
        <AmbientGlow tone="gold" />
        <ScreenHeader title="alignment" />
        <View className="flex-1 justify-center">
          <EmptyState
            ionicon={partnerSubmitted ? 'checkmark-done-outline' : 'eye-off-outline'}
            ioniconColor={`${theme.gold}B3`}
            title={partnerSubmitted ? 'both in' : 'their turn'}
            description={partnerSubmitted ? 'awards → overlap' : 'yours stay hidden'}
            primaryAction={{ label: navVoice.backTo('awards'), onPress: () => router.back() }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (required.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <AmbientGlow tone="gold" />
        <ScreenHeader title="alignment" />
        <View className="flex-1 justify-center">
          <EmptyState
            ionicon="add-circle-outline"
            ioniconColor={`${theme.gold}B3`}
            title="add a nomination first"
            description="at least one category needs a story before you align picks"
            primaryAction={{ label: navVoice.backTo('awards'), onPress: () => router.back() }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="gold" />
      <ScreenHeader title="your picks" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
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
                <View className="h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-hum-surface/55">
                  <Text className="text-[15px] leading-none" allowFontScaling={false}>
                    {cat.emoji}
                  </Text>
                </View>
                <Text
                  className="flex-1 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                  maxFontSizeMultiplier={1.25}
                >
                  {cat.label}
                </Text>
              </View>
              {inCat.map((n) => {
                const selected = picks[cat.id] === n.id;
                return (
                  <Pressable
                    key={n.id}
                    onPress={() => setPick(cat.id, n.id)}
                    className={`min-h-[44px] rounded-[20px] border px-4 py-3.5 active:opacity-88 ${
                      selected ? 'border-hum-primary/20 bg-hum-primary/8' : 'border-hum-border/18 bg-hum-card'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Pick ${n.title} for ${cat.label} in alignment`}
                    accessibilityState={{ selected }}
                  >
                    <Text className="text-[15px] font-medium text-hum-text" maxFontSizeMultiplier={1.3}>
                      {n.title}
                    </Text>
                    {n.description ? (
                      <Text
                        className="mt-1 text-[13px] font-light text-hum-muted"
                        numberOfLines={3}
                        maxFontSizeMultiplier={1.5}
                      >
                        {n.description}
                      </Text>
                    ) : null}
                  </Pressable>
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
