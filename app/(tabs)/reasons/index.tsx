import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { Button } from '@/components/shared/Button';
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
import { reasonsVoice } from '@/constants/hummVoice';
import type { Reason, UserProfile } from '@/types';

/** Pause after a real draw is committed so the moment reads before cards appear. */
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

/** Very soft “alive” feel on the hero glyph — opacity only, works reliably with NativeWind. */
function SoftGlyphBreath() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.68,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      className="items-center justify-center py-1"
      style={{ opacity }}
    >
      <Text className="text-[52px] leading-none" accessibilityElementsHidden>
        💌
      </Text>
    </Animated.View>
  );
}

/** Fade + gentle lift so the trio is easy to notice. */
function QuotesReveal({ revealKey, children }: { revealKey: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;
  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(22);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [revealKey, opacity, translateY]);
  return (
    <Animated.View
      className="gap-y-3"
      style={{ opacity, transform: [{ translateY }] }}
    >
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

  const drawUnlocked = reasonsDealThreeUnlocked(byMe.length, effectiveCheckpoint);

  const hasPartnerReasonsAboutMe = aboutMe.length > 0;

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
            Alert.alert('couldn’t open your trio', 'try again in a moment');
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
            Alert.alert('couldn’t open your trio', 'try again in a moment');
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

  const needsWriteForPartnerFirst = byMe.length === 0;

  const idleHero = (() => {
    if (needsWriteForPartnerFirst) {
      return {
        title: reasonsVoice.writeFirstTitle(partnerName),
        body: reasonsVoice.writeFirstBody,
      };
    }
    if (!hasPartnerReasonsAboutMe) {
      return {
        title: reasonsVoice.waitingOnPartnerTitle(partnerName),
        body: reasonsVoice.waitingOnPartnerBody,
      };
    }
    if (!drawUnlocked) {
      return {
        title: reasonsVoice.writeAgainTitle(partnerName),
        body: reasonsVoice.writeAgainBody,
      };
    }
    return {
      title: reasonsVoice.readyHeroTitle,
      body: reasonsVoice.readyHeroBody,
    };
  })();

  const primaryWriteLabel = reasonsVoice.primaryWriteFor(partnerName);

  const openWrite = () => {
    if (isOpeningTrio) return;
    setWarmHint(null);
    router.push('/reasons/write');
  };

  const openingHero = {
    title: 'opening…',
    body: 'three about you',
  };

  const idleHeroResolved = isOpeningTrio ? openingHero : idleHero;

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
            <View className="min-h-[280px] justify-center px-6 py-6">
              <View className="gap-y-5">
                <View className="items-center gap-y-2" accessibilityRole="text">
                  <SoftGlyphBreath />
                  <Text
                    className="text-center text-[20px] font-light leading-[26px] text-hum-text"
                    maxFontSizeMultiplier={1.25}
                  >
                    {idleHeroResolved.title}
                  </Text>
                  {idleHeroResolved.body ? (
                    <Text
                      className="text-center text-[14px] font-light leading-[22px] text-hum-muted"
                      maxFontSizeMultiplier={1.35}
                    >
                      {idleHeroResolved.body}
                    </Text>
                  ) : null}
                </View>

                {warmHint === 'partner_pending' ? (
                  <View className="rounded-[18px] border border-hum-bloom/25 bg-hum-surface/50 px-4 py-3">
                    <Text
                      className="text-center text-[12px] font-light leading-[18px] text-hum-muted"
                      maxFontSizeMultiplier={1.35}
                    >
                      reason saved · trio opens when they write about you
                    </Text>
                  </View>
                ) : null}
                {warmHint === 'sync' ? (
                  <View className="rounded-[18px] border border-hum-border/18 bg-hum-surface/40 px-4 py-3">
                    <Text
                      className="text-center text-[12px] font-light leading-[18px] text-hum-muted"
                      maxFontSizeMultiplier={1.35}
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
                    className="text-[11px] font-medium uppercase tracking-[0.18em] text-hum-bloom/60"
                    maxFontSizeMultiplier={1.2}
                  >
                    {reasonsVoice.rewardCardsTitle}
                  </Text>
                  <Text
                    className="mt-1.5 text-[17px] font-light leading-[24px] text-hum-text"
                    maxFontSizeMultiplier={1.25}
                  >
                    {reasonsVoice.rewardCardsSubtitle(partnerName)}
                  </Text>
                  <Text
                    className="mt-2 text-[12px] font-light leading-[18px] text-hum-bloom/55"
                    maxFontSizeMultiplier={1.35}
                  >
                    {reasonsVoice.rewardMomentHint}
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
                      maxFontSizeMultiplier={1.35}
                    >
                      {`\u201C${r.text}\u201D`}
                    </Text>
                    {partnerWrote(r) ? (
                      <Text
                        className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-bloom/50"
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
          <View className="flex-1 items-center gap-y-1.5 rounded-[18px] border border-hum-border/18 bg-hum-card px-2 py-4">
            <Text
              className="min-h-[28px] w-full text-center text-[22px] font-extralight leading-[28px] text-hum-text tabular-nums"
              maxFontSizeMultiplier={1.25}
            >
              {aboutMe.length}
            </Text>
            <Text className="px-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
              about you
            </Text>
          </View>
          <View className="flex-1 items-center gap-y-1.5 rounded-[18px] border border-hum-border/18 bg-hum-card px-2 py-4">
            <Text
              className="min-h-[28px] w-full text-center text-[22px] font-extralight leading-[28px] text-hum-text tabular-nums"
              maxFontSizeMultiplier={1.25}
            >
              {byMe.length}
            </Text>
            <Text className="px-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
              by you
            </Text>
          </View>
        </View>

        {myUid && partnerId ? (
          <View className="gap-y-3 rounded-[22px] border border-hum-border/18 bg-hum-card px-5 py-5">
            <Text
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              maxFontSizeMultiplier={1.2}
            >
              {reasonsVoice.listForPartnerEyebrow(partnerName)}
            </Text>
            {byMe.length === 0 ? (
              <Text
                className="text-center text-[13px] font-light leading-[20px] text-hum-muted"
                maxFontSizeMultiplier={1.35}
              >
                {reasonsVoice.listForPartnerEmpty}
              </Text>
            ) : (
              <View className="gap-y-2.5">
                {byMe.map((r) => (
                  <View
                    key={r.id}
                    className="rounded-[18px] border border-hum-crimson/18 bg-hum-surface/45 px-4 py-3.5"
                  >
                    <Text
                      className="text-[14px] font-light leading-[21px] text-hum-text"
                      maxFontSizeMultiplier={1.35}
                    >
                      {r.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
