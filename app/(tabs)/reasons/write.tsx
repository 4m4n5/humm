import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Button } from '@/components/shared/Button';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { LinkPartnerGate } from '@/components/shared/LinkPartnerGate';
import { ReasonWrittenCelebration } from '@/components/reasons/ReasonWrittenCelebration';
import { useAuthStore } from '@/lib/stores/authStore';
import { useReasonStore } from '@/lib/stores/reasonStore';
import { useReasonsRewardStore } from '@/lib/stores/reasonsRewardStore';
import { theme } from '@/constants/theme';
import { errorsVoice, navVoice } from '@/constants/hummVoice';

const MAX_CHARS = 240;

export default function WriteReasonScreen() {
  const { profile, firebaseUser } = useAuthStore();
  const { addReason, reasons } = useReasonStore();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [authorCountAtSave, setAuthorCountAtSave] = useState(0);

  if (!profile?.coupleId || !profile.partnerId) {
    return <LinkPartnerGate backTo="reasons" tone="crimson" />;
  }

  async function handleSave() {
    if (!text.trim()) {
      Alert.alert(errorsVoice.couldnt('save'), errorsVoice.needText);
      return;
    }
    if (!profile?.coupleId || !profile.partnerId) return;
    const authorId = (firebaseUser?.uid ?? profile.uid ?? '').trim();
    if (!authorId) {
      Alert.alert(errorsVoice.couldnt('save'), 'sign in again to save');
      return;
    }
    setSaving(true);
    try {
      const priorCount = reasons.filter(
        (r) => r.authorId === authorId && r.aboutId === profile.partnerId,
      ).length;
      await addReason({
        coupleId: profile.coupleId,
        authorId,
        aboutId: profile.partnerId,
        text,
      });
      useReasonsRewardStore.getState().armPendingReward();
      Keyboard.dismiss();
      setAuthorCountAtSave(priorCount);
      setCelebrating(true);
    } catch (e) {
      console.error(e);
      Alert.alert(errorsVoice.couldntSave, errorsVoice.checkConnection);
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg" edges={['top', 'bottom']}>
      <AmbientGlow tone="crimson" />
      <ScreenHeader title="for them" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View className="px-6 pb-5 pt-4" style={{ gap: 14 }}>
          <Text
            className="px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
          >
            one reason you love them
          </Text>
          <TextInput
            className="min-h-[52px] max-h-[100px] rounded-[20px] border border-hum-crimson/18 bg-hum-surface/80 px-4 py-3.5 text-[16px] font-light leading-[22px] text-hum-text"
            placeholder="what you appreciate or want them to remember"
            placeholderTextColor={theme.dim}
            value={text}
            onChangeText={setText}
            multiline
            scrollEnabled
            maxLength={MAX_CHARS}
            textAlignVertical="top"
            autoFocus={!celebrating}
            editable={!celebrating && !saving}
            accessibilityLabel="Reason for your partner, one sentence"
          />
          <View className="flex-row items-center justify-between px-1">
            <Text
              className="text-[11px] font-light tabular-nums text-hum-dim"
              maxFontSizeMultiplier={1.25}
            >
              {text.length}/{MAX_CHARS}
            </Text>
          </View>
          <Button
            label="save"
            onPress={handleSave}
            loading={saving && !celebrating}
            disabled={celebrating}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
      <ReasonWrittenCelebration
        visible={celebrating}
        onFinished={() => router.back()}
        authorCountBefore={authorCountAtSave}
      />
    </SafeAreaView>
  );
}
