import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { startDeliberation } from '@/lib/firestore/ceremonies';
import { enabledAwardCategoryIds } from '@/lib/awardCategoryConfig';
import {
  allEnabledCategoriesHaveNominations,
  allRequiredWinnersPresent,
  contestedCategories,
} from '@/lib/awardsLogic';
import { CeremonyPhaseStrip } from '@/components/awards/CeremonyPhaseStrip';
import { awardsVoice, errorsVoice } from '@/constants/hummVoice';
import { hapticSuccess } from '@/lib/haptics';
import { scrollContentStandard } from '@/constants/screenLayout';
import { ceremonySeasonShortLabel } from '@/lib/ceremonyCalendar';
import { theme } from '@/constants/theme';

function statusLabel(status: string | undefined, revealReady: boolean): string {
  switch (status) {
    case 'nominating':
      return 'nominate';
    case 'deliberating':
      return 'align';
    case 'voting':
      return revealReady ? 'cheer' : 'align';
    case 'complete':
      return 'wrapped';
    default:
      return 'nominate';
  }
}

export default function Awards() {
  const { profile } = useAuthStore();
  const { nominations, ceremony, couple } = useNominationsStore();
  const [starting, setStarting] = useState(false);

  const uidA = couple?.user1Id;
  const uidB = couple?.user2Id;
  const uid = profile?.uid;

  const awardRows = couple?.awardCategories ?? [];
  const enabledIds = useMemo(
    () => enabledAwardCategoryIds(awardRows),
    [awardRows],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of nominations) {
      map[n.category] = (map[n.category] ?? 0) + 1;
    }
    return map;
  }, [nominations]);

  const total = nominations.length;

  const periodHint = useMemo(() => {
    const pe = ceremony?.periodEnd;
    if (!pe || typeof pe.toDate !== 'function') return null;
    const end = pe.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diffDays = Math.round((endDay.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) return null;
    if (diffDays === 0) return 'ends today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  }, [ceremony?.periodEnd]);

  const canStartAlignment = useMemo(
    () => allEnabledCategoriesHaveNominations(nominations, enabledIds),
    [nominations, enabledIds],
  );

  const firstCategoryNeedingStory = useMemo(() => {
    const empty = enabledIds.find((id) => (counts[id] ?? 0) === 0);
    return empty ?? enabledIds[0];
  }, [enabledIds, counts]);
  const myPicksIn = !!(uid && ceremony?.picksSubmitted?.[uid]);
  const contested =
    ceremony && uidA && uidB
      ? contestedCategories(ceremony, nominations, uidA, uidB, enabledIds)
      : [];
  const revealReady =
    ceremony?.status === 'voting' &&
    allRequiredWinnersPresent(nominations, ceremony?.winners ?? {}, enabledIds);

  const seasonHubTitle = useMemo(() => {
    if (!ceremony) return 'season';
    const label = ceremonySeasonShortLabel(ceremony);
    return label || 'season';
  }, [ceremony]);

  const enabledRows = awardRows.filter((r) => r.enabled);
  const pausedRows = awardRows.filter(
    (r) =>
      !r.enabled &&
      (couple?.awardCategoryIdsUsedInCompleteSeasons ?? []).includes(r.id),
  );

  const showSeasonCardActions =
    ceremony?.status === 'nominating' ||
    (ceremony?.status === 'deliberating' && !myPicksIn) ||
    ceremony?.status === 'voting';

  function confirmStartAlignment() {
    if (!ceremony?.id) return;
    Alert.alert(
      awardsVoice.startAlignmentTitle,
      awardsVoice.startAlignmentBody,
      [
        { text: 'not yet', style: 'cancel' },
        {
          text: `let\u2019s go`,
          onPress: async () => {
            setStarting(true);
            try {
              await startDeliberation(ceremony.id);
              await hapticSuccess();
              router.push('/awards/deliberate');
            } catch (e: unknown) {
              Alert.alert(errorsVoice.couldntStart, e instanceof Error ? e.message : errorsVoice.tryAgain);
            } finally {
              setStarting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="gold" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle title="awards" />

        <View className="-mt-3 gap-3">
          <CeremonyPhaseStrip status={ceremony?.status} revealUnlocked={revealReady} />

          <Card className="gap-y-4 pt-4">
            <View className="flex-row items-center gap-x-3.5">
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hum-gold/12">
                <Text className="text-lg text-hum-gold/85" maxFontSizeMultiplier={1.25}>
                  ✦
                </Text>
              </View>
              <Pressable
                className="min-h-[44px] min-w-0 flex-1 flex-row items-center gap-1.5 py-1 active:opacity-88"
                onPress={() => router.push('/awards/ceremony-calendar')}
                accessibilityRole="button"
                accessibilityLabel={`Open season calendar, ${seasonHubTitle}`}
                hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
              >
                <Text
                  className="text-[17px] font-medium leading-[22px] tracking-[-0.02em] text-hum-text"
                  maxFontSizeMultiplier={1.3}
                >
                  {seasonHubTitle}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.dim} style={{ opacity: 0.5 }} />
              </Pressable>
              <View className="shrink-0 rounded-full border border-hum-border/18 bg-hum-surface/45 px-3 py-1.5">
                <Text
                  className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-muted"
                  maxFontSizeMultiplier={1.25}
                >
                  {statusLabel(ceremony?.status, revealReady)}
                </Text>
              </View>
            </View>

            {total > 0 || periodHint ? (
              <Text
                className="text-[12px] font-light tabular-nums leading-[18px] text-hum-dim"
                maxFontSizeMultiplier={1.3}
              >
                {`${total > 0 ? `${total} in the jar` : ''}${total > 0 && periodHint ? ' · ' : ''}${periodHint ?? ''}`}
              </Text>
            ) : null}

            {showSeasonCardActions ? <View className="h-px w-full bg-hum-border/14" /> : null}

            {ceremony?.status === 'nominating' ? (
              <View className="gap-y-2.5">
                <Button
                  label="start alignment"
                  onPress={confirmStartAlignment}
                  loading={starting}
                  disabled={!canStartAlignment || enabledIds.length === 0}
                  size="lg"
                />
                {!canStartAlignment && enabledIds.length > 0 && firstCategoryNeedingStory ? (
                  <Button
                    label="add a story"
                    variant="secondary"
                    onPress={() => router.push(`/awards/${firstCategoryNeedingStory}`)}
                    size="lg"
                    accessibilityLabel={`add a story — ${awardRows.find((r) => r.id === firstCategoryNeedingStory)?.label ?? 'next category'}`}
                  />
                ) : null}
              </View>
            ) : null}

            {ceremony?.status === 'deliberating' && !myPicksIn ? (
              <View className="gap-y-2">
                <Button label="make your picks" onPress={() => router.push('/awards/deliberate')} size="lg" />
              </View>
            ) : null}

            {ceremony?.status === 'voting' ? (
              <View className="gap-y-2">
                <Button
                  label={awardsVoice.overlapPrimary}
                  onPress={() => router.push('/awards/overlap')}
                  size="lg"
                />
                {contested.length > 0 ? (
                  <Button
                    label={awardsVoice.resolvePrimary}
                    onPress={() => router.push('/awards/resolve')}
                    variant="secondary"
                    size="lg"
                  />
                ) : null}
                {revealReady ? (
                  <Button
                    label={awardsVoice.revealPrimary}
                    onPress={() => router.push('/awards/reveal')}
                    variant="secondary"
                    size="lg"
                  />
                ) : null}
              </View>
            ) : null}
          </Card>
        </View>

        <View className="gap-y-3">
          <Text
            className="px-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
            maxFontSizeMultiplier={1.25}
          >
            categories
          </Text>
          <View className="gap-y-2.5">
            {enabledRows.map((cat) => {
              const count = counts[cat.id] ?? 0;
              return (
                <Pressable
                  key={cat.id}
                  className="flex-row items-center gap-x-3.5 rounded-[18px] border border-hum-border/18 bg-hum-card px-4 py-4 active:opacity-88"
                  onPress={() => router.push(`/awards/${cat.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${cat.label} category, ${count} nomination${count === 1 ? '' : 's'}`}
                >
                  <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hum-surface/35">
                    <Text className="text-[19px] leading-none" allowFontScaling={false}>
                      {cat.emoji}
                    </Text>
                  </View>
                  <Text
                    className="min-w-0 flex-1 text-[15px] font-medium leading-[20px] text-hum-text"
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.3}
                  >
                    {cat.label}
                  </Text>
                  <View className="h-8 min-w-8 shrink-0 items-center justify-center rounded-full border border-hum-border/18 bg-hum-surface/40 px-2.5">
                    <Text
                      className="text-[13px] font-medium tabular-nums text-hum-muted"
                      maxFontSizeMultiplier={1.25}
                    >
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {pausedRows.length > 0 ? (
              <View className="mt-3 gap-y-2.5 border-t border-hum-border/18 pt-3">
                {pausedRows.map((cat) => (
                  <Pressable
                    key={cat.id}
                    className="flex-row items-center gap-x-3.5 rounded-[18px] border border-dashed border-hum-border/18 bg-hum-surface/22 px-4 py-4 active:opacity-88"
                    onPress={() => router.push('/awards/manage-categories')}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.label} category is paused, open award categories to manage`}
                  >
                    <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hum-surface/35 opacity-75">
                      <Text className="text-[19px] leading-none" allowFontScaling={false}>
                        {cat.emoji}
                      </Text>
                    </View>
                    <Text
                      className="min-w-0 flex-1 text-[15px] font-medium leading-[20px] text-hum-muted"
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.3}
                    >
                      {cat.label}
                    </Text>
                    <Text
                      className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                      maxFontSizeMultiplier={1.25}
                    >
                      paused
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View className="gap-y-3">
          <Text
            className="px-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
            maxFontSizeMultiplier={1.25}
          >
            more
          </Text>
          <Pressable
            onPress={() => router.push('/awards/manage-categories')}
            className="flex-row items-center justify-between rounded-[18px] border border-hum-border/18 bg-hum-surface/35 px-4 py-4 active:opacity-88"

            accessibilityRole="button"
            accessibilityLabel="Award categories — rename, emoji, add, pause, or re-enable"
          >
            <Text className="text-[14px] font-medium text-hum-text" maxFontSizeMultiplier={1.3}>
              award categories
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.dim} style={{ opacity: 0.5 }} />
          </Pressable>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.push('/awards/ceremony-calendar')}
              className="min-h-[76px] flex-1 items-center justify-center gap-y-2 rounded-[18px] border border-hum-border/18 bg-hum-surface/35 px-3 py-3 active:opacity-88"
  
              accessibilityRole="button"
              accessibilityLabel="Season calendar — dates and reminders"
            >
              <Ionicons name="calendar-outline" size={18} color={theme.gold} style={{ opacity: 0.85 }} />
              <Text
                className="text-center text-[13px] font-medium tracking-tight text-hum-text"
                maxFontSizeMultiplier={1.3}
              >
                calendar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/awards/past')}
              className="min-h-[76px] flex-1 items-center justify-center gap-y-2 rounded-[18px] border border-hum-border/18 bg-hum-surface/35 px-3 py-3 active:opacity-88"
  
              accessibilityRole="button"
              accessibilityLabel="Past award seasons in the archive"
            >
              <Ionicons name="archive-outline" size={18} color={theme.gold} style={{ opacity: 0.85 }} />
              <Text
                className="text-center text-[13px] font-medium tracking-tight text-hum-text"
                maxFontSizeMultiplier={1.3}
              >
                archive
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
