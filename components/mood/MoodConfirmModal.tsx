import React, { useEffect } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/shared/Button';
import { cardShadow } from '@/constants/elevation';
import type { MoodStickerOption } from '@/types';

type Props = {
  visible: boolean;
  /** Sticker the user currently has logged for today (null for first log). */
  current: MoodStickerOption | null;
  /** Sticker the user just picked from the grid. */
  next: MoodStickerOption | null;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Two-tap confirmation gate before a mood is committed to the timeline. The
 * first-log case shows just the picked sticker; the change case shows a
 * `current → next` preview so the user can see exactly what they're swapping
 * and reconsider gracefully if it was a misfire.
 *
 * Backdrop tap, hardware back, and the "not yet" button all cancel; only the
 * primary "log it" button writes. While the write is in flight the modal
 * stays mounted with the primary button in its loading state so the user
 * has feedback and can't double-submit.
 */
export function MoodConfirmModal({
  visible,
  current,
  next,
  saving,
  onConfirm,
  onCancel,
}: Props) {
  // Light tap when the modal opens — gives the choice a small physical
  // moment to land before the user reads the prompt.
  useEffect(() => {
    if (!visible) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [visible]);

  if (!next) return null;

  const isChange = !!current && current.id !== next.id;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => {
        if (saving) return;
        onCancel();
      }}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1 items-center justify-center bg-hum-bg/70 px-8"
        onPress={() => {
          if (saving) return;
          onCancel();
        }}
        accessibilityRole="none"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          className="w-full max-w-[360px] overflow-hidden rounded-[28px] border border-hum-secondary/30"
          style={cardShadow}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 60 : 0}
            tint="dark"
            className="gap-y-5 px-6 py-7"
            style={{
              backgroundColor:
                Platform.OS === 'ios' ? 'rgba(30,28,39,0.62)' : 'rgba(30,28,39,0.96)',
            }}
          >
          {isChange ? (
            <View className="flex-row items-center justify-center gap-x-3.5">
              <StickerPreview sticker={current} dim />
              <Text
                className="text-[18px] font-light text-hum-dim/70"
                allowFontScaling={false}
              >
                →
              </Text>
              <StickerPreview sticker={next} />
            </View>
          ) : (
            <View className="items-center">
              <StickerPreview sticker={next} large />
            </View>
          )}

          <Text
            className="text-center text-[16px] font-medium tracking-tight text-hum-text"
            maxFontSizeMultiplier={1.2}
          >
            log this mood?
          </Text>

          <View className="flex-row gap-3">
            <Button
              label="not yet"
              variant="ghost"
              size="md"
              onPress={onCancel}
              disabled={saving}
              className="flex-1"
            />
            <Button
              label="log it"
              variant="primary"
              size="md"
              onPress={onConfirm}
              loading={saving}
              className="flex-1"
            />
          </View>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StickerPreview({
  sticker,
  dim,
  large,
}: {
  sticker: MoodStickerOption | null;
  dim?: boolean;
  large?: boolean;
}) {
  if (!sticker) return null;
  return (
    <View className="items-center gap-y-1.5">
      <View
        className={`items-center justify-center rounded-2xl border ${
          large ? 'h-[68px] w-[68px]' : 'h-14 w-14'
        } ${
          dim
            ? 'border-hum-border/30 bg-hum-bg/40'
            : 'border-hum-secondary/40 bg-hum-secondary/18'
        }`}
      >
        <Text className={large ? 'text-[36px]' : 'text-[28px]'} allowFontScaling={false}>
          {sticker.emoji}
        </Text>
      </View>
      <Text
        className={`text-[11px] ${
          dim ? 'font-light text-hum-dim' : 'font-medium text-hum-text'
        }`}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {sticker.label}
      </Text>
    </View>
  );
}
