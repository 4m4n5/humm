import React, { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';

type Props = Omit<TextProps, 'children'> & {
  value: number;
  /** ms to animate from previous → next value. Default 600. */
  duration?: number;
  /** Optional formatter (e.g. `n => n.toLocaleString()`). Default: identity. */
  format?: (n: number) => string;
};

/**
 * Number that smoothly tweens to its next value with eased interpolation.
 *
 * Uses `requestAnimationFrame` rather than Reanimated because we want to
 * render the integer value as text on every frame (counters that morph the
 * actual digits, not the position/opacity of a pre-rendered number). For
 * single small counters (XP, streak, completion count) this is plenty cheap.
 *
 * Skips animation on first mount and when the difference is 0 to avoid
 * pointless reflows. The first non-zero update plays the tween (so the
 * counter "wakes up" naturally on screen entry once data arrives, instead
 * of suddenly snapping into place).
 */
export function AnimatedNumber({
  value,
  duration = 600,
  format,
  ...textProps
}: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const toRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fromRef.current = value;
      toRef.current = value;
      setDisplay(value);
      return;
    }

    if (value === toRef.current) return;

    fromRef.current = display;
    toRef.current = value;
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic — feels alive but settles softly
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(
        fromRef.current + (toRef.current - fromRef.current) * eased,
      );
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // We intentionally omit `display` from deps — it only seeds `from`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <Text {...textProps}>{format ? format(display) : display}</Text>;
}
