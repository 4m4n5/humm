import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Share,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/stores/authStore';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { AUTH_SCREEN_PADDING_TOP } from '@/constants/screenLayout';
import { repairHalfLinkedProfile } from '@/lib/firestore/users';
import { errorsVoice } from '@/constants/hummVoice';

export default function LinkPartner() {
  const { profile, linkPartner, signOut, error, clearError } = useAuthStore();
  const [partnerCode, setPartnerCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [tab, setTab] = useState<'share' | 'enter'>('share');

  useEffect(() => {
    if (!profile?.uid || profile.coupleId) return;
    void repairHalfLinkedProfile(profile.uid).catch((e) =>
      console.warn('[link-partner] repair check failed', e),
    );
  }, [profile?.uid, profile?.coupleId]);

  async function handleShareCode() {
    if (!profile?.inviteCode) return;
    try {
      await Share.share({
        message: `join me on Hum — my code: ${profile.inviteCode}`,
      });
    } catch {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(profile.inviteCode);
        Alert.alert('copied', 'code’s on your clipboard');
      }
    }
  }

  async function handleLink() {
    if (!partnerCode.trim()) return;
    clearError();
    setLinking(true);
    try {
      await linkPartner(partnerCode.trim());
    } catch (e) {
      Alert.alert(errorsVoice.couldntLink, e instanceof Error ? e.message : 'check the code · try again');
    } finally {
      setLinking(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg" edges={['top', 'bottom']}>
      <AmbientGlow tone="primary" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View
            className="flex-1 gap-y-10 px-6 pb-10"
            style={{ paddingTop: AUTH_SCREEN_PADDING_TOP }}
          >
            <View className="items-center gap-y-3">
              <Text
                className="text-center text-[40px] font-extralight leading-[44px] tracking-[-0.02em] text-hum-primary"
                maxFontSizeMultiplier={1.3}
              >
                Hum - rituals
              </Text>
              <Text
                className="text-center text-[20px] font-light text-hum-text"
                maxFontSizeMultiplier={1.3}
              >
                link with your person
              </Text>
              <Text
                className="max-w-[280px] text-center text-[13px] font-light leading-[20px] text-hum-muted"
                maxFontSizeMultiplier={1.3}
              >
                one shares · the other types
              </Text>
            </View>

            <View
              className="flex-row rounded-full border border-hum-border/18 bg-hum-surface/50 p-[3px]"
              accessibilityRole="tablist"
            >
              <Pressable
                className={`min-h-[44px] flex-1 items-center justify-center rounded-full py-3 active:opacity-88 ${tab === 'share' ? 'bg-hum-card' : ''}`}
                onPress={() => setTab('share')}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'share' }}
                accessibilityLabel="Show my invite code tab"
              >
                <Text
                  className={`text-center text-[13px] tracking-wide ${
                    tab === 'share' ? 'font-semibold text-hum-text' : 'font-light text-hum-dim'
                  }`}
                  maxFontSizeMultiplier={1.3}
                >
                  my code
                </Text>
              </Pressable>
              <Pressable
                className={`min-h-[44px] flex-1 items-center justify-center rounded-full py-3 active:opacity-88 ${tab === 'enter' ? 'bg-hum-card' : ''}`}
                onPress={() => setTab('enter')}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'enter' }}
                accessibilityLabel="Enter partner invite code tab"
              >
                <Text
                  className={`text-center text-[13px] tracking-wide ${
                    tab === 'enter' ? 'font-semibold text-hum-text' : 'font-light text-hum-dim'
                  }`}
                  maxFontSizeMultiplier={1.3}
                >
                  their code
                </Text>
              </Pressable>
            </View>

            {tab === 'share' ? (
              <View className="items-center gap-y-8">
                <View className="w-full max-w-sm items-center gap-y-4 self-center rounded-[22px] border border-hum-border/18 bg-hum-card px-7 py-11">
                  <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.25}>
                    your code
                  </Text>
                  <Text className="text-[32px] font-light tracking-[0.45em] text-hum-primary" maxFontSizeMultiplier={1.3}>
                    {profile?.inviteCode ?? '······'}
                  </Text>
                </View>

                <Button label="share code" onPress={handleShareCode} size="lg" className="w-full" />

                <Text className="max-w-[280px] text-center text-[12px] font-light leading-[18px] text-hum-dim" maxFontSizeMultiplier={1.5}>
                  send through anything you already use
                </Text>
              </View>
            ) : (
              <View className="gap-y-5" style={{ maxWidth: 400, width: '100%', alignSelf: 'center' }}>
                <Input
                  label="their code"
                  placeholder="······"
                  value={partnerCode}
                  onChangeText={(v) => setPartnerCode(v.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={6}
                />

                {error ? (
                  <Text
                    className="text-center text-[14px] leading-[22px] text-red-400/90"
                    accessibilityLiveRegion="polite"
                    maxFontSizeMultiplier={1.5}
                  >
                    {error}
                  </Text>
                ) : null}

                <Button label="link us" onPress={handleLink} loading={linking} size="lg" />
              </View>
            )}

            <Pressable
              className="mt-auto min-h-[44px] items-center justify-center py-4 active:opacity-88"
              onPress={signOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out, this is not your account"
            >
              <Text className="text-[13px] font-light text-hum-dim" maxFontSizeMultiplier={1.3}>
                not you? <Text className="font-medium text-hum-muted" maxFontSizeMultiplier={1.3}>sign out</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
