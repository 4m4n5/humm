import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/stores/authStore';
import { useDecisionStore } from '@/lib/stores/decisionStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { useReasonStore } from '@/lib/stores/reasonStore';
import { useBattleStore } from '@/lib/stores/battleStore';
import { useHabitStore } from '@/lib/stores/habitStore';
import { useMoodStore } from '@/lib/stores/moodStore';
import { theme } from '@/constants/theme';
import {
  TAB_BAR_PADDING_BOTTOM_BASE,
  TAB_BAR_PADDING_TOP,
  tabBarTotalHeight,
} from '@/constants/tabBar';
import { GamificationToastHost } from '@/components/gamification/GamificationToastHost';
import { ensureWeeklyChallengeRotated } from '@/lib/firestore/coupleGamification';

const tabHaptic = () => {
  void Haptics.selectionAsync();
};

export default function TabsLayout() {
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: theme.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: `${theme.border}99`,
      paddingTop: TAB_BAR_PADDING_TOP,
      paddingBottom: TAB_BAR_PADDING_BOTTOM_BASE + insets.bottom,
      height: tabBarTotalHeight(insets.bottom),
    }),
    [insets.bottom],
  );

  useEffect(() => {
    if (!profile?.coupleId) return;
    const u1 = useDecisionStore.getState().init(profile.coupleId);
    const u2 = useNominationsStore.getState().init(profile.coupleId, profile.uid);
    const u3 = useReasonStore.getState().init(profile.coupleId);
    const u4 = useBattleStore.getState().init(profile.coupleId);
    const u5 = useHabitStore.getState().init(profile.coupleId);
    // Mood needs both uids — only subscribe once the partner link exists.
    const u6 = profile.partnerId
      ? useMoodStore.getState().init(profile.coupleId, profile.uid, profile.partnerId)
      : null;
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      if (u6) u6();
    };
  }, [profile?.coupleId, profile?.uid, profile?.partnerId]);

  useEffect(() => {
    if (!profile?.coupleId) return;
    void ensureWeeklyChallengeRotated(profile.coupleId).catch((e) =>
      console.warn('[tabs] ensureWeeklyChallengeRotated', e),
    );
  }, [profile?.coupleId]);

  return (
    <View style={styles.root}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.dim,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.3,
          textTransform: 'lowercase',
          marginTop: 3,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{ tabPress: tabHaptic }}
        options={{
          title: 'home',
          tabBarAccessibilityLabel: 'home tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          // Hidden from the tab bar — entry happens from the home screen's
          // mood card. Routes (`/mood`, `/mood/log`) remain accessible.
          href: null,
        }}
      />
      {/*
        Canonical feature order across the app:
        mood → decide → habits → reasons → awards.
        Mood is hidden from the ribbon (entered from the home mood card),
        so the visible sequence here is: decide → habits → reasons → awards.
      */}
      <Tabs.Screen
        name="decide"
        listeners={{ tabPress: tabHaptic }}
        options={{
          title: 'decide',
          tabBarAccessibilityLabel: 'decide tab, quick spin and battle',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        listeners={{ tabPress: tabHaptic }}
        options={{
          title: 'habits',
          tabBarAccessibilityLabel: 'habits tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox-outline" size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reasons"
        listeners={{ tabPress: tabHaptic }}
        options={{
          title: 'reasons',
          tabBarAccessibilityLabel: 'reasons tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="awards"
        listeners={{ tabPress: tabHaptic }}
        options={{
          title: 'awards',
          tabBarAccessibilityLabel: 'awards and nominations tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{ tabPress: tabHaptic }}
        options={{
          title: 'you',
          tabBarAccessibilityLabel: 'profile tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size - 1} color={color} />
          ),
        }}
      />
    </Tabs>
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <GamificationToastHost />
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
