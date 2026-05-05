import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, Alert, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AwardCategory } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { SeasonCompleteOverlay } from '@/components/awards/SeasonCompleteOverlay';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { displayForCategoryId, enabledAwardCategoryIds } from '@/lib/awardCategoryConfig';
import {
  allRequiredWinnersPresent,
  nominationById,
  deliberationDisagreementCount,
  categoriesWithNominations,
} from '@/lib/awardsLogic';
import { completeCeremonyAndAdvance } from '@/lib/firestore/ceremonies';
import { grantCeremonyCompletionRewards } from '@/lib/firestore/gamification';
import { afterCeremonyFullyCompleted } from '@/lib/gamificationTriggers';
import { enqueueGamificationToasts } from '@/lib/stores/xpFeedbackStore';
import { XP_REWARDS } from '@/constants/levels';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { LoadingState } from '@/components/shared/LoadingState';
import { awardsVoice } from '@/constants/hummVoice';

function RevealWinnerCard({
  stepIndex,
  categoryLine,
  title,
  description,
}: {
  stepIndex: number;
  categoryLine: string;
  title: string;
  description: string | null;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(22);
    scale.setValue(0.9);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 68,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 72,
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepIndex, opacity, translateY, scale]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }, { scale }],
      }}
      className="rounded-[22px] border border-hum-border/18 bg-hum-card px-6 py-9"
    >
      <Text className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
        {categoryLine}
      </Text>
      <Text className="mt-5 text-center text-[30px] font-semibold leading-[36px] tracking-tight text-hum-text">
        {title}
      </Text>
      {description ? (
        <Text
          className="mt-4 text-center text-[14px] font-light leading-[22px] text-hum-muted"
          numberOfLines={5}
        >
          {description}
        </Text>
      ) : null}
    </Animated.View>
  );
}

export default function RevealScreen() {
  const { profile } = useAuthStore();
  const { nominations, ceremony, couple } = useNominationsStore();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const enabledIds = enabledAwardCategoryIds(couple?.awardCategories ?? []);

  const steps = useMemo(() => {
    if (!ceremony) return [];
    const w = ceremony.winners ?? {};
    const order = (couple?.awardCategories ?? [])
      .filter((r) => r.enabled)
      .map((r) => r.id);
    const primary = order.filter((cat) => {
      const hasNoms = nominations.some((n) => n.category === cat);
      return hasNoms && w[cat as AwardCategory];
    });
    const extra = Object.keys(w).filter(
      (cat) =>
        !primary.includes(cat) &&
        nominations.some((n) => n.category === cat) &&
        w[cat as AwardCategory],
    );
    return [...primary, ...extra];
  }, [ceremony, nominations, couple?.awardCategories]);

  const coupleId = profile?.coupleId ?? couple?.id ?? null;
  const uidA = couple?.user1Id;
  const uidB = couple?.user2Id;
  const ready =
    ceremony?.status === 'voting' &&
    allRequiredWinnersPresent(nominations, ceremony?.winners ?? {}, enabledIds);

  const dismissComplete = useCallback(() => {
    setShowComplete(false);
    router.replace('/awards');
  }, []);

  if (!profile || !ceremony || !couple || !coupleId || !uidA || !uidB) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-hum-bg">
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScreenHeader title="cheer" subtitle="not ready" />
        <View className="flex-1 justify-center px-8">
          <Text className="mb-6 text-center text-[14px] font-light text-hum-muted">
            crown every category · or sync splits on awards
          </Text>
          <Button label="back to awards" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  if (steps.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScreenHeader title="cheer" />
        <View className="flex-1 justify-center px-8">
          <Button label="back to awards" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const catId = steps[step];
  const meta = displayForCategoryId(couple?.awardCategories, catId);
  const winner = ceremony.winners?.[catId as AwardCategory];
  const nom = winner ? nominationById(nominations, winner.nominationId) : null;
  const isLast = step >= steps.length - 1;

  function goNext() {
    void hapticLight();
    setStep((s) => s + 1);
  }

  async function onFinishSeason() {
    if (!coupleId || !ceremony || !uidA || !uidB) return;
    const rewardMeta = {
      deliberationDisagreements: deliberationDisagreementCount(
        ceremony,
        nominations,
        uidA,
        uidB,
        enabledIds,
      ),
      categoryCountWithNominations: categoriesWithNominations(nominations, enabledIds).length,
    };
    setFinishing(true);
    try {
      await completeCeremonyAndAdvance(coupleId, ceremony.id, nominations);
      const ceremonyGrants = await grantCeremonyCompletionRewards(uidA, uidB, rewardMeta);
      const cycleBadges = await afterCeremonyFullyCompleted(coupleId, ceremony, nominations);
      enqueueGamificationToasts(ceremonyGrants.xp, [
        ...ceremonyGrants.newBadges,
        ...cycleBadges,
      ]);
      await hapticSuccess();
      setShowComplete(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'something went sideways';
      Alert.alert('couldn’t finish', msg);
    } finally {
      setFinishing(false);
    }
  }

  const categoryLine = `${meta.emoji}  ${meta.label}`;

  return (
    <View className="flex-1 bg-hum-bg">
      <SafeAreaView className="flex-1">
        <ScreenHeader title="cheer" subtitle={`${step + 1} / ${steps.length}`} />
        <View className="flex-1 justify-between px-6 pb-10 pt-1">
          <Text
            className="mb-1 text-[10px] font-medium uppercase tracking-[0.24em] text-hum-dim"
            maxFontSizeMultiplier={1.25}
          >
            {awardsVoice.cheerScreenHint.toUpperCase()}
          </Text>
          <Pressable
            onPress={() => {
              if (step > 0) {
                void hapticLight();
                setStep((s) => s - 1);
              }
            }}
            disabled={step === 0}
            className="self-start min-h-11 justify-center py-2"
            accessibilityRole="button"
            accessibilityLabel="previous winner"
            accessibilityState={{ disabled: step === 0 }}
          >
            <Text className={`text-[13px] ${step === 0 ? 'text-hum-dim/40' : 'text-hum-muted'}`}>
              previous
            </Text>
          </Pressable>

          <View className="flex-1 justify-center py-4">
            <RevealWinnerCard
              stepIndex={step}
              categoryLine={categoryLine}
              title={nom?.title ?? '—'}
              description={nom?.description?.trim() ? nom.description : null}
            />
          </View>

          <View className="gap-y-3">
            {!isLast ? (
              <Button label="next moment" onPress={goNext} size="lg" />
            ) : (
              <Button
                label="wrap this season"
                onPress={onFinishSeason}
                loading={finishing}
                size="lg"
              />
            )}
          </View>
        </View>
      </SafeAreaView>

      <SeasonCompleteOverlay
        visible={showComplete}
        xpEach={XP_REWARDS.ceremony_completed}
        onDone={dismissComplete}
      />
    </View>
  );
}
