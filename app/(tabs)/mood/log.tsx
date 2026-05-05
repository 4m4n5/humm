import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { useAuthStore } from '@/lib/stores/authStore';
import { useMoodStore } from '@/lib/stores/moodStore';
import { upsertMoodEntry } from '@/lib/firestore/moodEntries';
import { afterMoodEntryWritten } from '@/lib/gamificationTriggers';
import { hapticSuccess } from '@/lib/haptics';
import { MoodGrid } from '@/components/mood/MoodGrid';
import { scrollContentStandard } from '@/constants/screenLayout';
import type { MoodStickerOption } from '@/types';

export default function MoodLogScreen() {
  const { profile } = useAuthStore();
  const myToday = useMoodStore((s) => s.myToday);
  const [savingId, setSavingId] = useState<string | null>(null);

  const currentId = myToday?.current.stickerId ?? null;
  const coupleId = profile?.coupleId ?? '';
  const myUid = profile?.uid ?? '';

  async function handleSelect(sticker: MoodStickerOption) {
    if (!coupleId || !myUid || savingId) return;
    setSavingId(sticker.id);
    try {
      const { isFirstSaveToday, entry } = await upsertMoodEntry(coupleId, myUid, sticker);
      await afterMoodEntryWritten(
        myUid,
        coupleId,
        entry.dayKey,
        sticker.id,
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
    } finally {
      setSavingId(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title="log mood" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <MoodGrid currentId={currentId} savingId={savingId} onSelect={handleSelect} />
      </ScrollView>
    </SafeAreaView>
  );
}
