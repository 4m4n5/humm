import React, { useEffect, useState } from 'react';
import { View, Text, Switch, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { useAuthStore } from '@/lib/stores/authStore';
import { updateUserProfile } from '@/lib/firestore/users';
import { scrollContentStandard } from '@/constants/screenLayout';
import { theme } from '@/constants/theme';
import type { NotificationPreferences } from '@/types';

const DEFAULTS: NotificationPreferences = {
  reasons: true,
  mood: true,
  nominations: true,
  battles: true,
  decisions: true,
};

const LABELS: Record<keyof NotificationPreferences, string> = {
  reasons: 'reasons',
  mood: 'mood',
  nominations: 'nominations',
  battles: 'battles',
  decisions: 'decisions',
};

export default function NotificationSettingsScreen() {
  const { profile } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    profile?.notificationPreferences ?? DEFAULTS,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.notificationPreferences) {
      setPrefs({ ...DEFAULTS, ...profile.notificationPreferences });
    }
  }, [profile?.notificationPreferences]);

  async function toggle(key: keyof NotificationPreferences) {
    if (!profile || saving) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    try {
      await updateUserProfile(profile.uid, { notificationPreferences: next });
    } catch {
      Alert.alert('couldn\u2019t save', 'check connection');
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="notifications" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[13px] font-light leading-[20px] text-hum-muted mb-4">
          choose which push notifications you receive from your partner.
        </Text>
        {(Object.keys(LABELS) as (keyof NotificationPreferences)[]).map((key) => (
          <View
            key={key}
            className="flex-row items-center justify-between border-b border-hum-border/10 py-3.5"
          >
            <Text className="text-[14px] font-medium text-hum-text">{LABELS[key]}</Text>
            <Switch
              value={prefs[key]}
              onValueChange={() => toggle(key)}
              trackColor={{ false: theme.border, true: theme.secondary }}
              disabled={saving}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
