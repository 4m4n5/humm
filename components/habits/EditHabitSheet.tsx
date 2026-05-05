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
        <View className="max-h-[88%] rounded-t-3xl border-t border-hum-border/40 bg-hum-bg px-5 pb-8 pt-4">
          <Text className="text-[18px] font-semibold text-hum-text">edit habit</Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ ...scrollContentStandard, paddingHorizontal: 0, paddingTop: 16 }}
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

            <Button label="save" onPress={() => void submit()} loading={busy} disabled={!title.trim()} size="lg" />

            <Button label="cancel" variant="secondary" onPress={handleClose} size="lg" />

            <TouchableOpacity onPress={archive} className="items-center py-3" accessibilityRole="button">
              <Text className="text-[13px] font-medium text-red-400/90">archive</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
