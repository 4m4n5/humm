import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { updateUserProfile } from '@/lib/firestore/users';

function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

/**
 * Saves Expo push token to `users/{uid}.fcmToken` for future server-driven pushes
 * (Cloud Functions + Expo Push API or FCM). Safe no-op on web, denied permission,
 * missing EAS projectId, or simulator / Expo Go limitations.
 */
export async function registerExpoPushToken(uid: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const projectId = resolveProjectId();
    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    if (!token) return;

    await updateUserProfile(uid, { fcmToken: token });
  } catch (e) {
    console.warn('[humm] push token registration skipped:', e);
  }
}
