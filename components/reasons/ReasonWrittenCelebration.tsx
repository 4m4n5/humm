import React, { useMemo } from 'react';
import { Animated, Text } from 'react-native';
import {
  EmojiShower,
  type ShowerIntensity,
} from '@/components/shared/EmojiShower';
import { reasonsVoice } from '@/constants/hummVoice';

/**
 * Celebration when a reason is written for the partner. Sibling to
 * `InSyncCelebration` (habits): both share the same {@link EmojiShower}
 * primitive but use distinct emoji vocabularies and intensity rules.
 *
 * Reasons get a slightly more generous default than habits — writing for
 * your person is a more intimate act than checking a box — and milestone
 * fires (1st, 10th, 25th, 50th, 100th) bloom into the lavish preset so the
 * gravity of "you've now told them 25 things" lands.
 */

const EMOJI_POOL = [
  '💖',
  '💕',
  '💞',
  '💝',
  '🌹',
  '✨',
  '💗',
  '💌',
  '✦',
  '🌷',
  '🫶',
  '💐',
];

type Props = {
  visible: boolean;
  onFinished: () => void;
  /**
   * The number of reasons by this author for this partner *before* this
   * one was added — so milestone math reads as "this is the Nth reason".
   */
  authorCountBefore?: number;
};

const MILESTONES = new Set([0, 9, 24, 49, 99, 249]);

function pickIntensity(authorCountBefore: number): ShowerIntensity {
  // Hitting a "round" reason (1st, 10th, 25th, 50th, 100th, 250th) gets the
  // lavish shower. Otherwise keep the standard generosity that this moment
  // historically earned.
  if (MILESTONES.has(authorCountBefore)) return 'lavish';
  return 'standard';
}

function CenterBadge() {
  const scale = React.useRef(new Animated.Value(0)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.delay(160),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 3.5,
          tension: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1300),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        alignSelf: 'center',
        top: '38%',
        opacity,
        transform: [{ scale }],
      }}
      className="items-center gap-1.5 rounded-3xl border border-hum-petal/40 bg-hum-card/95 px-7 py-4"
    >
      <Text className="text-[40px]" allowFontScaling={false}>
        💖
      </Text>
      <Text
        className="text-[15px] font-medium tracking-tight text-hum-text"
        allowFontScaling={false}
      >
        {reasonsVoice.rewardMomentHint}
      </Text>
    </Animated.View>
  );
}

export function ReasonWrittenCelebration({
  visible,
  onFinished,
  authorCountBefore = 0,
}: Props) {
  const intensity = useMemo(
    () => pickIntensity(authorCountBefore),
    [authorCountBefore],
  );

  return (
    <EmojiShower
      visible={visible}
      onFinished={onFinished}
      emojiPool={EMOJI_POOL}
      intensity={intensity}
    >
      {visible ? <CenterBadge /> : null}
    </EmojiShower>
  );
}
