import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  Alert,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { useAuthStore } from '@/lib/stores/authStore';
import { updateUserProfile } from '@/lib/firestore/users';
import { scrollContentStandard } from '@/constants/screenLayout';
import { theme } from '@/constants/theme';
import { cardShadow } from '@/constants/elevation';
import type {
  NotificationPreferences,
  DailyRemindersPreferences,
  DailyReminderConfig,
} from '@/types';

const ACTIVITY_DEFAULTS: NotificationPreferences = {
  mood: true,
  habits: true,
  decide: true,
  reasons: true,
  awards: true,
  weeklyChallenge: true,
  reminders: true,
};

const ACTIVITY_LABELS: Record<keyof NotificationPreferences, { label: string; hint: string }> = {
  mood: { label: 'mood', hint: 'when your partner taps a sticker' },
  habits: { label: 'habits', hint: 'check-ins and new shared habits' },
  decide: { label: 'decide', hint: 'quick spins and battles' },
  reasons: { label: 'reasons', hint: 'when your partner writes one for you' },
  awards: { label: 'awards', hint: 'nominations, picks, ceremony moments' },
  weeklyChallenge: { label: 'weekly challenge', hint: 'wins to celebrate together' },
  reminders: { label: 'daily reminders', hint: 'mood + habit nudges (configured below)' },
};

const ACTIVITY_ORDER: (keyof NotificationPreferences)[] = [
  'mood',
  'habits',
  'decide',
  'reasons',
  'awards',
  'weeklyChallenge',
  'reminders',
];

const REMINDERS_DEFAULTS: DailyRemindersPreferences = {
  mood: { enabled: false, localTime: '10:00' },
  habits: { enabled: false, localTime: '20:00' },
  timezone: resolveTimezone(),
};

function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Build half-hour slots "00:00", "00:30", ..., "23:30". */
function halfHourSlots(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
}

function formatTimeForDisplay(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h < 12 ? 'am' : 'pm';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function NotificationSettingsScreen() {
  const { profile } = useAuthStore();
  const [activity, setActivity] = useState<NotificationPreferences>(
    () => ({ ...ACTIVITY_DEFAULTS, ...(profile?.notificationPreferences ?? {}) }),
  );
  const [reminders, setReminders] = useState<DailyRemindersPreferences>(
    () => ({
      ...REMINDERS_DEFAULTS,
      ...(profile?.dailyReminders ?? {}),
      mood: {
        ...REMINDERS_DEFAULTS.mood,
        ...(profile?.dailyReminders?.mood ?? {}),
      },
      habits: {
        ...REMINDERS_DEFAULTS.habits,
        ...(profile?.dailyReminders?.habits ?? {}),
      },
    }),
  );
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<null | 'mood' | 'habits'>(null);

  useEffect(() => {
    if (profile?.notificationPreferences) {
      setActivity({ ...ACTIVITY_DEFAULTS, ...profile.notificationPreferences });
    }
    if (profile?.dailyReminders) {
      setReminders({
        ...REMINDERS_DEFAULTS,
        ...profile.dailyReminders,
        mood: { ...REMINDERS_DEFAULTS.mood, ...profile.dailyReminders.mood },
        habits: { ...REMINDERS_DEFAULTS.habits, ...profile.dailyReminders.habits },
      });
    }
  }, [profile?.notificationPreferences, profile?.dailyReminders]);

  async function persistActivity(next: NotificationPreferences) {
    if (!profile) return;
    setSaving(true);
    try {
      await updateUserProfile(profile.uid, { notificationPreferences: next });
    } catch {
      Alert.alert('couldn\u2019t save', 'check your connection');
      setActivity(activity);
    } finally {
      setSaving(false);
    }
  }

  async function persistReminders(next: DailyRemindersPreferences) {
    if (!profile) return;
    setSaving(true);
    try {
      await updateUserProfile(profile.uid, {
        dailyReminders: { ...next, timezone: next.timezone || resolveTimezone() },
      });
    } catch {
      Alert.alert('couldn\u2019t save', 'check your connection');
      setReminders(reminders);
    } finally {
      setSaving(false);
    }
  }

  function toggleActivity(key: keyof NotificationPreferences) {
    if (!profile || saving) return;
    const next = { ...activity, [key]: !activity[key] };
    setActivity(next);
    persistActivity(next);
  }

  function toggleReminder(kind: 'mood' | 'habits') {
    if (!profile || saving) return;
    const cfg = reminders[kind];
    const nextCfg: DailyReminderConfig = { ...cfg, enabled: !cfg.enabled };
    const next: DailyRemindersPreferences = {
      ...reminders,
      [kind]: nextCfg,
      timezone: reminders.timezone || resolveTimezone(),
    };
    setReminders(next);
    persistReminders(next);
  }

  function pickTime(kind: 'mood' | 'habits', time: string) {
    if (!profile) return;
    const next: DailyRemindersPreferences = {
      ...reminders,
      [kind]: { ...reminders[kind], localTime: time },
      timezone: reminders.timezone || resolveTimezone(),
    };
    setReminders(next);
    setPicker(null);
    persistReminders(next);
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="notifications" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Partner activity ─── */}
        <Text className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
          partner activity
        </Text>
        <View
          className="overflow-hidden rounded-[20px] border border-hum-border/18 bg-hum-card"
          style={cardShadow}
        >
          {ACTIVITY_ORDER.map((key, idx) => {
            const meta = ACTIVITY_LABELS[key];
            return (
              <View
                key={key}
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  idx > 0 ? 'border-t border-hum-border/12' : ''
                }`}
              >
                <View className="mr-3 flex-1">
                  <Text className="text-[14px] font-medium text-hum-text">{meta.label}</Text>
                  <Text className="mt-0.5 text-[11.5px] font-light text-hum-dim">
                    {meta.hint}
                  </Text>
                </View>
                <Switch
                  value={activity[key]}
                  onValueChange={() => toggleActivity(key)}
                  trackColor={{ false: theme.border, true: theme.secondary }}
                  disabled={saving}
                />
              </View>
            );
          })}
        </View>

        {/* ─── Daily reminders ─── */}
        <Text className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">
          daily reminders
        </Text>
        <View
          className="overflow-hidden rounded-[20px] border border-hum-border/18 bg-hum-card"
          style={cardShadow}
        >
          <ReminderRow
            label="mood check-in"
            hint="a gentle nudge to log how you feel"
            cfg={reminders.mood}
            onToggle={() => toggleReminder('mood')}
            onPickTime={() => setPicker('mood')}
            disabled={saving || !activity.reminders}
          />
            <View className="border-t border-hum-border/12" />
          <ReminderRow
            label="habit check-in"
            hint="don\u2019t forget today\u2019s rituals"
            cfg={reminders.habits}
            onToggle={() => toggleReminder('habits')}
            onPickTime={() => setPicker('habits')}
            disabled={saving || !activity.reminders}
          />
        </View>
        <Text className="mt-2 px-1 text-[11px] font-light text-hum-dim">
          {activity.reminders
            ? 'reminders skip themselves on days you\u2019ve already logged.'
            : 'turn on \u201cdaily reminders\u201d above to enable.'}
        </Text>
        <Text className="mt-1 px-1 text-[10.5px] font-light text-hum-dim/70">
          timezone: {reminders.timezone}
        </Text>
      </ScrollView>

      <TimePickerModal
        visible={picker !== null}
        current={picker ? reminders[picker].localTime : '10:00'}
        onClose={() => setPicker(null)}
        onPick={(t) => picker && pickTime(picker, t)}
        title={
          picker === 'mood'
            ? 'mood reminder time'
            : picker === 'habits'
              ? 'habit reminder time'
              : ''
        }
      />
    </SafeAreaView>
  );
}

function ReminderRow(props: {
  label: string;
  hint: string;
  cfg: DailyReminderConfig;
  onToggle: () => void;
  onPickTime: () => void;
  disabled?: boolean;
}) {
  return (
    <View className="px-4 py-3.5">
      <View className="flex-row items-center justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-[14px] font-medium text-hum-text">{props.label}</Text>
          <Text className="mt-0.5 text-[11.5px] font-light text-hum-dim">{props.hint}</Text>
        </View>
        <Switch
          value={props.cfg.enabled && !props.disabled}
          onValueChange={props.onToggle}
          trackColor={{ false: theme.border, true: theme.secondary }}
          disabled={props.disabled}
        />
      </View>
      {props.cfg.enabled && !props.disabled ? (
        <Pressable
          onPress={props.onPickTime}
          accessibilityRole="button"
          accessibilityLabel={`change ${props.label} time, currently ${formatTimeForDisplay(
            props.cfg.localTime,
          )}`}
          className="mt-3 flex-row items-center justify-between rounded-[12px] border border-hum-secondary/20 bg-hum-bg px-3 py-2.5 active:opacity-70"
        >
          <Text className="text-[12.5px] font-light text-hum-muted">at</Text>
          <Text className="text-[14px] font-medium tabular-nums text-hum-text">
            {formatTimeForDisplay(props.cfg.localTime)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TimePickerModal(props: {
  visible: boolean;
  current: string;
  title: string;
  onPick: (time: string) => void;
  onClose: () => void;
}) {
  const slots = useMemo(halfHourSlots, []);
  return (
    <Modal
      transparent
      visible={props.visible}
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
      onRequestClose={props.onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="close picker"
        onPress={props.onClose}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-[28px] border-t border-hum-border/18 bg-hum-bg px-4 pb-8 pt-3"
          style={cardShadow}
        >
          <View className="mb-2 items-center">
            <View className="h-[4px] w-12 rounded-full bg-hum-border/40" />
          </View>
          <Text className="mb-3 text-center text-[13px] font-medium text-hum-text">
            {props.title}
          </Text>
          <ScrollView
            style={{ maxHeight: 360 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {slots.map((slot) => {
              const selected = slot === props.current;
              return (
                <Pressable
                  key={slot}
                  onPress={() => props.onPick(slot)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={`flex-row items-center justify-between rounded-[10px] px-3 py-3 ${
                    selected ? 'bg-hum-secondary/10' : ''
                  }`}
                >
                  <Text
                    className={`text-[15px] tabular-nums ${
                      selected
                        ? 'font-semibold text-hum-secondary'
                        : 'font-light text-hum-text'
                    }`}
                  >
                    {formatTimeForDisplay(slot)}
                  </Text>
                  {selected ? (
                    <Text className="text-[11px] font-medium text-hum-secondary">selected</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
