import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Ceremony } from '@/types';

let handlerSet = false;

/**
 * Register foreground behavior once (required for local notifications to show while app is open).
 */
export function ensureNotificationHandler(): void {
  if (Platform.OS === 'web') return;
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: Platform.OS === 'android',
      shouldSetBadge: false,
    }),
  });
}

const PREFIX = 'humtum-ceremony-';

export async function cancelAllCeremonyReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const p of pending) {
    if (p.identifier.startsWith(PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(p.identifier);
    }
  }
}

/**
 * Request OS permission; returns whether notifications are allowed.
 */
export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  ensureNotificationHandler();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule up to two local reminders before `periodEnd`: when the alignment window starts (~14d) and final days (~3d).
 */
export async function scheduleCeremonySeasonReminders(ceremony: Ceremony): Promise<void> {
  if (Platform.OS === 'web') return;
  ensureNotificationHandler();
  await cancelAllCeremonyReminders();

  if (ceremony.status === 'complete') return;

  const end = ceremony.periodEnd?.toDate?.();
  if (!end) return;
  const now = new Date();
  if (end.getTime() <= now.getTime()) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ceremony', {
      name: 'Award season',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const d14 = new Date(end);
  d14.setDate(d14.getDate() - 14);
  const d3 = new Date(end);
  d3.setDate(d3.getDate() - 3);

  const items: { id: string; date: Date; body: string }[] = [];
  if (d14.getTime() > now.getTime()) {
    items.push({
      id: `${PREFIX}${ceremony.id}-14d`,
      date: d14,
      body: 'alignment window started — finish nominations and sync picks together',
    });
  }
  if (d3.getTime() > now.getTime()) {
    items.push({
      id: `${PREFIX}${ceremony.id}-3d`,
      date: d3,
      body: 'three days until the nomination window closes',
    });
  }

  for (const t of items) {
    await Notifications.scheduleNotificationAsync({
      identifier: t.id,
      content: {
        title: 'Hum · awards',
        body: t.body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: t.date,
        channelId: Platform.OS === 'android' ? 'ceremony' : undefined,
      },
    });
  }
}
