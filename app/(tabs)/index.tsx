import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
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

type FeatureTile = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  blurb: string;
  href: Href;
  a11y: string;
  borderClass: string;
};

const MAIN_TILES: FeatureTile[] = [
  {
    key: 'quick',
    icon: 'sparkles-outline',
    iconColor: theme.primary,
    title: 'quick spin',
    blurb: 'weighted pick',
    href: '/decide/quick-spin',
    a11y: 'quick spin — pick a category and spin',
    borderClass: 'border-hum-primary/20',
  },
  {
    key: 'battle',
    icon: 'git-compare-outline',
    iconColor: theme.secondary,
    title: 'battle',
    blurb: 'live bracket',
    href: '/decide/battle',
    a11y: 'battle mode — realtime bracket for two',
    borderClass: 'border-hum-secondary/20',
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
              className={`min-h-[156px] flex-1 justify-between gap-y-3 rounded-[24px] border bg-hum-card/95 p-4 active:opacity-88 ${t.borderClass}`}
              onPress={() => router.push(t.href)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={t.a11y}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-hum-bg/55">
                <Ionicons name={t.icon} size={21} color={t.iconColor} />
              </View>
              <View className="min-w-0 flex-1 gap-y-1">
                <Text className="text-[15px] font-medium leading-[20px] tracking-tight text-hum-text" maxFontSizeMultiplier={1.3}>
                  {t.title}
                </Text>
                <Text className="text-[12px] font-light leading-[17px] text-hum-muted" maxFontSizeMultiplier={1.35}>
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
  const initMood = useMoodStore((s) => s.init);

  const coupleId = profile?.coupleId ?? '';
  const myUid = profile?.uid ?? '';
  const partnerId = profile?.partnerId ?? '';
  const myFirst = (profile?.displayName ?? 'you').split(' ')[0] ?? 'you';
  const partnerFirst = partnerName.split(' ')[0] ?? 'partner';
  const partnerLinked = !!partnerId && !!coupleId;

  useEffect(() => {
    if (!coupleId || !myUid || !partnerId) return;
    return initMood(coupleId, myUid, partnerId);
  }, [coupleId, myUid, partnerId, initMood]);

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
          <MoodHomeRow
            myEntry={myToday}
            partnerEntry={partnerToday}
            myLabel={myFirst}
            partnerLabel={partnerFirst}
          />
        )}

        <TileGrid />

        <TouchableOpacity
          className="flex-row items-center gap-x-3.5 rounded-[20px] border border-hum-border/30 bg-hum-card/90 px-4 py-3.5 active:opacity-88"
          onPress={() => router.push('/profile')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="profile and settings"
        >
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-hum-primary/10">
            <Ionicons name="person-outline" size={18} color={theme.primary} />
          </View>
          <View className="min-w-0 flex-1 gap-y-0.5">
            <Text className="text-[14px] font-medium text-hum-text">you</Text>
            <Text className="text-[12px] font-light leading-[17px] text-hum-muted">xp, badges, cred</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={theme.dim} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
