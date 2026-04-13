import React from 'react';
import { View, Text } from 'react-native';
import { Couple, Nomination, Reason, UserProfile } from '@/types';
import { tallyNomineeReceivedBreakdown } from '@/lib/nominationStats';
import { resolvePartnerUid } from '@/lib/seasonCalendarStats';
import { theme } from '@/constants/theme';

function CredSection(props: { title: string; showTopRule: boolean; children: React.ReactNode }) {
  return (
    <View className={props.showTopRule ? 'mt-3 border-t border-hum-border/20 pt-3' : ''}>
      <Text
        className="mb-2 text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim"
        maxFontSizeMultiplier={1.2}
      >
        {props.title}
      </Text>
      {props.children}
    </View>
  );
}

function CredStatTile(props: {
  n: number;
  caption: string;
  accessibilityLabel: string;
}) {
  return (
    <View
      className="min-w-0 flex-1 rounded-[16px] bg-hum-surface/60 px-2.5 py-2.5"
      accessibilityLabel={props.accessibilityLabel}
    >
      <Text className="text-[20px] font-extralight tabular-nums text-hum-text" maxFontSizeMultiplier={1.1}>
        {props.n}
      </Text>
      <Text className="mt-0.5 text-[10px] font-light text-hum-dim" numberOfLines={1} maxFontSizeMultiplier={1.15}>
        {props.caption}
      </Text>
    </View>
  );
}

function countReasonsForYou(reasons: Reason[], myUid: string): number {
  return reasons.filter((r) => r.aboutId === myUid).length;
}

function countReasonsByYouForPartner(
  reasons: Reason[],
  myUid: string,
  partnerId: string | null,
): number {
  if (!partnerId) return 0;
  return reasons.filter((r) => r.authorId === myUid && r.aboutId === partnerId).length;
}

type Props = {
  profile: UserProfile;
  couple: Couple | null;
  partnerShortName: string;
  reasons: Reason[];
  nominations: Nomination[];
  reasonStreak: number;
};

function RelationshipReasonsInfographic(props: {
  byYouForPartner: number;
  aboutYou: number;
  streakDays: number;
  labelYou: string;
  labelPartner: string;
}) {
  const r = props.byYouForPartner + props.aboutYou;
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`reasons: ${props.byYouForPartner} for partner, ${props.aboutYou} about you, streak ${props.streakDays} days`}
    >
      <View className="flex-row gap-2">
        <CredStatTile
          n={props.byYouForPartner}
          caption={`→ ${props.labelPartner}`}
          accessibilityLabel={`reasons you wrote for ${props.labelPartner}: ${props.byYouForPartner}`}
        />
        <CredStatTile
          n={props.aboutYou}
          caption={`← ${props.labelYou}`}
          accessibilityLabel={`reasons about you: ${props.aboutYou}`}
        />
        <CredStatTile
          n={props.streakDays}
          caption="🔥"
          accessibilityLabel={`reason streak: ${props.streakDays} days`}
        />
      </View>
      {r > 0 ? (
        <View
          className="mt-3 h-[5px] w-full flex-row overflow-hidden rounded-full"
          style={{ backgroundColor: `${theme.border}66` }}
          accessibilityRole="none"
        >
          {props.byYouForPartner > 0 ? (
            <View
              style={{
                width: `${(props.byYouForPartner / r) * 100}%`,
                backgroundColor: theme.primary,
                minWidth: 4,
              }}
            />
          ) : null}
          {props.aboutYou > 0 ? (
            <View
              style={{
                width: `${(props.aboutYou / r) * 100}%`,
                backgroundColor: theme.secondary,
                minWidth: 4,
              }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function AwardsReceivedInfographic(props: {
  forYou: number;
  forPartner: number;
  both: number;
  labelYou: string;
  labelPartner: string;
}) {
  const t = props.forYou + props.forPartner + props.both;
  return (
    <View accessibilityRole="summary" accessibilityLabel={`nominations received: ${t} total`}>
      <View className="flex-row gap-2">
        <CredStatTile
          n={props.forYou}
          caption={props.labelYou}
          accessibilityLabel={`stories about you: ${props.forYou}`}
        />
        <CredStatTile
          n={props.forPartner}
          caption={props.labelPartner}
          accessibilityLabel={`stories about partner: ${props.forPartner}`}
        />
        <CredStatTile
          n={props.both}
          caption="both"
          accessibilityLabel={`stories about both: ${props.both}`}
        />
      </View>
      {t > 0 ? (
        <View
          className="mt-3 h-[5px] w-full flex-row overflow-hidden rounded-full"
          style={{ backgroundColor: `${theme.border}66` }}
          accessibilityRole="none"
        >
          {props.forYou > 0 ? (
            <View
              style={{
                width: `${(props.forYou / t) * 100}%`,
                backgroundColor: theme.primary,
                minWidth: 4,
              }}
            />
          ) : null}
          {props.forPartner > 0 ? (
            <View
              style={{
                width: `${(props.forPartner / t) * 100}%`,
                backgroundColor: theme.secondary,
                minWidth: 4,
              }}
            />
          ) : null}
          {props.both > 0 ? (
            <View
              style={{
                width: `${(props.both / t) * 100}%`,
                backgroundColor: theme.gold,
                minWidth: 4,
              }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Relationship Cred: reasons + awards nominee breakdown (all-time couple jar).
 * Partner uid is inferred from `couple` when `profile.partnerId` is missing so nominee matching
 * stays aligned with Firestore `nomineeId` values.
 */
export function ProfileSoftStats({
  profile,
  couple,
  partnerShortName,
  reasons,
  nominations,
  reasonStreak,
}: Props) {
  const myUid = profile.uid;
  const partnerUid = resolvePartnerUid(profile, couple);
  const viewerShortName = (profile.displayName ?? 'you').split(' ')[0] || 'you';
  const forYou = countReasonsForYou(reasons, myUid);
  const byYou = countReasonsByYouForPartner(reasons, myUid, partnerUid);
  const received = tallyNomineeReceivedBreakdown(nominations, myUid, partnerUid);

  return (
    <View className="gap-y-2">
      <Text
        className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim"
        maxFontSizeMultiplier={1.2}
      >
        relationship cred
      </Text>
      <View className="rounded-[20px] border border-hum-border/18 bg-hum-surface/20 px-4 py-3">
        <CredSection title="reasons" showTopRule={false}>
          <RelationshipReasonsInfographic
            byYouForPartner={byYou}
            aboutYou={forYou}
            streakDays={reasonStreak}
            labelYou={viewerShortName}
            labelPartner={partnerShortName}
          />
        </CredSection>
        <CredSection title="awards" showTopRule>
          <AwardsReceivedInfographic
            forYou={received.forYou}
            forPartner={received.forPartner}
            both={received.both}
            labelYou={viewerShortName}
            labelPartner={partnerShortName}
          />
        </CredSection>
      </View>
    </View>
  );
}
