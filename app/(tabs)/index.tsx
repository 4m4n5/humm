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
import { scrollContentStandard } from '@/constants/screenLayout';
import { cardShadow } from '@/constants/elevation';

type FeatureTile = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  blurb: string;
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
    iconColor: theme.primary,
    title: 'decide',
    blurb: 'spin or battle',
    href: '/decide',
    a11y: 'decide — quick spin or battle mode',
    borderClass: 'border-hum-primary/20',
    iconBgClass: 'bg-hum-primary/12',
  },
  {
    key: 'habits',
    icon: 'checkbox-outline',
    iconColor: theme.secondary,
    title: 'habits',
    blurb: 'small wins, same rhythm',
    href: '/habits',
    a11y: 'habits — daily and weekly check-ins',
    borderClass: 'border-hum-secondary/20',
    iconBgClass: 'bg-hum-secondary/12',
  },
  {
    key: 'reasons',
    icon: 'heart-outline',
    iconColor: theme.petal,
    title: 'reasons',
    blurb: 'write one, read three',
    href: '/reasons',
    a11y: 'reasons — write one, read three',
    borderClass: 'border-hum-petal/20',
    iconBgClass: 'bg-hum-petal/12',
  },
  {
    key: 'awards',
    icon: 'trophy-outline',
    iconColor: theme.gold,
    title: 'awards',
    blurb: 'nominate, align, cheer',
    href: '/awards',
    a11y: 'awards — nominate, align, cheer',
    borderClass: 'border-hum-gold/20',
    iconBgClass: 'bg-hum-gold/12',
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
              className={`min-h-[152px] flex-1 justify-between gap-y-3 rounded-[24px] border bg-hum-card p-4 active:opacity-88 ${t.borderClass}`}
              style={cardShadow}
              onPress={() => router.push(t.href)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={t.a11y}
            >
              <View
                className={`h-11 w-11 items-center justify-center rounded-2xl ${t.iconBgClass}`}
              >
                <Ionicons name={t.icon} size={20} color={t.iconColor} />
              </View>
              <View className="min-w-0 flex-1 gap-y-1">
                <Text
                  className="text-[15px] font-medium leading-[20px] tracking-tight text-hum-text"
                  maxFontSizeMultiplier={1.3}
                >
                  {t.title}
                </Text>
                <Text
                  className="text-[12px] font-light leading-[18px] text-hum-muted"
                  maxFontSizeMultiplier={1.35}
                >
                  {t.blurb}
                </Text>
              </View>
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
          subtitle="choose where to start"
          titleNumberOfLines={1}
        />

        {partnerLinked && (
          <Pressable
            onPress={() => router.push('/mood')}
            className="gap-y-4 rounded-[24px] border border-hum-petal/22 bg-hum-card p-5 active:opacity-95"
            style={cardShadow}
            accessibilityRole="button"
            accessibilityLabel="open mood"
            accessibilityHint="see history and check-ins"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-x-2.5">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-hum-petal/12">
                  <Ionicons name="heart-half-outline" size={15} color={theme.petal} />
                </View>
                <View className="gap-y-0.5">
                  <Text
                    className="text-[14px] font-medium leading-[18px] tracking-tight text-hum-text"
                    maxFontSizeMultiplier={1.25}
                  >
                    mood
                  </Text>
                  <Text
                    className="text-[11px] font-light leading-[14px] text-hum-muted"
                    maxFontSizeMultiplier={1.3}
                  >
                    today, together
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.dim}
                style={{ opacity: 0.55 }}
              />
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

        <TouchableOpacity
          className="flex-row items-center gap-x-3 rounded-[18px] border border-hum-border/22 bg-hum-card/85 px-4 py-3 active:opacity-88"
          onPress={() => router.push('/profile')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="profile and settings"
        >
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-hum-primary/10">
            <Ionicons name="person-outline" size={16} color={theme.primary} />
          </View>
          <View className="min-w-0 flex-1 gap-y-0.5">
            <Text
              className="text-[13.5px] font-medium leading-[18px] tracking-tight text-hum-text"
              maxFontSizeMultiplier={1.25}
            >
              you
            </Text>
            <Text
              className="text-[11px] font-light leading-[15px] text-hum-muted"
              maxFontSizeMultiplier={1.3}
            >
              xp · badges · cred
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={theme.dim} style={{ opacity: 0.55 }} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
