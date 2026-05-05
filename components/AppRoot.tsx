import React, { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/lib/stores/authStore';
import { View } from 'react-native';
import { LoadingState } from '@/components/shared/LoadingState';
import { ensureNotificationHandler } from '@/lib/ceremonyReminders';
import { registerExpoPushToken } from '@/lib/registerExpoPushToken';
import { migrateLegacyMoodSticker } from '@/lib/moodMigration';

/** Main app shell — only loaded when Firebase env vars are present (see `app/_layout.tsx`). */
export default function AppRoot() {
  const { init, isLoading, firebaseUser, profile } = useAuthStore();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    ensureNotificationHandler();
    const unsub = init();

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (typeof screen === 'string' && screen.startsWith('/')) {
        router.push(screen as never);
      }
    });

    return () => {
      unsub();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    void registerExpoPushToken(profile.uid).catch((e) =>
      console.warn('[AppRoot] registerExpoPushToken', e),
    );
    if (profile) {
      void migrateLegacyMoodSticker(profile).catch((e) =>
        console.warn('[AppRoot] migrateLegacyMoodSticker', e),
      );
    }
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
