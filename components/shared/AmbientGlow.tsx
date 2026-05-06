import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Tone = 'petal' | 'secondary' | 'gold' | 'primary' | 'bloom' | 'ember' | 'sage' | 'spark' | 'crimson';

const TONES: Record<Tone, [string, string, string]> = {
  // Each tone: [start, mid, end] colors. Start is the warm anchor at top,
  // end is fully transparent. Mid is the soft halo plateau. Opacity is
  // baked into the hex value so the gradient itself can run from solid to
  // transparent with no extra layering.
  petal: ['rgba(232,154,174,0.14)', 'rgba(232,154,174,0.05)', 'rgba(232,154,174,0)'],
  primary: ['rgba(232,160,154,0.14)', 'rgba(232,160,154,0.05)', 'rgba(232,160,154,0)'],
  secondary: ['rgba(159,184,210,0.16)', 'rgba(159,184,210,0.06)', 'rgba(159,184,210,0)'],
  sage: ['rgba(181,198,143,0.15)', 'rgba(181,198,143,0.05)', 'rgba(181,198,143,0)'],
  spark: ['rgba(159,183,186,0.15)', 'rgba(159,183,186,0.06)', 'rgba(159,183,186,0)'],
  gold: ['rgba(233,198,133,0.14)', 'rgba(233,198,133,0.05)', 'rgba(233,198,133,0)'],
  bloom: ['rgba(169,144,194,0.18)', 'rgba(169,144,194,0.07)', 'rgba(169,144,194,0)'],
  ember: ['rgba(232,160,154,0.13)', 'rgba(232,160,154,0.05)', 'rgba(232,160,154,0)'],
  crimson: ['rgba(210,115,115,0.16)', 'rgba(210,115,115,0.06)', 'rgba(210,115,115,0)'],
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
