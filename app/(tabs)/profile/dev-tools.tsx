import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { updateDoc } from 'firebase/firestore';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { addNomination } from '@/lib/firestore/nominations';
import { ceremonyDoc, startDeliberation, submitDeliberationPicks } from '@/lib/firestore/ceremonies';
import { enabledAwardCategoryIds } from '@/lib/awardCategoryConfig';
import { AwardCategory, CoupleAwardCategoryRow } from '@/types';
import { scrollContentStandard } from '@/constants/screenLayout';

const SAMPLE_STORIES: Record<string, { title: string; description: string }[]> = {
  best_found_food: [
    { title: 'that ramen spot downtown', description: 'the broth was unreal' },
    { title: 'farmers market tacos', description: 'never going back to chipotle' },
  ],
  best_purchase: [
    { title: 'the couch', description: 'best nap investment ever' },
    { title: 'noise cancelling headphones', description: 'game changer for flights' },
  ],
  sexy_time_initiation: [
    { title: 'after the concert', description: 'that energy tho' },
    { title: 'random tuesday', description: 'sometimes boring days win' },
  ],
  best_planning: [
    { title: 'the surprise weekend trip', description: 'everything just worked' },
    { title: 'friendsgiving', description: 'the seating chart alone deserved an award' },
  ],
  best_surprise: [
    { title: 'the handwritten letter', description: 'still have it in my wallet' },
    { title: 'birthday breakfast in bed', description: 'woke up to pancakes and flowers' },
  ],
  best_movie: [
    { title: 'past lives', description: 'we both cried for different reasons' },
    { title: 'the holdovers', description: 'unexpected comfort film' },
  ],
  best_fight_resolution: [
    { title: 'the dishes argument', description: 'ended with a shared chore chart that actually works' },
    { title: 'holiday planning tension', description: 'learned to plan earlier next time' },
  ],
};

function getStoriesForCategory(catId: string, catLabel: string): { title: string; description: string }[] {
  if (SAMPLE_STORIES[catId]) return SAMPLE_STORIES[catId];
  return [
    { title: `best ${catLabel} moment`, description: 'it was a great one' },
    { title: `that ${catLabel} thing`, description: 'you had to be there' },
  ];
}

export default function DevToolsScreen() {
  const { profile } = useAuthStore();
  const { nominations, ceremony, couple } = useNominationsStore();
  const [busy, setBusy] = useState<string | null>(null);

  const uid = profile?.uid;
  const coupleId = profile?.coupleId;
  const uidA = couple?.user1Id;
  const uidB = couple?.user2Id;
  const rows: CoupleAwardCategoryRow[] = couple?.awardCategories ?? [];
  const enabledIds = enabledAwardCategoryIds(rows);

  async function seedNominations() {
    if (!coupleId || !ceremony || !uid || !uidA || !uidB) return;
    setBusy('seed');
    try {
      let count = 0;
      for (const catId of enabledIds) {
        const existing = nominations.filter((n) => n.category === catId);
        if (existing.length >= 2) continue;

        const cat = rows.find((r) => r.id === catId);
        const stories = getStoriesForCategory(catId, cat?.label ?? catId);
        const needed = Math.max(0, 2 - existing.length);

        for (let i = 0; i < needed && i < stories.length; i++) {
          const story = stories[i];
          const submitter = i % 2 === 0 ? uidA : uidB;
          await addNomination({
            coupleId,
            ceremonyId: ceremony.id,
            category: catId as AwardCategory,
            nomineeId: i % 2 === 0 ? uidB : uidA,
            submittedBy: submitter,
            title: story.title,
            description: story.description,
            photoUrl: null,
            eventDate: null,
            seeded: true,
          });
          count++;
        }
      }
      Alert.alert('done', `seeded ${count} nominations`);
    } catch (e: unknown) {
      Alert.alert('error', e instanceof Error ? e.message : 'unknown');
    } finally {
      setBusy(null);
    }
  }

  async function advanceToAlignment() {
    if (!ceremony) return;
    if (ceremony.status !== 'nominating') {
      Alert.alert('skip', `already in ${ceremony.status}`);
      return;
    }
    setBusy('align');
    try {
      await startDeliberation(ceremony.id);
      Alert.alert('done', 'moved to alignment (deliberating)');
    } catch (e: unknown) {
      Alert.alert('error', e instanceof Error ? e.message : 'unknown');
    } finally {
      setBusy(null);
    }
  }

  async function submitPicksForBoth() {
    if (!ceremony || !uidA || !uidB || ceremony.status !== 'deliberating') {
      Alert.alert('skip', 'not in deliberating phase');
      return;
    }
    setBusy('picks');
    try {
      for (const submitterUid of [uidA, uidB]) {
        if (ceremony.picksSubmitted?.[submitterUid]) continue;
        const picks: Partial<Record<AwardCategory, string>> = {};
        for (const catId of enabledIds) {
          const catNoms = nominations.filter((n) => n.category === catId);
          if (catNoms.length > 0) {
            const pick = catNoms[Math.floor(Math.random() * catNoms.length)];
            picks[catId as AwardCategory] = pick.id;
          }
        }
        await submitDeliberationPicks(ceremony.id, submitterUid, picks, nominations, uidA, uidB);
      }
      Alert.alert('done', 'both users picked — moved to voting');
    } catch (e: unknown) {
      Alert.alert('error', e instanceof Error ? e.message : 'unknown');
    } finally {
      setBusy(null);
    }
  }

  async function forceAllWinners() {
    if (!ceremony || ceremony.status !== 'voting') {
      Alert.alert('skip', 'not in voting phase');
      return;
    }
    setBusy('winners');
    try {
      const winners: Partial<Record<AwardCategory, { nominationId: string; agreedBy: string[]; nomineeId: string | 'both' }>> = {
        ...(ceremony.winners ?? {}),
      };
      for (const catId of enabledIds) {
        if (winners[catId]) continue;
        const catNoms = nominations.filter((n) => n.category === catId);
        if (catNoms.length > 0) {
          const pick = catNoms[0];
          winners[catId] = {
            nominationId: pick.id,
            agreedBy: [uidA!, uidB!],
            nomineeId: pick.nomineeId,
          };
        }
      }
      await updateDoc(ceremonyDoc(ceremony.id), { winners });
      Alert.alert('done', 'all categories have winners — reveal ready');
    } catch (e: unknown) {
      Alert.alert('error', e instanceof Error ? e.message : 'unknown');
    } finally {
      setBusy(null);
    }
  }

  async function resetCheerFlags() {
    if (!ceremony) return;
    setBusy('cheer');
    try {
      await updateDoc(ceremonyDoc(ceremony.id), { cheerCompletedBy: {} });
      Alert.alert('done', 'cheer flags cleared');
    } catch (e: unknown) {
      Alert.alert('error', e instanceof Error ? e.message : 'unknown');
    } finally {
      setBusy(null);
    }
  }

  async function resetToNominating() {
    if (!ceremony) return;
    setBusy('reset');
    try {
      await updateDoc(ceremonyDoc(ceremony.id), {
        status: 'nominating',
        picksByUser: {},
        picksSubmitted: {},
        resolutionPicksByUser: {},
        winners: {},
        cheerCompletedBy: {},
      });
      Alert.alert('done', 'reset to nominating');
    } catch (e: unknown) {
      Alert.alert('error', e instanceof Error ? e.message : 'unknown');
    } finally {
      setBusy(null);
    }
  }

  const status = ceremony?.status ?? 'none';
  const nomCount = nominations.length;
  const winnerCount = Object.keys(ceremony?.winners ?? {}).length;

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="dev tools" />

        <Card padding="list-row" className="gap-y-2">
          <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
            ceremony state
          </Text>
          <Text className="text-[14px] font-light text-hum-muted" maxFontSizeMultiplier={1.3}>
            {`status: ${status} · ${nomCount} noms · ${winnerCount} winners · ${enabledIds.length} categories`}
          </Text>
          {ceremony?.cheerCompletedBy ? (
            <Text className="text-[12px] font-light text-hum-dim" maxFontSizeMultiplier={1.3}>
              {`cheer: ${Object.keys(ceremony.cheerCompletedBy).filter((k) => ceremony.cheerCompletedBy?.[k]).join(', ') || 'none'}`}
            </Text>
          ) : null}
        </Card>

        <View className="gap-y-3">
          <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
            data
          </Text>
          <Button
            label={`seed nominations (2 per category)`}
            onPress={seedNominations}
            loading={busy === 'seed'}
            disabled={!!busy}
            size="lg"
          />
        </View>

        <View className="gap-y-3">
          <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
            advance ceremony
          </Text>
          <Button
            label="nominating → alignment"
            onPress={advanceToAlignment}
            loading={busy === 'align'}
            disabled={!!busy || status !== 'nominating'}
            size="lg"
          />
          <Button
            label="submit picks (both users)"
            onPress={submitPicksForBoth}
            loading={busy === 'picks'}
            disabled={!!busy || status !== 'deliberating'}
            size="lg"
          />
          <Button
            label="force all winners"
            onPress={forceAllWinners}
            loading={busy === 'winners'}
            disabled={!!busy || status !== 'voting'}
            size="lg"
          />
        </View>

        <View className="gap-y-3">
          <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
            reset
          </Text>
          <Button
            label="clear cheer flags"
            onPress={resetCheerFlags}
            loading={busy === 'cheer'}
            disabled={!!busy}
            variant="secondary"
            size="lg"
          />
          <Button
            label="reset to nominating"
            onPress={resetToNominating}
            loading={busy === 'reset'}
            disabled={!!busy}
            variant="danger"
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
