/**
 * Bottom tab bar metrics — keep in sync with `app/(tabs)/_layout.tsx`.
 * Inner band is 44px content + 10px top pad + 10px bottom pad = 64px; home indicator
 * adds to bottom padding and total height only.
 */
export const TAB_BAR_CONTENT_HEIGHT = 64;
export const TAB_BAR_PADDING_TOP = 10;
export const TAB_BAR_PADDING_BOTTOM_BASE = 10;

/** Total tab bar height including device bottom inset (home indicator / gesture bar). */
export function tabBarTotalHeight(bottomInset: number): number {
  return TAB_BAR_CONTENT_HEIGHT + bottomInset;
}

/** Gap between tab bar top edge and floating XP banner. */
export const XP_BANNER_ABOVE_TAB_GAP = 12;
