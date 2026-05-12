import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { updateUserProfile } from '@/lib/firestore/users';

function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

/**
 * Outcomes of a single registration attempt. Used by the settings screen to
 * decide what to show / what button action to expose.
 */
export type RegisterPushResult =
  | { status: 'web-noop' }
  | { status: 'permission-undetermined' }
  | { status: 'permission-denied' }
  | { status: 'token-empty' }
  | { status: 'error'; error: string }
  | { status: 'ok'; token: string };

/**
 * Saves Expo push token to `users/{uid}.fcmToken` for future server-driven pushes
 * (Cloud Functions + Expo Push API or FCM). Idempotent: safe to call repeatedly
 * on every app foreground / every auth state change. The returned `status`
 * tells callers what (if anything) needs the user's attention.
 */
export async function registerExpoPushToken(uid: string): Promise<RegisterPushResult> {
  if (Platform.OS === 'web') return { status: 'web-noop' };

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') {
      console.log('[Hum] push: permission undetermined, skipping silent registration');
      return { status: 'permission-undetermined' };
    }
    if (status !== 'granted') {
      console.log(`[Hum] push: permission not granted (status=${status}), skipping token registration`);
      return { status: 'permission-denied' };
    }

    const projectId = resolveProjectId();
    console.log(`[Hum] push: requesting Expo push token (projectId=${projectId ?? 'none'}, platform=${Platform.OS})`);
    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    if (!token) {
      console.warn('[Hum] push: getExpoPushTokenAsync returned empty token');
      return { status: 'token-empty' };
    }

    console.log(`[Hum] push: ✓ got token ${token.slice(0, 30)}… — saving to Firestore for uid=${uid}`);
    await updateUserProfile(uid, { fcmToken: token });
    return { status: 'ok', token };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn('[Hum] push token registration error:', message);
    return { status: 'error', error: message };
  }
}
