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
import { ReasonWrittenCelebration } from '@/components/reasons/ReasonWrittenCelebration';
import { useAuthStore } from '@/lib/stores/authStore';
import { useReasonStore } from '@/lib/stores/reasonStore';
import { useReasonsRewardStore } from '@/lib/stores/reasonsRewardStore';
import { theme } from '@/constants/theme';

/** Enough for a sentence or two; field stays short so save stays on screen. */
const MAX_CHARS = 240;

export default function WriteReasonScreen() {
  const { profile, firebaseUser } = useAuthStore();
  const { addReason, reasons } = useReasonStore();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  // Snapshot the author's reason count *before* saving so milestone math
  // ("this is the 25th reason") stays stable across the celebration window.
  const [authorCountAtSave, setAuthorCountAtSave] = useState(0);

  if (!profile?.coupleId || !profile.partnerId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="text-center text-hum-muted">link with your person first</Text>
        <Button label="go back" onPress={() => router.back()} variant="ghost" size="md" className="mt-6" />
      </SafeAreaView>
    );
  }

  async function handleSave() {
    if (!text.trim()) {
      Alert.alert('empty page', 'even one honest reason is enough');
      return;
    }
    if (!profile?.coupleId || !profile.partnerId) return;
    const authorId = (firebaseUser?.uid ?? profile.uid ?? '').trim();
    if (!authorId) {
      Alert.alert('session', 'sign in again to save');
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
      // Drop the keyboard so the shower has a clean stage; the celebration
      // component handles the success haptic + auto-navigates back when done.
      Keyboard.dismiss();
      setAuthorCountAtSave(priorCount);
      setCelebrating(true);
    } catch (e) {
      console.error(e);
      Alert.alert('couldn’t save', 'check connection, try again');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg" edges={['top', 'bottom']}>
      <ScreenHeader title="for them" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View className="px-6 pb-5 pt-4" style={{ gap: 12 }}>
          <TextInput
            className="min-h-[48px] max-h-[88px] rounded-[20px] border border-hum-border/18 bg-hum-surface/80 px-4 py-3 text-[16px] font-light leading-[22px] text-hum-text"
            placeholder="what you love, appreciate, or want them to remember"
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
