import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { BracketProgress } from '@/components/pick/BracketProgress';
import { PickRevealAnimated } from '@/components/pick/PickRevealAnimated';
import { useAuthStore } from '@/lib/stores/authStore';
import { usePickStore } from '@/lib/stores/pickStore';
import {
  submitMatchupVote,
  submitPairVote,
  isVoteModeSession,
} from '@/lib/firestore/picks';
import {
  pairsInRound,
  userRoundProgress,
  hasUserCompletedRound,
} from '@/lib/copelandRanking';
import { hapticLight, hapticSuccess, hapticWarning } from '@/lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import { errorsVoice, navVoice } from '@/constants/hummVoice';
import { theme } from '@/constants/theme';
import { scrollContentStandard } from '@/constants/screenLayout';
import { PickPair, PickSession } from '@/types';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing as REasing,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Pick-vote screen.
 *
 * Two flows live here:
 *  - **Copeland round-robin** (new sessions): each partner independently
 *    swipes through C(N,2) pairs in their own shuffled order. When both
 *    finish, scores resolve and the result screen reveals.
 *  - **Single-elim bracket** (legacy, for in-flight old sessions): the
 *    original matchup-by-matchup vote with revote/coin-flip. Kept for
 *    backwards compat; new sessions never enter this path.
 */
export default function PickVoteScreen() {
  const { profile } = useAuthStore();
  const { pick, couple } = usePickStore();

  const uid = profile?.uid ?? '';
  const uidA = couple?.user1Id ?? '';
  const uidB = couple?.user2Id ?? '';

  useEffect(() => {
    if (!pick) return;
    if (pick.status === 'complete') {
      router.replace('/decide/pick-result');
    }
    if (pick.status === 'collecting') {
      router.replace('/decide/pick-lobby');
    }
  }, [pick?.status, pick]);

  // Bounce back to /decide if the session was wrapped up by the other
  // partner (save / cancel / start-over clear couple.activeBattleId).
  // Otherwise we'd be stuck rendering LoadingState since pick goes null.
  useEffect(() => {
    if (couple && !couple.activeBattleId) {
      router.replace('/decide');
    }
  }, [couple?.activeBattleId, couple]);

  if (!pick || pick.status !== 'battling') {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <AmbientGlow tone="spark" />
        <ScreenHeader title="vote" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (isVoteModeSession(pick)) {
    return <VotePairsFlow pick={pick} uid={uid} uidA={uidA} uidB={uidB} />;
  }
  return <VoteBracketFlow pick={pick} uid={uid} uidA={uidA} uidB={uidB} />;
}

// ════════════════════════════════════════════════════════════════════════════
// Copeland round-robin flow (new)
// ════════════════════════════════════════════════════════════════════════════

function VotePairsFlow({
  pick,
  uid,
  uidA,
  uidB,
}: {
  pick: PickSession;
  uid: string;
  uidA: string;
  uidB: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const partnerUid = uid === uidA ? uidB : uidA;

  const pairs = pick.pairs ?? [];
  const myOrder = pick.pairOrderByUser?.[uid] ?? [];

  // Round bookkeeping: in Swiss mode (`roundsTotal > 1`) we drive progress
  // off the *current round*; in full-RR mode (`roundsTotal === 1`) the
  // round counts collapse to overall progress and behave as before.
  const currentRound = pick.currentRound ?? 0;
  const roundsTotal = Math.max(1, pick.roundsTotal ?? 1);
  const swissMode = roundsTotal > 1;

  const roundPairs = useMemo(
    () => pairsInRound(pairs, currentRound),
    [pairs, currentRound],
  );
  const roundTotal = roundPairs.length;

  const myRoundProgress = useMemo(
    () => userRoundProgress(pairs, currentRound, uid),
    [pairs, currentRound, uid],
  );
  const partnerRoundProgress = useMemo(
    () => userRoundProgress(pairs, currentRound, partnerUid),
    [pairs, currentRound, partnerUid],
  );

  // Resolve current pair from my shuffled order: first index in my order
  // whose pair I haven't voted on yet AND that belongs to the current
  // round (Swiss). For full-RR `currentRound === 0` matches everything.
  const currentPair = useMemo<PickPair | null>(() => {
    for (const pi of myOrder) {
      const p = pairs.find((x) => x.index === pi);
      if (!p) continue;
      if ((p.round ?? 0) !== currentRound) continue;
      if (!p.voteByUser[uid]) return p;
    }
    return null;
  }, [pairs, myOrder, uid, currentRound]);

  const myRoundDone = useMemo(
    () => hasUserCompletedRound(pairs, currentRound, uid),
    [pairs, currentRound, uid],
  );
  const partnerRoundDone = useMemo(
    () => hasUserCompletedRound(pairs, currentRound, partnerUid),
    [pairs, currentRound, partnerUid],
  );

  const myDone = !currentPair && roundTotal > 0 && myRoundDone;
  const partnerDone = partnerRoundDone && roundTotal > 0;

  async function pickSide(label: string) {
    if (!currentPair || submitting) return;
    setSubmitting(true);
    try {
      await submitPairVote(pick.id, uid, currentPair.index, label, uidA, uidB);
    } catch (e) {
      Alert.alert(errorsVoice.couldnt('save your vote'), e instanceof Error ? e.message : errorsVoice.tryAgain);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="spark" />
      <ScreenHeader title="vote" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <PairProgress
          myProgress={myRoundProgress}
          partnerProgress={partnerRoundProgress}
          total={roundTotal}
          currentRound={currentRound}
          roundsTotal={roundsTotal}
          swissMode={swissMode}
        />

        {currentPair ? (
          <>
            <Text
              className="text-center text-[10px] font-medium uppercase tracking-[0.22em] text-hum-dim"
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
              which would you rather
            </Text>

            <View className="flex-row items-stretch gap-3">
              <SwipeCard
                label={currentPair.optionA}
                onPress={() => pickSide(currentPair.optionA)}
                disabled={submitting}
                side="A"
              />
              <View className="justify-center px-1">
                <View
                  className="h-[64%] w-[1px] rounded-full bg-hum-border/35"
                  accessibilityElementsHidden
                />
              </View>
              <SwipeCard
                label={currentPair.optionB}
                onPress={() => pickSide(currentPair.optionB)}
                disabled={submitting}
                side="B"
              />
            </View>

            <Text
              className="text-center text-[12px] font-light leading-[18px] text-hum-dim"
              maxFontSizeMultiplier={1.5}
              numberOfLines={2}
            >
              your picks stay private until the end
            </Text>
          </>
        ) : (
          <DoneCard
            myDone={myDone}
            partnerDone={partnerDone}
            currentRound={currentRound}
            roundsTotal={roundsTotal}
            swissMode={swissMode}
          />
        )}

        <Button
          label={navVoice.backTo('pool')}
          variant="ghost"
          size="md"
          onPress={() => router.back()}
          accessibilityLabel="back to pick screen"
          className="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function PairProgress({
  myProgress,
  partnerProgress,
  total,
  currentRound,
  roundsTotal,
  swissMode,
}: {
  myProgress: number;
  partnerProgress: number;
  total: number;
  currentRound: number;
  roundsTotal: number;
  swissMode: boolean;
}) {
  const myPct = total > 0 ? Math.min(1, myProgress / total) : 0;
  const partnerPct = total > 0 ? Math.min(1, partnerProgress / total) : 0;
  const pairLabel =
    myProgress < total
      ? `pair ${Math.min(myProgress + 1, total)} of ${total}`
      : `${total} of ${total}`;
  return (
    <View className="gap-y-3 px-1">
      <View className="items-center gap-y-1">
        {swissMode ? (
          <Text
            className="text-center text-[10px] font-medium uppercase tracking-[0.22em] text-hum-primary/80"
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
          >
            {`round ${currentRound + 1} of ${roundsTotal}`}
          </Text>
        ) : null}
        <Text
          className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
          maxFontSizeMultiplier={1.25}
          numberOfLines={1}
        >
          {pairLabel}
        </Text>
      </View>
      <View className="gap-y-2">
        <ProgressRow label="you" pct={myPct} />
        <ProgressRow label="partner" pct={partnerPct} muted />
      </View>
    </View>
  );
}

function ProgressRow({
  label,
  pct,
  muted,
}: {
  label: string;
  pct: number;
  muted?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-x-3">
      <Text
        className={`w-[60px] text-[10px] font-medium uppercase tracking-[0.18em] ${
          muted ? 'text-hum-dim' : 'text-hum-muted'
        }`}
        maxFontSizeMultiplier={1.25}
      >
        {label}
      </Text>
      <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-hum-border/25">
        <View
          className={`h-full rounded-full ${muted ? 'bg-hum-dim' : 'bg-hum-primary'}`}
          style={{ width: `${pct * 100}%` }}
        />
      </View>
    </View>
  );
}

function DoneCard({
  myDone,
  partnerDone,
  currentRound,
  roundsTotal,
  swissMode,
}: {
  myDone: boolean;
  partnerDone: boolean;
  currentRound: number;
  roundsTotal: number;
  swissMode: boolean;
}) {
  // Icon breathes (scale + opacity) while we're waiting on the partner; stays
  // still once both are done so the title gets a clean reveal. ReduceMotion
  // shrinks the amplitude but never hides the cue.
  const iconScale = useSharedValue(1);
  const iconOpacity = useSharedValue(1);
  const waiting = myDone && !partnerDone;

  useEffect(() => {
    if (waiting) {
      iconScale.value = withRepeat(
        withSequence(
          withTiming(0.92, { duration: 1100, easing: REasing.inOut(REasing.quad), reduceMotion: ReduceMotion.Never }),
          withTiming(1, { duration: 1100, easing: REasing.inOut(REasing.quad), reduceMotion: ReduceMotion.Never }),
        ),
        -1,
        false,
      );
      iconOpacity.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 1100, easing: REasing.inOut(REasing.quad), reduceMotion: ReduceMotion.Never }),
          withTiming(1, { duration: 1100, easing: REasing.inOut(REasing.quad), reduceMotion: ReduceMotion.Never }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(iconScale);
      cancelAnimation(iconOpacity);
      iconScale.value = withTiming(1, { duration: 200 });
      iconOpacity.value = withTiming(1, { duration: 200 });
    }
    return () => {
      cancelAnimation(iconScale);
      cancelAnimation(iconOpacity);
    };
  }, [waiting, iconScale, iconOpacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  // In Swiss mode the "done" state can mean two very different things:
  //   • finished an intermediate round → next round is brewing
  //   • finished the final round → final tally
  const isLastRound = !swissMode || currentRound + 1 >= roundsTotal;
  const bothDone = myDone && partnerDone;

  let title: string;
  let copy: string;
  if (bothDone) {
    title = isLastRound ? 'tallying picks' : 'next round brewing';
    copy = isLastRound ? 'one moment…' : 'pulling up the next pairs…';
  } else if (myDone) {
    title = isLastRound ? 'all yours, locked in' : `round ${currentRound + 1} done`;
    copy = isLastRound
      ? 'waiting on your partner to finish'
      : 'waiting on your partner to wrap this round';
  } else {
    title = 'syncing…';
    copy = 'pulling things together';
  }

  return (
    <Card tier="outer" padding="hero" className="items-center px-6 py-10">
      <Animated.View
        style={iconStyle}
        className="h-11 w-11 items-center justify-center rounded-xl bg-hum-primary/12"
      >
        <Ionicons
          name={bothDone ? 'sparkles-outline' : 'hourglass-outline'}
          size={20}
          color={theme.primary}
        />
      </Animated.View>
      <Text
        className="mt-5 text-center text-[16px] font-medium text-hum-text"
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text
        className="mt-2 max-w-[280px] text-center text-[13px] font-light leading-[19px] text-hum-muted"
        maxFontSizeMultiplier={1.5}
        numberOfLines={2}
      >
        {copy}
      </Text>
    </Card>
  );
}

const CARD_SPRING = { damping: 14, stiffness: 320, mass: 0.7 };
const CARD_PRESS_SCALE = 0.94;
const CARD_TINT_DURATION = 140;

function SwipeCard({
  label,
  onPress,
  disabled,
  side,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  side: 'A' | 'B';
}) {
  const scale = useSharedValue(1);
  const tint = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      tint.value,
      [0, 1],
      ['rgba(30,28,39,0.80)', 'rgba(232,160,154,0.10)'],
    ),
    borderColor: interpolateColor(
      tint.value,
      [0, 1],
      ['rgba(46,41,56,0.22)', 'rgba(232,160,154,0.35)'],
    ),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      tint.value,
      [0, 1],
      [theme.text, theme.primary],
    ),
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(CARD_PRESS_SCALE, CARD_SPRING);
    tint.value = withTiming(1, { duration: CARD_TINT_DURATION, easing: REasing.out(REasing.quad) });
    void hapticLight();
  }, [scale, tint]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, CARD_SPRING);
    tint.value = withTiming(0, { duration: 200, easing: REasing.out(REasing.quad) });
  }, [scale, tint]);

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !label}
        accessibilityRole="button"
        accessibilityLabel={`Option ${side}: ${label}`}
        accessibilityState={{ disabled }}
      >
        <Animated.View
          style={cardStyle}
          className="min-h-[160px] justify-center rounded-[18px] border-2 px-4 py-5"
        >
          <Animated.Text
            style={labelStyle}
            className="text-center text-[16px] font-medium leading-[22px]"
            maxFontSizeMultiplier={1.3}
            numberOfLines={3}
          >
            {label || '\u2026'}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Legacy bracket flow (compat — for in-flight old sessions only)
// ════════════════════════════════════════════════════════════════════════════

function VoteBracketFlow({
  pick,
  uid,
  uidA,
  uidB,
}: {
  pick: PickSession;
  uid: string;
  uidA: string;
  uidB: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [tiebreak, setTiebreak] = useState<
    { optionA: string; optionB: string; winner: string; key: string } | null
  >(null);
  const tiebreakShown = useRef(new Set<string>());
  const prevRevote = useRef(0);
  const lastCelebrated = useRef<string | null>(null);
  const winPulse = useSharedValue(1);
  const partnerUid = uid === uidA ? uidB : uidA;

  useEffect(() => {
    if (pick.status !== 'battling') return;
    for (let i = pick.bracket.length - 1; i >= 0; i--) {
      const m = pick.bracket[i];
      const key = `${pick.id}-${i}`;
      if (m.decidedByCoinFlip && m.winner && m.optionB !== null && !tiebreakShown.current.has(key)) {
        tiebreakShown.current.add(key);
        setTiebreak({ optionA: m.optionA, optionB: m.optionB, winner: m.winner, key });
        break;
      }
    }
  }, [pick.bracket, pick.id, pick.status]);

  const idx = pick.currentMatchupIndex ?? 0;
  const m = pick.bracket?.[idx];

  useEffect(() => {
    if (!m || pick.status !== 'battling') return;
    if ((m.revoteRound ?? 0) > prevRevote.current) {
      prevRevote.current = m.revoteRound ?? 0;
      void hapticWarning();
    }
  }, [m?.revoteRound, m, pick.status]);

  useEffect(() => {
    prevRevote.current = 0;
  }, [pick.currentMatchupIndex]);

  useEffect(() => {
    if (!m?.winner || m.decidedByCoinFlip || pick.status !== 'battling') return;
    const key = `${pick.id}-${idx}-${m.winner}`;
    if (lastCelebrated.current === key) return;
    lastCelebrated.current = key;
    void hapticSuccess();
    winPulse.value = 0.92;
    winPulse.value = withSpring(1, { damping: 8, stiffness: 180, mass: 0.6 });
  }, [m?.winner, m?.decidedByCoinFlip, pick.id, idx, pick.status, m, winPulse]);

  async function vote(choice: string) {
    if (!uidA || !uidB || pick.status !== 'battling') return;
    if (submitting) return;
    setSubmitting(true);
    void hapticLight();
    try {
      await submitMatchupVote(pick.id, uid, pick.currentMatchupIndex, choice, uidA, uidB);
    } catch (e) {
      Alert.alert(errorsVoice.couldnt('save your vote'), e instanceof Error ? e.message : errorsVoice.tryAgain);
    } finally {
      setSubmitting(false);
    }
  }

  if (!m) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <AmbientGlow tone="spark" />
        <ScreenHeader title="vote" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  const optA = m.optionA.trim();
  const optB = m.optionB !== null ? m.optionB.trim() : '';
  const myPick = m.votesByUser?.[uid];
  const partnerPick = m.votesByUser?.[partnerUid];
  const bothPicked = !!(myPick && partnerPick);
  const showSplitHint =
    (m.revoteRound ?? 0) > 0 &&
    !m.winner &&
    Object.keys(m.votesByUser ?? {}).length === 0;
  const splitHintCopy =
    (m.revoteRound ?? 0) >= 2
      ? 'final try · one more split and we’ll decide'
      : 'still split · decide together';
  const isFinalTiebreakerRound = (m.revoteRound ?? 0) >= 2;

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="spark" />
      <ScreenHeader title="vote" />

      {tiebreak ? (
        <View className="absolute inset-0 z-50 justify-center bg-hum-bg/95 px-6">
          <View className="items-center gap-y-4 rounded-[24px] border border-hum-border/30 bg-hum-card/90 px-6 py-10">
            <PickRevealAnimated
              options={[tiebreak.optionA, tiebreak.optionB]}
              winner={tiebreak.winner}
              eyebrow="picking"
              footnote="advances from this matchup"
              footnoteClassName="text-center text-[13px] font-light leading-[19px] text-hum-dim"
              onFinish={() => setTiebreak(null)}
              revealKey={tiebreak.key}
            />
          </View>
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <BracketProgress bracket={pick.bracket} currentIdx={pick.currentMatchupIndex} />

        {showSplitHint ? (
          <View className="rounded-[18px] border border-hum-border/18 bg-hum-surface/40 px-4 py-3.5">
            <Text
              className="text-center text-[14px] font-light text-hum-muted"
              maxFontSizeMultiplier={1.5}
              numberOfLines={2}
            >
              {splitHintCopy}
            </Text>
          </View>
        ) : null}

        {isFinalTiebreakerRound && !showSplitHint && !m.winner && !bothPicked ? (
          <View className="rounded-[18px] border border-hum-border/18 bg-hum-surface/40 px-4 py-3">
            <Text
              className="text-center text-[13px] font-light leading-[19px] text-hum-muted"
              maxFontSizeMultiplier={1.5}
              numberOfLines={2}
            >
              one more split and we’ll pick for you
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-stretch gap-3">
          <LegacyVoteCard
            label={optA}
            selected={myPick === m.optionA}
            disabled={!!myPick || !optA}
            onPress={() => vote(m.optionA)}
            side="A"
            dimmed={!!m.winner && m.winner !== m.optionA}
            highlight={!!m.winner && m.winner === m.optionA}
            animScale={winPulse}
          />
          <View className="justify-center px-1">
            <View
              className="h-[64%] w-[1px] rounded-full bg-hum-border/35"
              accessibilityElementsHidden
            />
          </View>
          <LegacyVoteCard
            label={optB}
            selected={m.optionB != null && myPick === m.optionB}
            disabled={!!myPick || !optB}
            onPress={() => m.optionB != null && vote(m.optionB)}
            side="B"
            dimmed={!!m.winner && m.optionB != null && m.winner !== m.optionB}
            highlight={!!m.winner && m.optionB != null && m.winner === m.optionB}
            animScale={winPulse}
          />
        </View>

        {myPick && !partnerPick ? (
          <Text
            className="text-center text-[14px] font-light text-hum-muted"
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
          >
            waiting for their pick…
          </Text>
        ) : null}

        {bothPicked && !m.winner ? (
          <Text
            className="text-center text-[14px] font-light text-hum-dim"
            maxFontSizeMultiplier={1.5}
            numberOfLines={2}
          >
            {isFinalTiebreakerRound
              ? 'resolving — we’ll pick if you split again…'
              : 'locking in…'}
          </Text>
        ) : null}

        {m.winner && !m.decidedByCoinFlip ? (
          <Text
            className="text-center text-[15px] font-medium text-hum-primary"
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
          >
            {m.winner} advances
          </Text>
        ) : null}

        <Button
          label={navVoice.backTo('pool')}
          variant="ghost"
          size="md"
          onPress={() => router.back()}
          accessibilityLabel="back to pick screen"
          className="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegacyVoteCard({
  label,
  selected,
  disabled,
  onPress,
  side,
  dimmed,
  highlight,
  animScale,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  side: 'A' | 'B';
  dimmed?: boolean;
  highlight?: boolean;
  animScale: SharedValue<number>;
}) {
  const wrapStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ scale: highlight ? animScale.value : 1 }],
  }));
  return (
    <Animated.View style={wrapStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled || !label}
        className={`min-h-[140px] flex-1 justify-center rounded-[18px] border-2 px-3 py-4 active:opacity-88 ${
          highlight
            ? 'border-hum-primary/25 bg-hum-primary/12'
            : selected
              ? 'border-hum-primary/20 bg-hum-primary/8'
              : 'border-hum-border/18 bg-hum-card'
        } ${dimmed ? 'opacity-45' : ''}`}
        accessibilityRole="button"
        accessibilityLabel={`Option ${side}: ${label}${selected ? ', selected' : ''}`}
        accessibilityState={{ selected: !!selected, disabled: disabled || !label }}
      >
        <Text
          className="text-center text-[15px] font-medium leading-[22px] text-hum-text"
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
        >
          {label || '…'}
        </Text>
        {selected ? (
          <View className="mt-3 items-center">
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
