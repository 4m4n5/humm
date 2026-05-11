import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { useAuthStore } from '@/lib/stores/authStore';
import { usePartnerName } from '@/lib/usePartnerName';
import { useMoodStore } from '@/lib/stores/moodStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { MoodHomeRow } from '@/components/mood/MoodHomeRow';
import { Card, type CardTone } from '@/components/shared/Card';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { theme } from '@/constants/theme';
import { scrollContentStandard } from '@/constants/screenLayout';
import { HEADER_BLOCK_PADDING_TOP } from '@/constants/screenLayout';

// ─── time-aware greeting ────────────────────────────────────────────────────

function useTimeGreeting(displayName: string): string {
  const hour = new Date().getHours();
  const first = displayName.split(' ')[0] ?? displayName;
  if (hour >= 5 && hour < 12) return `good morning, ${first}`;
  if (hour >= 12 && hour < 17) return `good afternoon, ${first}`;
  if (hour >= 17 && hour < 22) return `good evening, ${first}`;
  return `hey, ${first}`;
}

// ─── partner presence ───────────────────────────────────────────────────────

type PresenceLevel = 'online' | 'recent' | 'away' | 'gone' | 'off';

function usePartnerPresence(): PresenceLevel {
  const lastActiveAt = useNominationsStore((s) => s.partnerProfile?.lastActiveAt);
  return useMemo(() => {
    if (!lastActiveAt) return 'off';
    const agoMs = Date.now() - lastActiveAt.toMillis();
    const agoMin = agoMs / 60_000;
    if (agoMin < 5) return 'online';
    if (agoMin < 30) return 'recent';
    if (agoMin < 360) return 'away';
    return 'off';
  }, [lastActiveAt]);
}

const PRESENCE_COLORS: Record<PresenceLevel, string> = {
  online: '#4ADE80',
  recent: '#6EE7A0',
  away: '#475569',
  gone: '#334155',
  off: 'transparent',
};

function PresenceDot({ level }: { level: PresenceLevel }) {
  const opacity = useSharedValue(level === 'online' ? 0.9 : 0.6);

  React.useEffect(() => {
    if (level === 'online') {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: ReduceMotion.Never,
          }),
          withTiming(0.55, {
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: ReduceMotion.Never,
          }),
        ),
        -1,
        false,
      );
    } else {
      opacity.value = withTiming(level === 'off' ? 0 : level === 'recent' ? 0.7 : 0.35, {
        duration: 600,
        reduceMotion: ReduceMotion.Never,
      });
    }
  }, [level, opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (level === 'off') return null;

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: PRESENCE_COLORS[level],
        },
        animStyle,
      ]}
      accessibilityLabel={
        level === 'online'
          ? 'partner is active now'
          : level === 'recent'
            ? 'partner was here recently'
            : 'partner was here a while ago'
      }
    />
  );
}

// ─── greeting + partner-presence subtitle ───────────────────────────────────

/**
 * Large-title-with-subtitle pattern, after iOS 17 `UINavigationItem.subtitle`
 * and M3 `LargeFlexibleTopAppBar.subtitle`. The greeting is the large title;
 * the partner-presence row is the subtitle. Both live inside ONE header
 * block whose **total flow height = 98pt**, byte-equivalent to `ScreenTitle`,
 * so the home tab's first card aligns to the same Y as every other tab's
 * first card.
 *
 * Math:
 *   no subtitle:  paddingTop 28 + greeting 42 + paddingBottom 28          = 98
 *   w/ subtitle:  paddingTop 28 + greeting 42 + mt 6 + row 16 + padBot 6  = 98
 *
 * The bottom padding compresses from 28→6 when the subtitle is present —
 * the canonical iOS 17 / M3 spec: the subtitle row occupies part of the
 * title-area height, it does not push content downward. Per Slack/Discord
 * canon the presence dot is anchored to the partner's first name on the
 * SAME row, so the dot reads as the partner's status, not the user's.
 *
 * Sources: Apple HIG `UINavigationItem` —
 *   https://developer.apple.com/documentation/uikit/uinavigationitem
 * M3 LargeFlexibleTopAppBar —
 *   https://m3.material.io/components/app-bars/overview
 * Slack §Presence — https://slack.com/help/articles/4412421674259
 */
function GreetingBlock({
  displayName,
  partnerFirst,
  partnerLinked,
}: {
  displayName: string;
  partnerFirst: string;
  partnerLinked: boolean;
}) {
  const greeting = useTimeGreeting(displayName);
  const presence = usePartnerPresence();
  const showSubtitle = partnerLinked && presence !== 'off';

  return (
    <View
      style={{
        paddingTop: HEADER_BLOCK_PADDING_TOP,
        paddingBottom: showSubtitle ? 6 : 28,
      }}
    >
      <Text
        className="text-[36px] font-extralight leading-[42px] tracking-[-0.025em] text-hum-text"
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        ellipsizeMode="tail"
        accessibilityLabel={greeting}
      >
        {greeting}
      </Text>
      {showSubtitle && (
        <View className="mt-1.5 flex-row items-center gap-x-2">
          <PresenceDot level={presence} />
          <Text
            className="text-[13px] font-light leading-[16px] tracking-[-0.01em] text-hum-dim"
            numberOfLines={1}
            maxFontSizeMultiplier={1.25}
            accessibilityLabel={`${partnerFirst}, ${presence === 'online' ? 'active now' : presence === 'recent' ? 'recently active' : 'active earlier'}`}
          >
            {partnerFirst}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── tile grid ──────────────────────────────────────────────────────────────

type FeatureTile = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  href: Href;
  a11y: string;
  tone: CardTone;
  iconBgClass: string;
};

const MAIN_TILES: FeatureTile[] = [
  {
    key: 'decide',
    icon: 'sparkles-outline',
    iconColor: theme.spark,
    title: 'decide',
    href: '/decide',
    a11y: 'decide',
    tone: 'spark',
    iconBgClass: 'bg-hum-spark/22',
  },
  {
    key: 'habits',
    icon: 'checkbox-outline',
    iconColor: theme.sage,
    title: 'habits',
    href: '/habits',
    a11y: 'habits',
    tone: 'sage',
    iconBgClass: 'bg-hum-sage/22',
  },
  {
    key: 'reasons',
    icon: 'heart-outline',
    iconColor: theme.crimson,
    title: 'reasons',
    href: '/reasons',
    a11y: 'reasons',
    tone: 'crimson',
    iconBgClass: 'bg-hum-crimson/22',
  },
  {
    key: 'awards',
    icon: 'trophy-outline',
    iconColor: theme.gold,
    title: 'awards',
    href: '/awards',
    a11y: 'awards',
    tone: 'gold',
    iconBgClass: 'bg-hum-gold/22',
  },
];

function TileGrid() {
  const rows: FeatureTile[][] = [
    [MAIN_TILES[0]!, MAIN_TILES[1]!],
    [MAIN_TILES[2]!, MAIN_TILES[3]!],
  ];

  return (
    <View className="gap-3">
      {rows.map((pair) => (
        <View key={pair.map((p) => p.key).join('-')} className="flex-row gap-3">
          {pair.map((t) => (
            <Card
              key={t.key}
              pressable
              tone={t.tone}
              tier="bold"
              tonalTint={t.tone}
              topHighlight
              padding="standard"
              onPress={() => router.push(t.href)}
              accessibilityLabel={t.a11y}
              className="h-[140px] flex-1 justify-between"
            >
              <View
                className={`h-11 w-11 items-center justify-center rounded-xl ${t.iconBgClass}`}
              >
                <Ionicons name={t.icon} size={20} color={t.iconColor} />
              </View>
              <Text
                className="text-[17px] font-medium leading-[22px] tracking-[-0.01em] text-hum-text"
                maxFontSizeMultiplier={1.3}
              >
                {t.title}
              </Text>
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { profile } = useAuthStore();
  const partnerName = usePartnerName();
  const myToday = useMoodStore((s) => s.myToday);
  const partnerToday = useMoodStore((s) => s.partnerToday);

  const coupleId = profile?.coupleId ?? '';
  const partnerId = profile?.partnerId ?? '';
  const myFirst = (profile?.displayName ?? 'you').split(' ')[0] ?? 'you';
  const partnerFirst = partnerName.split(' ')[0] ?? 'partner';
  const partnerLinked = !!partnerId && !!coupleId;

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="primary" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <GreetingBlock
          displayName={profile?.displayName ?? 'you'}
          partnerFirst={partnerFirst}
          partnerLinked={partnerLinked}
        />

        {partnerLinked && (
          <Card
            pressable
            tone="bloom"
            tier="bold"
            tonalTint="bloom"
            topHighlight
            padding="standard"
            onPress={() => router.push('/mood')}
            accessibilityLabel="open mood"
            accessibilityHint="see history and check-ins"
            className="gap-y-4"
          >
            <View className="flex-row items-center gap-x-3">
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hum-bloom/22">
                <Ionicons name="heart-half-outline" size={20} color={theme.bloom} />
              </View>
              <Text
                className="min-w-0 flex-1 text-[17px] font-medium leading-[22px] tracking-[-0.01em] text-hum-text"
                maxFontSizeMultiplier={1.3}
              >
                mood
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.dim} style={{ opacity: 0.5 }} />
            </View>
            <MoodHomeRow
              myEntry={myToday}
              partnerEntry={partnerToday}
              myLabel={myFirst}
              partnerLabel={partnerFirst}
            />
          </Card>
        )}

        <TileGrid />

        <Card
          pressable
          tone="primary"
          tier="bold"
          tonalTint="primary"
          topHighlight
          padding="list-row"
          onPress={() => router.push('/profile')}
          accessibilityLabel="profile and settings"
          accessibilityHint="xp, badges, and relationship cred"
          className="flex-row items-center gap-x-3"
        >
          <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hum-primary/22">
            <Ionicons name="person-outline" size={20} color={theme.primary} />
          </View>
          <Text
            className="min-w-0 flex-1 text-[17px] font-medium leading-[22px] tracking-[-0.01em] text-hum-text"
            maxFontSizeMultiplier={1.3}
          >
            you
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.dim}
            style={{ opacity: 0.5 }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
