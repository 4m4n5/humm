import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  M3_EMPHASIZED,
  REDUCE_MOTION_NEVER,
  SPRING_RICH_REVEAL,
} from '@/lib/motion';
import { AwardCategory } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { SeasonCompleteOverlay } from '@/components/awards/SeasonCompleteOverlay';
import { EmojiShower } from '@/components/shared/EmojiShower';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { displayForCategoryId, enabledAwardCategoryIds } from '@/lib/awardCategoryConfig';
import {
  allRequiredWinnersPresent,
  nominationById,
  deliberationDisagreementCount,
  categoriesWithNominations,
} from '@/lib/awardsLogic';
import {
  completeCeremonyAndAdvance,
  markCheerCompleted,
} from '@/lib/firestore/ceremonies';
import { grantCeremonyCompletionRewards } from '@/lib/firestore/gamification';
import { afterCeremonyFullyCompleted } from '@/lib/gamificationTriggers';
import { enqueueGamificationToasts } from '@/lib/stores/xpFeedbackStore';
import { XP_REWARDS } from '@/constants/levels';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { LoadingState } from '@/components/shared/LoadingState';
import { awardsVoice, errorsVoice, navVoice } from '@/constants/hummVoice';
import { theme } from '@/constants/theme';
import { usePartnerName } from '@/lib/usePartnerName';

const AWARD_EMOJI_POOLS: Record<string, string[]> = {
  best_found_food: ['🍽️', '🍜', '🍕', '🥘', '✨', '🌟', '🍷', '🫕'],
  best_purchase: ['🛍️', '🎁', '💎', '✨', '🌟', '🛒', '💫', '🏷️'],
  sexy_time_initiation: ['🔥', '💋', '❤️‍🔥', '✨', '💫', '🌹', '🫦', '💕'],
  best_planning: ['🗺️', '📋', '✨', '🌟', '🎯', '💫', '🧭', '📍'],
  best_surprise: ['🎁', '🎉', '✨', '💫', '🌟', '🎊', '🎀', '🪅'],
  best_movie: ['🎞️', '🎬', '🍿', '✨', '🌟', '📽️', '💫', '🎥'],
  best_fight_resolution: ['🤝', '💛', '✨', '🌟', '💫', '🫶', '💪', '☮️'],
};

const CELEBRATORY_BASE = ['✨', '🌟', '💫', '✦', '🎉', '🏆', '⭐', '🪩'];

function emojiPoolForCategory(catId: string, catEmoji: string): string[] {
  const preset = AWARD_EMOJI_POOLS[catId];
  if (preset) return preset;
  return [catEmoji, catEmoji, ...CELEBRATORY_BASE];
}

// Reveal card entrance — long enough to feel rewarding, not so long that
// the moment drags. Calibrated 2026-05-07 against user feel-check.
const CARD_ENTER_MS = 600;
const SHOWER_DELAY_MS = CARD_ENTER_MS + 180;

function RevealWinnerCard({
  stepIndex,
  categoryLine,
  recipientLine,
  title,
  description,
}: {
  stepIndex: number;
  categoryLine: string;
  recipientLine: string | null;
  title: string;
  description: string | null;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(translateY);
    cancelAnimation(scale);
    opacity.value = 0;
    translateY.value = 14;
    scale.value = 0.92;

    opacity.value = withTiming(1, {
      duration: CARD_ENTER_MS,
      easing: Easing.out(Easing.cubic),
      reduceMotion: REDUCE_MOTION_NEVER,
    });
    translateY.value = withTiming(0, {
      duration: CARD_ENTER_MS,
      easing: M3_EMPHASIZED,
      reduceMotion: REDUCE_MOTION_NEVER,
    });
    // Scale uses an expressive spring (one visible breath on entry) so the
    // card lands with weight rather than fading in. Pairs with the timing
    // curves above — they finish in CARD_ENTER_MS, the spring lingers a
    // beat longer for follow-through.
    scale.value = withSpring(1, {
      ...SPRING_RICH_REVEAL,
      reduceMotion: REDUCE_MOTION_NEVER,
    });
  }, [stepIndex, opacity, translateY, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={animStyle}
      className="rounded-[22px] border border-hum-border/18 bg-hum-card px-6 py-9"
    >
      <Text
        className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
        maxFontSizeMultiplier={1.25}
      >
        {categoryLine}
      </Text>
      {recipientLine ? (
        <Text
          className="mt-3 text-center text-[15px] font-medium tracking-tight text-hum-gold"
          maxFontSizeMultiplier={1.3}
        >
          {recipientLine}
        </Text>
      ) : null}
      <Text
        className="mt-3 text-center text-[30px] font-semibold leading-[36px] tracking-tight text-hum-text"
        maxFontSizeMultiplier={1.3}
      >
        {title}
      </Text>
      {description ? (
        <Text
          className="mt-4 text-center text-[14px] font-light leading-[22px] text-hum-muted"
          numberOfLines={5}
          maxFontSizeMultiplier={1.5}
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
  const partnerName = usePartnerName();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showerKey, setShowerKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

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
  const uid = profile?.uid;
  const uidA = couple?.user1Id;
  const uidB = couple?.user2Id;
  const ready =
    ceremony?.status === 'voting' &&
    allRequiredWinnersPresent(nominations, ceremony?.winners ?? {}, enabledIds);

  const myCheerDone = !!(uid && ceremony?.cheerCompletedBy?.[uid]);
  const partnerUid = uid === uidA ? uidB : uidA;
  const partnerCheerDone = !!(partnerUid && ceremony?.cheerCompletedBy?.[partnerUid]);
  const bothCheered = myCheerDone && partnerCheerDone;

  useEffect(() => {
    setCelebrating(false);
    const showerTimer = setTimeout(() => {
      setShowerKey((k) => k + 1);
      setCelebrating(true);
    }, SHOWER_DELAY_MS);
    return () => clearTimeout(showerTimer);
  }, [step]);

  // Mark this user as having seen the cheer when they reach the last card.
  const reachedEnd = steps.length > 0 && step >= steps.length - 1;
  const markedRef = useRef(false);
  useEffect(() => {
    if (reachedEnd && uid && ceremony && !myCheerDone && !markedRef.current) {
      markedRef.current = true;
      void markCheerCompleted(ceremony.id, uid);
    }
  }, [reachedEnd, uid, ceremony, myCheerDone]);

  useEffect(() => {
    if (ceremony?.status === 'complete' && !showComplete) {
      setShowComplete(true);
    }
  }, [ceremony?.status, showComplete]);

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
        <ScreenHeader title="cheer" />
        <View className="flex-1 justify-center">
          <EmptyState
            ionicon="trophy-outline"
            ioniconColor={`${theme.gold}B3`}
            title="not ready to cheer"
            description="crown every category · or sync splits on awards"
            primaryAction={{ label: navVoice.backTo('awards'), onPress: () => router.back() }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (steps.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScreenHeader title="cheer" />
        <View className="flex-1 justify-center">
          <EmptyState
            ionicon="ribbon-outline"
            ioniconColor={`${theme.gold}B3`}
            title="nothing to cheer yet"
            description="winners will appear here once every category is settled"
            primaryAction={{ label: navVoice.backTo('awards'), onPress: () => router.back() }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const catId = steps[step];
  const meta = displayForCategoryId(couple?.awardCategories, catId);
  const winner = ceremony.winners?.[catId as AwardCategory];
  const nom = winner ? nominationById(nominations, winner.nominationId) : null;
  const isLast = step >= steps.length - 1;

  const recipientLine = (() => {
    if (!nom) return null;
    if (nom.nomineeId === 'both') return 'for both of you';
    if (nom.nomineeId === uid) return 'for you';
    return `for ${partnerName}`;
  })();

  const emojiPool = emojiPoolForCategory(catId, meta.emoji);

  function goNext() {
    void hapticLight();
    setStep((s) => s + 1);
  }

  async function onFinishSeason() {
    if (!coupleId || !ceremony || !uid || !uidA || !uidB) return;
    setFinishing(true);
    try {
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
      const msg = e instanceof Error ? e.message : errorsVoice.tryAgain;
      Alert.alert(errorsVoice.couldntFinish, msg);
    } finally {
      setFinishing(false);
    }
  }

  const categoryLine = `${meta.emoji}  ${meta.label}`;

  return (
    <View className="flex-1 bg-hum-bg">
      <SafeAreaView className="flex-1">
        <AmbientGlow tone="gold" />
        <ScreenHeader title="cheer" />
        <View className="flex-1 justify-between px-6 pb-10 pt-1">
          <Text
            className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
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
            className="self-start min-h-[44px] justify-center py-2"
            accessibilityRole="button"
            accessibilityLabel="Go to previous cheer winner"
            accessibilityState={{ disabled: step === 0 }}
          >
            <Text
              className={`text-[13px] ${step === 0 ? 'text-hum-dim/40' : 'text-hum-muted'}`}
              maxFontSizeMultiplier={1.3}
            >
              previous
            </Text>
          </Pressable>

          <View className="flex-1 justify-center py-4">
            <RevealWinnerCard
              stepIndex={step}
              categoryLine={categoryLine}
              recipientLine={recipientLine}
              title={nom?.title ?? '—'}
              description={nom?.description?.trim() ? nom.description : null}
            />
          </View>

          <View className="gap-y-3">
            {!isLast ? (
              <Button label="next moment" onPress={goNext} size="lg" />
            ) : bothCheered ? (
              <>
                <Button
                  label="wrap this season"
                  onPress={onFinishSeason}
                  loading={finishing}
                  size="lg"
                />
                <Button
                  label="wrap later"
                  onPress={() => router.replace('/awards')}
                  variant="ghost"
                  size="md"
                />
              </>
            ) : (
              <>
                <Text
                  className="text-center text-[13px] font-light text-hum-muted"
                  maxFontSizeMultiplier={1.5}
                >
                  waiting for your partner to see the cheer
                </Text>
                <Button
                  label="wrap later"
                  onPress={() => router.replace('/awards')}
                  variant="ghost"
                  size="md"
                />
              </>
            )}
          </View>
        </View>
      </SafeAreaView>

      <EmojiShower
        visible={celebrating}
        onFinished={() => setCelebrating(false)}
        emojiPool={emojiPool}
        intensity="standard"
        fireKey={showerKey}
      />

      <SeasonCompleteOverlay
        visible={showComplete}
        xpEach={XP_REWARDS.ceremony_completed}
        onDone={dismissComplete}
      />
    </View>
  );
}
