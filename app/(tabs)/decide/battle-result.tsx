import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { LoadingState } from '@/components/shared/LoadingState';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBattleStore } from '@/lib/stores/battleStore';
import { useDecisionStore } from '@/lib/stores/decisionStore';
import {
  completeBattleDecision,
  rematchBattle,
} from '@/lib/firestore/battles';
import { grantBattleCompletionRewards } from '@/lib/firestore/gamification';
import { afterBattleDecisionSaved } from '@/lib/gamificationTriggers';
import { enqueueGamificationToasts } from '@/lib/stores/xpFeedbackStore';
import { DECISION_CATEGORIES } from '@/constants/categories';
import { hapticSuccess } from '@/lib/haptics';
import { scrollContentStandard } from '@/constants/screenLayout';

export default function BattleResultScreen() {
  const { profile } = useAuthStore();
  const { battle, couple } = useBattleStore();
  const { markOptionPicked, options } = useDecisionStore();
  const [saving, setSaving] = useState(false);
  const [rematching, setRematching] = useState(false);
  const celebrated = useRef(false);

  const coupleId = profile?.coupleId ?? '';
  const uidA = couple?.user1Id ?? '';
  const uidB = couple?.user2Id ?? '';

  useEffect(() => {
    if (battle?.status === 'battling') {
      router.replace('/decide/battle-vote');
    }
    if (battle?.status === 'collecting') {
      router.replace('/decide/battle-lobby');
    }
  }, [battle?.status]);

  useEffect(() => {
    if (battle?.status === 'complete' && battle.winner && !celebrated.current) {
      celebrated.current = true;
      void hapticSuccess();
    }
  }, [battle?.status, battle?.winner]);

  async function handleSave() {
    if (!battle?.winner || !coupleId || !uidA || !uidB) return;
    const saved = battle;
    setSaving(true);
    try {
      await completeBattleDecision(coupleId, saved);

      try {
        const battleGrants = await grantBattleCompletionRewards(uidA, uidB, coupleId);
        enqueueGamificationToasts(battleGrants.xp, battleGrants.newBadges);
      } catch (e) {
        console.warn('battle rewards grant', e);
      }

      try {
        await afterBattleDecisionSaved(coupleId);
      } catch (e) {
        console.warn('battle gamification triggers', e);
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
            { text: 'not now', style: 'cancel', onPress: () => router.replace('/decide/battle') },
            {
              text: 'open maps',
              onPress: () => {
                const q = encodeURIComponent(`${result} restaurant`);
                const url =
                  Platform.OS === 'ios'
                    ? `maps://?q=${q}`
                    : `geo:0,0?q=${q}`;
                void Linking.openURL(url);
                router.replace('/decide/battle');
              },
            },
          ],
        );
      } else {
        router.replace('/decide/battle');
      }
    } catch (e) {
      Alert.alert('couldn’t save', e instanceof Error ? e.message : 'try again');
    } finally {
      setSaving(false);
    }
  }

  async function handleRematch() {
    if (!battle || !coupleId) return;
    setRematching(true);
    try {
      await rematchBattle(coupleId, battle.id, battle.category);
      router.replace('/decide/battle-lobby');
    } catch (e) {
      Alert.alert('rematch bailed', e instanceof Error ? e.message : 'try again');
    } finally {
      setRematching(false);
    }
  }

  if (!battle || battle.status !== 'complete' || !battle.winner) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScreenHeader title="result" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  const cat = DECISION_CATEGORIES.find((c) => c.id === battle.category);

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader
        title="champion"
        subtitle={cat ? `${cat.emoji} ${cat.label.toLowerCase()}` : battle.category}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center rounded-[24px] border border-hum-primary/22 bg-hum-card/95 px-6 py-10">
          <Text className="text-6xl">🏆</Text>
          <Text
            className="mt-4 text-center text-[10px] font-medium uppercase tracking-[0.26em] text-hum-muted"
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
          >
            crowned
          </Text>
          <Text
            className="mt-2 text-center text-[26px] font-light tracking-tight text-hum-text"
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
          >
            {battle.winner}
          </Text>
        </View>

        <View className="gap-y-2">
          <Text
            className="px-1 text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim"
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
          >
            how it shook out
          </Text>
          {battle.bracket.map((m, i) =>
            m.winner ? (
              <View
                key={`${m.round}-${m.position}-${i}`}
                className="flex-row flex-wrap items-center justify-between rounded-[20px] border border-hum-border/30 bg-hum-surface/30 px-4 py-3.5"
              >
                <Text
                  className="max-w-[70%] text-[14px] font-light text-hum-muted"
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                >
                  {m.optionB === null ? `${m.optionA} (bye)` : `${m.optionA} vs ${m.optionB}`}
                </Text>
                <Text
                  className="text-[15px] font-medium text-hum-primary"
                  maxFontSizeMultiplier={1.25}
                  numberOfLines={1}
                >
                  {m.winner}
                  {m.decidedByCoinFlip ? ' · coin' : ''}
                </Text>
              </View>
            ) : null,
          )}
        </View>

        <Button label="save this one" onPress={handleSave} loading={saving} variant="primary" size="lg" />
        <Button
          label="rematch (no save)"
          onPress={handleRematch}
          loading={rematching}
          variant="secondary"
          size="lg"
        />
        <Button label="battle hub" onPress={() => router.replace('/decide/battle')} variant="ghost" size="md" />
      </ScrollView>
    </SafeAreaView>
  );
}
