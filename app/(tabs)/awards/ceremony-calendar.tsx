import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Switch, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { SeasonStatsInfographic, SeasonTimelinePanels } from '@/components/awards/SeasonCalendarPanels';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUiPreferencesStore } from '@/lib/stores/uiPreferencesStore';
import { buildCeremonyMilestones, formatRelativeDay, formatShortDate } from '@/lib/ceremonyCalendar';
import {
  cancelAllCeremonyReminders,
  requestReminderPermission,
  scheduleCeremonySeasonReminders,
} from '@/lib/ceremonyReminders';
import { enabledAwardCategoryIds } from '@/lib/awardCategoryConfig';
import { theme } from '@/constants/theme';
import { registerExpoPushToken } from '@/lib/registerExpoPushToken';
import { scrollContentStandard } from '@/constants/screenLayout';

const TIMELINE_IDS = new Set(['start', 'alignment_start', 'wrap3', 'end']);

export default function CeremonyCalendarScreen() {
  const { ceremony, nominations, couple, partnerProfile } = useNominationsStore();
  const profile = useAuthStore((s) => s.profile);
  const ceremonyLocalRemindersEnabled = useUiPreferencesStore((s) => s.ceremonyLocalRemindersEnabled);
  const ceremonyReminderScheduledForId = useUiPreferencesStore((s) => s.ceremonyReminderScheduledForId);
  const setCeremonyLocalRemindersEnabled = useUiPreferencesStore((s) => s.setCeremonyLocalRemindersEnabled);
  const setCeremonyReminderScheduledForId = useUiPreferencesStore((s) => s.setCeremonyReminderScheduledForId);
  const [reminderBusy, setReminderBusy] = useState(false);

  const now = new Date();

  const { timeline, filledCategories, totalNominations } = useMemo(() => {
    if (!ceremony) {
      return {
        timeline: [] as ReturnType<typeof buildCeremonyMilestones>,
        filledCategories: 0,
        totalNominations: 0,
      };
    }
    const all = buildCeremonyMilestones(ceremony);
    const tl = all.filter((m) => TIMELINE_IDS.has(m.id));
    const enabledIds = enabledAwardCategoryIds(couple?.awardCategories ?? []);
    const filled = enabledIds.filter((id) => nominations.some((n) => n.category === id)).length;
    return { timeline: tl, filledCategories: filled, totalNominations: nominations.length };
  }, [ceremony, nominations, couple?.awardCategories]);

  function startOfDay(d: Date): number {
    const x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }
  const today0 = startOfDay(now);

  useEffect(() => {
    if (!ceremony || Platform.OS === 'web') return;
    if (!ceremonyLocalRemindersEnabled) return;
    if (ceremony.id === ceremonyReminderScheduledForId) return;
    void (async () => {
      await scheduleCeremonySeasonReminders(ceremony);
      setCeremonyReminderScheduledForId(ceremony.id);
    })();
  }, [
    ceremony,
    ceremony?.id,
    ceremonyLocalRemindersEnabled,
    ceremonyReminderScheduledForId,
    setCeremonyReminderScheduledForId,
  ]);

  async function onToggleReminders(next: boolean) {
    if (!ceremony) return;
    if (Platform.OS === 'web') {
      Alert.alert('not on web', 'reminders need the ios or android app');
      return;
    }
    if (!next) {
      setReminderBusy(true);
      try {
        await cancelAllCeremonyReminders();
        setCeremonyLocalRemindersEnabled(false);
        setCeremonyReminderScheduledForId(null);
      } finally {
        setReminderBusy(false);
      }
      return;
    }
    setReminderBusy(true);
    try {
      const ok = await requestReminderPermission();
      if (!ok) {
        Alert.alert('notifications off', 'flip them on in settings for pre-close nudges');
        return;
      }
      if (profile?.uid)
        void registerExpoPushToken(profile.uid).catch((e) =>
          console.warn('[ceremony-calendar] registerExpoPushToken', e),
        );
      await scheduleCeremonySeasonReminders(ceremony);
      setCeremonyLocalRemindersEnabled(true);
      setCeremonyReminderScheduledForId(ceremony.id);
    } finally {
      setReminderBusy(false);
    }
  }

  if (!ceremony) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScreenHeader title="season" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  const categoryTotal = enabledAwardCategoryIds(couple?.awardCategories ?? []).length;

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="season" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        {/* Season overview */}
        <SeasonTimelinePanels ceremony={ceremony} now={now} />

        {/* Nominations */}
        <View className="mt-3 rounded-[22px] border border-hum-border/18 bg-hum-card px-5 py-5">
          <View className="flex-row items-end justify-between gap-4">
            <View>
              <Text
                className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
                maxFontSizeMultiplier={1.15}
              >
                nominations
              </Text>
              <Text
                className="mt-2 text-[36px] font-extralight tabular-nums leading-none text-hum-text"
                maxFontSizeMultiplier={1.08}
              >
                {filledCategories}
                <Text className="text-[18px] font-light text-hum-muted">/{categoryTotal}</Text>
              </Text>
              <Text className="mt-1.5 text-[12px] text-hum-dim" maxFontSizeMultiplier={1.2}>
                {totalNominations} {totalNominations === 1 ? 'story' : 'stories'} logged
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/awards')}
              accessibilityRole="button"
              accessibilityLabel="add nominations"
              activeOpacity={0.88}
              className="rounded-full bg-hum-primary/15 px-4 py-2.5"
            >
              <Text className="text-[14px] font-medium text-hum-primary" maxFontSizeMultiplier={1.2}>
                + add
              </Text>
            </TouchableOpacity>
          </View>

          {couple ? (
            <View className="mt-6 border-t border-hum-border/18 pt-6">
              <SeasonStatsInfographic nominations={nominations} couple={couple} profile={profile} partnerProfile={partnerProfile} />
            </View>
          ) : null}
        </View>

        {/* Milestones */}
        <View className="px-1">
          <Text
            className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
            maxFontSizeMultiplier={1.15}
          >
            milestones
          </Text>
          {timeline.map((m, i) => {
            const past = startOfDay(m.at) < today0;
            const isLast = i === timeline.length - 1;
            return (
              <View key={m.id} className="flex-row">
                <View className="mr-3 w-5 items-center">
                  <View
                    className={`h-2.5 w-2.5 rounded-full ${
                      past ? 'bg-hum-dim/35' : 'border border-hum-primary/35 bg-hum-card'
                    }`}
                  />
                  {!isLast ? <View className="w-px bg-hum-border/20" style={{ height: 24 }} /> : null}
                </View>
                <View className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-3.5'}`}>
                  <View className="flex-row items-baseline justify-between gap-2">
                    <Text className="text-[15px] font-medium text-hum-text" maxFontSizeMultiplier={1.2}>
                      {m.title}
                    </Text>
                    <Text
                      className={`text-[12px] ${past ? 'text-hum-dim' : 'text-hum-primary'}`}
                      maxFontSizeMultiplier={1.2}
                    >
                      {formatRelativeDay(m.at)}
                    </Text>
                  </View>
                  <Text className="mt-0.5 text-[11px] text-hum-dim" maxFontSizeMultiplier={1.2}>
                    {formatShortDate(m.at)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Reminders */}
        {Platform.OS !== 'web' ? (
          <View className="flex-row items-center justify-between rounded-[18px] border border-hum-border/18 bg-hum-card px-4 py-3.5">
            <View className="flex-row items-center gap-3 pr-2">
              <Ionicons name="notifications-outline" size={20} color={theme.dim} />
              <View>
                <Text className="text-[15px] font-medium text-hum-text" maxFontSizeMultiplier={1.22}>
                  reminders
                </Text>
                <Text className="text-[11px] text-hum-dim" maxFontSizeMultiplier={1.2}>
                  alignment window start & 3 days before close
                </Text>
              </View>
            </View>
            <Switch
              value={ceremonyLocalRemindersEnabled}
              onValueChange={(v) => void onToggleReminders(v)}
              disabled={reminderBusy}
              trackColor={{ false: '#2E293899', true: `${theme.primary}CC` }}
              thumbColor={Platform.OS === 'android' ? theme.surface : undefined}
              accessibilityLabel="remind before season closes"
            />
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="back to awards"
          activeOpacity={0.88}
        >
          <Text className="text-center text-[14px] font-medium text-hum-muted">← awards</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
