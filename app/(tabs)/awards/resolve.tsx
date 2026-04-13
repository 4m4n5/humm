import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AwardCategory } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { displayForCategoryId, enabledAwardCategoryIds } from '@/lib/awardCategoryConfig';
import { contestedCategories, nominationById } from '@/lib/awardsLogic';
import { submitResolutionPick } from '@/lib/firestore/ceremonies';
import { afterResolutionCategoryLocked } from '@/lib/gamificationTriggers';
import { hapticLight, hapticMedium } from '@/lib/haptics';
import { LoadingState } from '@/components/shared/LoadingState';
import { awardsVoice } from '@/constants/hummVoice';
import { usePartnerName } from '@/lib/usePartnerName';
import { scrollContentStandard } from '@/constants/screenLayout';

export default function ResolveScreen() {
  const { profile } = useAuthStore();
  const { nominations, ceremony, couple } = useNominationsStore();
  const partnerName = usePartnerName();
  const [busy, setBusy] = useState<string | null>(null);

  const uidA = couple?.user1Id;
  const uidB = couple?.user2Id;
  const enabledIds = enabledAwardCategoryIds(couple?.awardCategories ?? []);

  if (!profile?.uid || !ceremony || !uidA || !uidB) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-hum-bg">
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (ceremony.status !== 'voting') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="mb-4 text-center text-[14px] text-hum-muted">wrong phase</Text>
        <Button label="back to awards" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const contested = contestedCategories(ceremony, nominations, uidA, uidB, enabledIds);

  async function choose(cat: AwardCategory, nominationId: string) {
    if (!profile?.uid || !ceremony || !uidA || !uidB) return;
    void hapticLight();
    setBusy(`${cat}-${nominationId}`);
    try {
      const locked = await submitResolutionPick(
        ceremony.id,
        profile.uid,
        cat,
        nominationId,
        nominations,
        uidA,
        uidB,
      );
      if (locked && profile.coupleId) {
        await afterResolutionCategoryLocked(profile.uid, profile.coupleId);
      }
      await hapticMedium();
    } catch (e: unknown) {
      Alert.alert('couldn’t save', e instanceof Error ? e.message : 'try again');
    } finally {
      setBusy(null);
    }
  }

  if (contested.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScreenHeader title="synced" />
        <View className="flex-1 justify-center px-8">
          <Text className="mb-6 text-center text-[14px] font-light text-hum-muted">awards → cheer</Text>
          <Button label="back to awards" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="sync splits" subtitle="same tap · locks" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-[10px] font-medium uppercase tracking-[0.24em] text-hum-dim"
          maxFontSizeMultiplier={1.25}
        >
          {awardsVoice.resolveScreenHint(partnerName).toUpperCase()}
        </Text>

        {contested.map((catId) => {
          const meta = displayForCategoryId(couple?.awardCategories, catId);
          const a = ceremony.picksByUser?.[uidA]?.[catId];
          const b = ceremony.picksByUser?.[uidB]?.[catId];
          const na = a ? nominationById(nominations, a) : null;
          const nb = b ? nominationById(nominations, b) : null;
          const myPick = ceremony.resolutionPicksByUser?.[profile.uid]?.[catId];
          const partnerUid = profile.uid === uidA ? uidB : uidA;
          const theirPick = ceremony.resolutionPicksByUser?.[partnerUid]?.[catId];

          return (
            <View key={catId} className="gap-y-4 rounded-[22px] border border-hum-border/16 bg-hum-card p-5">
              <View className="flex-row items-center gap-x-2.5">
                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hum-surface/55">
                  <Text className="text-[15px] leading-none">{meta?.emoji}</Text>
                </View>
                <Text className="flex-1 text-[15px] font-medium leading-snug text-hum-text">
                  {meta?.label}
                </Text>
              </View>

              {[na, nb]
                .filter((n): n is NonNullable<typeof na> => !!n)
                .filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i)
                .map((n) => {
                const loading = busy === `${catId}-${n.id}`;
                const isMine = myPick === n.id;
                return (
                  <TouchableOpacity
                    key={n.id}
                    disabled={!!busy}
                    onPress={() => choose(catId, n.id)}
                    className={`rounded-[20px] border px-4 py-3.5 ${
                      isMine ? 'border-hum-primary/18 bg-hum-primary/8' : 'border-hum-border/16 bg-hum-surface/32'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`${meta?.label}: ${n.title}`}
                    accessibilityState={{ selected: isMine }}
                  >
                    <Text className="text-[15px] font-medium text-hum-text">{n.title}</Text>
                    <Text className="mt-1 text-[14px] font-light text-hum-muted" numberOfLines={4}>
                      {n.description}
                    </Text>
                    {isMine ? (
                      <Text className="mt-2 text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">
                        your choice
                      </Text>
                    ) : null}
                    {loading ? (
                      <Text className="mt-1 text-[11px] text-hum-dim">saving…</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              {myPick && theirPick && myPick !== theirPick ? (
                <Text className="text-[14px] font-light text-amber-200/80">
                  different taps — cozy up and pick the same card.
                </Text>
              ) : null}
              {myPick && theirPick && myPick === theirPick ? (
                <Text className="text-[14px] font-light text-emerald-200/80">matched — locked</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
