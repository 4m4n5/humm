import type { ViewStyle } from 'react-native';

/**
 * UI rhythm (NativeWind): primary card chrome uses `border-hum-border/18` and `rounded-[22px]` (`Card`).
 * Dense lists and awards rows use `border-hum-border/18` with `rounded-[18px]`–`rounded-[20px]`.
 */

/**
 * Extra top inset below the safe area for `ScreenTitle` / `ScreenHeader`.
 * 28pt mirrors the Apple HIG large-title navigation rhythm — enough to
 * breathe without wasting vertical real estate.
 */
export const HEADER_BLOCK_PADDING_TOP = 28;

/**
 * Auth sign-in / sign-up / link-partner — top inset below safe area (aligned with header rhythm, slightly more air than tabs).
 */
export const AUTH_SCREEN_PADDING_TOP = HEADER_BLOCK_PADDING_TOP + 8;

/** Centered modal sheets (XP, badges, season complete). */
export const MODAL_SHEET_PADDING_H = 28;
export const MODAL_SHEET_PADDING_V = 36;

/**
 * Default scroll content insets for tab roots and stack flows.
 * Horizontal 24px matches ScreenHeader / ScreenTitle (px-6) rhythm.
 * Bottom padding is breathing room above the scroll end, not tab-bar clearance (tabs sit outside the scroll).
 * Floating UI above the tab bar should use `@/constants/tabBar`.
 */
export const scrollContentStandard: ViewStyle = {
  paddingHorizontal: 24,
  paddingTop: 4,
  paddingBottom: 36,
  gap: 20,
};

/** Long pages with a fixed bottom primary action (e.g. nominate / add story). */
export const scrollContentWithBottomCTA: ViewStyle = {
  paddingHorizontal: 24,
  paddingTop: 4,
  paddingBottom: 120,
  gap: 20,
};

/**
 * FlatList / SectionList insets — no `gap` (gap would space every row).
 * `paddingTop` stays slightly larger than scroll flows because the list has no `ScreenTitle` inset.
 */
export const listContentStandard: ViewStyle = {
  paddingHorizontal: 24,
  paddingTop: 8,
  paddingBottom: 36,
};
