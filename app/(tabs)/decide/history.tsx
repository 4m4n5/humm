import React from 'react';
import { View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { DecisionRow } from '@/components/pick/DecisionRow';
import { useDecisionStore } from '@/lib/stores/decisionStore';
import { listContentStandard } from '@/constants/screenLayout';

export default function History() {
  const { history } = useDecisionStore();

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="spark" />
      <ScreenHeader title="history" />

      {history.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            icon="○"
            title="no saves yet"
            description="saved picks land here"
            primaryAction={{
              label: 'start',
              onPress: () => router.push('/decide'),
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
