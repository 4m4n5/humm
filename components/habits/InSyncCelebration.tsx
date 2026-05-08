import React, { useMemo } from 'react';
import {
  EmojiShower,
  type ShowerIntensity,
} from '@/components/shared/EmojiShower';
import { CelebrationBadge } from '@/components/shared/CelebrationBadge';

const EMOJI_POOL = ['✨', '💛', '🤝', '🌟', '💜', '✦', '🌈', '🎉', '🪩'];

type Props = {
  visible: boolean;
  onFinished: () => void;
  jointStreak?: number;
};

function pickIntensity(streak: number): ShowerIntensity {
  if (streak >= 7) return 'lavish';
  return 'standard';
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
      {visible ? (
        <CelebrationBadge
          emoji="🎉"
          label="in sync!"
          borderColorClass="border-hum-primary/40"
        />
      ) : null}
    </EmojiShower>
  );
}
