import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { SPIN_ROULETTE } from '@/lib/spinRoulette';

/**
 * Subtle “pop” on each label change while the roulette is rolling — shared by quick spin and battle tiebreaker.
 */
export function useRouletteTickPulse(displayKey: string, active: boolean) {
  const scale = useRef(new Animated.Value(SPIN_ROULETTE.tickPulseScaleTo)).current;

  useEffect(() => {
    if (!active || displayKey === '') return;
    scale.setValue(SPIN_ROULETTE.tickPulseScaleFrom);
    Animated.spring(scale, {
      toValue: SPIN_ROULETTE.tickPulseScaleTo,
      tension: SPIN_ROULETTE.tickPulseSpring.tension,
      friction: SPIN_ROULETTE.tickPulseSpring.friction,
      useNativeDriver: SPIN_ROULETTE.tickPulseSpring.useNativeDriver,
    }).start();
  }, [displayKey, active, scale]);

  return scale;
}
