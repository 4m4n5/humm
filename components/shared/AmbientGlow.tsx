import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Tone = 'petal' | 'secondary' | 'gold' | 'primary';

const TONES: Record<Tone, [string, string, string]> = {
  // Each tone: [start, mid, end] colors. Start is the warm anchor at top,
  // end is fully transparent. Mid is the soft halo plateau. Opacity is
  // baked into the hex value so the gradient itself can run from solid to
  // transparent with no extra layering.
  petal: ['rgba(212,160,160,0.10)', 'rgba(212,160,160,0.04)', 'rgba(212,160,160,0)'],
  primary: ['rgba(224,180,172,0.10)', 'rgba(224,180,172,0.04)', 'rgba(224,180,172,0)'],
  secondary: ['rgba(158,145,180,0.10)', 'rgba(158,145,180,0.04)', 'rgba(158,145,180,0)'],
  gold: ['rgba(205,184,150,0.10)', 'rgba(205,184,150,0.04)', 'rgba(205,184,150,0)'],
};

type Props = {
  /** Color tone for the glow. Defaults to petal (warm romantic). */
  tone?: Tone;
  /** How far down the screen the glow extends, as a fraction. Default 0.45. */
  reach?: number;
};

/**
 * A soft warm glow anchored at the top of the screen, fading to transparent
 * by `reach * screenHeight`. Sits absolutely-positioned behind the screen's
 * content and is `pointerEvents="none"`, so it never intercepts input.
 *
 * Designed to be dropped into the root of a tab screen as a sibling of the
 * scroll view — gives the dark canvas a faint atmosphere without making the
 * design feel heavy or themed.
 */
export function AmbientGlow({ tone = 'petal', reach = 0.45 }: Props) {
  const { height } = useWindowDimensions();
  const [c0, c1, c2] = TONES[tone];

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: Math.round(height * reach),
      }}
    >
      <LinearGradient
        colors={[c0, c1, c2]}
        // Slightly off-axis so the warmth feels organic, not symmetric.
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.55, 1]}
        style={{ flex: 1 }}
      />
    </View>
  );
}
