import React, { useEffect, useRef } from 'react';
import { Alert, Pressable, Text, TouchableOpacity, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { cardShadow } from '@/constants/elevation';

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
  onEditPress: () => void;
};

function initialOf(s: string): string {
  const t = s.trim();
  return (t.length ? t[0] : '?').toUpperCase();
}

function StartsChip({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full border border-hum-border/30 bg-hum-bg/40 px-2 py-0.5">
      <Ionicons name="calendar-outline" size={10} color={theme.dim} />
      <Text className="text-[10px] font-medium tabular-nums text-hum-dim">{label}</Text>
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
  return (
    <Pressable
      onPress={readOnly ? undefined : onPress}
      disabled={readOnly}
      accessibilityRole={readOnly ? 'text' : 'checkbox'}
      accessibilityState={{ checked }}
      accessibilityLabel={`${label}${checked ? ' done' : ' not done'}`}
      className={`flex-1 flex-row items-center gap-2 rounded-[18px] border px-2.5 py-2 ${
        checked
          ? 'border-hum-secondary/40 bg-hum-secondary/12'
          : 'border-hum-border/18 bg-hum-bg/40'
      }`}
    >
      <View
        className={`h-7 w-7 items-center justify-center rounded-full ${
          checked
            ? 'bg-hum-secondary/40'
            : 'border border-hum-border/30 bg-hum-card/50'
        }`}
      >
        {checked ? (
          <Ionicons name="checkmark" size={14} color={theme.text} />
        ) : (
          <Text className="text-[12px] font-semibold text-hum-muted">
            {initialOf(label)}
          </Text>
        )}
      </View>
      <Text
        numberOfLines={1}
        className={`flex-1 text-[13px] tracking-[-0.01em] ${
          checked ? 'font-medium text-hum-text' : 'font-light text-hum-muted'
        }`}
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
  const bounce = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  /** null = not hydrated yet; skip animation on mount when already both-done */
  const prevBoth = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevBoth.current === null) {
      prevBoth.current = bothJustCompleted;
      return;
    }
    if (bothJustCompleted && prevBoth.current === false) {
      bounce.setValue(0.7);
      glow.setValue(1);
      Animated.parallel([
        Animated.spring(bounce, {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevBoth.current = bothJustCompleted;
  }, [bothJustCompleted, bounce, glow]);

  return (
    <View className="relative">
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -4,
          left: -4,
          right: -4,
          bottom: -4,
          borderRadius: 16,
          backgroundColor: theme.secondary,
          opacity: Animated.multiply(glow, new Animated.Value(0.25)),
        }}
      />
      <Animated.View
        className={`h-10 w-10 items-center justify-center rounded-xl ${
          completed ? 'bg-hum-secondary/18' : 'bg-hum-bg/55'
        }`}
        style={{ transform: [{ scale: bounce }] }}
      >
        <Text className="text-[20px]" allowFontScaling={false}>{emoji}</Text>
      </Animated.View>
    </View>
  );
}

function CardPulseWrapper({ children, pulse }: { children: React.ReactNode; pulse: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevPulse = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevPulse.current === null) {
      prevPulse.current = pulse;
      return;
    }
    if (pulse && prevPulse.current === false) {
      scale.setValue(0.97);
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 160,
        useNativeDriver: true,
      }).start();
    }
    prevPulse.current = pulse;
  }, [pulse, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
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
  onEditPress,
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
        { text: 'cancel', style: 'cancel' },
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
      ? 'border-hum-secondary/45 bg-hum-card'
      : completed
        ? 'border-hum-secondary/30 bg-hum-card'
        : 'border-hum-border/18 bg-hum-card'
  } ${inactive ? 'opacity-55' : ''}`;

  const titleStyle = {
    textDecorationLine: completed ? ('line-through' as const) : ('none' as const),
  };

  if (isShared) {
    return (
      <CardPulseWrapper pulse={both}>
        <Pressable
          onLongPress={onEditPress}
          delayLongPress={420}
          accessibilityLabel={title}
          className={cardBaseClass}
          style={cardShadow}
        >
          <View className="flex-row items-center gap-3 px-3.5 pt-3.5">
            <AnimatedEmojiTile emoji={emoji} completed={completed} bothJustCompleted={both} />
            <Text
              numberOfLines={1}
              className="flex-1 text-[15px] font-medium leading-[20px] tracking-tight text-hum-text"
              style={titleStyle}
            >
              {title}
            </Text>
            {inactive && startsLabel ? <StartsChip label={startsLabel} /> : null}
            <TouchableOpacity
              onPress={onEditPress}
              hitSlop={10}
              accessibilityLabel="edit habit"
              className="h-8 w-8 items-center justify-center rounded-full"
            >
              <Ionicons name="ellipsis-horizontal" size={17} color={theme.dim} style={{ opacity: 0.45 }} />
            </TouchableOpacity>
          </View>

          <View
            className="flex-row gap-2 px-3 pb-3 pt-2.5"
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
        </Pressable>
      </CardPulseWrapper>
    );
  }

  return (
    <Pressable
      onPress={inactive ? undefined : handleToggle}
      onLongPress={onEditPress}
      delayLongPress={420}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: myChecked, disabled: inactive }}
      accessibilityLabel={title}
      className={`${cardBaseClass} flex-row items-center gap-3 px-3.5 py-3`}
      style={cardShadow}
    >
      <AnimatedEmojiTile emoji={emoji} completed={completed} bothJustCompleted={false} />
      <Text
        numberOfLines={1}
        className="flex-1 text-[15px] font-medium leading-[20px] tracking-tight text-hum-text"
        style={titleStyle}
      >
        {title}
      </Text>
      {inactive && startsLabel ? <StartsChip label={startsLabel} /> : null}
      <TouchableOpacity
        onPress={onEditPress}
        hitSlop={10}
        accessibilityLabel="edit habit"
        className="h-8 w-8 items-center justify-center rounded-full"
      >
        <Ionicons name="ellipsis-horizontal" size={17} color={theme.dim} style={{ opacity: 0.45 }} />
      </TouchableOpacity>
      <View
        className={`h-8 w-8 items-center justify-center rounded-full ${
          myChecked
            ? 'bg-hum-secondary/40'
            : 'border border-hum-border/30 bg-hum-bg/40'
        }`}
      >
        {myChecked ? <Ionicons name="checkmark" size={16} color={theme.text} /> : null}
      </View>
    </Pressable>
  );
}
