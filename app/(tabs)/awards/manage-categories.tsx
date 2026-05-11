import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { LinkPartnerGate } from '@/components/shared/LinkPartnerGate';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { SectionLabel } from '@/components/shared/SectionLabel';
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
import { errorsVoice, navVoice } from '@/constants/hummVoice';

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
      Alert.alert(errorsVoice.couldntSave, e instanceof Error ? e.message : errorsVoice.tryAgain);
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
      Alert.alert(errorsVoice.couldntAdd, e instanceof Error ? e.message : errorsVoice.tryAgain);
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
        { text: navVoice.cancel, style: 'cancel' },
        {
          text: hasHist ? 'pause' : 'remove',
          style: 'destructive',
          onPress: async () => {
            if (!coupleId) return;
            setBusy(`off-${row.id}`);
            try {
              await disableAwardCategoryRow(coupleId, row.id);
            } catch (e: unknown) {
              Alert.alert(errorsVoice.couldntUpdate, e instanceof Error ? e.message : errorsVoice.tryAgain);
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
      Alert.alert(errorsVoice.couldntEnable, e instanceof Error ? e.message : errorsVoice.tryAgain);
    } finally {
      setBusy(null);
    }
  }

  if (!coupleId || !couple) {
    return <LinkPartnerGate backTo="awards" tone="gold" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="gold" />
      <ScreenHeader title="award categories" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!canPauseOrRemoveCategories ? (
          <Text
            className="text-[11px] font-medium uppercase tracking-[0.2em] text-hum-dim"
            maxFontSizeMultiplier={1.25}
          >
            pause · remove · nominate phase only
          </Text>
        ) : null}

        <View className="gap-y-3">
          <Text
            className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
            maxFontSizeMultiplier={1.25}
          >
            active
          </Text>
          {enabledRows.length === 0 ? (
            <EmptyState
              className="px-0 py-4"
              ionicon="folder-open-outline"
              ioniconColor={`${theme.gold}B3`}
              title="no active categories"
              description="add a category in the form below"
            />
          ) : null}
          {enabledRows.map((row) => (
            <View
              key={row.id}
              className="gap-y-3 rounded-[20px] border border-hum-border/18 bg-hum-card px-4 py-4"
            >
              {editingId === row.id ? (
                <>
                  <Input
                    label="name"
                    value={draftLabel}
                    onChangeText={setDraftLabel}
                    autoCapitalize="sentences"
                    placeholder="cooking moment"
                  />
                  <View className="gap-y-2.5">
                    <SectionLabel title="emoji" />
                    <TextInput
                      className="min-h-[52px] rounded-[20px] border border-hum-gold/18 bg-hum-surface/80 px-4 py-3.5 text-[22px] font-light text-hum-text"
                      placeholder="✨"
                      placeholderTextColor={theme.dim}
                      value={draftEmoji}
                      onChangeText={setDraftEmoji}
                      maxLength={8}
                    />
                  </View>
                  <View className="flex-row gap-2 pt-1">
                    <Button
                      label="save"
                      onPress={() => void saveEdit()}
                      loading={busy === `edit-${row.id}`}
                      disabled={!draftLabel.trim() || !draftEmoji.trim()}
                      size="sm"
                      className="flex-1"
                    />
                    <Button label={navVoice.cancel} variant="secondary" size="sm" onPress={() => setEditingId(null)} className="flex-1" />
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-2xl" allowFontScaling={false}>
                      {row.emoji}
                    </Text>
                    <Text className="flex-1 text-[16px] font-medium text-hum-text" maxFontSizeMultiplier={1.3}>
                      {row.label}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    <Pressable
                      onPress={() => startEdit(row)}
                      className="min-h-[44px] justify-center rounded-full border border-hum-border/18 px-4 py-2 active:opacity-88"
                      disabled={!!busy}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit award category ${row.label}`}
                    >
                      <Text className="text-[13px] font-medium text-hum-muted" maxFontSizeMultiplier={1.3}>
                        edit
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDisable(row)}
                      className="min-h-[44px] justify-center rounded-full border border-amber-900/18 bg-amber-950/10 px-4 py-2 active:opacity-88"
                      disabled={!!busy || !canPauseOrRemoveCategories}
                      accessibilityRole="button"
                      accessibilityLabel={
                        history.has(row.id)
                          ? `Pause award category ${row.label}`
                          : `Remove award category ${row.label}`
                      }
                    >
                      <Text className="text-[13px] font-medium text-amber-100/90" maxFontSizeMultiplier={1.3}>
                        {history.has(row.id) ? 'pause' : 'remove'}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ))}
        </View>

        {pausedRows.length > 0 ? (
          <View className="gap-y-3">
            <Text
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              maxFontSizeMultiplier={1.25}
            >
              paused
            </Text>
            {pausedRows.map((row) => (
              <View
                key={row.id}
                className="flex-row items-center gap-3 rounded-[18px] border border-dashed border-hum-border/18 bg-hum-surface/25 px-4 py-4"
              >
                <Text className="text-2xl opacity-80" allowFontScaling={false}>
                  {row.emoji}
                </Text>
                <Text className="min-w-0 flex-1 text-[15px] font-medium text-hum-muted" maxFontSizeMultiplier={1.3}>
                  {row.label}
                </Text>
                <Pressable
                  onPress={() => void onEnable(row)}
                  disabled={!!busy}
                  className="min-h-[44px] justify-center rounded-full bg-hum-primary/12 px-4 py-2 active:opacity-88"
                  accessibilityRole="button"
                  accessibilityLabel={`Re-enable paused award category ${row.label}`}
                >
                  <Text className="text-[13px] font-semibold text-hum-primary" maxFontSizeMultiplier={1.3}>
                    turn on
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View className="h-px bg-hum-border/12" />

        <View className="gap-y-3.5">
          <SectionLabel title="new category" />
          <Input
            label="name"
            placeholder="cooking moment"
            value={newLabel}
            onChangeText={setNewLabel}
            autoCapitalize="sentences"
          />
          <View className="gap-y-2.5">
            <SectionLabel title="emoji" />
            <TextInput
              className="min-h-[52px] rounded-[20px] border border-hum-gold/18 bg-hum-surface/80 px-4 py-3.5 text-[22px] font-light text-hum-text"
              placeholder="✨"
              placeholderTextColor={theme.dim}
              value={newEmoji}
              onChangeText={setNewEmoji}
              maxLength={8}
            />
          </View>
          <View className="pt-1">
            <Button
              label="add category"
              onPress={() => void onAdd()}
              loading={busy === 'add'}
              disabled={!newLabel.trim() || !newEmoji.trim()}
              size="lg"
            />
          </View>
        </View>

        <Button label={navVoice.done} variant="secondary" size="lg" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}
