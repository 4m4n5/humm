import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
import { AUTH_SCREEN_PADDING_TOP } from '@/constants/screenLayout';
import { repairHalfLinkedProfile } from '@/lib/firestore/users';

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
      Alert.alert('couldn’t link', e instanceof Error ? e.message : 'check the code and try again');
    } finally {
      setLinking(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg" edges={['top', 'bottom']}>
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
            className="flex-1 gap-y-9 px-6 pb-10"
            style={{ paddingTop: AUTH_SCREEN_PADDING_TOP }}
          >
            <View className="items-center gap-y-3">
              <Text
                className="text-center text-[30px] font-extralight leading-[36px] tracking-[-0.02em] text-hum-primary"
                maxFontSizeMultiplier={1.2}
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
                className="max-w-[280px] text-center text-[14px] font-light leading-[22px] text-hum-muted"
                maxFontSizeMultiplier={1.35}
              >
                one shares a code. the other types it in. that’s the whole ritual.
              </Text>
            </View>

            <View
              className="flex-row rounded-full border border-hum-border/18 bg-hum-surface/60 p-1"
              accessibilityRole="tablist"
            >
              <TouchableOpacity
                className={`min-h-12 flex-1 items-center justify-center rounded-full py-3 ${tab === 'share' ? 'bg-hum-card' : ''}`}
                onPress={() => setTab('share')}
                activeOpacity={0.88}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'share' }}
                accessibilityLabel="show my invite code"
              >
                <Text
                  className={`text-center text-[13px] font-medium tracking-wide ${
                    tab === 'share' ? 'text-hum-text' : 'text-hum-dim'
                  }`}
                >
                  my code
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`min-h-12 flex-1 items-center justify-center rounded-full py-3 ${tab === 'enter' ? 'bg-hum-card' : ''}`}
                onPress={() => setTab('enter')}
                activeOpacity={0.88}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'enter' }}
                accessibilityLabel="enter partner invite code"
              >
                <Text
                  className={`text-center text-[13px] font-medium tracking-wide ${
                    tab === 'enter' ? 'text-hum-text' : 'text-hum-dim'
                  }`}
                >
                  their code
                </Text>
              </TouchableOpacity>
            </View>

            {tab === 'share' ? (
              <View className="items-center gap-y-8">
                <View className="w-full max-w-sm items-center gap-y-4 self-center rounded-[22px] border border-hum-border/18 bg-hum-card/95 px-7 py-11">
                  <Text className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim">
                    your code
                  </Text>
                  <Text className="text-[32px] font-light tracking-[0.45em] text-hum-primary">
                    {profile?.inviteCode ?? '······'}
                  </Text>
                </View>

                <Button label="share code" onPress={handleShareCode} size="lg" className="w-full" />

                <Text className="max-w-[280px] text-center text-[13px] font-light leading-[22px] text-hum-dim">
                  send it through whatever you already use to say goodnight.
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
                    className="text-center text-[14px] leading-5 text-red-400/90"
                    accessibilityLiveRegion="polite"
                  >
                    {error}
                  </Text>
                ) : null}

                <Button label="link us" onPress={handleLink} loading={linking} size="lg" />
              </View>
            )}

            <TouchableOpacity
              className="mt-auto min-h-12 items-center justify-center py-4"
              onPress={signOut}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="sign out, not you"
            >
              <Text className="text-[13px] font-light text-hum-dim">
                not you? <Text className="font-medium text-hum-muted">sign out</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
