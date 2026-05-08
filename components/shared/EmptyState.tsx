import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/shared/Button';
import { theme } from '@/constants/theme';

type Props = {
  /** Emoji string (rendered as text) OR Ionicons name (rendered as icon). */
  icon?: string;
  /** Ionicons name — takes precedence over `icon` when both are set. */
  ionicon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Hex color for ionicon. Defaults to `theme.primary` at 70% opacity. */
  ioniconColor?: string;
  /** Tailwind class for the emoji glyph color. Defaults to primary tint. */
  iconClassName?: string;
  title: string;
  description: string;
  primaryAction?: { label: string; onPress: () => void };
  /** Merged onto the root; use e.g. `px-0` when the parent scroll already applies horizontal padding. */
  className?: string;
};

/** Empty list / zero state with optional single CTA. */
export function EmptyState({
  icon,
  ionicon,
  ioniconColor,
  iconClassName,
  title,
  description,
  primaryAction,
  className,
}: Props) {
  const renderIcon = () => {
    if (ionicon) {
      return (
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl bg-hum-primary/10">
          <Ionicons
            name={ionicon}
            size={28}
            color={ioniconColor ?? `${theme.primary}B3`}
          />
        </View>
      );
    }
    if (icon) {
      return (
        <Text
          className={`mb-5 text-[44px] font-extralight leading-none ${
            iconClassName ?? 'text-hum-primary/70'
          }`}
          maxFontSizeMultiplier={1.3}
          allowFontScaling={false}
        >
          {icon}
        </Text>
      );
    }
    return null;
  };

  return (
    <View
      className={`items-center px-6 py-10 ${className ?? ''}`}
      accessibilityRole="text"
    >
      {renderIcon()}
      <Text
        className="text-center text-[18px] font-light leading-[24px] tracking-[-0.01em] text-hum-text"
        maxFontSizeMultiplier={1.3}
      >
        {title}
      </Text>
      <Text
        className="mt-2 max-w-[280px] text-center text-[13px] font-light leading-[20px] text-hum-muted"
        maxFontSizeMultiplier={1.4}
      >
        {description}
      </Text>
      {primaryAction ? (
        <Button label={primaryAction.label} onPress={primaryAction.onPress} className="mt-6 w-full max-w-xs" />
      ) : null}
    </View>
  );
}
