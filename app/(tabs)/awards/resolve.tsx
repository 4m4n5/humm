import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AwardCategory } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { displayForCategoryId, enabledAwardCategoryIds } from '@/lib/awardCategoryConfig';
import { contestedCategories, nominationById } from '@/lib/awardsLogic';
import { submitResolutionPick } from '@/lib/firestore/ceremonies';
import { afterResolutionCategoryLocked } from '@/lib/gamificationTriggers';
import { hapticLight, hapticMedium } from '@/lib/haptics';
import { LoadingState } from '@/components/shared/LoadingState';
import { awardsVoice, errorsVoice, navVoice } from '@/constants/hummVoice';
import { usePartnerName } from '@/lib/usePartnerName';
import { scrollContentStandard } from '@/constants/screenLayout';
import { theme } from '@/constants/theme';

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
      <SafeAreaView className="flex-1 justify-center bg-hum-bg">
        <EmptyState
          ionicon="lock-closed-outline"
          ioniconColor={`${theme.gold}B3`}
          title="wrong phase"
          description="sync split picks when voting is open"
          primaryAction={{ label: navVoice.backTo('awards'), onPress: () => router.back() }}
        />
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
      Alert.alert(errorsVoice.couldntSave, e instanceof Error ? e.message : errorsVoice.tryAgain);
    } finally {
      setBusy(null);
    }
  }

  if (contested.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <AmbientGlow tone="gold" />
        <ScreenHeader title="synced" />
        <View className="flex-1 justify-center">
          <EmptyState
            ionicon="sparkles-outline"
            ioniconColor={`${theme.gold}B3`}
            title="awards → cheer"
            description="all split picks are synced · head back to cheer"
            primaryAction={{ label: navVoice.backTo('awards'), onPress: () => router.back() }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="gold" />
      <ScreenHeader title="sync splits" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
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
            <Card key={catId} className="gap-y-4">
              <View className="flex-row items-center gap-x-2.5">
                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hum-surface/55">
                  <Text className="text-[15px] leading-none" allowFontScaling={false}>
                    {meta?.emoji}
                  </Text>
                </View>
                <Text className="flex-1 text-[15px] font-medium leading-[20px] text-hum-text" maxFontSizeMultiplier={1.3}>
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
                  <Pressable
                    key={n.id}
                    disabled={!!busy}
                    onPress={() => choose(catId, n.id)}
                    className={`min-h-[44px] rounded-[20px] border px-4 py-3.5 active:opacity-88 ${
                      isMine ? 'border-hum-primary/18 bg-hum-primary/8' : 'border-hum-border/18 bg-hum-surface/32'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Sync split for ${meta?.label ?? 'category'}: choose ${n.title}`}
                    accessibilityState={{ selected: isMine }}
                  >
                    <Text className="text-[15px] font-medium text-hum-text" maxFontSizeMultiplier={1.3}>
                      {n.title}
                    </Text>
                    <Text
                      className="mt-1 text-[14px] font-light text-hum-muted"
                      numberOfLines={4}
                      maxFontSizeMultiplier={1.5}
                    >
                      {n.description}
                    </Text>
                    {isMine ? (
                      <Text
                        className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                        maxFontSizeMultiplier={1.25}
                      >
                        your choice
                      </Text>
                    ) : null}
                    {loading ? (
                      <Text className="mt-1 text-[11px] text-hum-dim" maxFontSizeMultiplier={1.25}>
                        saving…
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}

              {myPick && theirPick && myPick !== theirPick ? (
                <Text className="text-[14px] font-light text-hum-muted" maxFontSizeMultiplier={1.5}>
                  different taps — cozy up and pick the same card.
                </Text>
              ) : null}
              {myPick && theirPick && myPick === theirPick ? (
                <Text className="text-[14px] font-light text-hum-gold" maxFontSizeMultiplier={1.3}>
                  matched — locked
                </Text>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
