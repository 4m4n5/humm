import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { useAuthStore } from '@/lib/stores/authStore';
import { useMoodStore } from '@/lib/stores/moodStore';
import { upsertMoodEntry } from '@/lib/firestore/moodEntries';
import { afterMoodEntryWritten } from '@/lib/gamificationTriggers';
import { hapticSuccess } from '@/lib/haptics';
import { MoodGrid } from '@/components/mood/MoodGrid';
import { MoodConfirmModal } from '@/components/mood/MoodConfirmModal';
import { getMoodStickerById } from '@/constants/moodStickers';
import { scrollContentStandard } from '@/constants/screenLayout';
import { cardShadow } from '@/constants/elevation';
import type { MoodStickerOption } from '@/types';

export default function MoodLogScreen() {
  const { profile } = useAuthStore();
  const myToday = useMoodStore((s) => s.myToday);
  const [savingId, setSavingId] = useState<string | null>(null);
  // Sticker the user picked from the grid that's awaiting confirmation. Save
  // only fires after they tap "log it" in the confirmation modal.
  const [pending, setPending] = useState<MoodStickerOption | null>(null);

  const currentId = myToday?.current.stickerId ?? null;
  const currentSticker = getMoodStickerById(currentId);
  const coupleId = profile?.coupleId ?? '';
  const myUid = profile?.uid ?? '';

  function handleSelect(sticker: MoodStickerOption) {
    if (!coupleId || !myUid || savingId) return;
    if (sticker.id === currentId) return;
    setPending(sticker);
  }

  async function handleConfirm() {
    if (!pending || !coupleId || !myUid || savingId) return;
    setSavingId(pending.id);
    try {
      const { isFirstSaveToday, entry } = await upsertMoodEntry(
        coupleId,
        myUid,
        pending,
      );
      await afterMoodEntryWritten(
        myUid,
        coupleId,
        entry.dayKey,
        pending.id,
        isFirstSaveToday,
      );
      await hapticSuccess();
      router.replace('/mood');
    } catch (e: unknown) {
      const code =
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        typeof (e as { code: unknown }).code === 'string'
          ? (e as { code: string }).code
          : '';
      if (code === 'permission-denied') {
        Alert.alert(
          "couldn't save",
          'Firestore is blocking mood saves until moodEntries rules are published in the Firebase Console (see FIRESTORE_MOOD_RULES in the repo docs).',
        );
      } else {
        Alert.alert("couldn't save", 'check connection, try again');
      }
      setSavingId(null);
    }
  }

  function handleCancel() {
    if (savingId) return;
    setPending(null);
  }

  const subtitle = myToday
    ? `currently ${myToday.current.label} — tap to change`
    : 'pick what fits right now';

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="log mood" subtitle={subtitle} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        {myToday && (
          <View
            className="flex-row items-center gap-3 self-start rounded-[22px] border border-hum-secondary/40 bg-hum-card px-3.5 py-3"
            style={cardShadow}
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-hum-secondary/18">
              <Text className="text-[20px]" allowFontScaling={false}>
                {myToday.current.emoji}
              </Text>
            </View>
            <View className="gap-y-0.5 pr-2">
              <Text
                className="text-[11px] font-light text-hum-dim"
                maxFontSizeMultiplier={1.2}
              >
                right now
              </Text>
              <Text
                className="text-[15px] font-medium leading-[20px] tracking-tight text-hum-text"
                maxFontSizeMultiplier={1.25}
              >
                {myToday.current.label}
              </Text>
            </View>
          </View>
        )}
        <MoodGrid currentId={currentId} savingId={savingId} onSelect={handleSelect} />
      </ScrollView>

      <MoodConfirmModal
        visible={!!pending}
        current={currentSticker}
        next={pending}
        saving={!!savingId}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}
