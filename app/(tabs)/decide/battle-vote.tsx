import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/shared/Button';
import { BracketProgress } from '@/components/battle/BracketProgress';
import { CoinFlip } from '@/components/battle/CoinFlip';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBattleStore } from '@/lib/stores/battleStore';
import { submitMatchupVote } from '@/lib/firestore/battles';
import { hapticLight, hapticSuccess, hapticWarning } from '@/lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { scrollContentStandard } from '@/constants/screenLayout';

export default function BattleVoteScreen() {
  const { profile } = useAuthStore();
  const { battle, couple } = useBattleStore();
  const [submitting, setSubmitting] = useState(false);
  const [coinFlip, setCoinFlip] = useState<{
    a: string;
    b: string;
    w: string;
  } | null>(null);
  const coinShown = useRef(new Set<string>());
  const prevRevote = useRef(0);
  const lastCelebrated = useRef<string | null>(null);
  const winPulse = useRef(new Animated.Value(1)).current;

  const uid = profile?.uid ?? '';
  const uidA = couple?.user1Id ?? '';
  const uidB = couple?.user2Id ?? '';
  const partnerUid = uid === uidA ? uidB : uidA;

  useEffect(() => {
    if (!battle) return;
    if (battle.status === 'complete') {
      router.replace('/decide/battle-result');
    }
    if (battle.status === 'collecting') {
      router.replace('/decide/battle-lobby');
    }
  }, [battle?.status, battle]);

  useEffect(() => {
    if (!battle || battle.status !== 'battling') return;
    for (let i = battle.bracket.length - 1; i >= 0; i--) {
      const m = battle.bracket[i];
      const key = `${battle.id}-${i}`;
      if (m.decidedByCoinFlip && m.winner && m.optionB !== null && !coinShown.current.has(key)) {
        coinShown.current.add(key);
        setCoinFlip({ a: m.optionA, b: m.optionB, w: m.winner });
        break;
      }
    }
  }, [battle?.bracket, battle?.id, battle?.status]);

  const idx = battle?.currentMatchupIndex ?? 0;
  const m = battle?.bracket?.[idx];

  useEffect(() => {
    if (!m || battle?.status !== 'battling') return;
    if ((m.revoteRound ?? 0) > prevRevote.current) {
      prevRevote.current = m.revoteRound ?? 0;
      void hapticWarning();
    }
  }, [m?.revoteRound, m, battle?.status]);

  useEffect(() => {
    prevRevote.current = 0;
  }, [battle?.currentMatchupIndex]);

  useEffect(() => {
    if (!m?.winner || m.decidedByCoinFlip || battle?.status !== 'battling') return;
    const key = `${battle?.id}-${idx}-${m.winner}`;
    if (lastCelebrated.current === key) return;
    lastCelebrated.current = key;
    void hapticSuccess();
    winPulse.setValue(0.92);
    Animated.spring(winPulse, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [m?.winner, m?.decidedByCoinFlip, battle?.id, idx, battle?.status, m, winPulse]);

  async function pick(choice: string) {
    if (!battle || !uidA || !uidB || battle.status !== 'battling') return;
    if (submitting) return;
    setSubmitting(true);
    void hapticLight();
    try {
      await submitMatchupVote(battle.id, uid, battle.currentMatchupIndex, choice, uidA, uidB);
    } catch (e) {
      Alert.alert('vote didn’t stick', e instanceof Error ? e.message : 'try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (!battle || battle.status !== 'battling' || !m) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScreenHeader title="battle" />
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
      ? 'final try · split again spins it'
      : 'still split · pick together';
  const isFinalTiebreakerRound = (m.revoteRound ?? 0) >= 2;

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="matchup" />

      {coinFlip ? (
        <View className="absolute inset-0 z-50 justify-center bg-hum-bg/95 px-4">
          <CoinFlip
            optionA={coinFlip.a}
            optionB={coinFlip.b}
            winningLabel={coinFlip.w}
            onFinish={() => setCoinFlip(null)}
          />
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <BracketProgress bracket={battle.bracket} currentIdx={battle.currentMatchupIndex} />

        {showSplitHint ? (
          <View className="rounded-[18px] border border-hum-border/18 bg-amber-950/22 px-4 py-3.5">
            <Text
              className="text-center text-[14px] font-light text-amber-100/90"
              maxFontSizeMultiplier={1.3}
              numberOfLines={2}
            >
              {splitHintCopy}
            </Text>
          </View>
        ) : null}

        {isFinalTiebreakerRound && !showSplitHint && !m.winner && !bothPicked ? (
          <View className="rounded-[18px] border border-amber-900/35 bg-amber-950/18 px-4 py-3">
            <Text
              className="text-center text-[13px] font-light leading-[19px] text-amber-100/85"
              maxFontSizeMultiplier={1.3}
              numberOfLines={2}
            >
              third split spins a tiebreaker
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-stretch gap-3">
          <VoteCard
            label={optA}
            selected={myPick === m.optionA}
            disabled={!!myPick || !optA}
            onPress={() => pick(m.optionA)}
            side="A"
            dimmed={!!m.winner && m.winner !== m.optionA}
            highlight={!!m.winner && m.winner === m.optionA}
            animScale={winPulse}
          />
          <View className="justify-center px-1">
            <Text
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              numberOfLines={1}
            >
              vs
            </Text>
          </View>
          <VoteCard
            label={optB}
            selected={m.optionB != null && myPick === m.optionB}
            disabled={!!myPick || !optB}
            onPress={() => m.optionB != null && pick(m.optionB)}
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
            maxFontSizeMultiplier={1.3}
            numberOfLines={2}
          >
            {isFinalTiebreakerRound
              ? 'resolving — tiebreaker spin if you still split…'
              : 'locking in…'}
          </Text>
        ) : null}

        {m.winner && !m.decidedByCoinFlip ? (
          <Text
            className="text-center text-[15px] font-medium text-hum-spark"
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
          >
            {m.winner} advances
          </Text>
        ) : null}

        <Button
          label="back"
          variant="ghost"
          size="md"
          onPress={() => router.back()}
          accessibilityLabel="back to battle hub"
          className="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function VoteCard({
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
  animScale: Animated.Value;
}) {
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: highlight ? animScale : 1 }] }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || !label}
        activeOpacity={0.88}
        className={`min-h-[140px] flex-1 justify-center rounded-[18px] border-2 px-3 py-4 ${
          highlight
            ? 'border-emerald-500/55 bg-emerald-950/25'
            : selected
              ? 'border-hum-primary/20 bg-hum-primary/12'
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
            <Ionicons name="checkmark-circle" size={22} color={theme.spark} />
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}
