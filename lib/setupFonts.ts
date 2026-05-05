import React from 'react';
import { Text, TextInput, StyleSheet, type TextStyle } from 'react-native';

/**
 * Maps RN `fontWeight` values to the corresponding Inter PostScript family.
 * NativeWind compiles `font-light`, `font-medium`, etc. into numeric
 * `fontWeight` values (e.g. `'300'`, `'500'`), so this lookup is what
 * actually picks the right Inter file for every Text in the app.
 */
const WEIGHT_TO_FAMILY: Record<string, string> = {
  '100': 'Inter_300Light',
  '200': 'Inter_200ExtraLight',
  '300': 'Inter_300Light',
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_700Bold',
  '900': 'Inter_700Bold',
  normal: 'Inter_400Regular',
  bold: 'Inter_700Bold',
};

/**
 * One stable style object per weight. Returning the same reference on every
 * render avoids "style identity changed" cascades in libraries that compare
 * styles by reference (e.g. NativeWind's CssInterop).
 */
const FAMILY_STYLE_CACHE: Record<string, { fontFamily: string }> = {};
function familyStyleFor(weight: string): { fontFamily: string } {
  let cached = FAMILY_STYLE_CACHE[weight];
  if (!cached) {
    cached = { fontFamily: WEIGHT_TO_FAMILY[weight] ?? 'Inter_400Regular' };
    FAMILY_STYLE_CACHE[weight] = cached;
  }
  return cached;
}

function flattenStyle(style: unknown): TextStyle {
  if (!style) return {};
  return (StyleSheet.flatten(style as never) ?? {}) as TextStyle;
}

let applied = false;

/**
 * Wraps RN's `Text` and `TextInput` so every text node in the app picks the
 * matching Inter weight without per-call edits. Caller-supplied `fontFamily`
 * always wins (e.g. tabular-nums or monospace overrides). Wrapped in
 * try/catch so a render-time failure can never block UI — we always fall
 * back to the original render.
 *
 * Idempotent — safe to call from app boot.
 */
export function applyInterToTextDefaults() {
  if (applied) return;
  applied = true;

  patchComponent(Text);
  patchComponent(TextInput);
}

function patchComponent(Component: typeof Text | typeof TextInput) {
  const target = Component as unknown as {
    render?: (...args: unknown[]) => React.ReactElement;
  };
  const originalRender = target.render;
  if (typeof originalRender !== 'function') return;

  target.render = function patchedRender(...args: unknown[]) {
    const result = originalRender.apply(this, args);
    try {
      if (!result || !React.isValidElement(result)) return result;
      const props = (result.props ?? {}) as { style?: unknown };
      const flat = flattenStyle(props.style);
      if (flat.fontFamily) return result;
      const weight = flat.fontWeight == null ? '400' : String(flat.fontWeight);
      const familyStyle = familyStyleFor(weight);
      return React.cloneElement(result, {
        style: [familyStyle, props.style],
      } as never);
    } catch {
      // Never let font injection block the UI — fall back to original.
      return result;
    }
  };
}
