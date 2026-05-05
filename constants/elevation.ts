import { Platform, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

/** Card depth — soft, grounded lift. Subtle but felt. */
export const cardShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  android: {
    elevation: 3,
  },
  default: {},
}) ?? {};

/** Primary CTA — warm, anchored glow. Reads as "primary" without shouting. */
export const primaryButtonShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  android: {
    elevation: 3,
  },
  default: {},
}) ?? {};
