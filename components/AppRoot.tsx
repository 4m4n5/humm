import React, { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useAuthStore } from '@/lib/stores/authStore';
import { View } from 'react-native';
import { LoadingState } from '@/components/shared/LoadingState';
import { migrateLegacyMoodSticker } from '@/lib/moodMigration';
import { applyInterToTextDefaults } from '@/lib/setupFonts';

// Wire the Inter weight → fontFamily mapping for all <Text> in the app once.
// Safe to call before fonts are actually loaded; iOS / Android will fall back
// to the system font for the brief moment between mount and useFonts resolve.
applyInterToTextDefaults();

// Keep the native splash up until fonts are loaded so we never flash the
// system font on first launch. Errors are non-fatal (e.g. on web).
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Main app shell — only loaded when Firebase env vars are present (see `app/_layout.tsx`). */
export default function AppRoot() {
  const { init, isLoading, firebaseUser, profile } = useAuthStore();
  const responseListener = useRef<{ remove(): void } | null>(null);

  const [fontsLoaded] = useFonts({
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const unsub = init();

    if (Platform.OS !== 'web') {
      const setup = async () => {
        const Notifications = await import('expo-notifications');
        const { ensureNotificationHandler } = await import('@/lib/ceremonyReminders');
        ensureNotificationHandler();
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
          const screen = response.notification.request.content.data?.screen;
          if (typeof screen === 'string' && screen.startsWith('/')) {
            router.push(screen as never);
          }
        });
      };
      setup();
    }

    return () => {
      unsub();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    const uid = profile.uid;

    if (Platform.OS !== 'web') {
      // Initial attempt on auth/profile readiness.
      import('@/lib/registerExpoPushToken').then(({ registerExpoPushToken }) =>
        registerExpoPushToken(uid).catch((e) =>
          console.warn('[AppRoot] registerExpoPushToken', e),
        ),
      );

      // Self-healing path: re-attempt registration whenever the app comes
      // back to the foreground. Covers the common case where a user toggles
      // the OS notification permission in Settings and returns to the app —
      // we pick up the new state and persist the token without requiring
      // any explicit UI interaction.
      const sub = AppState.addEventListener('change', (next) => {
        if (next !== 'active') return;
        import('@/lib/registerExpoPushToken').then(({ registerExpoPushToken }) =>
          registerExpoPushToken(uid).catch((e) =>
            console.warn('[AppRoot] registerExpoPushToken on resume', e),
          ),
        );
      });

      if (profile) {
        void migrateLegacyMoodSticker(profile).catch((e) =>
          console.warn('[AppRoot] migrateLegacyMoodSticker', e),
        );
      }

      return () => sub.remove();
    }

    if (profile) {
      void migrateLegacyMoodSticker(profile).catch((e) =>
        console.warn('[AppRoot] migrateLegacyMoodSticker', e),
      );
    }
  }, [profile?.uid]);

  const lastRouteRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    let target: string;
    if (!firebaseUser) {
      target = '/(auth)/sign-in';
    } else if (!profile?.coupleId) {
      target = '/(auth)/link-partner';
    } else {
      target = '/(tabs)';
    }

    if (lastRouteRef.current === target) return;
    lastRouteRef.current = target;

    // Defer to next frame so the replace doesn't fire inside React
    // Navigation's useSyncState layout-effect commit cycle (causes
    // "Maximum update depth exceeded" on React 19 + RN 0.81).
    const raf = requestAnimationFrame(() => {
      router.replace(target as any);
    });
    return () => cancelAnimationFrame(raf);
  }, [isLoading, firebaseUser, profile?.coupleId]);

  if (isLoading || !fontsLoaded) {
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
