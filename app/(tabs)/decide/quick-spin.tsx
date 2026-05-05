import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/stores/authStore';
import { useDecisionStore } from '@/lib/stores/decisionStore';
import { DECISION_CATEGORIES } from '@/constants/categories';
import { DecisionCategory } from '@/types';
import { Button } from '@/components/shared/Button';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { theme } from '@/constants/theme';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import {
  SPIN_ROULETTE,
  rouletteSpeedAfterTick,
  rouletteTotalTicks,
  shouldRouletteTickHaptic,
} from '@/lib/spinRoulette';
import { useRouletteTickPulse } from '@/lib/useRouletteTickPulse';
import { RouletteRevealBlock } from '@/components/shared/RouletteRevealBlock';
import { useUiPreferencesStore } from '@/lib/stores/uiPreferencesStore';
import { afterQuickSpinDecisionSaved } from '@/lib/gamificationTriggers';
import { router, useFocusEffect } from 'expo-router';
import { scrollContentStandard } from '@/constants/screenLayout';

type SpinState = 'idle' | 'spinning' | 'result';

export default function QuickSpin() {
  const { profile } = useAuthStore();
  const { options, addOption, removeOption, markOptionPicked, recordDecision } =
    useDecisionStore();

  const [category, setCategory] = useState<DecisionCategory>('food');
  const [spinState, setSpinState] = useState<SpinState>('idle');
  const [result, setResult] = useState<string | null>(null);
  const [vetoUsed, setVetoUsed] = useState(false);
  const [vetoed, setVetoed] = useState<string[]>([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);
  const [displayOption, setDisplayOption] = useState('');

  const resultAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinStateRef = useRef(spinState);
  const savingDecisionRef = useRef(savingDecision);
  spinStateRef.current = spinState;
  savingDecisionRef.current = savingDecision;
  const tickPulse = useRouletteTickPulse(displayOption, spinState === 'spinning');

  const currentCat = DECISION_CATEGORIES.find((c) => c.id === category)!;
  const categoryOptions = options[category] ?? [];
  const availableOptions = categoryOptions.filter(
    (o) => !vetoed.includes(o.id),
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /** Leaving this screen during a spin or before save: stop timers and reset decide stack so the tab opens on the hub. */
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (savingDecisionRef.current) return;
        const s = spinStateRef.current;
        if (s !== 'spinning' && s !== 'result') return;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        router.replace('/decide');
      };
    }, []),
  );

  /** Weighting uses `lastPickedAt` on options — only updated in `handleAccept` via `markOptionPicked`, not when the wheel lands. */
  function pickWeightedRandom(opts: typeof availableOptions): string {
    if (opts.length === 0) return '';
    const now = Date.now();
    const fourWeeksMs = 4 * 7 * 24 * 60 * 60 * 1000;
    const weighted: string[] = [];
    for (const o of opts) {
      const lastPicked = o.lastPickedAt?.toMillis?.() ?? 0;
      const isRecent = now - lastPicked < fourWeeksMs;
      const weight = isRecent ? 1 : 3;
      for (let i = 0; i < weight; i++) weighted.push(o.id);
    }
    const id = weighted[Math.floor(Math.random() * weighted.length)];
    return opts.find((o) => o.id === id)?.label ?? opts[0].label;
  }

  function startSpin() {
    if (availableOptions.length === 0) return;
    setSpinState('spinning');
    resultAnim.setValue(0);

    const labels = availableOptions.map((o) => o.label);
    let idx = 0;
    let speed: number = SPIN_ROULETTE.initialSpeedMs;
    let ticks = 0;
    const totalTicks = rouletteTotalTicks();

    if (timerRef.current) clearTimeout(timerRef.current);

    function tick() {
      setDisplayOption(labels[idx % labels.length]);
      idx++;
      ticks++;

      const spinHapticsOn = useUiPreferencesStore.getState().spinResultHaptics;
      if (spinHapticsOn && shouldRouletteTickHaptic(ticks)) {
        void hapticLight();
      }

      if (ticks >= totalTicks) {
        const winner = pickWeightedRandom(availableOptions);
        setResult(winner);
        setDisplayOption(winner);
        setSpinState('result');

        Animated.spring(resultAnim, {
          toValue: 1,
          ...SPIN_ROULETTE.revealSpring,
        }).start();

        if (spinHapticsOn) {
          void hapticSuccess();
        }
      } else {
        speed = rouletteSpeedAfterTick(speed, ticks, totalTicks);
        timerRef.current = setTimeout(tick, speed);
      }
    }

    timerRef.current = setTimeout(tick, speed);
  }

  function handleVeto() {
    if (!result || vetoUsed) return;
    const vetoedOption = availableOptions.find((o) => o.label === result);
    if (!vetoedOption) return;
    setVetoUsed(true);
    setVetoed((v) => [...v, vetoedOption.id]);
    setSpinState('idle');
    setResult(null);
    setDisplayOption('');
    resultAnim.setValue(0);
  }

  async function handleAccept() {
    if (!result || !profile?.coupleId) return;
    setSavingDecision(true);
    try {
      const pickedOption = (options[category] ?? []).find((o) => o.label === result);
      if (pickedOption) {
        await markOptionPicked(profile.coupleId, category, pickedOption.id);
      }

      await recordDecision({
        coupleId: profile.coupleId,
        category,
        mode: 'quickspin',
        options: availableOptions.map((o) => o.label),
        result,
        vetoedOptions: vetoed
          .map(
            (id) => (options[category] ?? []).find((o) => o.id === id)?.label ?? '',
          )
          .filter(Boolean),
        createdByUserId: profile.uid,
      });

      try {
        await afterQuickSpinDecisionSaved(profile.uid, profile.coupleId);
      } catch (e) {
        console.warn('gamification after quick spin', e);
      }

      if (category === 'food') {
        Alert.alert(
          `let’s get ${result}!`,
          'peek maps for a spot nearby?',
          [
            { text: 'not now', style: 'cancel', onPress: resetSpin },
            {
              text: 'open maps',
              onPress: () => {
                const query = encodeURIComponent(`${result} restaurant`);
                const url =
                  Platform.OS === 'ios'
                    ? `maps://?q=${query}`
                    : `geo:0,0?q=${query}`;
                void Linking.openURL(url);
                resetSpin();
              },
            },
          ],
        );
      } else {
        resetSpin();
      }
    } catch (e) {
      Alert.alert('couldn’t save', e instanceof Error ? e.message : 'try again');
    } finally {
      setSavingDecision(false);
    }
  }

  function resetSpin() {
    setSpinState('idle');
    setResult(null);
    setDisplayOption('');
    setVetoUsed(false);
    setVetoed([]);
    resultAnim.setValue(0);
  }

  async function handleAddOption() {
    if (!newOptionText.trim() || !profile?.coupleId) return;
    await addOption(profile.coupleId, category, newOptionText.trim());
    setNewOptionText('');
    setShowAddInput(false);
  }

  const summaryLine = `${currentCat.label} · ${categoryOptions.length} option${categoryOptions.length !== 1 ? 's' : ''}`;

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="quick spin" />

      <ScrollView
        className="flex-1"
        stickyHeaderIndices={[1]}
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 8 }}
          >
            {DECISION_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  if (spinState === 'spinning') return;
                  setCategory(cat.id);
                  resetSpin();
                }}
                className={`flex-row items-center gap-x-2 rounded-full border px-5 py-2.5 ${
                  category === cat.id
                    ? 'border-hum-primary/25 bg-hum-primary'
                    : 'border-hum-border/18 bg-hum-card/80'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`category ${cat.label}`}
                accessibilityState={{ selected: category === cat.id }}
              >
                <Text className="text-base">{cat.emoji}</Text>
                <Text
                  className={`text-[14px] font-medium tracking-wide ${
                    category === cat.id ? 'text-hum-ink' : 'text-hum-muted'
                  }`}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="z-10 border-b border-hum-border/14 bg-hum-bg py-3.5">
          <Text
            className="text-[13px] font-medium tracking-wide text-hum-text"
            maxFontSizeMultiplier={1.35}
            numberOfLines={1}
          >
            {summaryLine}
          </Text>
          {vetoUsed ? (
            <Text
              className="mt-1 text-[12px] font-light text-hum-muted"
              maxFontSizeMultiplier={1.35}
            >
              veto used — one more spin from what’s left.
            </Text>
          ) : null}
        </View>

        <View className="gap-y-5">
        {/* Spin area */}
        <View className="min-h-[220px] items-center justify-center gap-y-6 rounded-[24px] border border-hum-border/18 bg-hum-card p-10">
          {spinState === 'idle' && (
            <>
              <Text className="text-5xl opacity-90">{currentCat.emoji}</Text>
              <Text className="px-4 text-center text-[14px] font-light leading-5 text-hum-muted">
                {availableOptions.length === 0
                  ? 'add a few options below, then spin when you’re ready'
                  : `${availableOptions.length} option${availableOptions.length !== 1 ? 's' : ''} ready when you are`}
              </Text>
              {vetoUsed && (
                <View className="rounded-full border border-hum-border/18 bg-hum-surface/50 px-5 py-2">
                  <Text className="text-center text-[12px] font-light text-hum-muted">
                    one veto used — spin again from what’s left
                  </Text>
                </View>
              )}
            </>
          )}

          {spinState === 'spinning' && (
            <Animated.View style={{ transform: [{ scale: tickPulse }] }}>
              <Text
                className="text-center text-[26px] font-light tracking-tight text-hum-text"
                numberOfLines={3}
                maxFontSizeMultiplier={1.12}
              >
                {displayOption}
              </Text>
            </Animated.View>
          )}

          {spinState === 'result' && result && (
            <RouletteRevealBlock
              eyebrow="perhaps"
              label={result}
              resultAnim={resultAnim}
              footnote={`tap “let’s do it!” to save this pick\nor use your veto once for another spin`}
            />
          )}
        </View>

        {/* Action buttons */}
        {spinState === 'idle' && (
          <Button
            label={vetoUsed ? 'spin again' : 'spin'}
            onPress={startSpin}
            size="lg"
            disabled={availableOptions.length === 0}
          />
        )}

        {spinState === 'result' && (
          <View className="gap-y-3">
            <Button
              label="let's do it!"
              onPress={handleAccept}
              size="lg"
              loading={savingDecision}
            />
            {!vetoUsed && (
              <Button
                label="veto — spin again"
                onPress={handleVeto}
                variant="secondary"
                size="lg"
              />
            )}
          </View>
        )}

        {/* Options list */}
        <View className="gap-y-4">
          <View className="flex-row items-center justify-between">
            <Text
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              numberOfLines={1}
            >
              {currentCat.label} · your list
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddInput((v) => !v)}
              className="min-h-11 flex-row items-center gap-x-1.5 px-2 py-2"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={showAddInput ? 'close add option' : 'add option to list'}
            >
              <Ionicons
                name={showAddInput ? 'close' : 'add'}
                size={18}
                color={theme.primary}
              />
              <Text
                className="text-xs font-medium tracking-wide text-hum-primary"
                numberOfLines={1}
              >
                {showAddInput ? 'close' : 'add'}
              </Text>
            </TouchableOpacity>
          </View>

          {showAddInput && (
            <View className="flex-row gap-3">
              <TextInput
                className="flex-1 rounded-[20px] border border-hum-border/18 bg-hum-surface/80 px-4 py-3.5 text-[16px] text-hum-text"
                placeholder="something you’d both say yes to…"
                placeholderTextColor={theme.dim}
                value={newOptionText}
                onChangeText={setNewOptionText}
                onSubmitEditing={handleAddOption}
                returnKeyType="done"
                autoFocus
              />
              <TouchableOpacity
                className="min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl bg-hum-primary px-4"
                onPress={handleAddOption}
                accessibilityRole="button"
                accessibilityLabel="save new option"
              >
                <Ionicons name="checkmark" size={22} color={theme.ink} />
              </TouchableOpacity>
            </View>
          )}

          {categoryOptions.length === 0 ? (
            <View className="items-center gap-4 rounded-[20px] border border-dashed border-hum-border/18 py-8 px-4">
              <Text
                className="text-center text-[14px] font-light text-hum-muted"
                maxFontSizeMultiplier={1.4}
              >
                empty list — toss in what you’re choosing between.
              </Text>
              <Button label="add your first option" onPress={() => setShowAddInput(true)} size="md" />
            </View>
          ) : (
            categoryOptions.map((opt) => {
              const isVetoed = vetoed.includes(opt.id);
              return (
                <View
                  key={opt.id}
                  className={`flex-row items-center gap-x-3 rounded-[20px] border border-hum-border/18 bg-hum-card px-4 py-3.5 ${isVetoed ? 'opacity-35' : ''}`}
                >
                  <Text className="flex-1 text-[15px] font-light text-hum-text" numberOfLines={1}>
                    {opt.label}
                  </Text>
                  {isVetoed && (
                    <Text
                      className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                      numberOfLines={1}
                    >
                      vetoed
                    </Text>
                  )}
                  {!isVetoed && (
                    <TouchableOpacity
                      onPress={() => {
                        if (profile?.coupleId) {
                          removeOption(profile.coupleId, category, opt.id);
                        }
                      }}
                      className="h-11 w-11 items-center justify-center"
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${opt.label} from list`}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.dim} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
