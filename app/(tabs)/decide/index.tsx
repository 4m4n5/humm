import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDecisionStore } from '@/lib/stores/decisionStore';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { DECISION_CATEGORIES } from '@/constants/categories';
import { theme } from '@/constants/theme';
import { scrollContentStandard } from '@/constants/screenLayout';
import { cardShadow } from '@/constants/elevation';

export default function Decide() {
  const { history } = useDecisionStore();

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="spark" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle title="decide" />

        <TouchableOpacity
          className="gap-y-5 rounded-[22px] border border-hum-spark/35 bg-hum-card p-5 active:opacity-90"
          style={cardShadow}
          onPress={() => router.push('/decide/quick-spin')}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="quick spin — weighted random pick"
        >
          <View className="flex-row items-center gap-x-4">
            <View className="h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-hum-spark/14">
              <Ionicons name="dice-outline" size={22} color={theme.spark} />
            </View>
            <Text className="min-w-0 flex-1 text-[17px] font-medium leading-[22px] tracking-[-0.01em] text-hum-text">
              quick spin
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.dim} style={{ opacity: 0.5 }} />
          </View>
          <View className="flex-row items-center justify-between">
            {DECISION_CATEGORIES.map((c) => (
              <View
                key={c.id}
                className="rounded-full border border-hum-border/22 bg-hum-surface/45 px-3 py-1.5"
              >
                <Text className="text-[10px] font-medium uppercase leading-[14px] tracking-[0.16em] text-hum-dim">
                  {c.label.toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center gap-x-4 rounded-[22px] border border-hum-secondary/35 bg-hum-card p-5 active:opacity-90"
          style={cardShadow}
          onPress={() => router.push('/decide/battle')}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="battle mode — realtime bracket, both vote each matchup"
        >
          <View className="h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-hum-secondary/14">
            <Ionicons name="flash-outline" size={22} color={theme.secondary} />
          </View>
          <Text className="min-w-0 flex-1 text-[17px] font-medium leading-[22px] tracking-[-0.01em] text-hum-text">
            battle mode
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.dim} style={{ opacity: 0.5 }} />
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
              size={16}
              color={theme.dim}
              style={{ opacity: 0.5 }}
            />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
