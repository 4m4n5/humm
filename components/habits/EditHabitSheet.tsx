import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '@/constants/theme';
import type { Habit, HabitCadence, HabitScope } from '@/types';
import { useHabitStore } from '@/lib/stores/habitStore';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { scrollContentStandard } from '@/constants/screenLayout';

type Props = {
  visible: boolean;
  habit: Habit | null;
  onClose: () => void;
};

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

export function EditHabitSheet({ visible, habit, onClose }: Props) {
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const archiveHabit = useHabitStore((s) => s.archiveHabit);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [cadence, setCadence] = useState<HabitCadence>('daily');
  const [scope, setScope] = useState<HabitScope>('shared');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!habit) return;
    setTitle(habit.title);
    setEmoji(habit.emoji);
    setCadence(habit.cadence);
    setScope(habit.scope);
  }, [habit]);

  const handleClose = () => {
    onClose();
  };

  const submit = async () => {
    if (!habit) return;
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await updateHabit(habit.id, {
        title: t,
        emoji: emoji.trim() || '✨',
        cadence,
        scope,
      });
      handleClose();
    } finally {
      setBusy(false);
    }
  };

  const archive = () => {
    if (!habit) return;
    Alert.alert('archive?', 'you can add a new one anytime.', [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'archive',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await archiveHabit(habit.id);
              handleClose();
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  if (!habit || !visible) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable className="flex-1" onPress={handleClose} accessibilityLabel="Dismiss" />
        <BlurView
          intensity={Platform.OS === 'ios' ? 70 : 0}
          tint="dark"
          className="max-h-[88%] overflow-hidden rounded-t-[28px] border-t border-hum-border/18 px-5 pb-8 pt-3"
          style={{
            backgroundColor:
              Platform.OS === 'ios' ? 'rgba(15,14,20,0.55)' : 'rgba(15,14,20,0.95)',
          }}
        >
          {/* Grab handle */}
          <View className="mb-4 items-center">
            <View className="h-[4px] w-9 rounded-full bg-hum-border/40" />
          </View>

          <Text className="text-[18px] font-semibold tracking-tight text-hum-text">edit habit</Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ ...scrollContentStandard, paddingHorizontal: 0, paddingTop: 16 }}
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

            <View className="gap-y-2.5 pt-2">
              <Button label="save" onPress={() => void submit()} loading={busy} disabled={!title.trim()} size="lg" />
              <Button label="cancel" variant="secondary" onPress={handleClose} size="lg" />
            </View>

            <View className="mt-2 items-center border-t border-hum-border/10 pt-4">
              <TouchableOpacity onPress={archive} className="px-4 py-2" accessibilityRole="button">
                <Text className="text-[13px] font-medium text-red-400/80">archive this habit</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
