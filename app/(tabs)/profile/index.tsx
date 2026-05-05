import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/stores/authStore';
import { getLevelForXp } from '@/constants/levels';
import { Card } from '@/components/shared/Card';
import { theme } from '@/constants/theme';
import { updateUserProfile, subscribeToUserProfile } from '@/lib/firestore/users';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { BadgeShelf } from '@/components/profile/BadgeShelf';
import { PartnerXpCard } from '@/components/profile/PartnerXpCard';
import { ProfileSoftStats } from '@/components/profile/ProfileSoftStats';
import { subscribeToCouple } from '@/lib/firestore/couples';
import { subscribeToNominationsForCouple } from '@/lib/firestore/nominations';
import { useReasonStore } from '@/lib/stores/reasonStore';
import { Couple, Nomination, UserProfile } from '@/types';
import { scrollContentStandard } from '@/constants/screenLayout';

export default function Profile() {
  const { profile, signOut } = useAuthStore();
  const reasons = useReasonStore((s) => s.reasons);
  const [coupleNominations, setCoupleNominations] = useState<Nomination[]>([]);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [partnerProfileLoading, setPartnerProfileLoading] = useState(false);
  const [partnerBadgesOpen, setPartnerBadgesOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile?.displayName ?? '');

  const level = getLevelForXp(profile?.xp ?? 0);
  const xpProgress = level.nextLevelXp
    ? ((profile?.xp ?? 0) - level.minXp) / (level.nextLevelXp - level.minXp)
    : 1;

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeToCouple(profile.coupleId, setCouple);
  }, [profile?.coupleId]);

  /** All seasons, full couple jar — same scope as awards filed / spotlight badges (`nominationStats`). */
  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeToNominationsForCouple(profile.coupleId, setCoupleNominations);
  }, [profile?.coupleId]);

  useEffect(() => {
    if (!profile?.partnerId) {
      setPartnerProfile(null);
      setPartnerProfileLoading(false);
      return;
    }
    setPartnerProfileLoading(true);
    return subscribeToUserProfile(profile.partnerId, (p) => {
      setPartnerProfile(p);
      setPartnerProfileLoading(false);
    });
  }, [profile?.partnerId]);

  useEffect(() => {
    if (!profile?.partnerId) setPartnerBadgesOpen(false);
  }, [profile?.partnerId]);

  function handleSignOut() {
    Alert.alert('sign out?', 'leave this session?', [
      { text: 'stay', style: 'cancel' },
      { text: 'sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTitle title="you" subtitle="xp · badges · cred" />

        <Card className="gap-y-5">
          <View className="flex-row items-center gap-x-4">
            <View className="h-16 w-16 items-center justify-center rounded-full border border-hum-petal/20 bg-hum-petal/8">
              <Text
                className="text-[22px] font-light text-hum-petal"
                maxFontSizeMultiplier={1.2}
              >
                {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View className="flex-1 gap-y-1">
              {editingName ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="flex-1 rounded-[20px] border border-hum-border/30 bg-hum-surface px-3 py-2.5 text-[18px] font-medium text-hum-text"
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    autoFocus
                    returnKeyType="done"
                    maxLength={30}
                    accessibilityLabel="Display name"
                    maxFontSizeMultiplier={1.35}
                    onSubmitEditing={async () => {
                      const trimmed = nameDraft.trim();
                      if (!trimmed || !profile) return;
                      try {
                        await updateUserProfile(profile.uid, { displayName: trimmed });
                        setEditingName(false);
                      } catch {
                        Alert.alert('couldn’t save', 'check connection, try again');
                      }
                    }}
                    placeholderTextColor={theme.dim}
                  />
                  <TouchableOpacity
                    onPress={async () => {
                      const trimmed = nameDraft.trim();
                      if (!trimmed || !profile) return;
                      try {
                        await updateUserProfile(profile.uid, { displayName: trimmed });
                        setEditingName(false);
                      } catch {
                        Alert.alert('couldn’t save', 'check connection, try again');
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Save display name"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.88}
                  >
                    <Text className="text-[14px] font-semibold text-hum-primary">save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setNameDraft(profile?.displayName ?? '');
                    setEditingName(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Edit display name"
                  accessibilityHint="opens an inline editor"
                  activeOpacity={0.88}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}
                  className="flex-row items-center gap-x-2"
                >
                  <Text
                    className="text-[18px] font-medium tracking-tight text-hum-text"
                    maxFontSizeMultiplier={1.35}
                  >
                    {profile?.displayName ?? 'your name'}
                  </Text>
                  <Ionicons
                    name="pencil-outline"
                    size={12}
                    color={theme.dim}
                    style={{ opacity: 0.7 }}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View className="items-end gap-y-0.5">
              <Text className="text-[20px] font-light text-hum-primary">{profile?.xp ?? 0}</Text>
              <Text className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">xp</Text>
            </View>
          </View>

          {level.nextLevelXp && (
            <View className="gap-y-2">
              <Text className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">
                level {level.level}
              </Text>
              <View className="h-[6px] overflow-hidden rounded-full bg-hum-border/30">
                <View
                  className="h-full rounded-full bg-hum-primary/80"
                  style={{ width: `${Math.min(xpProgress * 100, 100)}%` }}
                />
              </View>
              <Text className="text-[12px] font-light text-hum-dim">
                {`${level.nextLevelXp - (profile?.xp ?? 0)} xp until ${getLevelForXp(level.nextLevelXp).name}`}
              </Text>
            </View>
          )}

        </Card>

        {profile?.partnerId ? (
          <View className="gap-y-3">
            <Text className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">
              partner
            </Text>
            <PartnerXpCard partner={partnerProfile} loading={partnerProfileLoading} />
          </View>
        ) : null}

        {profile?.coupleId && profile?.uid ? (
          <ProfileSoftStats
            profile={profile}
            couple={couple}
            reasons={reasons}
            nominations={coupleNominations}
            reasonStreak={couple?.streaks?.reasonStreak ?? 0}
          />
        ) : null}

        <View className="gap-y-3">
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">
              badges
            </Text>
            {(profile?.badges?.length ?? 0) > 0 ? (
              <Text
                className="text-[11px] font-light tabular-nums text-hum-muted"
                maxFontSizeMultiplier={1.25}
              >
                {`${profile?.badges?.length ?? 0} unlocked`}
              </Text>
            ) : null}
          </View>
          <BadgeShelf earnedIds={profile?.badges ?? []} />
          {profile?.partnerId ? (
            <View className="gap-y-3">
              <TouchableOpacity
                className="rounded-[20px] border border-dashed border-hum-border/18 bg-hum-surface/15 py-3.5 active:opacity-88"
                onPress={() => setPartnerBadgesOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityLabel={
                  partnerBadgesOpen ? 'hide partner badges' : 'show partner badges'
                }
                accessibilityState={{ expanded: partnerBadgesOpen }}
              >
                <View className="flex-row items-center justify-between gap-3 px-4">
                  <Text
                    className="flex-1 text-[13px] font-light text-hum-muted"
                    maxFontSizeMultiplier={1.35}
                  >
                    {partnerBadgesOpen ? 'hide' : 'see'} partner’s badges
                  </Text>
                  {!partnerProfileLoading && partnerProfile ? (
                    <Text
                      className="text-[11px] font-light tabular-nums text-hum-dim"
                      maxFontSizeMultiplier={1.25}
                    >
                      {`${partnerProfile.badges?.length ?? 0} unlocked`}
                    </Text>
                  ) : partnerProfileLoading ? (
                    <Text
                      className="text-[11px] font-light text-hum-dim"
                      maxFontSizeMultiplier={1.25}
                    >
                      …
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
              {partnerBadgesOpen ? (
                partnerProfileLoading && !partnerProfile ? (
                  <View className="rounded-[22px] border border-dashed border-hum-border/18 bg-hum-card/50 px-6 py-8">
                    <Text
                      className="text-center text-[13px] font-light text-hum-muted"
                      maxFontSizeMultiplier={1.35}
                    >
                      loading badges
                    </Text>
                  </View>
                ) : (
                  <BadgeShelf
                    earnedIds={partnerProfile?.badges ?? []}
                    accessibilityLabel="partner earned badges"
                    emptyMessage="they haven’t unlocked any badges yet."
                  />
                )
              ) : null}
            </View>
          ) : null}
          <TouchableOpacity
            className="rounded-[20px] border border-dashed border-hum-border/18 bg-hum-surface/15 py-3.5 active:opacity-88"
            onPress={() => router.push('/profile/badge-teasers')}
            accessibilityRole="button"
            accessibilityLabel="see a few badges you have not earned yet"
          >
            <Text
              className="text-center text-[13px] font-light text-hum-muted"
              maxFontSizeMultiplier={1.35}
            >
              peek at a few you haven’t earned yet
            </Text>
          </TouchableOpacity>
        </View>

        {profile?.inviteCode && !profile?.partnerId ? (
          <Card className="gap-y-3 border-hum-primary/15">
            <Text className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">
              invite
            </Text>
            <Text className="text-[26px] font-light tracking-[0.35em] text-hum-primary">
              {profile.inviteCode}
            </Text>
            <Text className="text-[13px] font-light leading-5 text-hum-muted">
              the phrase that links your accounts — share it once, in private.
            </Text>
          </Card>
        ) : null}

        <TouchableOpacity
          className="items-center rounded-full border border-hum-border/18 bg-hum-card/55 py-3.5 active:opacity-88"
          onPress={handleSignOut}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="sign out"
        >
          <Text className="text-[14px] font-medium tracking-wide text-hum-muted">sign out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center rounded-full border border-red-900/30 bg-red-950/12 py-3.5 active:opacity-88"
          onPress={() => router.push('/profile/delete-account')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="delete account"
        >
          <Text className="text-[14px] font-medium tracking-wide text-red-400/80">delete account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
