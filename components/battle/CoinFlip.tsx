import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { RouletteRevealBlock } from '@/components/shared/RouletteRevealBlock';
import {
  SPIN_ROULETTE,
  rouletteSpeedAfterTick,
  rouletteTotalTicks,
  shouldRouletteTickHaptic,
} from '@/lib/spinRoulette';
import { useRouletteTickPulse } from '@/lib/useRouletteTickPulse';
import { hapticLight, hapticMedium, hapticSuccess } from '@/lib/haptics';
import { useUiPreferencesStore } from '@/lib/stores/uiPreferencesStore';

type Props = {
  optionA: string;
  optionB: string;
  winningLabel: string;
  onFinish: () => void;
};

const TIE_PHASE_MS = 1100;
const AFTER_REVEAL_MS = 1600;

const SPIN_SURFACE =
  'w-full max-w-[360px] min-h-[220px] justify-center rounded-[24px] border border-hum-border/30 bg-hum-card/90 p-10';

/**
 * Tie breaker after repeated splits: explicit tie beat, then the same roulette + reveal motion as quick spin.
 */
export function CoinFlip({ optionA, optionB, winningLabel, onFinish }: Props) {
  const [step, setStep] = useState<'tie' | 'spin' | 'reveal'>('tie');
  const [displayLabel, setDisplayLabel] = useState('');
  const resultAnim = useRef(new Animated.Value(0)).current;
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const tickPulse = useRouletteTickPulse(displayLabel, step === 'spin');

  const a = optionA.trim();
  const b = optionB.trim();

  useEffect(() => {
    if (step !== 'reveal') return;
    const id = setTimeout(() => onFinishRef.current(), AFTER_REVEAL_MS);
    return () => clearTimeout(id);
  }, [step]);

  useEffect(() => {
    const clearAll = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.current.push(id);
    };

    clearAll();

    void hapticMedium();
    schedule(() => setStep('spin'), TIE_PHASE_MS);

    return clearAll;
  }, []);

  useEffect(() => {
    if (step !== 'spin') return;

    const clearAll = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.current.push(id);
    };

    clearAll();

    const labels = [a, b].filter(Boolean);
    if (labels.length === 0) {
      setDisplayLabel(winningLabel);
      resultAnim.setValue(1);
      setStep('reveal');
      return;
    }

    let idx = 0;
    let ticks = 0;
    const totalTicks = rouletteTotalTicks();
    let speed: number = SPIN_ROULETTE.initialSpeedMs;

    const tick = () => {
      setDisplayLabel(labels[idx % labels.length]!);
      idx++;
      ticks++;

      const spinHapticsOn = useUiPreferencesStore.getState().spinResultHaptics;
      if (spinHapticsOn && shouldRouletteTickHaptic(ticks)) {
        void hapticLight();
      }

      if (ticks >= totalTicks) {
        setDisplayLabel(winningLabel);
        setStep('reveal');
        resultAnim.setValue(0);
        Animated.spring(resultAnim, {
          toValue: 1,
          ...SPIN_ROULETTE.revealSpring,
        }).start();
        if (spinHapticsOn) {
          void hapticSuccess();
        }
      } else {
        speed = rouletteSpeedAfterTick(speed, ticks, totalTicks);
        schedule(tick, speed);
      }
    };

    schedule(tick, speed);
    return clearAll;
  }, [step, a, b, winningLabel, resultAnim]);

  if (step === 'tie') {
    return (
      <View className="items-center px-4" accessibilityLabel="tie breaker">
        <View className={`items-center gap-y-5 ${SPIN_SURFACE}`}>
          <Text
            className="text-center text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200/90"
            maxFontSizeMultiplier={1.2}
          >
            still tied
          </Text>
          <Text
            className="text-center text-[17px] font-medium leading-[24px] text-hum-text"
            maxFontSizeMultiplier={1.15}
          >
            you kept picking opposite sides
          </Text>
          <Text
            className="text-center text-[13px] font-light leading-[20px] text-hum-muted"
            maxFontSizeMultiplier={1.3}
          >
            same spin as quick spin — watch it pick between your two finalists
          </Text>
          <View className="w-full flex-row gap-3">
            <View
              className="min-h-[72px] flex-1 justify-center rounded-[20px] border border-hum-border/30 bg-hum-bg/80 px-3 py-3"
              accessibilityLabel={`contender ${a}`}
            >
              <Text
                className="text-center text-[14px] font-medium leading-[20px] text-hum-text"
                numberOfLines={3}
                maxFontSizeMultiplier={1.25}
              >
                {a || '—'}
              </Text>
            </View>
            <View
              className="min-h-[72px] flex-1 justify-center rounded-[20px] border border-hum-border/30 bg-hum-bg/80 px-3 py-3"
              accessibilityLabel={`contender ${b}`}
            >
              <Text
                className="text-center text-[14px] font-medium leading-[20px] text-hum-text"
                numberOfLines={3}
                maxFontSizeMultiplier={1.25}
              >
                {b || '—'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (step === 'spin') {
    return (
      <View className="items-center px-4" accessibilityLabel="tie breaker spinning">
        <View className={`items-center gap-y-6 ${SPIN_SURFACE}`}>
          <Text
            className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
            maxFontSizeMultiplier={1.2}
          >
            spinning
          </Text>
          <Animated.View style={{ transform: [{ scale: tickPulse }] }} className="w-full items-center">
            <Text
              className="min-h-[88px] text-center text-[26px] font-light tracking-tight text-hum-text"
              numberOfLines={3}
              maxFontSizeMultiplier={1.12}
            >
              {displayLabel || '…'}
            </Text>
          </Animated.View>
          <View className="flex-row items-center gap-2 opacity-85">
            <Text className="text-2xl" accessibilityElementsHidden>
              🪙
            </Text>
            <Text
              className="flex-1 text-center text-[12px] font-light italic leading-[17px] text-hum-dim"
              maxFontSizeMultiplier={1.25}
            >
              slowing down on purpose — same rhythm as quick spin
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="items-center px-4" accessibilityLiveRegion="polite">
      <View className={`items-center ${SPIN_SURFACE}`}>
        <RouletteRevealBlock
          eyebrow="fate says"
          label={winningLabel}
          resultAnim={resultAnim}
          footnote="advances from this matchup"
          footnoteClassName="text-center text-[13px] font-light leading-[19px] text-hum-dim"
        />
      </View>
    </View>
  );
}
