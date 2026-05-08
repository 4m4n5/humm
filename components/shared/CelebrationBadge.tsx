import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withSequence,
  ReduceMotion,
} from 'react-native-reanimated';

type Props = {
  emoji: string;
  label: string;
  borderColorClass?: string;
};

export function CelebrationBadge({
  emoji,
  label,
  borderColorClass = 'border-hum-primary/40',
}: Props) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      160,
      withSpring(1, {
        damping: 8,
        stiffness: 200,
        mass: 0.8,
        reduceMotion: ReduceMotion.Never,
      }),
    );
    opacity.value = withDelay(
      160,
      withSequence(
        withTiming(1, { duration: 240, reduceMotion: ReduceMotion.Never }),
        withDelay(
          1300,
          withTiming(0, { duration: 500, reduceMotion: ReduceMotion.Never }),
        ),
      ),
    );
  }, [scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          alignSelf: 'center',
          top: '38%',
        },
        animStyle,
      ]}
      className={`items-center gap-1.5 rounded-3xl border ${borderColorClass} bg-hum-card/95 px-7 py-4`}
    >
      <Text className="text-[40px]" allowFontScaling={false}>
        {emoji}
      </Text>
      <Text
        className="text-[15px] font-medium tracking-tight text-hum-text"
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
    </Animated.View>
  );
}
