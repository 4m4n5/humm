import React from 'react';
import {
  Pressable,
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
 * - `outer` = `/25`. Used for hero cards, nav rows, stat cards.
 * - `inner` = `/18`. Used for list rows, dividers, dense surfaces.
 *
 * Defaults are tone-aware: feature tones default to `outer` (the louder
 * `/25` opacity), neutral defaults to `inner` (the quiet `/18`). Both
 * match the de facto pattern in the app today.
 */
export type CardTier = 'outer' | 'inner';

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

function resolveTier(tone: CardTone, tier?: CardTier): CardTier {
  if (tier) return tier;
  return tone === 'neutral' ? 'inner' : 'outer';
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
    children,
    className,
    style,
  } = props;

  const resolvedTier = resolveTier(tone, tier);
  const borderColor =
    resolvedTier === 'outer' ? BORDER_CLASS_OUTER[tone] : BORDER_CLASS_INNER[tone];

  const baseClass = `rounded-[22px] border ${dashed ? 'border-dashed' : ''} ${borderColor} ${bgClassName} ${PADDING_CLASS[padding]}`;

  const shadowStyle: StyleProp<ViewStyle> = flat ? undefined : (cardShadow as StyleProp<ViewStyle>);

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
      {children}
    </View>
  );
}
