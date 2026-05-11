import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { XP_BANNER_ABOVE_TAB_GAP, tabBarTotalHeight } from '@/constants/tabBar';
import { useXpFeedbackStore } from '@/lib/stores/xpFeedbackStore';
import { useCelebrationOverlayStore } from '@/lib/stores/celebrationOverlayStore';
import type { GrantXpResult } from '@/lib/firestore/gamification';
import { getBadge } from '@/constants/badges';
import { MODAL_SHEET_PADDING_H, MODAL_SHEET_PADDING_V } from '@/constants/screenLayout';
import { REDUCE_MOTION_NEVER } from '@/lib/motion';

type ModalPayload =
  | { kind: 'level'; result: GrantXpResult }
  | { kind: 'badges'; ids: string[] };

export function GamificationToastHost() {
  const insets = useSafeAreaInsets();
  const queue = useXpFeedbackStore((s) => s.queue);
  const shift = useXpFeedbackStore((s) => s.shift);
  const celebrationActive = useCelebrationOverlayStore((s) => s.active);
  const head = queue[0];
  const [banner, setBanner] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalPayload | null>(null);
  const bannerOpacity = useSharedValue(0);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBannerTimer = () => {
    if (bannerTimer.current) {
      clearTimeout(bannerTimer.current);
      bannerTimer.current = null;
    }
  };

  useEffect(() => () => clearBannerTimer(), []);

  const onFadeOutComplete = useCallback(() => {
    setBanner(null);
    shift();
  }, [shift]);

  const showBanner = useCallback(
    (message: string) => {
      clearBannerTimer();
      // Cancel any in-flight fade so a fresh xp grant on top of a
      // previous banner doesn't compound the opacity animation.
      cancelAnimation(bannerOpacity);
      setBanner(message);
      bannerOpacity.value = 0;
      bannerOpacity.value = withTiming(1, {
        duration: 200,
        reduceMotion: REDUCE_MOTION_NEVER,
      });
      bannerTimer.current = setTimeout(() => {
        bannerOpacity.value = withTiming(
          0,
          { duration: 320, reduceMotion: REDUCE_MOTION_NEVER },
          (finished) => {
            if (finished) runOnJS(onFadeOutComplete)();
          },
        );
      }, 2400);
    },
    [bannerOpacity, onFadeOutComplete],
  );

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
  }));

  useEffect(() => {
    if (modal) return;
    if (!head) return;
    // Hold the queue while a peak-moment celebration overlay (emoji shower)
    // is on screen so XP banners and level/badge modals don't compete with
    // the celebration. The effect re-runs when `celebrationActive` flips
    // back to 0 and processes whatever was waiting.
    if (celebrationActive > 0) return;

    if (head.kind === 'xp') {
      const leveledUp = head.result.newLevel > head.result.previousLevel;
      if (leveledUp) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        shift();
        setModal({ kind: 'level', result: head.result });
      } else {
        showBanner(`+${head.result.xpGained} xp`);
      }
      return;
    }

    if (head.kind === 'badges') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      shift();
      setModal({ kind: 'badges', ids: head.ids });
    }
  }, [head, modal, shift, showBanner, celebrationActive]);

  const closeModal = () => setModal(null);

  const modalTitle =
    modal?.kind === 'level'
      ? 'level up'
      : modal?.kind === 'badges'
        ? modal.ids.length > 1
          ? 'new badges'
          : 'new badge'
        : '';

  const modalBody =
    modal?.kind === 'level'
      ? `you’re ${modal.result.newLevelName.toLowerCase()} now — gentle glow, louder hum`
      : modal?.kind === 'badges'
        ? modal.ids
            .map((id) => {
              const b = getBadge(id);
              return b ? `${b.emoji} ${b.name}` : id;
            })
            .join('\n')
        : '';

  return (
    <>
      {banner ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              bottom: tabBarTotalHeight(insets.bottom) + XP_BANNER_ABOVE_TAB_GAP,
              left: 24,
              right: 24,
              zIndex: 9999,
            },
            bannerStyle,
          ]}
        >
          <View className="rounded-[22px] border border-hum-primary/35 bg-hum-card/95 px-5 py-3.5">
            <Text className="text-center text-[15px] font-medium tracking-wide text-hum-primary" maxFontSizeMultiplier={1.3}>
              {banner}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      <Modal
        visible={!!modal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
        accessibilityViewIsModal
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/55 px-6"
          onPress={closeModal}
          accessibilityRole="button"
          accessibilityLabel="dismiss level up dialog"
        >
          <Pressable
            className="w-full max-w-sm rounded-[22px] border border-hum-border/18 bg-hum-card/95"
            style={{
              paddingHorizontal: MODAL_SHEET_PADDING_H,
              paddingVertical: MODAL_SHEET_PADDING_V,
            }}
            onPress={closeModal}
            accessibilityRole="button"
            accessibilityLabel={modal ? `${modalTitle}. Tap to continue.` : undefined}
          >
            <Text
              className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
              maxFontSizeMultiplier={1.3}
            >
              {modalTitle}
            </Text>
            <Text
              className="mt-6 text-center text-[17px] font-light leading-[26px] text-hum-text"
              maxFontSizeMultiplier={1.35}
            >
              {modalBody}
            </Text>
            <Text
              className="mt-8 text-center text-[13px] font-medium text-hum-primary"
              maxFontSizeMultiplier={1.35}
            >
              tap to continue
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
