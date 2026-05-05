import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { useAuthStore } from '@/lib/stores/authStore';
import { useHabitStore } from '@/lib/stores/habitStore';
import { theme } from '@/constants/theme';
import { scrollContentStandard } from '@/constants/screenLayout';
import type { HabitCadence, HabitScope } from '@/types';

export default function NewHabitScreen() {
  const profile = useAuthStore((s) => s.profile);
  const createHabit = useHabitStore((s) => s.createHabit);

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [cadence, setCadence] = useState<HabitCadence>('daily');
  const [scope, setScope] = useState<HabitScope>('shared');
  const [busy, setBusy] = useState(false);

  if (!profile?.coupleId || !profile.uid) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="text-center text-hum-muted">link your partner first</Text>
        <Button label="go back" onPress={() => router.back()} className="mt-6" />
      </SafeAreaView>
    );
  }

  async function handleSave() {
    const t = title.trim();
    if (!t) {
      Alert.alert('need a title', 'a few words are enough');
      return;
    }
    const coupleId = profile?.coupleId;
    const uid = profile?.uid;
    if (!coupleId || !uid) return;
    setBusy(true);
    try {
      await createHabit({
        coupleId,
        createdBy: uid,
        title: t,
        emoji: emoji.trim() || '✨',
        cadence,
        scope,
      });
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('couldn’t save', 'check connection, try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="new habit" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-y-3">
          <Text className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">cadence</Text>
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                { key: 'daily' as const, label: 'daily' },
                { key: 'weekly' as const, label: 'weekly' },
              ] as const
            ).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setCadence(key)}
                className={`rounded-full border px-4 py-2.5 ${
                  cadence === key
                    ? 'border-hum-primary/25 bg-hum-primary'
                    : 'border-hum-border/16 bg-hum-card'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: cadence === key }}
                activeOpacity={0.88}
              >
                <Text
                  className={`text-[13px] font-medium tracking-wide ${
                    cadence === key ? 'text-hum-ink' : 'text-hum-muted'
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="gap-y-3">
          <Text className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">who</Text>
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                { key: 'shared' as const, label: 'together' },
                { key: 'personal' as const, label: 'just you' },
              ] as const
            ).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setScope(key)}
                className={`rounded-full border px-4 py-2.5 ${
                  scope === key
                    ? 'border-hum-primary/25 bg-hum-primary'
                    : 'border-hum-border/16 bg-hum-card'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: scope === key }}
                activeOpacity={0.88}
              >
                <Text
                  className={`text-[13px] font-medium tracking-wide ${
                    scope === key ? 'text-hum-ink' : 'text-hum-muted'
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label="title"
          placeholder="evening walk"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />

        <View className="gap-y-2">
          <Text className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">emoji</Text>
          <TextInput
            className="min-h-[52px] rounded-[18px] border border-hum-border/16 bg-hum-surface/65 px-4 py-3.5 text-[22px] font-light text-hum-text"
            placeholder="✨"
            placeholderTextColor={theme.dim}
            value={emoji}
            onChangeText={setEmoji}
            maxLength={8}
          />
        </View>

        <Button
          label="save"
          onPress={handleSave}
          loading={busy}
          disabled={!title.trim()}
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
