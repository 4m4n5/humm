import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import {
  addAwardCategoryRow,
  disableAwardCategoryRow,
  enableAwardCategoryRow,
  updateAwardCategoryRow,
} from '@/lib/firestore/awardCategories';
import type { CoupleAwardCategoryRow } from '@/types';
import { theme } from '@/constants/theme';
import { scrollContentStandard } from '@/constants/screenLayout';

export default function ManageAwardCategoriesScreen() {
  const { profile } = useAuthStore();
  const { couple, ceremony } = useNominationsStore();
  const canPauseOrRemoveCategories = !ceremony || ceremony.status === 'nominating';
  const [busy, setBusy] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftEmoji, setDraftEmoji] = useState('');

  const coupleId = profile?.coupleId ?? null;
  const rows = couple?.awardCategories ?? [];
  const history = new Set(couple?.awardCategoryIdsUsedInCompleteSeasons ?? []);

  const enabledRows = rows.filter((r) => r.enabled);
  const pausedRows = rows.filter((r) => !r.enabled && history.has(r.id));

  function startEdit(row: CoupleAwardCategoryRow) {
    setEditingId(row.id);
    setDraftLabel(row.label);
    setDraftEmoji(row.emoji);
  }

  async function saveEdit() {
    if (!coupleId || !editingId) return;
    setBusy(`edit-${editingId}`);
    try {
      await updateAwardCategoryRow(coupleId, editingId, { label: draftLabel, emoji: draftEmoji });
      setEditingId(null);
    } catch (e: unknown) {
      Alert.alert('couldn’t save', e instanceof Error ? e.message : 'try again');
    } finally {
      setBusy(null);
    }
  }

  async function onAdd() {
    if (!coupleId) return;
    setBusy('add');
    try {
      await addAwardCategoryRow(coupleId, { label: newLabel, emoji: newEmoji });
      setNewLabel('');
      setNewEmoji('');
    } catch (e: unknown) {
      Alert.alert('couldn’t add', e instanceof Error ? e.message : 'try again');
    } finally {
      setBusy(null);
    }
  }

  function confirmDisable(row: CoupleAwardCategoryRow) {
    const hasHist = history.has(row.id);
    Alert.alert(
      hasHist ? 'pause this category?' : 'remove this category?',
      hasHist ? 'stays listed · re-enable anytime' : 'removed · never used in a finished season',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: hasHist ? 'pause' : 'remove',
          style: 'destructive',
          onPress: async () => {
            if (!coupleId) return;
            setBusy(`off-${row.id}`);
            try {
              await disableAwardCategoryRow(coupleId, row.id);
            } catch (e: unknown) {
              Alert.alert('couldn’t update', e instanceof Error ? e.message : 'try again');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  async function onEnable(row: CoupleAwardCategoryRow) {
    if (!coupleId) return;
    setBusy(`on-${row.id}`);
    try {
      await enableAwardCategoryRow(coupleId, row.id);
    } catch (e: unknown) {
      Alert.alert('couldn’t enable', e instanceof Error ? e.message : 'try again');
    } finally {
      setBusy(null);
    }
  }

  if (!coupleId || !couple) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="text-center text-[14px] text-hum-muted">link a partner first</Text>
        <Button label="back" onPress={() => router.back()} className="mt-6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="award categories" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!canPauseOrRemoveCategories ? (
          <Text className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-200/90">
            pause · remove · nominate phase only
          </Text>
        ) : null}

        <View className="gap-y-3">
          <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">active</Text>
          {enabledRows.length === 0 ? (
            <Text className="text-[13px] text-hum-muted">add a category below</Text>
          ) : null}
          {enabledRows.map((row) => (
            <View
              key={row.id}
              className="gap-y-3 rounded-[20px] border border-hum-border/18 bg-hum-card px-4 py-4"
            >
              {editingId === row.id ? (
                <>
                  <TextInput
                    className="rounded-[20px] border border-hum-border/18 bg-hum-surface/70 px-4 py-3 text-[15px] text-hum-text"
                    placeholder="emoji"
                    placeholderTextColor={theme.dim}
                    value={draftEmoji}
                    onChangeText={setDraftEmoji}
                    maxLength={8}
                  />
                  <Input label="name" value={draftLabel} onChangeText={setDraftLabel} />
                  <View className="flex-row gap-2">
                    <Button
                      label="save"
                      onPress={() => void saveEdit()}
                      loading={busy === `edit-${row.id}`}
                      className="flex-1"
                    />
                    <Button label="cancel" variant="secondary" onPress={() => setEditingId(null)} className="flex-1" />
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-2xl">{row.emoji}</Text>
                    <Text className="flex-1 text-[16px] font-medium text-hum-text">{row.label}</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    <TouchableOpacity
                      onPress={() => startEdit(row)}
                      className="rounded-full border border-hum-border/18 px-4 py-2"
                      disabled={!!busy}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${row.label}`}
                      activeOpacity={0.88}
                    >
                      <Text className="text-[13px] font-medium text-hum-muted">edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDisable(row)}
                      className="rounded-full border border-amber-900/18 bg-amber-950/10 px-4 py-2"
                      disabled={!!busy || !canPauseOrRemoveCategories}
                      accessibilityRole="button"
                      accessibilityLabel={
                        history.has(row.id) ? `Pause ${row.label}` : `Remove ${row.label}`
                      }
                      activeOpacity={0.88}
                    >
                      <Text className="text-[13px] font-medium text-amber-100/90">
                        {history.has(row.id) ? 'pause' : 'remove'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}
        </View>

        {pausedRows.length > 0 ? (
          <View className="gap-y-3">
            <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">paused</Text>
            {pausedRows.map((row) => (
              <View
                key={row.id}
                className="flex-row items-center gap-3 rounded-[18px] border border-dashed border-hum-border/18 bg-hum-surface/25 px-4 py-4"
              >
                <Text className="text-2xl opacity-80">{row.emoji}</Text>
                <Text className="min-w-0 flex-1 text-[15px] font-medium text-hum-muted">{row.label}</Text>
                <TouchableOpacity
                  onPress={() => void onEnable(row)}
                  disabled={!!busy}
                  className="rounded-full bg-hum-primary/12 px-4 py-2"
                  accessibilityRole="button"
                  accessibilityLabel={`Turn on ${row.label}`}
                  activeOpacity={0.88}
                >
                  <Text className="text-[13px] font-semibold text-hum-primary">turn on</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View className="gap-y-3 rounded-[20px] border border-hum-border/18 bg-hum-surface/28 px-4 py-5">
          <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">new category</Text>
          <Text className="text-[12px] text-hum-dim">pick an emoji and a short name (e.g. “best road trip”)</Text>
          <TextInput
            className="rounded-[20px] border border-hum-border/18 bg-hum-card px-4 py-3 text-[15px] text-hum-text"
            placeholder="emoji"
            placeholderTextColor={theme.dim}
            value={newEmoji}
            onChangeText={setNewEmoji}
            maxLength={8}
          />
          <Input label="name" value={newLabel} onChangeText={setNewLabel} />
          <Button label="add category" onPress={() => void onAdd()} loading={busy === 'add'} disabled={!newLabel.trim() || !newEmoji.trim()} />
        </View>

        <Button label="done" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}
