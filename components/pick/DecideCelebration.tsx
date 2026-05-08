import React from 'react';
import { EmojiShower } from '@/components/shared/EmojiShower';
import { CelebrationBadge } from '@/components/shared/CelebrationBadge';

const EMOJI_POOL = ['✨', '🎯', '🤝', '🌟', '✦', '💫', '🎉', '⚡', '🪩'];

type Props = {
  visible: boolean;
  onFinished: () => void;
};

export function DecideCelebration({ visible, onFinished }: Props) {
  return (
    <EmojiShower
      visible={visible}
      onFinished={onFinished}
      emojiPool={EMOJI_POOL}
      intensity="standard"
    >
      {visible ? (
        <CelebrationBadge
          emoji="🎯"
          label="decided!"
          borderColorClass="border-hum-spark/40"
        />
      ) : null}
    </EmojiShower>
  );
}
