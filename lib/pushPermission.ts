import * as Notifications from 'expo-notifications';
import { useUiPreferencesStore } from '@/lib/stores/uiPreferencesStore';
import { registerExpoPushToken } from '@/lib/registerExpoPushToken';

/**
 * Request push permission once, gated by the `pushPromptShown` flag so users
 * are only interrupted a single time. Returns true if permission is granted.
 */
export async function promptPushPermissionOnce(uid: string): Promise<boolean> {
  if (useUiPreferencesStore.getState().pushPromptShown) return false;
  useUiPreferencesStore.getState().setPushPromptShown(true);

  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  if (status === 'denied') return false;

  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  if (newStatus === 'granted') {
    await registerExpoPushToken(uid);
    return true;
  }
  return false;
}
