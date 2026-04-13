import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

async function safe(fn: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  try {
    await fn();
  } catch {
    /* simulator or unsupported */
  }
}

export function hapticLight() {
  return safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticMedium() {
  return safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticSuccess() {
  return safe(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

export function hapticWarning() {
  return safe(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  );
}
