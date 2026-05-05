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

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="gap-y-2.5">
      <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map(({ key, label: l }) => {
          const on = value === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onChange(key)}
              className={`rounded-full border px-4 py-2.5 ${
                on
                  ? 'border-hum-primary/25 bg-hum-primary'
                  : 'border-hum-border/18 bg-hum-card/60'
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              activeOpacity={0.88}
            >
              <Text
                className={`text-[13px] font-medium tracking-wide ${
                  on ? 'text-hum-ink' : 'text-hum-muted'
                }`}
              >
                {l}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const CADENCE_OPTIONS = [
  { key: 'daily' as const, label: 'daily' },
  { key: 'weekly' as const, label: 'weekly' },
] as const;

const SCOPE_OPTIONS = [
  { key: 'shared' as const, label: 'together' },
  { key: 'personal' as const, label: 'just you' },
] as const;

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
      Alert.alert("couldn't save", 'check connection, try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="new habit" subtitle="something small you want to keep up" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="title"
          placeholder="evening walk"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />

        <View className="gap-y-2.5">
          <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">emoji</Text>
          <TextInput
            className="min-h-[52px] rounded-[20px] border border-hum-border/18 bg-hum-surface/65 px-4 py-3.5 text-[22px] font-light text-hum-text"
            placeholder="✨"
            placeholderTextColor={theme.dim}
            value={emoji}
            onChangeText={setEmoji}
            maxLength={8}
          />
        </View>

        <View className="h-px bg-hum-border/12" />

        <PillGroup
          label="cadence"
          options={CADENCE_OPTIONS}
          value={cadence}
          onChange={setCadence}
        />

        <PillGroup
          label="who"
          options={SCOPE_OPTIONS}
          value={scope}
          onChange={setScope}
        />

        <View className="pt-2">
          <Button
            label="save"
            onPress={handleSave}
            loading={busy}
            disabled={!title.trim()}
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
