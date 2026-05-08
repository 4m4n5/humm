import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { LoadingState } from '@/components/shared/LoadingState';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { useAuthStore } from '@/lib/stores/authStore';
import { usePickStore } from '@/lib/stores/pickStore';
import {
  addPickOption,
  removePickOption,
  readyUp,
  solvePickFromPool,
  appendLabelToLibrary,
} from '@/lib/firestore/picks';
import { useDecisionStore } from '@/lib/stores/decisionStore';
import { errorsVoice, navVoice, decideVoice } from '@/constants/hummVoice';
import { DECISION_CATEGORIES } from '@/constants/categories';
import { hapticLight } from '@/lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { usePartnerName } from '@/lib/usePartnerName';
import { scrollContentStandard } from '@/constants/screenLayout';
import { swissTournamentConfig } from '@/lib/copelandRanking';

function contributorLabel(
  optionsByUser: Record<string, string[]>,
  label: string,
  myUid: string,
): 'you' | 'other' {
  for (const [uid, labels] of Object.entries(optionsByUser)) {
    if (labels.includes(label)) {
      return uid === myUid ? 'you' : 'other';
    }
  }
  return 'other';
}

export default function PickLobbyScreen() {
  const { profile } = useAuthStore();
  const { pick, couple } = usePickStore();
  const { options: decisionLib } = useDecisionStore();
  const partnerName = usePartnerName();
  const [newText, setNewText] = useState('');
  const [busy, setBusy] = useState(false);
  const [solving, setSolving] = useState(false);

  const uid = profile?.uid ?? '';
  const uidA = couple?.user1Id ?? '';
  const uidB = couple?.user2Id ?? '';

  useEffect(() => {
    if (!pick) return;
    if (pick.status === 'battling') {
      router.replace('/decide/pick-vote');
    }
    if (pick.status === 'complete') {
      router.replace('/decide/pick-result');
    }
  }, [pick?.status, pick]);

  // Bounce out if the partner cancelled / saved / started over — the pick
  // doc is gone and couple.activeBattleId has been cleared. Without this
  // the screen sits on LoadingState forever.
  useEffect(() => {
    if (couple && !couple.activeBattleId) {
      router.replace('/decide');
    }
  }, [couple?.activeBattleId, couple]);

  if (!pick || pick.status !== 'collecting') {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <AmbientGlow tone="spark" />
        <ScreenHeader title="pool" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  void DECISION_CATEGORIES;

  const canPickForUs = pick.options.length >= 2;
  const canVote = pick.options.length >= 4;

  async function handleAdd() {
    const t = newText.trim();
    if (!t || !pick) return;
    setBusy(true);
    void hapticLight();
    try {
      await addPickOption(pick.id, uid, t);
      setNewText('');
      if (profile?.coupleId) {
        void appendLabelToLibrary(profile.coupleId, pick.category, t);
      }
    } catch (e) {
      Alert.alert(errorsVoice.couldntAdd, e instanceof Error ? e.message : errorsVoice.tryAgain);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(label: string) {
    if (!pick) return;
    setBusy(true);
    try {
      await removePickOption(pick.id, uid, label);
    } catch (e) {
      Alert.alert(errorsVoice.couldntRemove, e instanceof Error ? e.message : errorsVoice.tryAgain);
    } finally {
      setBusy(false);
    }
  }

  async function handleStartVoting() {
    if (!pick || !canVote || !uidA || !uidB) return;
    setBusy(true);
    void hapticLight();
    try {
      // Either partner can start. The other auto-joins via the index
      // listener; the vote screen then opens for both.
      await readyUp(pick.id, uid, uidA, uidB);
    } catch (e) {
      Alert.alert(errorsVoice.couldnt('go to vote'), e instanceof Error ? e.message : errorsVoice.tryAgain);
    } finally {
      setBusy(false);
    }
  }

  function handleRandomize() {
    if (!pick || !canPickForUs || solving) return;
    Alert.alert(
      decideVoice.randomizeConfirmTitle,
      decideVoice.randomizeConfirmBody,
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'randomize',
          onPress: async () => {
            if (!pick) return;
            setSolving(true);
            void hapticLight();
            try {
              await solvePickFromPool(pick.id, uid, decisionLib);
            } catch (e) {
              Alert.alert(errorsVoice.couldntPick, e instanceof Error ? e.message : errorsVoice.tryAgain);
            } finally {
              setSolving(false);
            }
          },
        },
      ],
    );
  }

  // Vote-cost preview so users see what they're about to commit to.
  // Swiss kicks in for N≥8; for smaller pools we still do full round-robin.
  const voteCfg = swissTournamentConfig(pick.options.length);
  const pairCount = voteCfg.totalPairs;

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="spark" />
      <ScreenHeader title="pool" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row gap-2">
          <TextInput
            value={newText}
            onChangeText={setNewText}
            placeholder="add an option…"
            placeholderTextColor={theme.dim}
            className="min-h-[52px] flex-1 rounded-[18px] border border-hum-border/18 bg-hum-surface/80 px-4 py-3 text-[16px] text-hum-text"
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            maxFontSizeMultiplier={1.3}
            editable={!busy}
          />
          <Pressable
            onPress={handleAdd}
            disabled={busy || !newText.trim()}
            className="h-[52px] w-[52px] items-center justify-center rounded-full bg-hum-primary/20 active:opacity-88"
            accessibilityRole="button"
            accessibilityLabel="Add typed option to decision pool"
          >
            <Ionicons name="add" size={28} color={theme.primary} />
          </Pressable>
        </View>

        <View className="gap-y-2">
          {pick.options.length === 0 ? (
            <View className="items-center rounded-[18px] border border-dashed border-hum-border/18 px-4 py-8">
              <Text
                className="text-center text-[14px] font-light text-hum-muted"
                maxFontSizeMultiplier={1.5}
              >
                nothing here yet — drop your first one.
              </Text>
            </View>
          ) : (
            pick.options.map((label) => {
              const who = contributorLabel(pick.optionsByUser ?? {}, label, uid);
              const mine = who === 'you';
              return (
                <View
                  key={label}
                  className="flex-row items-center justify-between rounded-[18px] border border-hum-border/18 bg-hum-card px-4 py-3.5"
                >
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-[15px] font-medium text-hum-text"
                      maxFontSizeMultiplier={1.3}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                    <Text
                      className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                      maxFontSizeMultiplier={1.25}
                      numberOfLines={1}
                    >
                      {who === 'you' ? 'you' : partnerName}
                    </Text>
                  </View>
                  {mine ? (
                    <Pressable
                      onPress={() => handleRemove(label)}
                      hitSlop={12}
                      className="h-11 w-11 items-center justify-center active:opacity-88"
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${label} from options`}
                    >
                      <Ionicons name="close-circle-outline" size={24} color={theme.dim} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {!canPickForUs ? (
          <Text
            className="text-center text-[12px] font-light text-amber-200/80"
            maxFontSizeMultiplier={1.3}
          >
            {`add ${2 - pick.options.length} more option${2 - pick.options.length !== 1 ? 's' : ''} to unlock`}
          </Text>
        ) : !canVote ? (
          <Text
            className="text-center text-[12px] font-light text-hum-dim"
            maxFontSizeMultiplier={1.3}
          >
            {`add ${4 - pick.options.length} more to decide together`}
          </Text>
        ) : (
          <Text
            className="text-center text-[12px] font-light text-hum-dim"
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
          >
            {voteCfg.useFullRoundRobin
              ? `${pairCount} pair${pairCount === 1 ? '' : 's'} · ${pick.options.length} options`
              : `${voteCfg.totalRounds} rounds · ${voteCfg.pairsPerRound} pairs each`}
          </Text>
        )}

        <Button
          label={decideVoice.primaryAction}
          onPress={handleStartVoting}
          loading={busy}
          disabled={!canVote}
          variant="primary"
          size="lg"
        />

        {canPickForUs ? (
          <Button
            label={decideVoice.randomizeAction}
            onPress={handleRandomize}
            loading={solving}
            variant="secondary"
            size="lg"
          />
        ) : null}

        <Button label={navVoice.backTo('decide')} onPress={() => router.back()} variant="ghost" size="md" />
      </ScrollView>
    </SafeAreaView>
  );
}
