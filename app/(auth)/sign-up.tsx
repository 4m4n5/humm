import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { useAuthStore } from '@/lib/stores/authStore';
import { AUTH_SCREEN_PADDING_TOP } from '@/constants/screenLayout';

export default function SignUp() {
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSignUp() {
    clearError();
    if (!name.trim()) {
      Alert.alert('name?', 'we need something to call you');
      return;
    }
    if (!email.trim()) {
      Alert.alert('email?', 'drop the address you’ll sign in with');
      return;
    }
    try {
      await signUp(email.trim(), password, name.trim());
    } catch {
      /* error surfaced via store */
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
            className="flex-1 justify-center gap-y-10 px-6 pb-10"
            style={{ paddingTop: AUTH_SCREEN_PADDING_TOP }}
          >
            <View className="items-center gap-y-4">
              <Text
                className="text-[42px] font-extralight tracking-[0.38em] text-hum-primary"
                maxFontSizeMultiplier={1.25}
              >
                humm
              </Text>
              <Text
                className="text-center text-[14px] font-light tracking-wide text-hum-muted"
                maxFontSizeMultiplier={1.35}
              >
                let’s set up your corner
              </Text>
            </View>

            <View className="gap-y-5" style={{ maxWidth: 400, width: '100%', alignSelf: 'center' }}>
              <Input
                label="your name"
                placeholder="what should we call you?"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
              />
              <Input
                label="email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <Input
                label="password"
                placeholder="at least six characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
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
                label="create account"
                onPress={handleSignUp}
                loading={isLoading}
                size="lg"
                className="mt-2"
              />
            </View>

            <View className="items-center">
              <Text className="text-[14px] font-light text-hum-muted" maxFontSizeMultiplier={1.35}>
                already have one?{' '}
                <Text
                  className="font-medium text-hum-primary"
                  onPress={() => router.back()}
                  accessibilityRole="link"
                  accessibilityLabel="back to sign in"
                >
                  sign in
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
