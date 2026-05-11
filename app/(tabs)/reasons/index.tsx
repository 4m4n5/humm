import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import Animated, {
  Easing as REasing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { useAuthStore } from '@/lib/stores/authStore';
import { useReasonStore } from '@/lib/stores/reasonStore';
import { useReasonsRewardStore } from '@/lib/stores/reasonsRewardStore';
import { usePartnerName } from '@/lib/usePartnerName';
import { reasonsAboutUser, pickRandomReasons } from '@/lib/firestore/reasons';
import { setReasonPartnerCountAtLastDraw } from '@/lib/firestore/users';
import {
  reasonsDealThreeUnlocked,
  effectiveReasonPartnerDrawCheckpoint,
} from '@/lib/reasonsDrawCredits';
import { scrollContentStandard } from '@/constants/screenLayout';
import { cardShadow } from '@/constants/elevation';
import { theme } from '@/constants/theme';
import { reasonsVoice, errorsVoice } from '@/constants/hummVoice';
import type { Reason, UserProfile } from '@/types';

const REVEAL_PAUSE_MS = 1400;

function reasonsByMeForPartner(
  reasons: Reason[],
  myUid: string,
  partnerId: string,
): Reason[] {
  if (!myUid.trim() || !partnerId.trim()) return [];
  return reasons.filter(
    (r) =>
      r.authorId === myUid && (r.aboutId ?? '').trim() === partnerId,
  );
}

type DrawEval =
  | { ok: true; cards: Reason[]; countAtDraw: number }
  | { ok: false; reason: 'not_unlocked' | 'no_pool' };

function evaluateReasonsDraw(
  reasons: Reason[],
  profile: UserProfile,
  myUid: string,
  partnerId: string,
): DrawEval {
  const mine = reasonsByMeForPartner(reasons, myUid, partnerId);
  const serverCp = effectiveReasonPartnerDrawCheckpoint(profile, mine.length);
  if (!reasonsDealThreeUnlocked(mine.length, serverCp)) {
    return { ok: false, reason: 'not_unlocked' };
  }
  const aboutNow = reasonsAboutUser(reasons, myUid);
  if (aboutNow.length === 0) return { ok: false, reason: 'no_pool' };

  const next = pickRandomReasons(aboutNow, 3);
  if (!next.length) return { ok: false, reason: 'no_pool' };
  return { ok: true, cards: next, countAtDraw: mine.length };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function SoftGlyphBreath() {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 3200, easing: REasing.inOut(REasing.quad) }),
        withTiming(1, { duration: 3200, easing: REasing.inOut(REasing.quad) }),
      ),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(0.92, { duration: 3200, easing: REasing.inOut(REasing.quad) }),
        withTiming(1, { duration: 3200, easing: REasing.inOut(REasing.quad) }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View className="items-center justify-center py-2" style={animStyle}>
      <Ionicons name="heart-outline" size={36} color={theme.crimson} />
    </Animated.View>
  );
}

function QuotesReveal({ revealKey, children }: { revealKey: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(22);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 22;
    opacity.value = withTiming(1, {
      duration: 1100,
      easing: REasing.out(REasing.cubic),
    });
    translateY.value = withTiming(0, {
      duration: 1100,
      easing: REasing.out(REasing.cubic),
    });
  }, [revealKey, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View className="gap-y-3" style={animStyle}>
      {children}
    </Animated.View>
  );
}

export default function ReasonsScreen() {
  const { profile, firebaseUser } = useAuthStore();
  const partnerName = usePartnerName();
  const [drawn, setDrawn] = useState<Reason[] | null>(null);
  const [rewardRunId, setRewardRunId] = useState(0);
  const [isOpeningTrio, setIsOpeningTrio] = useState(false);
  const [warmHint, setWarmHint] = useState<'partner_pending' | 'sync' | null>(null);
  const [optimisticCheckpointFloor, setOptimisticCheckpointFloor] = useState<number | null>(null);

  const myUid = (firebaseUser?.uid ?? profile?.uid ?? '').trim();
  const partnerId = (profile?.partnerId ?? '').trim();

  const reasons = useReasonStore((s) => s.reasons);

  const aboutMe = useMemo(
    () => (myUid ? reasonsAboutUser(reasons, myUid) : []),
    [reasons, myUid],
  );
  const byMe = useMemo(
    () => reasonsByMeForPartner(reasons, myUid, partnerId),
    [reasons, myUid, partnerId],
  );

  const serverCheckpoint = useMemo(
    () => effectiveReasonPartnerDrawCheckpoint(profile, byMe.length),
    [profile, byMe.length],
  );

  const effectiveCheckpoint =
    optimisticCheckpointFloor != null
      ? Math.max(serverCheckpoint, optimisticCheckpointFloor)
      : serverCheckpoint;

  useEffect(() => {
    if (
      optimisticCheckpointFloor != null &&
      serverCheckpoint >= optimisticCheckpointFloor
    ) {
      setOptimisticCheckpointFloor(null);
    }
  }, [serverCheckpoint, optimisticCheckpointFloor]);

  const runPostWriteReward = useCallback(
    async (cancelled: { current: boolean }) => {
      if (!myUid || !partnerId) return;
      if (cancelled.current) return;
      setWarmHint(null);
      setIsOpeningTrio(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const deadline = Date.now() + 3400;
      let lastEval: DrawEval | null = null;

      const finishFailure = () => {
        if (!cancelled.current) {
          setIsOpeningTrio(false);
        }
      };

      while (Date.now() < deadline) {
        if (cancelled.current) {
          setIsOpeningTrio(false);
          return;
        }
        const r = useReasonStore.getState().reasons;
        const p = useAuthStore.getState().profile;
        if (!p) break;
        lastEval = evaluateReasonsDraw(r, p, myUid, partnerId);
        if (lastEval.ok) {
          try {
            await setReasonPartnerCountAtLastDraw(myUid, lastEval.countAtDraw);
          } catch (e) {
            console.error(e);
            finishFailure();
            if (cancelled.current) return;
            Alert.alert(errorsVoice.couldntOpen('your trio'), errorsVoice.tryAgainLater);
            return;
          }
          if (cancelled.current) {
            setIsOpeningTrio(false);
            return;
          }
          await sleep(REVEAL_PAUSE_MS);
          if (cancelled.current) {
            setIsOpeningTrio(false);
            return;
          }
          setOptimisticCheckpointFloor(lastEval.countAtDraw);
          setDrawn(lastEval.cards);
          setRewardRunId((x) => x + 1);
          setIsOpeningTrio(false);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          return;
        }
        await sleep(90);
      }

      if (cancelled.current) {
        setIsOpeningTrio(false);
        return;
      }

      const pFinal = useAuthStore.getState().profile;
      const rFinal = useReasonStore.getState().reasons;
      if (pFinal) {
        const again = evaluateReasonsDraw(rFinal, pFinal, myUid, partnerId);
        if (again.ok) {
          try {
            await setReasonPartnerCountAtLastDraw(myUid, again.countAtDraw);
            if (cancelled.current) {
              setIsOpeningTrio(false);
              return;
            }
            await sleep(REVEAL_PAUSE_MS);
            if (cancelled.current) {
              setIsOpeningTrio(false);
              return;
            }
            setOptimisticCheckpointFloor(again.countAtDraw);
            setDrawn(again.cards);
            setRewardRunId((x) => x + 1);
            setIsOpeningTrio(false);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch (e) {
            console.error(e);
            finishFailure();
            Alert.alert(errorsVoice.couldntOpen('your trio'), errorsVoice.tryAgainLater);
          }
          return;
        }
        lastEval = again;
      }

      finishFailure();
      if (cancelled.current) return;
      if (lastEval?.ok === false && lastEval.reason === 'no_pool') {
        setWarmHint('partner_pending');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        setWarmHint('sync');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    },
    [myUid, partnerId],
  );

  useFocusEffect(
    useCallback(() => {
      if (!useReasonsRewardStore.getState().consumePendingReward()) {
        return undefined;
      }
      const cancelled = { current: false };
      void runPostWriteReward(cancelled);
      return () => {
        cancelled.current = true;
        setIsOpeningTrio(false);
      };
    }, [runPostWriteReward]),
  );

  const partnerWrote = (r: Reason) =>
    partnerId.length > 0 && r.authorId === partnerId;

  const idleHero = 'one for them \u00b7 three for you';

  const primaryWriteLabel = reasonsVoice.primaryWriteFor(partnerName);

  const openWrite = () => {
    if (isOpeningTrio) return;
    setWarmHint(null);
    router.push('/reasons/write');
  };

  const heroTagline = isOpeningTrio ? 'opening\u2026' : idleHero;

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="crimson" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle title="reasons" />

        <View
          className="relative overflow-hidden rounded-[22px] border border-hum-crimson/25 bg-hum-card"
          style={cardShadow as StyleProp<ViewStyle>}
        >
          {drawn === null ? (
            <View className="min-h-[220px] justify-center px-6 py-6">
              <View className="gap-y-5">
                <View className="items-center gap-y-2.5" accessibilityRole="text">
                  <SoftGlyphBreath />
                  <Text
                    className="text-center text-[13px] font-light leading-[20px] text-hum-muted"
                    maxFontSizeMultiplier={1.3}
                    numberOfLines={1}
                  >
                    {heroTagline}
                  </Text>
                </View>

                {warmHint === 'partner_pending' ? (
                  <View className="rounded-[18px] border border-hum-crimson/18 bg-hum-surface/50 px-4 py-3">
                    <Text
                      className="text-center text-[12px] font-light leading-[18px] text-hum-muted"
                      maxFontSizeMultiplier={1.5}
                    >
                      reason saved · trio opens when they write about you
                    </Text>
                  </View>
                ) : null}
                {warmHint === 'sync' ? (
                  <View className="rounded-[18px] border border-hum-border/18 bg-hum-surface/40 px-4 py-3">
                    <Text
                      className="text-center text-[12px] font-light leading-[18px] text-hum-muted"
                      maxFontSizeMultiplier={1.5}
                    >
                      stay here a moment · or write again
                    </Text>
                  </View>
                ) : null}

                {myUid && partnerId ? (
                  <Button
                    label={primaryWriteLabel}
                    onPress={openWrite}
                    loading={isOpeningTrio}
                    disabled={isOpeningTrio}
                    size="lg"
                    accessibilityLabel={`Write a reason for ${partnerName}`}
                  />
                ) : null}
              </View>
            </View>
          ) : (
            <View className="gap-y-4 px-6 py-6">
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1 pt-0.5">
                  <Text
                    className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                    maxFontSizeMultiplier={1.25}
                  >
                    {reasonsVoice.rewardCardsTitle}
                  </Text>
                  <Text
                    className="mt-1.5 text-[17px] font-light leading-[24px] text-hum-text"
                    maxFontSizeMultiplier={1.3}
                  >
                    {reasonsVoice.rewardCardsSubtitle(partnerName)}
                  </Text>
                </View>
                <Button
                  label="done"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDrawn(null);
                  }}
                  accessibilityLabel="Close and return to write"
                />
              </View>

              <QuotesReveal revealKey={rewardRunId}>
                {drawn.map((r) => (
                  <View
                    key={`${rewardRunId}-${r.id}`}
                    className="gap-y-2 rounded-[18px] border border-hum-crimson/22 bg-hum-surface/45 px-4 py-4"
                  >
                    <Text
                      className="text-[16px] font-light leading-[24px] text-hum-text"
                      maxFontSizeMultiplier={1.5}
                    >
                      {`\u201C${r.text}\u201D`}
                    </Text>
                    {partnerWrote(r) ? (
                      <Text
                        className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                        maxFontSizeMultiplier={1.25}
                      >
                        from {partnerName}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </QuotesReveal>

              <Button
                label={reasonsVoice.writeAnotherFor(partnerName)}
                onPress={openWrite}
                size="lg"
                variant="secondary"
                accessibilityLabel={`Write another reason for ${partnerName}`}
              />
            </View>
          )}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 items-center gap-y-1.5 rounded-[18px] border border-hum-crimson/18 bg-hum-card px-2 py-4">
            <Text
              className="min-h-[28px] w-full text-center text-[22px] font-extralight leading-[28px] text-hum-text tabular-nums"
              maxFontSizeMultiplier={1.3}
            >
              {aboutMe.length}
            </Text>
            <Text className="px-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
              about you
            </Text>
          </View>
          <View className="flex-1 items-center gap-y-1.5 rounded-[18px] border border-hum-crimson/18 bg-hum-card px-2 py-4">
            <Text
              className="min-h-[28px] w-full text-center text-[22px] font-extralight leading-[28px] text-hum-text tabular-nums"
              maxFontSizeMultiplier={1.3}
            >
              {byMe.length}
            </Text>
            <Text className="px-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
              by you
            </Text>
          </View>
        </View>

        {myUid && partnerId && byMe.length > 0 ? (
          <Card className="gap-y-3">
            <Text
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              maxFontSizeMultiplier={1.25}
            >
              {reasonsVoice.listForPartnerEyebrow(partnerName)}
            </Text>
            <View className="gap-y-2.5">
              {byMe.map((r) => (
                <View
                  key={r.id}
                  className="rounded-[18px] border border-hum-crimson/18 bg-hum-surface/45 px-4 py-3.5"
                >
                  <Text
                    className="text-[14px] font-light leading-[21px] text-hum-text"
                    maxFontSizeMultiplier={1.5}
                  >
                    {r.text}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
