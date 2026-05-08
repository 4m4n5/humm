import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Alert, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { EmptyState } from '@/components/shared/EmptyState';
import { DecisionRow } from '@/components/pick/DecisionRow';
import { useAuthStore } from '@/lib/stores/authStore';
import { usePickStore } from '@/lib/stores/pickStore';
import { useDecisionStore } from '@/lib/stores/decisionStore';
import { DECISION_CATEGORIES } from '@/constants/categories';
import { DecisionCategory } from '@/types';
import { createPick, cancelPick } from '@/lib/firestore/picks';
import { scrollContentStandard } from '@/constants/screenLayout';
import { theme } from '@/constants/theme';
import { errorsVoice, decideVoice, navVoice } from '@/constants/hummVoice';

const INLINE_HISTORY_LIMIT = 5;

export default function Decide() {
  const { profile } = useAuthStore();
  const { pick } = usePickStore();
  const { history } = useDecisionStore();
  const [category, setCategory] = useState<DecisionCategory>('food');
  const [starting, setStarting] = useState(false);

  const coupleId = profile?.coupleId ?? null;
  const partnerLinked = !!profile?.partnerId && !!coupleId;

  // Track screen focus so we only auto-navigate when visible.
  const focused = useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      focused.current = true;
      return () => { focused.current = false; };
    }, []),
  );

  // Auto-join: when an active pick appears (partner started one) and this
  // screen is focused, navigate directly into the session instead of making
  // the user tap "resume". Guard against the creator path (they navigate via
  // handleStart) by checking `starting`.
  const prevPickId = useRef<string | null>(null);
  useEffect(() => {
    if (!pick) {
      prevPickId.current = null;
      return;
    }
    if (pick.id === prevPickId.current) return;
    prevPickId.current = pick.id;
    if (!focused.current || starting) return;
    const route =
      pick.status === 'collecting' ? '/decide/pick-lobby'
        : pick.status === 'battling' ? '/decide/pick-vote'
          : '/decide/pick-result';
    requestAnimationFrame(() => router.push(route));
  }, [pick, pick?.id, pick?.status, starting]);

  async function handleStart() {
    if (!coupleId || !profile?.uid) return;
    setStarting(true);
    try {
      await createPick(coupleId, category, profile.uid);
      router.push('/decide/pick-lobby');
    } catch (e) {
      Alert.alert(
        errorsVoice.couldntStart,
        e instanceof Error ? e.message : errorsVoice.tryAgain,
      );
    } finally {
      setStarting(false);
    }
  }

  function resumeRoute(): '/decide/pick-lobby' | '/decide/pick-vote' | '/decide/pick-result' {
    if (!pick) return '/decide/pick-lobby';
    if (pick.status === 'collecting') return '/decide/pick-lobby';
    if (pick.status === 'battling') return '/decide/pick-vote';
    return '/decide/pick-result';
  }

  function handleResume() {
    router.push(resumeRoute());
  }

  async function handleLeave() {
    if (!coupleId || !pick) return;
    Alert.alert(
      decideVoice.leavePickTitle,
      decideVoice.leavePickBody,
      [
        { text: navVoice.stay, style: 'cancel' },
        {
          text: decideVoice.leaveAction,
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelPick(coupleId, pick.id);
            } catch (e) {
              Alert.alert(errorsVoice.couldntLeave, e instanceof Error ? e.message : errorsVoice.tryAgain);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="spark" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle title="decide" />

        {!partnerLinked ? (
          <EmptyState
            ionicon="people-outline"
            title="link your partner first"
            description="invite them · everything here is for two"
            className="px-0"
          />
        ) : pick ? (
          <View className="gap-y-4">
            <View className="items-center gap-y-1">
              <Text
                className="text-center text-[10px] font-medium uppercase tracking-[0.22em] text-hum-primary/80"
                maxFontSizeMultiplier={1.25}
                numberOfLines={1}
              >
                {pick.status === 'collecting'
                  ? 'adding options'
                  : pick.status === 'battling'
                    ? 'deciding in progress'
                    : 'decided'}
              </Text>
              <Text
                className="text-center text-[13px] font-light text-hum-muted"
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
              >
                {pick.options.length} option{pick.options.length !== 1 ? 's' : ''} ·{' '}
                {DECISION_CATEGORIES.find((c) => c.id === pick.category)?.label ?? pick.category}
              </Text>
            </View>
            <Button
              label={decideVoice.resumeAction}
              onPress={handleResume}
              variant="primary"
              size="lg"
            />
            <Button
              label={decideVoice.leaveAction}
              onPress={handleLeave}
              variant="ghost"
              size="md"
            />
          </View>
        ) : (
          <>
            <Text
              className="text-center text-[13px] font-light leading-[20px] text-hum-muted"
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
            >
              decide together · or randomize
            </Text>

            <Text
              className="px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
              category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {DECISION_CATEGORIES.map((c) => {
                const selected = category === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    className={`min-h-[44px] flex-row items-center gap-x-2 rounded-full border px-5 py-2.5 active:opacity-88 ${
                      selected
                        ? 'border-hum-primary/25 bg-hum-primary'
                        : 'border-hum-border/18 bg-hum-card/70'
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${c.label} category${selected ? ', selected' : ''}`}
                  >
                    <Text className="text-base" allowFontScaling={false}>
                      {c.emoji}
                    </Text>
                    <Text
                      className={`text-[13px] font-medium tracking-wide ${
                        selected ? 'text-hum-ink' : 'text-hum-muted'
                      }`}
                      maxFontSizeMultiplier={1.3}
                      numberOfLines={1}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Button
              label={decideVoice.startAction}
              onPress={handleStart}
              loading={starting}
              variant="primary"
              size="lg"
            />
          </>
        )}

        {history.length > 0 ? (
          <View className="gap-y-2">
            <Text
              className="px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
              past decisions
            </Text>
            {history.slice(0, INLINE_HISTORY_LIMIT).map((d) => (
              <DecisionRow key={d.id} item={d} />
            ))}
            {history.length > INLINE_HISTORY_LIMIT ? (
              <Pressable
                className="min-h-[44px] flex-row items-center justify-center gap-x-1.5 rounded-full py-2 active:opacity-88"
                onPress={() => router.push('/decide/history')}
                accessibilityRole="button"
                accessibilityLabel={`See all ${history.length} decisions`}
              >
                <Text
                  className="text-[12px] font-medium text-hum-muted"
                  maxFontSizeMultiplier={1.3}
                >
                  see all {history.length}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.muted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
