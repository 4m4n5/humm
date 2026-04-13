import React from 'react';
import { View, Text } from 'react-native';
import { HEADER_BLOCK_PADDING_TOP } from '@/constants/screenLayout';
import { containsDevanagari } from '@/lib/containsDevanagari';

type Props = {
  title: string;
  subtitle?: string;
  /** Keeps one-line title height so spacing matches other tab roots (e.g. home display name). */
  titleNumberOfLines?: number;
};

/** Tab roots — calm hierarchy, consistent rhythm. */
export function ScreenTitle({ title, subtitle, titleNumberOfLines }: Props) {
  const titleIsDevanagari = containsDevanagari(title);

  const titleEl = (
    <Text
      className="text-[30px] font-extralight leading-[36px] tracking-[-0.02em] text-hum-text"
      maxFontSizeMultiplier={1.35}
      numberOfLines={titleNumberOfLines}
      ellipsizeMode={titleNumberOfLines != null ? 'tail' : undefined}
      accessibilityLabel={titleNumberOfLines != null ? title : undefined}
    >
      {title}
    </Text>
  );

  return (
    <View className="gap-y-2 pb-6" style={{ paddingTop: HEADER_BLOCK_PADDING_TOP }}>
      {titleIsDevanagari ? (
        <View className="-mb-1.5 pt-1.5">{titleEl}</View>
      ) : (
        titleEl
      )}
      {subtitle ? (
        <Text
          className="w-full self-stretch pr-1 text-[14px] font-light leading-[22px] tracking-[0.01em] text-hum-muted"
          maxFontSizeMultiplier={1.4}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
