import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBattleStore } from '@/lib/stores/battleStore';
import { DECISION_CATEGORIES } from '@/constants/categories';
import { DecisionCategory } from '@/types';
import { createBattle, cancelBattle } from '@/lib/firestore/battles';
import { scrollContentStandard } from '@/constants/screenLayout';

export default function BattleScreen() {
  const { profile } = useAuthStore();
  const { battle } = useBattleStore();
  const [category, setCategory] = useState<DecisionCategory>('food');
  const [starting, setStarting] = useState(false);

  const coupleId = profile?.coupleId ?? null;
  const partnerLinked = !!profile?.partnerId && !!coupleId;

  async function handleStart() {
    if (!coupleId) return;
    setStarting(true);
    try {
      await createBattle(coupleId, category);
      router.push('/decide/battle-lobby');
    } catch (e) {
      Alert.alert(
        'not yet',
        e instanceof Error ? e.message : 'couldn’t start a battle — try again',
      );
    } finally {
      setStarting(false);
    }
  }

  function resumeRoute(): '/decide/battle-lobby' | '/decide/battle-vote' | '/decide/battle-result' {
    if (!battle) return '/decide/battle-lobby';
    if (battle.status === 'collecting') return '/decide/battle-lobby';
    if (battle.status === 'battling') return '/decide/battle-vote';
    return '/decide/battle-result';
  }

  function handleResume() {
    router.push(resumeRoute());
  }

  async function handleCancelBattle() {
    if (!coupleId || !battle) return;
    Alert.alert(
      'leave this battle?',
      'you can open a fresh one later — nothing saves to history',
      [
        { text: 'stay', style: 'cancel' },
        {
          text: 'leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBattle(coupleId, battle.id);
              router.replace('/decide/battle');
            } catch (e) {
              Alert.alert('couldn’t leave', e instanceof Error ? e.message : 'try again');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="battle" subtitle="live bracket" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        {!partnerLinked ? (
          <View className="rounded-[24px] border border-hum-border/30 bg-hum-card/90 px-5 py-7">
            <Text className="text-center text-4xl">⚔️</Text>
            <Text
              className="mt-4 text-center text-[15px] font-medium text-hum-text"
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
              link your partner first
            </Text>
            <Text
              className="mt-2 text-center text-[14px] font-light leading-[22px] text-hum-muted"
              maxFontSizeMultiplier={1.3}
            >
              battle mode needs you both — link your partner from profile, then come back.
            </Text>
          </View>
        ) : battle ? (
          <View className="gap-y-5">
            <View className="rounded-[24px] border border-hum-secondary/20 bg-hum-card px-5 py-6">
              <Text className="text-center text-4xl">⚔️</Text>
              <Text
                className="mt-3 text-center text-[15px] font-medium text-hum-text"
                maxFontSizeMultiplier={1.25}
                numberOfLines={1}
              >
                {battle.status === 'collecting'
                  ? 'options round'
                  : battle.status === 'battling'
                    ? 'bracket in play'
                    : 'winner decided'}
              </Text>
              <Text
                className="mt-2 text-center text-[14px] font-light text-hum-muted"
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
              >
                {battle.options.length} option{battle.options.length !== 1 ? 's' : ''} ·{' '}
                {DECISION_CATEGORIES.find((c) => c.id === battle.category)?.label ?? battle.category}
              </Text>
              <Button
                label="resume"
                onPress={handleResume}
                variant="primary"
                size="lg"
                className="mt-6"
              />
              <Button
                label="leave battle"
                onPress={handleCancelBattle}
                variant="ghost"
                size="md"
                className="mt-2"
              />
            </View>
          </View>
        ) : (
          <>
            <View className="rounded-[24px] border border-hum-secondary/20 bg-hum-card px-5 py-7">
              <Text className="text-center text-4xl">⚔️</Text>
              <Text
                className="mt-5 text-center text-[14px] font-light leading-[22px] text-hum-muted"
                maxFontSizeMultiplier={1.3}
              >
                both pick every round in real time—if you’re split, it resolves on its own.
              </Text>
            </View>

            <Text
              className="px-1 text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim"
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
              category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {DECISION_CATEGORIES.map((c) => {
                const selected = category === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    className={`rounded-full border px-4 py-2.5 ${
                      selected
                        ? 'border-hum-primary/50 bg-hum-primary/15'
                        : 'border-hum-border/30 bg-hum-surface/40'
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${c.label} category${selected ? ', selected' : ''}`}
                    activeOpacity={0.88}
                  >
                    <Text
                      className={`text-[13px] font-medium ${
                        selected ? 'text-hum-text' : 'text-hum-muted'
                      }`}
                      numberOfLines={1}
                    >
                      {c.emoji} {c.label.toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button
              label="start a battle"
              onPress={handleStart}
              loading={starting}
              variant="primary"
              size="lg"
            />
          </>
        )}

        <Button
          label="back to choose"
          onPress={() => router.back()}
          variant="secondary"
          size="lg"
          className="mt-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
