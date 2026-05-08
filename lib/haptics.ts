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

/**
 * Apple HIG: `selectionAsync` is the dedicated generator for picker-like
 * changes (segmented control, wheel pickers, scrubbers). Use this for the
 * shuffle's per-tick "spotlight moved" feedback rather than `impactLight`,
 * which is reserved for tactile collisions/landings.
 */
export function hapticSelection() {
  return safe(() => Haptics.selectionAsync());
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
