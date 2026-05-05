import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Timestamp } from 'firebase/firestore';
import { Decision } from '@/types';
import { DECISION_CATEGORIES } from '@/constants/categories';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDecisionStore } from '@/lib/stores/decisionStore';
import { listContentStandard } from '@/constants/screenLayout';

function categoryEmoji(cat: string): string {
  return DECISION_CATEGORIES.find((c) => c.id === cat)?.emoji ?? '✧';
}

function relativeDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : 0;
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`;
  return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''} ago`;
}

function DecisionRow({ item }: { item: Decision }) {
  return (
    <View className="gap-y-2 rounded-[20px] border border-hum-border/18 bg-hum-card px-4 py-3.5">
      <View className="flex-row items-center gap-x-3">
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hum-surface/55">
          <Text className="text-[18px] leading-none">{categoryEmoji(item.category)}</Text>
        </View>
        <View className="min-w-0 flex-1 gap-y-1">
          <Text
            className="text-[15px] font-medium tracking-tight text-hum-text"
            numberOfLines={1}
          >
            {item.result}
          </Text>
          <View className="flex-row flex-wrap items-center gap-x-2">
            <Text
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              numberOfLines={1}
            >
              {item.category}
            </Text>
            <Text className="text-[11px] text-hum-dim/45" numberOfLines={1}>
              ·
            </Text>
            <Text
              className="text-[12px] font-light text-hum-muted"
              numberOfLines={1}
            >
              {relativeDate(item.createdAt)}
            </Text>
          </View>
          {(item.vetoedOptions ?? []).length > 0 && (
            <Text className="text-[12px] font-light italic text-hum-dim">
              passed on: {(item.vetoedOptions ?? []).join(', ')}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default function History() {
  const { history } = useDecisionStore();

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="history" />

      {history.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            icon="○"
            title="no saves yet"
            description="saved spins land here"
            primaryAction={{
              label: 'quick spin',
              onPress: () => router.push('/decide/quick-spin'),
            }}
          />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="pb-3">
              <DecisionRow item={item} />
            </View>
          )}
          contentContainerStyle={listContentStandard}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
