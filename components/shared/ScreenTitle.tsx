import React from 'react';
import { View, Text } from 'react-native';
import { HEADER_BLOCK_PADDING_TOP } from '@/constants/screenLayout';
import { containsDevanagari } from '@/lib/containsDevanagari';

type Props = {
  title: string;
  /** Keeps one-line title height so spacing matches other tab roots (e.g. home display name). */
  titleNumberOfLines?: number;
};

/** Tab roots — calm hierarchy, consistent rhythm. */
export function ScreenTitle({ title, titleNumberOfLines }: Props) {
  const titleIsDevanagari = containsDevanagari(title);

  const titleEl = (
    <Text
      className="text-[36px] font-extralight leading-[42px] tracking-[-0.025em] text-hum-text"
      maxFontSizeMultiplier={1.3}
      numberOfLines={titleNumberOfLines}
      ellipsizeMode={titleNumberOfLines != null ? 'tail' : undefined}
      accessibilityLabel={titleNumberOfLines != null ? title : undefined}
    >
      {title}
    </Text>
  );

  return (
    <View className="pb-7" style={{ paddingTop: HEADER_BLOCK_PADDING_TOP }}>
      {titleIsDevanagari ? (
        <View className="-mb-1.5 pt-1.5">{titleEl}</View>
      ) : (
        titleEl
      )}
    </View>
  );
}
