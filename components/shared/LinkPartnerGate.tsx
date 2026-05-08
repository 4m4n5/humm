import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState } from '@/components/shared/EmptyState';
import { AmbientGlow, type AmbientGlowTone } from '@/components/shared/AmbientGlow';
import { navVoice } from '@/constants/hummVoice';

type Props = {
  /** Feature name used for "back to {destination}" CTA. */
  backTo?: string;
  /** AmbientGlow tone — matches the parent feature. */
  tone?: AmbientGlowTone;
};

/**
 * Full-screen gate shown when a screen requires a linked partner
 * but the user hasn't connected one yet. Standardises copy, icon,
 * and back-navigation across all gated features.
 */
export function LinkPartnerGate({ backTo, tone }: Props) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg">
      {tone && <AmbientGlow tone={tone} />}
      <EmptyState
        ionicon="people-outline"
        title="link your partner first"
        description="invite them · everything here is for two"
        primaryAction={
          backTo
            ? { label: navVoice.backTo(backTo), onPress: () => router.back() }
            : undefined
        }
      />
    </SafeAreaView>
  );
}
