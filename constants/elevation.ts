import { Platform, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

/** Hairline depth for cards — barely lifts off the canvas. */
export const cardShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  android: {
    elevation: 2,
  },
  default: {},
}) ?? {};

/** Primary CTA — tight, low-contrast lift (no heavy halo). */
export const primaryButtonShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
  },
  android: {
    elevation: 2,
  },
  default: {},
}) ?? {};
