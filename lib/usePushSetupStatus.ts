import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/lib/stores/authStore';
import { registerExpoPushToken } from '@/lib/registerExpoPushToken';

/**
 * Composite push-setup state. Combines OS-level permission with whether we've
 * actually persisted a usable `fcmToken` on `users/{uid}` in Firestore. The
 * notification-settings screen renders the right repair button per state.
 *
 *   ok                   - permission granted AND token saved → notifications work
 *   needs-permission     - permission undetermined → tapping the button prompts
 *   permission-blocked   - permission denied → tapping the button opens OS settings
 *   needs-token          - permission granted but no token saved → tapping the button retries
 *   working-on-it        - mid-flight (after tap, before status flips)
 *   web                  - not applicable
 */
export type PushSetupState =
  | 'unknown'
  | 'ok'
  | 'needs-permission'
  | 'permission-blocked'
  | 'needs-token'
  | 'working-on-it'
  | 'web';

type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'undetermined';

export function usePushSetupStatus(): {
  state: PushSetupState;
  permission: PermissionStatus;
  hasToken: boolean;
  refresh: () => Promise<void>;
  /** One-button repair. Picks the right action for the current state. */
  repair: () => Promise<void>;
  /** Mid-flight UI flag (Repair tapped, not finished). */
  busy: boolean;
} {
  const profile = useAuthStore((s) => s.profile);
  const uid = profile?.uid ?? null;
  const hasToken = !!profile?.fcmToken;

  const [permission, setPermission] = useState<PermissionStatus>('unknown');
  const [busy, setBusy] = useState(false);

  const readPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermission('unknown');
      return;
    }
    const res = await Notifications.getPermissionsAsync();
    if (res.status === 'granted') setPermission('granted');
    else if (res.status === 'denied') setPermission('denied');
    else setPermission('undetermined');
  }, []);

  // Initial read + re-read on every app-foreground transition.
  // Foreground re-read is critical for the self-healing path: user goes to
  // OS Settings, toggles permission on, returns to the app — we pick up the
  // change automatically and re-attempt token registration.
  useEffect(() => {
    void readPermission();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void readPermission().then(() => {
          if (uid && !busy) {
            void registerExpoPushToken(uid).catch(() => undefined);
          }
        });
      }
    });
    return () => sub.remove();
    // intentionally only depends on uid — readPermission is stable, busy
    // would cause loops if included.
  }, [uid, readPermission]);

  // Derive the composite state.
  let state: PushSetupState;
  if (Platform.OS === 'web') state = 'web';
  else if (busy) state = 'working-on-it';
  else if (permission === 'unknown') state = 'unknown';
  else if (permission === 'undetermined') state = 'needs-permission';
  else if (permission === 'denied') state = 'permission-blocked';
  else if (permission === 'granted' && !hasToken) state = 'needs-token';
  else if (permission === 'granted' && hasToken) state = 'ok';
  else state = 'unknown';

  const refresh = useCallback(async () => {
    await readPermission();
    if (uid) await registerExpoPushToken(uid).catch(() => undefined);
  }, [readPermission, uid]);

  const repair = useCallback(async () => {
    if (Platform.OS === 'web' || !uid) return;
    setBusy(true);
    try {
      if (state === 'needs-permission' || state === 'unknown') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          await registerExpoPushToken(uid);
        }
      } else if (state === 'permission-blocked') {
        await Linking.openSettings();
      } else if (state === 'needs-token') {
        await registerExpoPushToken(uid);
      }
      await readPermission();
    } finally {
      setBusy(false);
    }
  }, [state, uid, readPermission]);

  return { state, permission, hasToken, refresh, repair, busy };
}
