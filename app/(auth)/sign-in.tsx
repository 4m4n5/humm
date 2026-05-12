import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { useAuthStore } from '@/lib/stores/authStore';
import { AUTH_SCREEN_PADDING_TOP } from '@/constants/screenLayout';

export default function SignIn() {
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSignIn() {
    clearError();
    try {
      await signIn(email.trim(), password);
    } catch {
      /* error surfaced via store */
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
            className="flex-1 justify-center gap-y-10 px-6 pb-10"
            style={{ paddingTop: AUTH_SCREEN_PADDING_TOP }}
          >
            <View className="items-center gap-y-3">
              <Text
                className="text-center text-[40px] font-extralight leading-[44px] tracking-[-0.02em] text-hum-primary"
                maxFontSizeMultiplier={1.3}
              >
                Hum
              </Text>
              <Text
                className="text-center text-[14px] font-light tracking-wide text-hum-muted"
                maxFontSizeMultiplier={1.3}
              >
                a quiet app for two
              </Text>
            </View>

            <View className="gap-y-5" style={{ maxWidth: 400, width: '100%', alignSelf: 'center' }}>
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
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
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

              <Button label="sign in" onPress={handleSignIn} loading={isLoading} size="lg" className="mt-2" />
            </View>

            <View className="flex-row flex-wrap items-center justify-center gap-x-1">
              <Text className="text-[14px] font-light text-hum-muted" maxFontSizeMultiplier={1.3}>
                new here?{' '}
              </Text>
              <Pressable
                onPress={() => router.push('/(auth)/sign-up')}
                accessibilityRole="link"
                accessibilityLabel="Create an account, sign up"
                className="min-h-[44px] items-center justify-center px-1"
              >
                <Text className="text-[14px] font-medium text-hum-primary" maxFontSizeMultiplier={1.3}>
                  create an account
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
