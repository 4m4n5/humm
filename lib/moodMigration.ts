import { getMoodStickerById } from '@/constants/moodStickers';
import { upsertMoodEntry } from '@/lib/firestore/moodEntries';
import { updateUserProfile } from '@/lib/firestore/users';
import { useUiPreferencesStore } from '@/lib/stores/uiPreferencesStore';
import type { UserProfile } from '@/types';

/**
 * One-shot migration: if the user still has a legacy `moodSticker` on their
 * profile, carry it forward as today's MoodEntry, then strip the legacy fields.
 * Runs once per device (gated by `moodMigrated` in uiPreferencesStore).
 */
export async function migrateLegacyMoodSticker(profile: UserProfile): Promise<void> {
  if (useUiPreferencesStore.getState().moodMigrated) return;
  if (!profile.moodSticker || !profile.coupleId) {
    useUiPreferencesStore.getState().setMoodMigrated(true);
    return;
  }

  const sticker = getMoodStickerById(profile.moodSticker.id);
  if (sticker) {
    try {
      await upsertMoodEntry(profile.coupleId, profile.uid, sticker);
    } catch (e) {
      console.warn('[moodMigration] upsertMoodEntry failed:', e);
    }
  }

  try {
    await updateUserProfile(profile.uid, {
      moodSticker: null,
      moodUpdateCount: 0,
    } as Partial<UserProfile>);
  } catch (e) {
    console.warn('[moodMigration] strip legacy fields failed:', e);
  }

  useUiPreferencesStore.getState().setMoodMigrated(true);
}
