import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';
import {
  LAND,
  M3_EMPHASIZED,
  SPRING,
  TIMING,
  flipDelay,
  shouldTickHaptic,
} from '@/lib/pickRevealMotion';
import { hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { useUiPreferencesStore } from '@/lib/stores/uiPreferencesStore';
import { theme } from '@/constants/theme';

/**
 * Card-style pick reveal.
 *
 * A single card with cycling text, decelerating, settling on the winner.
 * Each flip has a subtle vertical slide ("rolling ticker" feel). The card
 * border and glow transition smoothly via interpolateColor on the UI thread
 * rather than snapping via className changes.
 */
export type PickRevealAnimatedProps = {
  options: string[];
  winner: string;
  eyebrow?: string;
  footnote?: React.ReactNode;
  footnoteClassName?: string;
  onFinish?: () => void;
  revealKey?: string | number;
};

export function PickRevealAnimated({
  options,
  winner,
  eyebrow,
  footnote,
  footnoteClassName = 'text-center text-[13px] font-light leading-[19px] text-hum-dim',
  onFinish,
  revealKey,
}: PickRevealAnimatedProps) {
  // When the consumer doesn't provide an eyebrow we hide it entirely so
  // the reveal renders as just the cycling card (matches the static
  // result-card styling at rest).
  const showEyebrow = typeof eyebrow === 'string' && eyebrow.length > 0;
  const safeOptions = options.length > 0 ? options : [winner];

  const reduceMotion = useReducedMotion();
  const [displayLabel, setDisplayLabel] = useState(reduceMotion ? winner : '');
  const [landed, setLanded] = useState(!!reduceMotion);

  // Shared values — all on the UI thread.
  const cardScale = useSharedValue<number>(1);
  const labelOp = useSharedValue<number>(reduceMotion ? 1 : 0);
  const labelY = useSharedValue<number>(0);
  const eyebrowOp = useSharedValue<number>(1);
  // 0 = cycling state (dim card), 1 = landed state (primary-tinted card).
  const landMix = useSharedValue<number>(reduceMotion ? 1 : 0);

  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const cancelAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelAnimation(cardScale);
    cancelAnimation(labelOp);
    cancelAnimation(labelY);
    cancelAnimation(eyebrowOp);
    cancelAnimation(landMix);
  };

  useEffect(() => {
    cancelAll();
    cardScale.value = 1;
    eyebrowOp.value = 1;
    labelY.value = 0;
    landMix.value = 0;

    // ── Reduce-motion ───────────────────────────────────────────────
    if (reduceMotion) {
      setDisplayLabel(winner);
      setLanded(true);
      landMix.value = 1;
      labelOp.value = withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.Never,
      });
      const hapticsOn = useUiPreferencesStore.getState().spinResultHaptics;
      if (hapticsOn) void hapticMedium();
      timers.current.push(
        setTimeout(() => onFinishRef.current?.(), TIMING.reducedMotionMs + TIMING.reducedMotionHoldMs),
      );
      return () => cancelAll();
    }

    // ── Full animation ──────────────────────────────────────────────
    setLanded(false);
    setDisplayLabel('');
    labelOp.value = 0;

    // Phase 0: Anticipation — card micro-shrinks ("inhale" before action).
    cardScale.value = withTiming(TIMING.anticipationScale, {
      duration: TIMING.anticipationMs,
      easing: Easing.out(Easing.quad),
    });

    let flip = 0;
    let lastIdx = -1;
    const winnerIdx = Math.max(0, safeOptions.findIndex((o) => o === winner));

    const doFlip = () => {
      let next = Math.floor(Math.random() * safeOptions.length);
      if (safeOptions.length > 1) {
        let guard = 0;
        while ((next === lastIdx || next === winnerIdx) && guard < 8) {
          next = Math.floor(Math.random() * safeOptions.length);
          guard++;
        }
      }
      lastIdx = next;
      setDisplayLabel(safeOptions[next]);
      flip++;

      // Release the anticipation squash on the first flip.
      if (flip === 1) {
        cardScale.value = withSpring(1, { duration: 260, dampingRatio: 0.85 });
      }

      // Vertical slide: start slightly above, slide to 0 (rolling ticker).
      const duration = Math.min(140, flipDelay(flip) * 0.65);
      labelY.value = -TIMING.flipSlideY;
      labelY.value = withTiming(0, {
        duration,
        easing: M3_EMPHASIZED,
      });

      // Opacity: trough → full.
      labelOp.value = TIMING.flipOpacityTrough;
      labelOp.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.quad),
      });

      // Haptic in the back half of the sequence.
      if (shouldTickHaptic(flip)) {
        const hapticsOn = useUiPreferencesStore.getState().spinResultHaptics;
        if (hapticsOn) void hapticSelection();
      }

      if (flip >= TIMING.flipCount) {
        land();
      } else {
        timers.current.push(setTimeout(doFlip, flipDelay(flip)));
      }
    };

    const land = () => {
      setDisplayLabel(winner);
      setLanded(true);

      // Label enters from above, fades in.
      labelY.value = -TIMING.flipSlideY;
      labelY.value = withTiming(0, {
        duration: 200,
        easing: M3_EMPHASIZED,
      });
      labelOp.value = 0.25;
      labelOp.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });

      // Card pop: gentle spring with one visible overshoot.
      cardScale.value = withSequence(
        withSpring(LAND.peak, SPRING.landPop),
        withSpring(LAND.rest, SPRING.landPop),
      );

      // Card border + bg color shift (cycling → primary-tinted).
      landMix.value = withTiming(1, {
        duration: TIMING.landColorMs,
        easing: M3_EMPHASIZED,
      });

      // Eyebrow cross-fade ("picking" → "we picked").
      eyebrowOp.value = withSequence(
        withTiming(0, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 180, easing: M3_EMPHASIZED }),
      );

      // Haptics: medium on land, success shortly after (peak-end haptic).
      const hapticsOn = useUiPreferencesStore.getState().spinResultHaptics;
      if (hapticsOn) {
        void hapticMedium();
        timers.current.push(setTimeout(() => void hapticSuccess(), 200));
      }

      timers.current.push(
        setTimeout(() => onFinishRef.current?.(), TIMING.holdMs),
      );
    };

    // Start flipping after the anticipation beat.
    timers.current.push(
      setTimeout(doFlip, TIMING.anticipationMs + 30),
    );

    return () => cancelAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey, safeOptions.length, winner, reduceMotion]);

  // ── Animated styles (UI thread) ─────────────────────────────────────

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // Card bg + border: cycling starts with a faint primary tint (the card's
  // identity is always present), then intensifies on landing. This prevents
  // the "dull card that suddenly becomes pretty" discontinuity.
  const cardColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      landMix.value,
      [0, 1],
      ['rgba(232,160,154,0.03)', 'rgba(232,160,154,0.07)'],
    ),
    borderColor: interpolateColor(
      landMix.value,
      [0, 1],
      ['rgba(232,160,154,0.12)', 'rgba(232,160,154,0.25)'],
    ),
  }));

  // Shadow present from the start (focal surface), intensifies on landing.
  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.10 + landMix.value * 0.15,
  }));

  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: labelOp.value,
    transform: [{ translateY: labelY.value }],
  }));

  // Label color: cycling starts as muted (warm grey), landing intensifies
  // to full primary. White cycling text against a primary-tinted card felt
  // cold; starting warm keeps the card cohesive throughout.
  const labelColorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      landMix.value,
      [0, 1],
      [theme.muted, theme.primary],
    ),
  }));

  const eyebrowAnimStyle = useAnimatedStyle(() => ({
    opacity: eyebrowOp.value,
  }));

  return (
    <View
      className="w-full items-center gap-y-4"
      accessibilityLiveRegion="polite"
      accessibilityLabel={landed ? `we picked ${winner}` : 'picking from your options'}
    >
      {showEyebrow ? (
        <Animated.Text
          style={eyebrowAnimStyle}
          className="text-[10px] font-medium uppercase tracking-[0.22em] text-hum-dim"
          numberOfLines={1}
          maxFontSizeMultiplier={1.25}
        >
          {landed ? 'we picked' : eyebrow}
        </Animated.Text>
      ) : null}

      <Animated.View
        style={[
          cardAnimStyle,
          cardColorStyle,
          shadowStyle,
          CARD_BASE_SHADOW,
        ]}
        className="w-full items-center overflow-hidden rounded-[20px] border px-6 py-7"
      >
        <Animated.Text
          style={[labelAnimStyle, labelColorStyle]}
          className={`text-center text-[28px] leading-tight ${
            landed ? 'font-medium' : 'font-light'
          }`}
          numberOfLines={3}
          maxFontSizeMultiplier={1.3}
        >
          {displayLabel}
        </Animated.Text>
      </Animated.View>

      {footnote ? (
        <Text className={footnoteClassName} maxFontSizeMultiplier={1.3}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

/** Static shadow properties — shadowOpacity is animated (partial at rest,
 *  full on land). Matches PickReveal's CARD_SHADOW. */
const CARD_BASE_SHADOW = {
  shadowColor: theme.primary,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 0 } as const,
  elevation: 4,
};
