import React, { useEffect } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { cardShadow } from '@/constants/elevation';
import { navVoice } from '@/constants/hummVoice';
import {
  M3_EMPHASIZED,
  REDUCE_MOTION_NEVER,
  SPRING_EXPRESSIVE_BLOOM,
  SPRING_EXPRESSIVE_SETTLE,
  SPRING_FAST_SPATIAL,
  TIMING_EXPRESSIVE_MS,
} from '@/lib/motion';

export type HabitCardVariant =
  | 'shared-daily'
  | 'shared-weekly'
  | 'personal-daily'
  | 'personal-weekly';

type Props = {
  variant: HabitCardVariant;
  emoji: string;
  title: string;
  myLabel: string;
  partnerLabel?: string;
  myChecked: boolean;
  partnerChecked?: boolean;
  inactive?: boolean;
  startsLabel?: string;
  onToggleMine: () => void;
  onDeletePress: () => void;
};

function initialOf(s: string): string {
  const t = s.trim();
  return (t.length ? t[0] : '?').toUpperCase();
}

function StartsChip({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full border border-hum-border/30 bg-hum-bg/40 px-2 py-0.5">
      <Ionicons name="calendar-outline" size={10} color={theme.dim} />
      <Text className="text-[10px] font-medium tabular-nums text-hum-dim" maxFontSizeMultiplier={1.25}>{label}</Text>
    </View>
  );
}

function ParticipantPill({
  label,
  checked,
  onPress,
  readOnly,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  readOnly: boolean;
}) {
  // Tap-bloom on the participant check disc when this person flips to done.
  // Suppressed for readOnly (partner) display so it only blooms for its
  // owner's actual interaction, not for arriving snapshots.
  const scale = useSharedValue(1);
  const prev = React.useRef<boolean | null>(null);
  useEffect(() => {
    if (prev.current === null) {
      prev.current = checked;
      return;
    }
    if (!readOnly && checked && prev.current === false) {
      cancelAnimation(scale);
      scale.value = withSequence(
        withSpring(1.18, { ...SPRING_EXPRESSIVE_BLOOM, reduceMotion: REDUCE_MOTION_NEVER }),
        withSpring(1, { ...SPRING_EXPRESSIVE_SETTLE, reduceMotion: REDUCE_MOTION_NEVER }),
      );
    }
    prev.current = checked;
  }, [checked, readOnly, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={readOnly ? undefined : onPress}
      disabled={readOnly}
      accessibilityRole={readOnly ? 'text' : 'checkbox'}
      accessibilityState={{ checked }}
      accessibilityLabel={`${label}${checked ? ' done' : ' not done'}`}
      className={`flex-1 flex-row items-center gap-2.5 rounded-[16px] border px-3 py-2.5 ${
        checked
          ? 'border-hum-primary/35 bg-hum-primary/10'
          : 'border-hum-border/18 bg-hum-bg/30'
      }`}
    >
      <Animated.View
        className={`h-[26px] w-[26px] items-center justify-center rounded-full ${
          checked
            ? 'bg-hum-primary/45'
            : 'border border-hum-border/25 bg-hum-card/50'
        }`}
        style={animStyle}
      >
        {checked ? (
          <Ionicons name="checkmark" size={13} color={theme.text} />
        ) : (
          <Text className="text-[11px] font-semibold text-hum-muted" maxFontSizeMultiplier={1.25}>
            {initialOf(label)}
          </Text>
        )}
      </Animated.View>
      <Text
        numberOfLines={1}
        className={`flex-1 text-[13px] tracking-[-0.01em] ${
          checked ? 'font-medium text-hum-text' : 'font-light text-hum-muted'
        }`}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AnimatedEmojiTile({ emoji, completed, bothJustCompleted }: {
  emoji: string;
  completed: boolean;
  bothJustCompleted: boolean;
}) {
  const bounce = useSharedValue(1);
  const glow = useSharedValue(0);
  /** null = not hydrated yet; skip animation on mount when already both-done */
  const prevBoth = React.useRef<boolean | null>(null);
  /** null = not hydrated; track to bloom on the first solo check */
  const prevCompleted = React.useRef<boolean | null>(null);

  useEffect(() => {
    if (prevBoth.current === null) {
      prevBoth.current = bothJustCompleted;
      return;
    }
    if (bothJustCompleted && prevBoth.current === false) {
      cancelAnimation(bounce);
      cancelAnimation(glow);
      bounce.value = 0.7;
      glow.value = 1;
      bounce.value = withSpring(1, {
        ...SPRING_EXPRESSIVE_BLOOM,
        reduceMotion: REDUCE_MOTION_NEVER,
      });
      glow.value = withTiming(0, {
        duration: TIMING_EXPRESSIVE_MS * 2.5, // 1200ms — sustained glow
        easing: Easing.out(Easing.quad),
      });
    }
    prevBoth.current = bothJustCompleted;
  }, [bothJustCompleted, bounce, glow]);

  // Solo tap-bloom: when this user toggles `completed` on, the emoji
  // springs out and back so even individual taps feel alive (the both-done
  // moment above stays the bigger celebration).
  useEffect(() => {
    if (prevCompleted.current === null) {
      prevCompleted.current = completed;
      return;
    }
    if (completed && prevCompleted.current === false && !bothJustCompleted) {
      cancelAnimation(bounce);
      bounce.value = withSequence(
        withSpring(1.22, { ...SPRING_EXPRESSIVE_BLOOM, reduceMotion: REDUCE_MOTION_NEVER }),
        withSpring(1, { ...SPRING_EXPRESSIVE_SETTLE, reduceMotion: REDUCE_MOTION_NEVER }),
      );
    }
    prevCompleted.current = completed;
  }, [completed, bothJustCompleted, bounce]);

  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounce.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.25]),
  }));

  return (
    <View className="relative">
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: 16,
            backgroundColor: theme.primary,
          },
          glowStyle,
        ]}
      />
      <Animated.View
        className={`h-10 w-10 items-center justify-center rounded-xl ${
          completed ? 'bg-hum-primary/18' : 'bg-hum-bg/55'
        }`}
        style={tileStyle}
      >
        <Text className="text-[20px]" allowFontScaling={false}>{emoji}</Text>
      </Animated.View>
    </View>
  );
}

function BloomingCheck({ checked }: { checked: boolean }) {
  const scale = useSharedValue(1);
  const prev = React.useRef<boolean | null>(null);

  useEffect(() => {
    if (prev.current === null) {
      prev.current = checked;
      return;
    }
    if (checked && prev.current === false) {
      cancelAnimation(scale);
      scale.value = withSequence(
        withSpring(1.18, { ...SPRING_EXPRESSIVE_BLOOM, reduceMotion: REDUCE_MOTION_NEVER }),
        withSpring(1, { ...SPRING_EXPRESSIVE_SETTLE, reduceMotion: REDUCE_MOTION_NEVER }),
      );
    }
    prev.current = checked;
  }, [checked, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      className={`h-[30px] w-[30px] items-center justify-center rounded-full ${
        checked
          ? 'bg-hum-primary/45'
          : 'border-[1.5px] border-hum-border/25 bg-hum-bg/35'
      }`}
      style={animStyle}
    >
      {checked ? <Ionicons name="checkmark" size={15} color={theme.text} /> : null}
    </Animated.View>
  );
}

function CardPulseWrapper({ children, pulse }: { children: React.ReactNode; pulse: boolean }) {
  const scale = useSharedValue(1);
  const prevPulse = React.useRef<boolean | null>(null);

  useEffect(() => {
    if (prevPulse.current === null) {
      prevPulse.current = pulse;
      return;
    }
    if (pulse && prevPulse.current === false) {
      cancelAnimation(scale);
      scale.value = 0.97;
      scale.value = withSpring(1, {
        ...SPRING_FAST_SPATIAL,
        reduceMotion: REDUCE_MOTION_NEVER,
      });
    }
    prevPulse.current = pulse;
  }, [pulse, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function HabitCard({
  variant,
  emoji,
  title,
  myLabel,
  partnerLabel,
  myChecked,
  partnerChecked,
  inactive,
  startsLabel,
  onToggleMine,
  onDeletePress,
}: Props) {
  const isShared = variant === 'shared-daily' || variant === 'shared-weekly';
  const isWeekly = variant === 'shared-weekly' || variant === 'personal-weekly';
  const both = isShared && myChecked && (partnerChecked ?? false);
  const completed = isShared ? both : myChecked;

  const handleToggle = () => {
    if (inactive) return;
    if (myChecked) {
      const t = isWeekly ? 'undo weekly check-in?' : "undo today's check-in?";
      const m = isWeekly
        ? 'you can check again before the week ends.'
        : 'you can check again any time today.';
      Alert.alert(t, m, [
        { text: navVoice.cancel, style: 'cancel' },
        {
          text: 'undo',
          style: 'destructive',
          onPress: () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleMine();
          },
        },
      ]);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleMine();
  };

  const cardBaseClass = `overflow-hidden rounded-[22px] border ${
    both
      ? 'border-hum-primary/45 bg-hum-card'
      : completed
        ? 'border-hum-primary/30 bg-hum-card'
        : 'border-hum-border/18 bg-hum-card'
  } ${inactive ? 'opacity-55' : ''}`;

  const titleStyle = {
    textDecorationLine: completed ? ('line-through' as const) : ('none' as const),
  };

  if (isShared) {
    return (
      <CardPulseWrapper pulse={both}>
        <View
          accessibilityLabel={`shared habit: ${title}`}
          className={cardBaseClass}
          style={cardShadow}
        >
          <View className="flex-row items-center gap-3 px-3.5 pt-3.5">
            <AnimatedEmojiTile emoji={emoji} completed={completed} bothJustCompleted={both} />
            <Text
              numberOfLines={1}
              className="flex-1 text-[15px] font-medium leading-[20px] tracking-tight text-hum-text"
              style={titleStyle}
              maxFontSizeMultiplier={1.3}
            >
              {title}
            </Text>
            {inactive && startsLabel ? <StartsChip label={startsLabel} /> : null}
            <Pressable
              onPress={onDeletePress}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`delete habit ${title}`}
              className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
            >
              <Ionicons name="trash-outline" size={17} color={theme.dim} style={{ opacity: 0.55 }} />
            </Pressable>
          </View>

          <View
            className="flex-row gap-2 px-3 pb-3.5 pt-2"
            style={{ direction: 'ltr' }}
          >
            <ParticipantPill
              label={myLabel}
              checked={myChecked}
              onPress={handleToggle}
              readOnly={!!inactive}
            />
            <ParticipantPill
              label={partnerLabel ?? 'partner'}
              checked={partnerChecked ?? false}
              onPress={() => {}}
              readOnly
            />
          </View>
        </View>
      </CardPulseWrapper>
    );
  }

  return (
    <View
      className={`${cardBaseClass} flex-row items-center gap-3 px-3.5 py-3`}
      style={cardShadow}
    >
      <Pressable
        onPress={inactive ? undefined : handleToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: myChecked, disabled: inactive }}
        accessibilityLabel={`habit: ${title}`}
        className="flex-1 flex-row items-center gap-3"
      >
        <AnimatedEmojiTile emoji={emoji} completed={completed} bothJustCompleted={false} />
        <Text
          numberOfLines={1}
          className="flex-1 text-[15px] font-medium leading-[20px] tracking-tight text-hum-text"
          style={titleStyle}
          maxFontSizeMultiplier={1.3}
        >
          {title}
        </Text>
        {inactive && startsLabel ? <StartsChip label={startsLabel} /> : null}
        <BloomingCheck checked={myChecked} />
      </Pressable>
      <Pressable
        onPress={onDeletePress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`delete habit ${title}`}
        className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
      >
        <Ionicons name="trash-outline" size={17} color={theme.dim} style={{ opacity: 0.55 }} />
      </Pressable>
    </View>
  );
}
