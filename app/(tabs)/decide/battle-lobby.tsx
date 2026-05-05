import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { LoadingState } from '@/components/shared/LoadingState';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBattleStore } from '@/lib/stores/battleStore';
import {
  addBattleOption,
  removeBattleOption,
  readyUp,
} from '@/lib/firestore/battles';
import { DECISION_CATEGORIES } from '@/constants/categories';
import { hapticLight } from '@/lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { usePartnerName } from '@/lib/usePartnerName';
import { scrollContentStandard } from '@/constants/screenLayout';

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

export default function BattleLobbyScreen() {
  const { profile } = useAuthStore();
  const { battle, couple } = useBattleStore();
  const partnerName = usePartnerName();
  const [newText, setNewText] = useState('');
  const [busy, setBusy] = useState(false);
  const pulse = React.useRef(new Animated.Value(1)).current;

  const uid = profile?.uid ?? '';
  const coupleId = profile?.coupleId ?? '';
  const uidA = couple?.user1Id ?? '';
  const uidB = couple?.user2Id ?? '';

  useEffect(() => {
    if (!battle) return;
    if (battle.status === 'battling') {
      router.replace('/decide/battle-vote');
    }
    if (battle.status === 'complete') {
      router.replace('/decide/battle-result');
    }
  }, [battle?.status, battle]);

  useEffect(() => {
    const me = battle?.readyByUser?.[uid];
    const them = battle?.readyByUser?.[uid === uidA ? uidB : uidA];
    if (me && !them) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
    return undefined;
  }, [battle?.readyByUser, uid, uidA, uidB, pulse]);

  if (!battle || battle.status !== 'collecting') {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScreenHeader title="battle lobby" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  const cat = DECISION_CATEGORIES.find((c) => c.id === battle.category);
  const partnerUid = uid === uidA ? uidB : uidA;
  const myReady = !!battle.readyByUser?.[uid];
  const partnerReady = !!battle.readyByUser?.[partnerUid];
  const canReady = battle.options.length >= 4;

  async function handleAdd() {
    const t = newText.trim();
    if (!t || !battle) return;
    setBusy(true);
    void hapticLight();
    try {
      await addBattleOption(battle.id, uid, t);
      setNewText('');
    } catch (e) {
      Alert.alert('couldn’t add', e instanceof Error ? e.message : 'try again');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(label: string) {
    if (!battle) return;
    setBusy(true);
    try {
      await removeBattleOption(battle.id, uid, label);
    } catch (e) {
      Alert.alert('couldn’t remove', e instanceof Error ? e.message : 'try again');
    } finally {
      setBusy(false);
    }
  }

  async function handleReady() {
    if (!battle || !canReady || !uidA || !uidB) return;
    setBusy(true);
    try {
      await readyUp(battle.id, uid, uidA, uidB);
    } catch (e) {
      Alert.alert('hold on', e instanceof Error ? e.message : 'try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="load the bracket" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[14px] font-light leading-[22px] text-hum-muted" maxFontSizeMultiplier={1.3}>
          Both of you add ideas to the pool. You need at least four before you can lock in. Remove only
          what you added.
        </Text>

        <View className="flex-row gap-2">
          <TextInput
            value={newText}
            onChangeText={setNewText}
            placeholder="add an option…"
            placeholderTextColor={`${theme.dim}aa`}
            className="min-h-[52px] flex-1 rounded-[20px] border border-hum-border/18 bg-hum-surface/80 px-4 py-3 text-[16px] text-hum-text"
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            maxFontSizeMultiplier={1.35}
            editable={!busy}
          />
          <TouchableOpacity
            onPress={handleAdd}
            disabled={busy || !newText.trim()}
            className="h-[52px] w-[52px] items-center justify-center rounded-full bg-hum-primary/20 active:opacity-88"
            accessibilityRole="button"
            accessibilityLabel="add option"
          >
            <Ionicons name="add" size={28} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View className="gap-y-2">
          {battle.options.length === 0 ? (
            <Text className="py-6 text-center text-[14px] text-hum-dim" maxFontSizeMultiplier={1.3}>
              Nothing here yet — drop your first pick.
            </Text>
          ) : (
            battle.options.map((label) => {
              const who = contributorLabel(battle.optionsByUser ?? {}, label, uid);
              const mine = who === 'you';
              return (
                <View
                  key={label}
                  className="flex-row items-center justify-between rounded-[20px] border border-hum-border/18 bg-hum-card px-4 py-3.5"
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
                    <TouchableOpacity
                      onPress={() => handleRemove(label)}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${label}`}
                    >
                      <Ionicons name="close-circle-outline" size={24} color={theme.dim} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {!canReady ? (
          <Text
            className="text-center text-[12px] font-light text-amber-200/80"
            maxFontSizeMultiplier={1.3}
          >
            {`add ${4 - battle.options.length} more option${4 - battle.options.length !== 1 ? 's' : ''} to unlock ready`}
          </Text>
        ) : null}

        <Button
          label={myReady ? `waiting for ${partnerName}…` : 'ready to battle'}
          onPress={handleReady}
          loading={busy}
          disabled={!canReady || myReady}
          variant="primary"
          size="lg"
        />

        {myReady ? (
          <Animated.Text
            style={{ opacity: pulse }}
            className="text-center text-[13px] font-light text-hum-muted"
            maxFontSizeMultiplier={1.3}
          >
            {partnerReady ? 'starting…' : 'nudge them — you both need to tap ready'}
          </Animated.Text>
        ) : null}

        <Button label="back" onPress={() => router.back()} variant="secondary" size="md" />
      </ScrollView>
    </SafeAreaView>
  );
}
