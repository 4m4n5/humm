import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/shared/Button';

type Props = {
  icon?: string;
  title: string;
  description: string;
  primaryAction?: { label: string; onPress: () => void };
  /** Merged onto the root; use e.g. `px-0` when the parent scroll already applies horizontal padding. */
  className?: string;
};

/** Empty list / zero state with optional single CTA. */
export function EmptyState({ icon, title, description, primaryAction, className }: Props) {
  return (
    <View
      className={`items-center gap-y-2.5 px-6 py-10 ${className ?? ''}`}
      accessibilityRole="text"
    >
      {icon ? (
        <Text className="text-3xl font-extralight text-hum-primary/80" maxFontSizeMultiplier={1.3}>
          {icon}
        </Text>
      ) : null}
      <Text
        className="text-center text-[16px] font-medium text-hum-text"
        maxFontSizeMultiplier={1.35}
      >
        {title}
      </Text>
      <Text
        className="text-center text-[13px] font-light leading-[20px] text-hum-muted"
        maxFontSizeMultiplier={1.4}
      >
        {description}
      </Text>
      {primaryAction ? (
        <Button label={primaryAction.label} onPress={primaryAction.onPress} className="mt-4 w-full max-w-xs" />
      ) : null}
    </View>
  );
}
