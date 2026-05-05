import React, { useMemo } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { getBadge } from '@/constants/badges';

const DEFAULT_EMPTY_MESSAGE = 'no badges yet · reasons · habits · spins · seasons';

type Props = {
  earnedIds: string[];
  /** Defaults to “earned badges”. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Shown when `earnedIds` resolves to an empty list. */
  emptyMessage?: string;
};

const GAP = 12;
const CARD_MIN_HEIGHT = 132;

/** Earned badges only — horizontal shelf so many badges don’t stretch the profile. */
export function BadgeShelf({
  earnedIds,
  accessibilityLabel = 'earned badges',
  accessibilityHint = 'swipe sideways to see more badges',
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}: Props) {
  const { width: winW } = useWindowDimensions();
  const cardWidth = Math.round(Math.min(188, Math.max(156, winW * 0.44)));
  const step = cardWidth + GAP;

  const earned = useMemo(() => [...new Set(earnedIds)].sort(), [earnedIds]);

  if (earned.length === 0) {
    return (
      <View className="rounded-[22px] border border-dashed border-hum-border/18 bg-hum-card/50 px-6 py-8">
        <Text className="text-center text-[14px] font-light leading-[22px] text-hum-muted">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled
      snapToInterval={step}
      snapToAlignment="start"
      decelerationRate="fast"
      disableIntervalMomentum
      contentContainerStyle={{ paddingRight: 24 }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {earned.map((id) => {
        const def = getBadge(id);
        return (
          <View key={id} style={{ width: cardWidth, marginRight: GAP }} accessibilityRole="none">
            <View
              className="justify-center rounded-[20px] border border-hum-border/18 bg-hum-card px-4 py-3.5"
              style={{ minHeight: CARD_MIN_HEIGHT }}
              accessibilityLabel={def ? `${def.name}. ${def.description}` : `Badge ${id}`}
            >
              <Text
                className="w-full text-center text-[22px]"
                maxFontSizeMultiplier={1.2}
              >
                {def?.emoji ?? '✦'}
              </Text>
              <Text
                className="mt-1.5 w-full text-center text-[13px] font-medium tracking-tight text-hum-text"
                numberOfLines={2}
                maxFontSizeMultiplier={1.25}
              >
                {(def?.name ?? id).toLowerCase()}
              </Text>
              {def ? (
                <Text
                  className="mt-1 w-full text-center text-[11px] font-light leading-[16px] text-hum-dim"
                  numberOfLines={3}
                  maxFontSizeMultiplier={1.3}
                >
                  {def.description}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
