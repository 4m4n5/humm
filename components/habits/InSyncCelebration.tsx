import React, { useMemo } from 'react';
import { Animated, Text } from 'react-native';
import {
  EmojiShower,
  type ShowerIntensity,
} from '@/components/shared/EmojiShower';

/**
 * Celebration when both partners complete every shared habit for the day
 * (or week). Uses the shared {@link EmojiShower} primitive so it stays in
 * the same family as the reasons celebration, with its own emoji vocabulary
 * and a streak-aware intensity bump (a 7-day joint streak should feel
 * meaningfully bigger than a casual day-to-day completion).
 */

const EMOJI_POOL = ['✨', '💛', '🤝', '🌟', '💜', '✦', '🌈', '🎉', '🪩'];

type Props = {
  visible: boolean;
  onFinished: () => void;
  /** Joint daily streak (days). Used to bump intensity on milestone runs. */
  jointStreak?: number;
};

function pickIntensity(streak: number): ShowerIntensity {
  // Streak milestones get the lavish treatment so co-completing on day 7
  // feels different from co-completing on day 2.
  if (streak >= 7) return 'lavish';
  if (streak >= 3) return 'standard';
  // Even very early streaks get a standard shower — this is a paired
  // achievement, not a solo tap, and should always read as a real moment.
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
      className="items-center gap-1.5 rounded-3xl border border-hum-secondary/40 bg-hum-card/95 px-7 py-4"
    >
      <Text className="text-[40px]" allowFontScaling={false}>🎉</Text>
      <Text
        className="text-[15px] font-medium tracking-tight text-hum-text"
        allowFontScaling={false}
      >
        in sync!
      </Text>
    </Animated.View>
  );
}

export function InSyncCelebration({ visible, onFinished, jointStreak = 0 }: Props) {
  const intensity = useMemo(() => pickIntensity(jointStreak), [jointStreak]);

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
