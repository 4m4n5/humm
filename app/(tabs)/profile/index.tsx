import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/stores/authStore';
import { getLevelForXp } from '@/constants/levels';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { theme } from '@/constants/theme';
import { updateUserProfile, subscribeToUserProfile } from '@/lib/firestore/users';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { BadgeShelf } from '@/components/profile/BadgeShelf';
import { PartnerXpCard } from '@/components/profile/PartnerXpCard';
import { ProfileSoftStats } from '@/components/profile/ProfileSoftStats';
import { subscribeToCouple } from '@/lib/firestore/couples';
import { subscribeToNominationsForCouple } from '@/lib/firestore/nominations';
import { useReasonStore } from '@/lib/stores/reasonStore';
import { Couple, Nomination, UserProfile } from '@/types';
import { scrollContentStandard } from '@/constants/screenLayout';
import { errorsVoice, navVoice } from '@/constants/hummVoice';

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
    Alert.alert('sign out?', 'you can sign back in anytime', [
      { text: navVoice.stay, style: 'cancel' },
      { text: 'sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="primary" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTitle title="you" />

        <Card className="gap-y-5">
          <View className="flex-row items-center gap-x-4">
            <View className="h-16 w-16 items-center justify-center rounded-full border border-hum-primary/20 bg-hum-primary/8">
              <Text
                className="text-[22px] font-light text-hum-primary"
                maxFontSizeMultiplier={1.2}
              >
                {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View className="flex-1 gap-y-1">
              {editingName ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className="flex-1 rounded-[20px] border border-hum-border/18 bg-hum-surface/80 px-3 py-2.5 text-[18px] font-medium text-hum-text"
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
                        Alert.alert(errorsVoice.couldntSave, errorsVoice.checkConnection);
                      }
                    }}
                    placeholderTextColor={theme.dim}
                  />
                  <Button
                    label="save"
                    variant="primary"
                    size="sm"
                    onPress={async () => {
                      const trimmed = nameDraft.trim();
                      if (!trimmed || !profile) return;
                      try {
                        await updateUserProfile(profile.uid, { displayName: trimmed });
                        setEditingName(false);
                      } catch {
                        Alert.alert(errorsVoice.couldntSave, errorsVoice.checkConnection);
                      }
                    }}
                    accessibilityLabel="Save display name"
                  />
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setNameDraft(profile?.displayName ?? '');
                    setEditingName(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Edit display name"
                  accessibilityHint="opens an inline editor"
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}
                  className="flex-row items-center gap-x-2 active:opacity-88"
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
                </Pressable>
              )}
            </View>
            <View className="items-end">
              <AnimatedNumber
                value={profile?.xp ?? 0}
                className="text-[34px] font-extralight tabular-nums leading-[36px] tracking-[-0.025em] text-hum-primary"
                maxFontSizeMultiplier={1.25}
              />
              <Text className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
                xp
              </Text>
            </View>
          </View>

          {level.nextLevelXp && (
            <View className="gap-y-2">
              <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
                level {level.level}
              </Text>
              <View className="h-[6px] overflow-hidden rounded-full bg-hum-border/30">
                <View
                  className="h-full rounded-full bg-hum-primary/80"
                  style={{ width: `${Math.min(xpProgress * 100, 100)}%` }}
                />
              </View>
              <Text className="text-[12px] font-light text-hum-dim" maxFontSizeMultiplier={1.5}>
                {`${level.nextLevelXp - (profile?.xp ?? 0)} xp until ${getLevelForXp(level.nextLevelXp).name}`}
              </Text>
            </View>
          )}

        </Card>

        {profile?.partnerId ? (
          <View className="gap-y-3">
            <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
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
            <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
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
              <Pressable
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
              </Pressable>
              {partnerBadgesOpen ? (
                partnerProfileLoading && !partnerProfile ? (
                  <Card padding="hero" dashed bgClassName="bg-hum-card/50" flat>
                    <Text
                      className="text-center text-[13px] font-light text-hum-muted"
                      maxFontSizeMultiplier={1.35}
                    >
                      loading badges
                    </Text>
                  </Card>
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
          <Pressable
            className="rounded-[20px] border border-dashed border-hum-border/18 bg-hum-surface/15 py-3.5 active:opacity-88"
            onPress={() => router.push('/profile/badge-teasers')}
            accessibilityRole="button"
            accessibilityLabel="see a few badges you have not earned yet"
          >
            <Text
              className="text-center text-[13px] font-light text-hum-muted"
              maxFontSizeMultiplier={1.35}
            >
              peek at a few locked
            </Text>
          </Pressable>
        </View>

        {profile?.inviteCode && !profile?.partnerId ? (
          <Card tone="primary" tier="inner" className="gap-y-3">
            <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
              invite
            </Text>
            <Text className="text-[26px] font-light tracking-[0.35em] text-hum-primary" maxFontSizeMultiplier={1.25}>
              {profile.inviteCode}
            </Text>
            <Text className="text-[13px] font-light leading-5 text-hum-muted" maxFontSizeMultiplier={1.3}>
              share once · in private
            </Text>
          </Card>
        ) : null}

        <View className="gap-y-3">
          <Card
            pressable
            padding="list-row"
            onPress={() => router.push('/profile/notification-settings')}
            accessibilityLabel="notifications"
            accessibilityHint="manage push notification preferences and daily reminders"
            className="flex-row items-center gap-x-3"
          >
            <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hum-secondary/14">
              <Ionicons name="notifications-outline" size={20} color={theme.secondary} />
            </View>
            <Text
              className="min-w-0 flex-1 text-[17px] font-medium leading-[22px] tracking-[-0.01em] text-hum-text"
              maxFontSizeMultiplier={1.3}
            >
              notifications
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.dim}
              style={{ opacity: 0.5 }}
            />
          </Card>
          {__DEV__ ? (
            <Card
              pressable
              padding="list-row"
              dashed
              bgClassName="bg-hum-surface/22"
              flat
              onPress={() => router.push('/profile/dev-tools')}
              accessibilityLabel="dev tools"
              className="flex-row items-center gap-x-3"
            >
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hum-surface/45">
                <Ionicons name="construct-outline" size={20} color={theme.dim} />
              </View>
              <Text
                className="min-w-0 flex-1 text-[17px] font-medium leading-[22px] tracking-[-0.01em] text-hum-muted"
                maxFontSizeMultiplier={1.3}
              >
                dev tools
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.dim}
                style={{ opacity: 0.5 }}
              />
            </Card>
          ) : null}
          <Button
            label="sign out"
            variant="secondary"
            size="lg"
            onPress={handleSignOut}
            accessibilityLabel="sign out"
          />
          <Button
            label="delete account"
            variant="danger"
            size="lg"
            onPress={() => router.push('/profile/delete-account')}
            accessibilityLabel="delete account"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
