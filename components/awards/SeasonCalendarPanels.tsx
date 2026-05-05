import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ceremony } from '@/types';
import { theme } from '@/constants/theme';
import {
  alignmentStartsSummary,
  calendarHalfLabel,
  formatShortDate,
  seasonElapsedFraction,
  timestampToDate,
} from '@/lib/ceremonyCalendar';
import { CoupleAwardCategoryRow, Couple, Nomination, UserProfile } from '@/types';
import { displayForCategoryId } from '@/lib/awardCategoryConfig';
import {
  hottestCategoryId,
  maxCategoryCount,
  nomineeSpotlightCounts,
  nominationCountsByCategory,
  partnerNominationVibe,
  resolvePartnerUid,
  submissionCountsForViewer,
} from '@/lib/seasonCalendarStats';

function Eyebrow(props: { children: string }) {
  return (
    <Text
      className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
      maxFontSizeMultiplier={1.15}
    >
      {props.children}
    </Text>
  );
}

export function SeasonTimelinePanels(props: { ceremony: Ceremony; now: Date }) {
  const half = calendarHalfLabel(props.now);
  const end = timestampToDate(props.ceremony.periodEnd);
  const progress = seasonElapsedFraction(props.now, props.ceremony);
  const pct = Math.round(progress * 100);
  const alignmentLine = alignmentStartsSummary(props.now, props.ceremony);

  return (
    <View className="rounded-[22px] border border-hum-border/18 bg-hum-card px-5 py-5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[22px] font-light text-hum-text" maxFontSizeMultiplier={1.15}>
          {half.half}
        </Text>
        <Text className="text-[13px] text-hum-muted" maxFontSizeMultiplier={1.2}>
          {half.range}
        </Text>
      </View>

      <View className="mt-5">
        <View className="mb-2 flex-row items-baseline justify-between">
          <Eyebrow>through the season</Eyebrow>
          <Text className="text-[13px] font-medium tabular-nums text-hum-muted" maxFontSizeMultiplier={1.2}>
            {pct}%
          </Text>
        </View>
        <View
          className="w-full overflow-hidden rounded-full"
          style={{ height: 5, backgroundColor: `${theme.border}50` }}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: pct }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              backgroundColor: `${theme.gold}AA`,
              minWidth: pct > 0 ? 4 : 0,
            }}
          />
        </View>
      </View>

      <View className="mt-5 flex-row items-baseline justify-between">
        <Text className="text-[13px] text-hum-muted" maxFontSizeMultiplier={1.2}>
          closes
        </Text>
        <Text className="text-[13px] font-medium text-hum-text" maxFontSizeMultiplier={1.2}>
          {end ? formatShortDate(end) : '—'}
        </Text>
      </View>

      <View className="mt-4 border-t border-hum-border/18 pt-4">
        <Eyebrow>alignment</Eyebrow>
        <Text className="mt-1.5 text-[14px] font-light text-hum-text" maxFontSizeMultiplier={1.25}>
          {alignmentLine}
        </Text>
      </View>
    </View>
  );
}

export function CategoryNominationChart(props: {
  rows: CoupleAwardCategoryRow[];
  counts: Record<string, number>;
  highlightId: string | null;
}) {
  const max = Math.max(1, maxCategoryCount(props.counts));

  return (
    <View className="mt-6">
      <Eyebrow>by category</Eyebrow>
      <View className="mt-3">
        {props.rows.map((c) => {
          const n = props.counts[c.id] ?? 0;
          const w = Math.round((n / max) * 100);
          const hot = props.highlightId === c.id && n > 0;
          return (
            <Pressable
              key={c.id}
              className="mb-3 flex-row items-center gap-2.5 active:opacity-88"
              onPress={() => router.push(`/awards/${c.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${c.label} category`}
            >
              <Text className="w-6 text-center text-[15px]">
                {c.emoji}
              </Text>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-[12px] ${hot ? 'font-semibold text-hum-text' : 'text-hum-muted'}`}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {c.label}
                  </Text>
                  <Text className="text-[12px] tabular-nums text-hum-text" maxFontSizeMultiplier={1.2}>
                    {n}
                  </Text>
                </View>
                <View className="mt-1.5 h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: `${theme.border}44` }}>
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${w}%`,
                      minWidth: n > 0 ? 6 : 0,
                      backgroundColor: hot ? theme.secondary : theme.primary,
                      opacity: n === 0 ? 0.12 : 0.72,
                    }}
                  />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NomineeSpotlightRow(props: {
  forYou: number;
  forPartner: number;
  both: number;
  labelYou: string;
  labelPartner: string;
}) {
  const t = props.forYou + props.forPartner + props.both;
  if (t === 0) return null;
  const lead =
    props.forYou > props.forPartner
      ? props.labelYou
      : props.forPartner > props.forYou
        ? props.labelPartner
        : null;

  return (
    <View className="mt-6">
      <Eyebrow>nominated for</Eyebrow>
      <View className="mt-3 flex-row gap-2">
        {[
          { n: props.forYou, label: props.labelYou },
          { n: props.forPartner, label: props.labelPartner },
          { n: props.both, label: 'both' },
        ].map((item) => (
          <View key={item.label} className="flex-1 rounded-[18px] bg-hum-surface/42 px-3 py-2.5">
            <Text className="text-[20px] font-extralight tabular-nums text-hum-text" maxFontSizeMultiplier={1.1}>
              {item.n}
            </Text>
            <Text className="mt-0.5 text-[10px] text-hum-dim" numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
      <Text className="mt-2 text-[11px] font-light italic text-hum-dim" maxFontSizeMultiplier={1.2}>
        {lead ? `most about ${lead}` : 'balanced spotlight'}
      </Text>
    </View>
  );
}

export function PartnerNominationSplit(props: {
  mine: number;
  partner: number;
  other: number;
  labelMine: string;
  labelPartner: string;
}) {
  const total = props.mine + props.partner + props.other;
  const vibe = partnerNominationVibe(props.mine, props.partner);

  return (
    <View>
      <Eyebrow>who wrote them</Eyebrow>
      <View className="mt-3 flex-row gap-2">
        <View className="flex-1 rounded-[18px] bg-hum-surface/42 px-3 py-2.5">
          <Text className="text-[20px] font-extralight tabular-nums text-hum-text" maxFontSizeMultiplier={1.1}>
            {props.mine}
          </Text>
          <Text className="mt-0.5 text-[10px] text-hum-dim" numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {props.labelMine}
          </Text>
        </View>
        <View className="flex-1 rounded-[18px] bg-hum-surface/42 px-3 py-2.5">
          <Text className="text-[20px] font-extralight tabular-nums text-hum-text" maxFontSizeMultiplier={1.1}>
            {props.partner}
          </Text>
          <Text className="mt-0.5 text-[10px] text-hum-dim" numberOfLines={1} maxFontSizeMultiplier={1.15}>
            {props.labelPartner}
          </Text>
        </View>
      </View>
      {total > 0 ? (
        <View className="mt-3 h-[5px] w-full flex-row overflow-hidden rounded-full" style={{ backgroundColor: `${theme.border}44` }}>
          {props.mine > 0 ? (
            <View style={{ width: `${(props.mine / total) * 100}%`, backgroundColor: theme.primary, minWidth: 4 }} />
          ) : null}
          {props.partner > 0 ? (
            <View style={{ width: `${(props.partner / total) * 100}%`, backgroundColor: theme.secondary, minWidth: 4 }} />
          ) : null}
        </View>
      ) : null}
      <Text className="mt-2 text-[11px] font-light text-hum-dim" maxFontSizeMultiplier={1.2}>
        {vibe}
      </Text>
    </View>
  );
}

export function SeasonStatsInfographic(props: {
  nominations: Nomination[];
  couple: Couple;
  profile: UserProfile | null;
  partnerProfile: UserProfile | null;
}) {
  const rows = props.couple.awardCategories ?? [];
  const categoryIds = [
    ...new Set([...rows.map((r) => r.id), ...props.nominations.map((n) => n.category)]),
  ];
  const counts = nominationCountsByCategory(props.nominations, categoryIds);
  const enabledOrder = rows.filter((r) => r.enabled).map((r) => r.id);
  const tieOrder = enabledOrder.length ? enabledOrder : categoryIds;
  const hot = hottestCategoryId(counts, tieOrder);
  const hotDisplay = hot ? displayForCategoryId(rows, hot) : null;
  const chartRows = rows.filter((r) => r.enabled || (counts[r.id] ?? 0) > 0);
  const partnerUid = resolvePartnerUid(props.profile, props.couple);
  const myUid = props.profile?.uid ?? null;
  const { mine, partner, other } = submissionCountsForViewer(props.nominations, myUid, partnerUid);
  const spotlight = nomineeSpotlightCounts(props.nominations, myUid, partnerUid);

  const labelMine = (props.profile?.displayName ?? 'you').split(' ')[0] || 'you';
  const labelPartner = (props.partnerProfile?.displayName ?? 'partner').split(' ')[0] || 'partner';

  return (
    <View>
      {hotDisplay && hot && (counts[hot] ?? 0) > 0 ? (
        <View className="mb-6 flex-row items-center gap-2.5">
          <Text className="text-[20px]">{hotDisplay.emoji}</Text>
          <View>
            <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim" maxFontSizeMultiplier={1.12}>
              most active
            </Text>
            <Text className="text-[15px] font-medium text-hum-text" maxFontSizeMultiplier={1.2}>
              {hotDisplay.label}
              <Text className="text-hum-dim"> · {counts[hot]}</Text>
            </Text>
          </View>
        </View>
      ) : null}
      <PartnerNominationSplit
        mine={mine}
        partner={partner}
        other={other}
        labelMine={labelMine}
        labelPartner={labelPartner}
      />
      <NomineeSpotlightRow
        forYou={spotlight.forYou}
        forPartner={spotlight.forPartner}
        both={spotlight.both}
        labelYou={labelMine}
        labelPartner={labelPartner}
      />
      <CategoryNominationChart rows={chartRows} counts={counts} highlightId={hot} />
    </View>
  );
}
