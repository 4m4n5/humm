import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { useAuthStore } from '@/lib/stores/authStore';
import { scrollContentStandard } from '@/constants/screenLayout';

export default function DeleteAccountScreen() {
  const { deleteAccount, isLoading, error, clearError, profile } = useAuthStore();
  const [password, setPassword] = useState('');

  async function handleDelete() {
    clearError();
    if (!password) {
      Alert.alert('password?', 'we need it to confirm it’s really you');
      return;
    }
    Alert.alert(
      'delete forever?',
      profile?.partnerId
        ? 'your profile and sign-in go away. your partner will be unlinked and this couple’s shared data (decisions, awards, reasons, battles) will be removed for both of you.'
        : 'your profile and sign-in go away. any invite-only data tied to this account will be removed.',
      [
        { text: 'cancel', style: 'cancel' },
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScreenHeader title="delete account" subtitle="permanent · can’t be undone" />
        <ScrollView
          className="flex-1"
          contentContainerStyle={scrollContentStandard}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-y-5">
            <Text
              className="text-[14px] font-light leading-[22px] text-hum-muted"
              maxFontSizeMultiplier={1.35}
            >
              enter your password so we know it’s you. after this, the app signs you out and your
              account is gone.
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
                maxFontSizeMultiplier={1.35}
              >
                {error}
              </Text>
            ) : null}
            <Button
              label="delete my account"
              onPress={handleDelete}
              loading={isLoading}
              size="lg"
              className="mt-1"
            />
            <Text
              className="text-center text-[12px] font-light leading-[18px] text-hum-dim"
              maxFontSizeMultiplier={1.35}
            >
              changed your mind? tap back — nothing happens until you confirm.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
