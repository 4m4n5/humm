import React from 'react';
import { Text, Animated } from 'react-native';
import { SPIN_ROULETTE } from '@/lib/spinRoulette';

type Props = {
  eyebrow: string;
  label: string;
  resultAnim: Animated.Value;
  footnote?: React.ReactNode;
  /** Extra classes on the footnote wrapper text (e.g. max width) */
  footnoteClassName?: string;
};

/**
 * Landing / reveal moment shared by quick spin and battle coin tiebreaker (spring scale + typography).
 */
export function RouletteRevealBlock({
  eyebrow,
  label,
  resultAnim,
  footnote,
  footnoteClassName = 'max-w-[280px] text-center text-[13px] font-light leading-[19px] text-hum-muted',
}: Props) {
  const scale = resultAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SPIN_ROULETTE.revealScaleStart, SPIN_ROULETTE.revealScaleEnd],
  });

  return (
    <Animated.View style={{ transform: [{ scale }] }} className="items-center gap-y-4">
      <Text
        className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
        numberOfLines={1}
        maxFontSizeMultiplier={1.25}
      >
        {eyebrow}
      </Text>
      <Text
        className="text-center text-[32px] font-light leading-tight text-hum-primary"
        numberOfLines={3}
        maxFontSizeMultiplier={1.08}
      >
        {label}
      </Text>
      {footnote ? (
        <Text className={footnoteClassName} maxFontSizeMultiplier={1.35}>
          {footnote}
        </Text>
      ) : null}
    </Animated.View>
  );
}
