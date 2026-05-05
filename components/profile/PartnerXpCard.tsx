import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/shared/Card';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import { getLevelForXp } from '@/constants/levels';
import type { UserProfile } from '@/types';

type Props = {
  partner: UserProfile | null;
  /** True while partnerId exists but first snapshot not received */
  loading?: boolean;
};

/** Read-only XP / level for the linked partner (live from their user doc). */
export function PartnerXpCard({ partner, loading }: Props) {
  if (loading && !partner) {
    return (
      <Card className="bg-hum-surface/15 py-6">
        <Text
          className="text-center text-[13px] font-light text-hum-muted"
          maxFontSizeMultiplier={1.35}
        >
          loading partner
        </Text>
      </Card>
    );
  }

  if (!partner) {
    return (
      <Card className="bg-hum-surface/15 py-5">
        <Text
          className="text-center text-[13px] font-light text-hum-muted"
          maxFontSizeMultiplier={1.35}
        >
          nothing here yet — their xp lands when it syncs.
        </Text>
      </Card>
    );
  }

  const level = getLevelForXp(partner.xp ?? 0);
  const xpProgress = level.nextLevelXp
    ? ((partner.xp ?? 0) - level.minXp) / (level.nextLevelXp - level.minXp)
    : 1;

  return (
    <Card className="gap-y-5 bg-hum-card/55">
      <View className="flex-row items-center gap-x-4">
        <View className="h-16 w-16 items-center justify-center rounded-full border border-hum-border/18 bg-hum-surface/40">
          <Text
            className="text-[22px] font-light text-hum-muted"
            maxFontSizeMultiplier={1.2}
          >
            {partner.displayName?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View className="flex-1 gap-y-1">
          <Text
            className="text-[18px] font-medium tracking-tight text-hum-text"
            maxFontSizeMultiplier={1.35}
          >
            {partner.displayName}
          </Text>
        </View>
        <View className="items-end">
          <AnimatedNumber
            value={partner.xp ?? 0}
            className="text-[34px] font-extralight tabular-nums leading-[36px] tracking-[-0.025em] text-hum-primary/90"
          />
          <Text className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
            xp
          </Text>
        </View>
      </View>

      {level.nextLevelXp ? (
        <View className="gap-y-2">
          <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
            level {level.level}
          </Text>
          <View className="h-[6px] overflow-hidden rounded-full bg-hum-border/30">
            <View
              className="h-full rounded-full bg-hum-primary/50"
              style={{ width: `${Math.min(xpProgress * 100, 100)}%` }}
            />
          </View>
          <Text className="text-[12px] font-light text-hum-dim">
            {level.nextLevelXp - (partner.xp ?? 0)} xp until {getLevelForXp(level.nextLevelXp).name}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
