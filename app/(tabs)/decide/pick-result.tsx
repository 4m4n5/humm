import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { LoadingState } from '@/components/shared/LoadingState';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/authStore';
import { usePickStore } from '@/lib/stores/pickStore';
import { useDecisionStore } from '@/lib/stores/decisionStore';
import {
  completePickDecision,
  startOverPick,
} from '@/lib/firestore/picks';
import { PickReveal } from '@/components/pick/PickReveal';
import { PickRevealAnimated } from '@/components/pick/PickRevealAnimated';
import { DecideCelebration } from '@/components/pick/DecideCelebration';
import { grantBattleCompletionRewards } from '@/lib/firestore/gamification';
import { errorsVoice, decideVoice, navVoice } from '@/constants/hummVoice';
import {
  afterBattleDecisionSaved,
  afterQuickSpinDecisionSaved,
} from '@/lib/gamificationTriggers';
import { enqueueGamificationToasts } from '@/lib/stores/xpFeedbackStore';
import { hapticSuccess } from '@/lib/haptics';
import { scrollContentStandard } from '@/constants/screenLayout';
import { pairOutcome } from '@/lib/copelandRanking';
import { PickSession } from '@/types';

export default function PickResultScreen() {
  const { profile } = useAuthStore();
  const { pick, couple } = usePickStore();
  const { markOptionPicked, options } = useDecisionStore();
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const celebrated = useRef(false);
  const [celebrating, setCelebrating] = useState(false);
  const [revealedPickId, setRevealedPickId] = useState<string | null>(null);

  const coupleId = profile?.coupleId ?? '';
  const uidA = couple?.user1Id ?? '';
  const uidB = couple?.user2Id ?? '';

  useEffect(() => {
    if (pick?.status === 'battling') {
      router.replace('/decide/pick-vote');
    }
    if (pick?.status === 'collecting') {
      router.replace('/decide/pick-lobby');
    }
  }, [pick?.status]);

  // If the partner saved (or cancelled / started over), the pick doc is
  // deleted and `couple.activeBattleId` is cleared. Without this, the
  // listener returns null and we'd sit on `LoadingState` forever.
  // Skip while we're the one mid-action — `startOverPick` briefly clears
  // `activeBattleId` between deleting the old session and creating the new
  // one, and `handleSave` shows a maps alert that should outlive this nav.
  useEffect(() => {
    if (saving || restarting) return;
    if (couple && !couple.activeBattleId) {
      router.replace('/decide');
    }
  }, [couple?.activeBattleId, couple, saving, restarting]);

  useEffect(() => {
    if (pick?.status === 'complete' && pick.winner && !celebrated.current) {
      celebrated.current = true;
      setCelebrating(true);
    }
  }, [pick?.status, pick?.winner]);

  async function handleSave() {
    if (!pick?.winner || !coupleId || !uidA || !uidB || !profile) return;
    const saved = pick;
    const isSolo = !!saved.pickedSoloByUserId;
    setSaving(true);
    try {
      await completePickDecision(coupleId, saved, { createdByUserId: profile.uid });

      try {
        if (isSolo) {
          await afterQuickSpinDecisionSaved(saved.pickedSoloByUserId ?? profile.uid, coupleId);
        } else {
          const grants = await grantBattleCompletionRewards(uidA, uidB, coupleId);
          enqueueGamificationToasts(grants.xp, grants.newBadges);
          await afterBattleDecisionSaved(coupleId);
        }
      } catch (e) {
        console.warn('pick gamification', e);
      }

      const picked = (options[saved.category] ?? []).find((o) => o.label === saved.winner);
      if (picked) {
        try {
          await markOptionPicked(coupleId, saved.category, picked.id);
        } catch (e) {
          console.warn('markOptionPicked', e);
        }
      }

      if (saved.category === 'food') {
        const result = saved.winner;
        Alert.alert(
          `let’s get ${result}!`,
          'peek maps for a spot nearby?',
          [
            { text: 'not now', style: 'cancel', onPress: () => router.replace('/decide') },
            {
              text: 'open maps',
              onPress: () => {
                const q = encodeURIComponent(`${result} restaurant`);
                const url =
                  Platform.OS === 'ios'
                    ? `maps://?q=${q}`
                    : `geo:0,0?q=${q}`;
                void Linking.openURL(url);
                router.replace('/decide');
              },
            },
          ],
        );
      } else {
        router.replace('/decide');
      }
    } catch (e) {
      Alert.alert(errorsVoice.couldntSave, e instanceof Error ? e.message : errorsVoice.tryAgain);
    } finally {
      setSaving(false);
    }
  }

  async function handleStartOver() {
    if (!pick || !coupleId || !profile?.uid) return;
    setRestarting(true);
    try {
      await startOverPick(coupleId, pick.id, pick.category, profile.uid);
      router.replace('/decide/pick-lobby');
    } catch (e) {
      Alert.alert(errorsVoice.couldntReset, e instanceof Error ? e.message : errorsVoice.tryAgain);
    } finally {
      setRestarting(false);
    }
  }

  if (!pick || pick.status !== 'complete' || !pick.winner) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <AmbientGlow tone="spark" />
        <ScreenHeader title="decided" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  const isSolo = !!pick.pickedSoloByUserId;
  const showSoloReveal = isSolo && revealedPickId !== pick.id;

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="spark" />
      <ScreenHeader title="decided" />

      {showSoloReveal ? (
        <View className="absolute inset-0 z-50 items-center justify-center bg-hum-bg/95 px-8">
          <View className="w-full max-w-[380px]">
            <PickRevealAnimated
              options={pick.options}
              winner={pick.winner}
              onFinish={() => {
                setRevealedPickId(pick.id);
                setCelebrating(true);
              }}
              revealKey={pick.id}
            />
          </View>
        </View>
      ) : null}

      <DecideCelebration
        visible={celebrating && !showSoloReveal}
        onFinished={() => setCelebrating(false)}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-y-4">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-hum-primary/14">
            <Ionicons name="trophy-outline" size={30} color={theme.primary} />
          </View>
          <PickReveal label={pick.winner} revealKey={pick.winner} />
        </View>

        {!isSolo && pick.ranking && pick.ranking.length > 0 ? (
          <CopelandBreakdown pick={pick} />
        ) : !isSolo ? (
          <View className="gap-y-2">
            <Text
              className="px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
              how it shook out
            </Text>
            {pick.bracket.map((m, i) =>
              m.winner ? (
                <View
                  key={`${m.round}-${m.position}-${i}`}
                  className="flex-row flex-wrap items-center justify-between rounded-[18px] border border-hum-border/18 bg-hum-surface/30 px-4 py-3.5"
                >
                  <Text
                    className="max-w-[70%] text-[14px] font-light text-hum-muted"
                    maxFontSizeMultiplier={1.3}
                    numberOfLines={1}
                  >
                    {m.optionB === null ? `${m.optionA} (bye)` : `${m.optionA} · ${m.optionB}`}
                  </Text>
                  <Text
                    className="text-[15px] font-medium text-hum-primary"
                    maxFontSizeMultiplier={1.3}
                    numberOfLines={1}
                  >
                    {m.winner}
                    {m.decidedByCoinFlip ? ' · we picked' : ''}
                  </Text>
                </View>
              ) : null,
            )}
          </View>
        ) : null}

        <Button label={decideVoice.saveResultAction} onPress={handleSave} loading={saving} variant="primary" size="lg" />
        <Button
          label={decideVoice.startOverAction}
          onPress={handleStartOver}
          loading={restarting}
          variant="secondary"
          size="lg"
        />
        <Button label={navVoice.backTo('decide')} onPress={() => router.replace('/decide')} variant="ghost" size="md" />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Copeland-mode breakdown: shows the joint ranking + an agreement stat.
 *
 *  - "your joint ranking": every option, sorted by Copeland score.
 *    Score is rendered as a small chip ({sign}{n}). The leader has a
 *    primary-tinted row; ties keep the same score.
 *  - "where you matched": % of pairs where both partners agreed.
 */
function CopelandBreakdown({ pick }: { pick: PickSession }) {
  const ranking = pick.ranking ?? [];
  const scores = pick.scores ?? {};
  const pairs = pick.pairs ?? [];

  const totalPairs = pairs.length;
  const agreed = pairs.filter((p) => pairOutcome(p) === 'agree').length;
  const split = pairs.filter((p) => pairOutcome(p) === 'split').length;
  const agreementPct = totalPairs > 0 ? Math.round((agreed / totalPairs) * 100) : 0;

  return (
    <View className="gap-y-3">
      <View className="flex-row gap-x-3">
        <StatChip label="agreed" value={`${agreed}`} sub={`of ${totalPairs}`} accent />
        <StatChip label="split" value={`${split}`} sub={`of ${totalPairs}`} />
        <StatChip label="match" value={`${agreementPct}%`} sub="overall" />
      </View>

      <Text
        className="px-1 pt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
        maxFontSizeMultiplier={1.25}
        numberOfLines={1}
      >
        your joint ranking
      </Text>
      <View className="gap-y-2">
        {ranking.map((label, i) => {
          const score = scores[label] ?? 0;
          const sign = score > 0 ? '+' : '';
          const isWinner = i === 0;
          return (
            <View
              key={label}
              className={`flex-row items-center justify-between rounded-[18px] border px-4 py-3.5 ${
                isWinner
                  ? 'border-hum-primary/35 bg-hum-primary/8'
                  : 'border-hum-border/18 bg-hum-surface/30'
              }`}
            >
              <View className="flex-1 flex-row items-center gap-x-3 pr-3">
              <Text
                className={`w-5 text-[12px] font-medium tabular-nums ${
                  isWinner ? 'text-hum-primary' : 'text-hum-dim'
                }`}
                maxFontSizeMultiplier={1.3}
              >
                {i + 1}
              </Text>
                <Text
                  className={`flex-1 text-[15px] font-medium ${
                    isWinner ? 'text-hum-text' : 'text-hum-muted'
                  }`}
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
              <Text
                className={`text-[13px] font-medium tabular-nums ${
                  isWinner
                    ? 'text-hum-primary'
                    : score > 0
                      ? 'text-hum-muted'
                      : 'text-hum-dim'
                }`}
                maxFontSizeMultiplier={1.3}
              >
                {sign}{score}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatChip({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <View
      className={`flex-1 rounded-[18px] border px-3 py-3 ${
        accent ? 'border-hum-primary/25 bg-hum-primary/8' : 'border-hum-border/18 bg-hum-surface/30'
      }`}
    >
      <Text
        className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
        maxFontSizeMultiplier={1.25}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        className={`mt-1 text-[18px] font-medium tabular-nums ${
          accent ? 'text-hum-primary' : 'text-hum-text'
        }`}
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
      >
        {value}
      </Text>
      {sub ? (
        <Text
          className="mt-0.5 text-[11px] font-light text-hum-dim"
          maxFontSizeMultiplier={1.25}
          numberOfLines={1}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
