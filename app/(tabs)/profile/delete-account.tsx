import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { useAuthStore } from '@/lib/stores/authStore';
import { scrollContentStandard } from '@/constants/screenLayout';
import { errorsVoice, navVoice } from '@/constants/hummVoice';

export default function DeleteAccountScreen() {
  const { deleteAccount, isLoading, error, clearError, profile } = useAuthStore();
  const [password, setPassword] = useState('');

  async function handleDelete() {
    clearError();
    if (!password) {
      Alert.alert(errorsVoice.couldnt('confirm'), errorsVoice.needPassword);
      return;
    }
    Alert.alert(
      'delete forever?',
      profile?.partnerId
        ? 'your account goes · partner unlinked · shared data removed for both of you'
        : 'your account goes · any invite-only data removed',
      [
        { text: navVoice.cancel, style: 'cancel' },
        {
          text: 'delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(password);
            } catch {
              /* surfaced via store */
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg" edges={['bottom']}>
      <AmbientGlow tone="primary" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScreenHeader title="delete account" />
        <ScrollView
          className="flex-1"
          contentContainerStyle={scrollContentStandard}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-y-5">
            <Text
              className="text-[13px] font-light leading-[20px] text-hum-muted"
              maxFontSizeMultiplier={1.5}
            >
              confirm with your password · this signs you out for good
            </Text>
            <Input
              label="password"
              placeholder="your sign-in password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
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
            <Button
              label="delete my account"
              variant="danger"
              onPress={handleDelete}
              loading={isLoading}
              size="lg"
              className="mt-1"
            />
            <Text
              className="text-center text-[12px] font-light leading-[18px] text-hum-dim"
              maxFontSizeMultiplier={1.3}
            >
              tap back · nothing saved yet
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
