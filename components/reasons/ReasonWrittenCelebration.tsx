import React, { useMemo } from 'react';
import {
  EmojiShower,
  type ShowerIntensity,
} from '@/components/shared/EmojiShower';
import { CelebrationBadge } from '@/components/shared/CelebrationBadge';
import { reasonsVoice } from '@/constants/hummVoice';

const EMOJI_POOL = [
  '💖', '💕', '💞', '💝', '🌹', '✨',
  '💗', '💌', '✦', '🌷', '🫶', '💐',
];

type Props = {
  visible: boolean;
  onFinished: () => void;
  authorCountBefore?: number;
};

const MILESTONES = new Set([0, 9, 24, 49, 99, 249]);

function pickIntensity(authorCountBefore: number): ShowerIntensity {
  if (MILESTONES.has(authorCountBefore)) return 'lavish';
  return 'standard';
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
      {visible ? (
        <CelebrationBadge
          emoji="💖"
          label={reasonsVoice.rewardMomentHint}
          borderColorClass="border-hum-crimson/40"
        />
      ) : null}
    </EmojiShower>
  );
}
