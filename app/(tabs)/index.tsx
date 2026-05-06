import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { router, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/stores/authStore';
import { usePartnerName } from '@/lib/usePartnerName';
import { useMoodStore } from '@/lib/stores/moodStore';
import { MoodHomeRow } from '@/components/mood/MoodHomeRow';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { theme } from '@/constants/theme';
import { cardShadow } from '@/constants/elevation';
import { scrollContentStandard } from '@/constants/screenLayout';

type FeatureTile = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  href: Href;
  a11y: string;
  borderClass: string;
  iconBgClass: string;
};

/**
 * Canonical feature order across the app: mood → decide → habits → reasons → awards.
 * Mood lives in the hero card above this grid; the four feature tiles below
 * follow the remaining sequence so it matches the bottom ribbon and the
 * `relationship cred` panel on /you.
 */
const MAIN_TILES: FeatureTile[] = [
  {
    key: 'decide',
    icon: 'sparkles-outline',
    iconColor: theme.spark,
    title: 'decide',
    href: '/decide',
    a11y: 'decide',
    borderClass: 'border-hum-spark/35',
    iconBgClass: 'bg-hum-spark/14',
  },
  {
    key: 'habits',
    icon: 'checkbox-outline',
    iconColor: theme.sage,
    title: 'habits',
    href: '/habits',
    a11y: 'habits',
    borderClass: 'border-hum-sage/35',
    iconBgClass: 'bg-hum-sage/14',
  },
  {
    key: 'reasons',
    icon: 'heart-outline',
    iconColor: theme.crimson,
    title: 'reasons',
    href: '/reasons',
    a11y: 'reasons',
    borderClass: 'border-hum-crimson/35',
    iconBgClass: 'bg-hum-crimson/14',
  },
  {
    key: 'awards',
    icon: 'trophy-outline',
    iconColor: theme.gold,
    title: 'awards',
    href: '/awards',
    a11y: 'awards',
    borderClass: 'border-hum-gold/35',
    iconBgClass: 'bg-hum-gold/14',
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
            <TouchableOpacity
              key={t.key}
              className={`h-[140px] flex-1 justify-between rounded-[22px] border bg-hum-card p-5 active:opacity-90 ${t.borderClass}`}
              style={cardShadow}
              onPress={() => router.push(t.href)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={t.a11y}
            >
              <View
                className={`h-12 w-12 items-center justify-center rounded-2xl ${t.iconBgClass}`}
              >
                <Ionicons name={t.icon} size={22} color={t.iconColor} />
              </View>
              <Text
                className="text-[17px] font-medium leading-[22px] tracking-[-0.01em] text-hum-text"
                maxFontSizeMultiplier={1.3}
              >
                {t.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

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
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle
          title={profile?.displayName ?? 'hey you'}
          titleNumberOfLines={1}
        />

        {partnerLinked && (
          <Pressable
            onPress={() => router.push('/mood')}
            className="gap-y-4 rounded-[22px] border border-hum-bloom/35 bg-hum-card px-5 py-5 active:opacity-88"
            style={cardShadow}
            accessibilityRole="button"
            accessibilityLabel="open mood"
            accessibilityHint="see history and check-ins"
          >
            <View className="flex-row items-center gap-x-3">
              <View className="h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-hum-bloom/14">
                <Ionicons name="heart-half-outline" size={22} color={theme.bloom} />
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
          </Pressable>
        )}

        <TileGrid />

        <Pressable
          onPress={() => router.push('/profile')}
          className="flex-row items-center gap-x-3 rounded-[22px] border border-hum-primary/35 bg-hum-card px-5 py-4 active:opacity-88"
          style={cardShadow}
          accessibilityRole="button"
          accessibilityLabel="profile and settings"
          accessibilityHint="xp, badges, and relationship cred"
        >
          <View className="h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-hum-primary/14">
            <Ionicons name="person-outline" size={22} color={theme.primary} />
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
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
