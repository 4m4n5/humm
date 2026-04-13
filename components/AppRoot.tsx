import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/lib/stores/authStore';
import { View } from 'react-native';
import { LoadingState } from '@/components/shared/LoadingState';
import { ensureNotificationHandler } from '@/lib/ceremonyReminders';
import { registerExpoPushToken } from '@/lib/registerExpoPushToken';

/** Main app shell — only loaded when Firebase env vars are present (see `app/_layout.tsx`). */
export default function AppRoot() {
  const { init, isLoading, firebaseUser, profile } = useAuthStore();

  useEffect(() => {
    ensureNotificationHandler();
    const unsub = init();
    return unsub;
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    void registerExpoPushToken(profile.uid);
  }, [profile?.uid]);

  useEffect(() => {
    if (isLoading) return;

    if (!firebaseUser) {
      router.replace('/(auth)/sign-in');
    } else if (!profile?.coupleId) {
      router.replace('/(auth)/link-partner');
    } else {
      router.replace('/(tabs)');
    }
  }, [isLoading, firebaseUser, profile?.coupleId]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center bg-hum-bg">
        <LoadingState />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
