import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDecisionStore } from '@/lib/stores/decisionStore';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { DECISION_CATEGORIES } from '@/constants/categories';
import { theme } from '@/constants/theme';
import { scrollContentStandard } from '@/constants/screenLayout';
import { cardShadow } from '@/constants/elevation';

export default function Decide() {
  const { history } = useDecisionStore();

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle title="decide" subtitle="gentle spin or full battle" />

        <TouchableOpacity
          className="gap-y-4 rounded-[24px] border border-hum-primary/20 bg-hum-card p-5 active:opacity-88"
          style={cardShadow}
          onPress={() => router.push('/decide/quick-spin')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="quick spin — weighted random pick"
        >
          <View className="flex-row items-start gap-x-4">
            <View className="h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-hum-primary/12">
              <Text className="text-[28px] leading-none" maxFontSizeMultiplier={1.2}>
                🎰
              </Text>
            </View>
            <View className="min-w-0 flex-1 gap-y-1">
              <Text className="text-[15px] font-medium leading-[20px] tracking-tight text-hum-text">quick spin</Text>
              <Text className="text-[13px] font-light leading-[19px] text-hum-muted">spin · veto · save</Text>
            </View>
            <View className="h-11 w-11 items-center justify-center" accessibilityElementsHidden>
              <Ionicons name="chevron-forward" size={20} color={theme.dim} />
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {DECISION_CATEGORIES.map((c) => (
                <View
                  key={c.id}
                  className="rounded-full border border-hum-border/18 bg-hum-surface/40 px-3 py-1.5"
                >
                <Text className="text-[11px] font-medium uppercase tracking-[0.12em] text-hum-dim">
                  {c.label.toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-start gap-x-4 rounded-[24px] border border-hum-secondary/20 bg-hum-card p-5 active:opacity-88"
          style={cardShadow}
          onPress={() => router.push('/decide/battle')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="battle mode — realtime bracket, both vote each matchup"
        >
          <View className="h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-hum-secondary/12">
            <Text className="text-[28px] leading-none" maxFontSizeMultiplier={1.2}>
              ⚔️
            </Text>
          </View>
          <View className="min-w-0 flex-1 gap-y-1">
            <Text className="text-[15px] font-medium leading-[20px] tracking-tight text-hum-text">battle mode</Text>
            <Text className="text-[13px] font-light leading-[19px] text-hum-muted">live votes · coin on ties</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center" accessibilityElementsHidden>
            <Ionicons name="chevron-forward" size={20} color={theme.dim} />
          </View>
        </TouchableOpacity>

        {history.length > 0 ? (
          <TouchableOpacity
            className="flex-row items-center justify-between rounded-[18px] border border-hum-border/18 bg-hum-card px-4 py-3 active:opacity-88"
            onPress={() => router.push('/decide/history')}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={`Decision history, ${history.length} saved`}
          >
            <Text
              className="min-w-0 flex-1 pr-2 text-[12px] font-light tabular-nums text-hum-muted"
              maxFontSizeMultiplier={1.3}
            >
              {history.length} saved
            </Text>
            <Ionicons
              name="chevron-forward"
              size={15}
              color={theme.dim}
              style={{ opacity: 0.55 }}
            />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
