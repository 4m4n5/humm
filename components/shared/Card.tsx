import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import { cardShadow } from '@/constants/elevation';

/**
 * Feature accent palette. Each tone maps to a `border-hum-{tone}` color.
 * `neutral` is the default chrome color (`hum-border`).
 */
export type CardTone =
  | 'neutral'
  | 'gold'
  | 'bloom'
  | 'crimson'
  | 'primary'
  | 'spark'
  | 'sage'
  | 'secondary';

/**
 * Border opacity tier per [`DESIGN.md`](../../docs/DESIGN.md):
 * - `bold`  = `/35`. Reserved for HOME entry-point tiles (mood / 4 feature
 *   tiles / you). Loud enough to form a confident region against the dark
 *   canvas without crossing into "neon."  See M3 §Tone-based surfaces and
 *   NN/g §Common Region — entry-point cards earn one tier louder than
 *   sibling cards-inside-content.
 * - `outer` = `/25`. Used for hero cards, nav rows, stat cards.
 * - `inner` = `/18`. Used for list rows, dividers, dense surfaces.
 *
 * Defaults are tone-aware: feature tones default to `outer` (the louder
 * `/25` opacity), neutral defaults to `inner` (the quiet `/18`). Both
 * match the de facto pattern in the app today. `bold` is opt-in only.
 */
export type CardTier = 'bold' | 'outer' | 'inner';

/**
 * Padding presets used across the app. If a card needs a unique padding
 * shape, fall back to `<View className="rounded-[22px] border ...">` —
 * Card's job is the 80%, not 100%.
 */
export type CardPadding = 'standard' | 'list-row' | 'dense' | 'hero';

interface CardBaseProps {
  tone?: CardTone;
  tier?: CardTier;
  padding?: CardPadding;
  /** Render with a dashed border. Defaults `false`. */
  dashed?: boolean;
  /** Override the default `bg-hum-card`. */
  bgClassName?: string;
  /** Drop the card-body shadow. Defaults to `false` (shadow on). */
  flat?: boolean;
  /**
   * Drop a low-alpha feature-tone overlay on top of the card surface so
   * the tile inhabits its tone instead of reading as a flat grey block.
   * Defaults to `false`. Used on home entry-point tiles. ~6-8% alpha is
   * enough to register without crossing into saturation.
   * Source: M3 tone-based surfaces; iOS 26 Liquid Glass tinting.
   */
  tonalTint?: CardTone;
  /**
   * Render a 1px `rgba(255,255,255,0.05)` inner highlight along the top
   * edge for the "lifted glass" cue. Defaults to `false`. Used on home
   * entry-point tiles. Source: iOS 26 §edge highlighting; Trifleck 2026.
   */
  topHighlight?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

interface CardStaticProps extends CardBaseProps {
  pressable?: false;
  onPress?: never;
  /** Optional accessibility label on the card body. */
  accessibilityLabel?: string;
  /** `accessibilityRole` for the View (default unset). */
  accessibilityRole?: ViewProps['accessibilityRole'];
  testID?: string;
}

interface CardPressableProps extends CardBaseProps {
  pressable: true;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  /** Aria role for the pressable. Defaults to `'button'`. */
  accessibilityRole?: 'button' | 'link' | 'checkbox' | 'menuitem';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export type CardProps = CardStaticProps | CardPressableProps;

const PADDING_CLASS: Record<CardPadding, string> = {
  standard: 'p-5',
  'list-row': 'px-5 py-4',
  dense: 'px-3.5 py-3',
  hero: 'px-6 py-8',
};

const BORDER_CLASS_BOLD: Record<CardTone, string> = {
  neutral: 'border-hum-border/35',
  gold: 'border-hum-gold/35',
  bloom: 'border-hum-bloom/35',
  crimson: 'border-hum-crimson/35',
  primary: 'border-hum-primary/35',
  spark: 'border-hum-spark/35',
  sage: 'border-hum-sage/35',
  secondary: 'border-hum-secondary/35',
};

const BORDER_CLASS_OUTER: Record<CardTone, string> = {
  neutral: 'border-hum-border/25',
  gold: 'border-hum-gold/25',
  bloom: 'border-hum-bloom/25',
  crimson: 'border-hum-crimson/25',
  primary: 'border-hum-primary/25',
  spark: 'border-hum-spark/25',
  sage: 'border-hum-sage/25',
  secondary: 'border-hum-secondary/25',
};

const BORDER_CLASS_INNER: Record<CardTone, string> = {
  neutral: 'border-hum-border/18',
  gold: 'border-hum-gold/18',
  bloom: 'border-hum-bloom/18',
  crimson: 'border-hum-crimson/18',
  primary: 'border-hum-primary/18',
  spark: 'border-hum-spark/18',
  sage: 'border-hum-sage/18',
  secondary: 'border-hum-secondary/18',
};

/**
 * Per-tone tonal overlay opacity. Reduced from `/8` (2026-05-11 first attempt,
 * read by the user as "too light") to `/4` so the tile lands ~5 lightness
 * units above baseline `bg-hum-card` — within Apple HIG's "subtly suggest
 * elevation" envelope (~5-7% accent on dark surfaces). The bold border and
 * icon-container carry the louder per-feature cues; the surface tint is now
 * a whisper, not a wash.
 */
const TINT_CLASS: Record<CardTone, string> = {
  neutral: 'bg-hum-border/4',
  gold: 'bg-hum-gold/4',
  bloom: 'bg-hum-bloom/4',
  crimson: 'bg-hum-crimson/4',
  primary: 'bg-hum-primary/4',
  spark: 'bg-hum-spark/4',
  sage: 'bg-hum-sage/4',
  secondary: 'bg-hum-secondary/4',
};

function resolveTier(tone: CardTone, tier?: CardTier): CardTier {
  if (tier) return tier;
  return tone === 'neutral' ? 'inner' : 'outer';
}

function borderClassFor(tier: CardTier, tone: CardTone): string {
  if (tier === 'bold') return BORDER_CLASS_BOLD[tone];
  if (tier === 'outer') return BORDER_CLASS_OUTER[tone];
  return BORDER_CLASS_INNER[tone];
}

/**
 * Hum's standard card chrome. Token-driven — see `CardTone`, `CardTier`,
 * `CardPadding` for the design vocabulary. Falls back to `View` by
 * default; pass `pressable` to make it a `Pressable` with `active:opacity-88`.
 *
 * @example
 * // Outer hero card (default tier for feature tones)
 * <Card tone="bloom" padding="standard">…</Card>
 *
 * // Inner list row, neutral
 * <Card padding="list-row" className="flex-row items-center gap-x-3">…</Card>
 *
 * // Pressable nav row
 * <Card padding="list-row" pressable onPress={() => router.push('/foo')}>…</Card>
 *
 * // Dashed empty/zero state
 * <Card padding="hero" dashed bgClassName="bg-hum-card/50">…</Card>
 */
export function Card(props: CardProps) {
  const {
    tone = 'neutral',
    tier,
    padding = 'standard',
    dashed = false,
    bgClassName = 'bg-hum-card',
    flat = false,
    tonalTint,
    topHighlight = false,
    children,
    className,
    style,
  } = props;

  const resolvedTier = resolveTier(tone, tier);
  const borderColor = borderClassFor(resolvedTier, tone);

  const baseClass = `rounded-[22px] border ${dashed ? 'border-dashed' : ''} ${borderColor} ${bgClassName} ${PADDING_CLASS[padding]}`;

  const shadowStyle: StyleProp<ViewStyle> = flat ? undefined : (cardShadow as StyleProp<ViewStyle>);

  /**
   * Optional inner chrome layers for the "lifted glass" home-tile look.
   * Both layers are absolutely-positioned and `pointerEvents="none"`, so
   * they never intercept input. Rendered BEFORE children so they sit
   * visually behind the content (RN renders in source order, no z-index
   * needed). Each layer carries its own `borderRadius` so we don't have
   * to set `overflow: hidden` on the parent (which would clip the shadow).
   */
  const chrome =
    tonalTint || topHighlight ? (
      <>
        {tonalTint && (
          <View
            pointerEvents="none"
            className={`${TINT_CLASS[tonalTint]} rounded-[22px]`}
            style={StyleSheet.absoluteFill}
          />
        )}
        {topHighlight && (
          <View
            pointerEvents="none"
            className="absolute left-5 right-5 top-px h-px bg-white/[0.05]"
          />
        )}
      </>
    ) : null;

  if (props.pressable) {
    const {
      onPress,
      onLongPress,
      disabled,
      accessibilityRole = 'button',
      accessibilityLabel,
      accessibilityHint,
    } = props;
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        className={`${baseClass} ${disabled ? 'opacity-45' : 'active:opacity-88'} ${className ?? ''}`}
        style={[shadowStyle, style]}
      >
        {chrome}
        {children}
      </Pressable>
    );
  }

  const { accessibilityLabel, accessibilityRole, testID } = props as CardStaticProps;
  return (
    <View
      className={`${baseClass} ${className ?? ''}`}
      style={[shadowStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {chrome}
      {children}
    </View>
  );
}
