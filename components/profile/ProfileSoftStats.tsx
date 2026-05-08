import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import {
  Couple,
  Habit,
  HabitCheckin,
  MoodEntry,
  MoodStickerOption,
  Nomination,
  Reason,
  UserProfile,
} from '@/types';
import { tallyNomineeReceivedBreakdown } from '@/lib/nominationStats';
import { resolvePartnerUid } from '@/lib/seasonCalendarStats';
import { getMoodStickerById } from '@/constants/moodStickers';
import { useHabitStore } from '@/lib/stores/habitStore';
import { useMoodStore } from '@/lib/stores/moodStore';
import {
  activeDailyHabits,
  hasDailyCheckin,
  indexHabitCheckins,
} from '@/lib/habitStreakLogic';
import { localDayKey, offsetLocalDayKey } from '@/lib/dateKeys';

const HABIT_WINDOW_DAYS = 60;

function CredSection(props: { title: string; showTopRule: boolean; children: React.ReactNode }) {
  return (
    <View className={props.showTopRule ? 'mt-2.5 border-t border-hum-border/15 pt-2.5' : ''}>
      <Text
        className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
        maxFontSizeMultiplier={1.2}
      >
        {props.title}
      </Text>
      {props.children}
    </View>
  );
}

type CredStatItem = {
  /** Number, glyph string ("🥰 😌"), or `'–'` for empty state. */
  value: string | number;
  label: string;
  /** Emoji values skip tabular-nums for consistent glyph baselines. */
  isGlyph?: boolean;
};

/**
 * Uniform 3-column stat row. Each column holds a number above its label so
 * the panel reads as a clean grid without any borders or backgrounds — pure
 * typography rhythm. Columns share equal width via `flex-1` so values line
 * up across all four cred sections.
 *
 * Items are passed in narrative order (most engaging stat first).
 */
function CredStatRow(props: { items: CredStatItem[]; accessibilityLabel: string }) {
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={props.accessibilityLabel}
      className="flex-row gap-x-3"
    >
      {props.items.map((item, i) => (
        <View key={`stat-${i}`} className="min-w-0 flex-1">
          <Text
            className={
              item.isGlyph
                ? 'text-[18px] leading-[22px] text-hum-text'
                : 'text-[18px] font-light tabular-nums leading-[22px] text-hum-text'
            }
            maxFontSizeMultiplier={1.25}
          >
            {item.value}
          </Text>
          <Text
            className="mt-0.5 text-[10.5px] font-light tracking-[0.04em] text-hum-dim"
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Reasons + Awards (existing) ──────────────────────────────────────────

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

/**
 * Reasons cred row. Narrative order: notes for you → notes for them →
 * how consistent the loop is.
 */
function RelationshipReasonsInfographic(props: {
  byYouForPartner: number;
  aboutYou: number;
  streakDays: number;
}) {
  return (
    <CredStatRow
      accessibilityLabel={`reasons: ${props.aboutYou} for you, ${props.byYouForPartner} for them, ${props.streakDays} day streak`}
      items={[
        { value: props.aboutYou, label: 'for you' },
        { value: props.byYouForPartner, label: 'for them' },
        { value: props.streakDays, label: 'day streak' },
      ]}
    />
  );
}

/**
 * Awards cred row. Narrative order: about you → about them → about both.
 */
function AwardsReceivedInfographic(props: {
  forYou: number;
  forPartner: number;
  both: number;
}) {
  return (
    <CredStatRow
      accessibilityLabel={`nominations: ${props.forYou} about you, ${props.forPartner} about them, ${props.both} about both`}
      items={[
        { value: props.forYou, label: 'about you' },
        { value: props.forPartner, label: 'about them' },
        { value: props.both, label: 'about both' },
      ]}
    />
  );
}

// ─── Mood (new) ───────────────────────────────────────────────────────────

type MoodStats = {
  vibeMatches: number;
  myTop: MoodStickerOption | null;
  partnerTop: MoodStickerOption | null;
};

function computeMoodStats(
  entries: MoodEntry[],
  myUid: string,
  partnerUid: string | null,
): MoodStats {
  const myTally = new Map<string, number>();
  const partnerTally = new Map<string, number>();

  // dayKey → { mySticker, partnerSticker } so we can detect "both logged the
  // same sticker today" without re-iterating.
  const byDay = new Map<string, { mine?: string; theirs?: string }>();

  for (const e of entries) {
    const sid = e.current?.stickerId;
    if (!sid) continue;
    if (e.uid === myUid) {
      myTally.set(sid, (myTally.get(sid) ?? 0) + 1);
      const slot = byDay.get(e.dayKey) ?? {};
      slot.mine = sid;
      byDay.set(e.dayKey, slot);
    } else if (partnerUid && e.uid === partnerUid) {
      partnerTally.set(sid, (partnerTally.get(sid) ?? 0) + 1);
      const slot = byDay.get(e.dayKey) ?? {};
      slot.theirs = sid;
      byDay.set(e.dayKey, slot);
    }
  }

  let vibeMatches = 0;
  for (const slot of byDay.values()) {
    if (slot.mine && slot.theirs && slot.mine === slot.theirs) {
      vibeMatches += 1;
    }
  }

  const top = (m: Map<string, number>): MoodStickerOption | null => {
    let bestId: string | null = null;
    let bestN = 0;
    for (const [id, n] of m.entries()) {
      if (n > bestN) {
        bestId = id;
        bestN = n;
      }
    }
    return bestId ? getMoodStickerById(bestId) : null;
  };

  return {
    vibeMatches,
    myTop: top(myTally),
    partnerTop: top(partnerTally),
  };
}

/**
 * Mood cred row. Narrative order: how long you've been logging together →
 * how often you matched → your most common vibes side-by-side.
 */
function MoodCredInfographic(props: {
  bothLoggedStreak: number;
  vibeMatches: number;
  myTop: MoodStickerOption | null;
  partnerTop: MoodStickerOption | null;
}) {
  const myEmoji = props.myTop?.emoji ?? '·';
  const theirEmoji = props.partnerTop?.emoji ?? '·';
  return (
    <CredStatRow
      accessibilityLabel={`mood: your top vibe ${props.myTop?.label ?? 'none yet'}, partner top vibe ${props.partnerTop?.label ?? 'none yet'}, ${props.vibeMatches} vibe matches, ${props.bothLoggedStreak} day streak`}
      items={[
        { value: `${myEmoji} ${theirEmoji}`, label: 'top vibes', isGlyph: true },
        { value: props.vibeMatches, label: 'vibe matches' },
        { value: props.bothLoggedStreak, label: 'day streak' },
      ]}
    />
  );
}

// ─── Habits (new) ─────────────────────────────────────────────────────────

type HabitsStats = {
  bestRun: number;
  inSyncDays: number;
};

function computeHabitsStatsForWindow(
  habits: Habit[],
  checkins: HabitCheckin[],
  myUid: string,
  partnerUid: string | null,
  endDayKey: string,
  windowDays: number,
): HabitsStats {
  const dailies = activeDailyHabits(habits);
  if (dailies.length === 0) {
    return { bestRun: 0, inSyncDays: 0 };
  }

  const sharedDailies = dailies.filter((h) => h.scope === 'shared');
  const myPersonal = dailies.filter(
    (h) => h.scope === 'personal' && h.createdBy === myUid,
  );
  const partnerPersonal = partnerUid
    ? dailies.filter((h) => h.scope === 'personal' && h.createdBy === partnerUid)
    : [];

  const myOwed = sharedDailies.length + myPersonal.length;
  const partnerOwed = partnerUid
    ? sharedDailies.length + partnerPersonal.length
    : 0;

  const keys = indexHabitCheckins(
    checkins.filter((c) => c.cadence === 'daily'),
  );

  let inSync = 0;
  let bestRun = 0;
  let run = 0;

  for (let i = 0; i < windowDays; i++) {
    const dk = offsetLocalDayKey(endDayKey, -i);

    let myDone = 0;
    let partnerDone = 0;
    for (const h of sharedDailies) {
      if (hasDailyCheckin(keys, h.id, myUid, dk)) myDone += 1;
      if (partnerUid && hasDailyCheckin(keys, h.id, partnerUid, dk)) {
        partnerDone += 1;
      }
    }
    for (const h of myPersonal) {
      if (hasDailyCheckin(keys, h.id, myUid, dk)) myDone += 1;
    }
    if (partnerUid) {
      for (const h of partnerPersonal) {
        if (hasDailyCheckin(keys, h.id, partnerUid, dk)) partnerDone += 1;
      }
    }

    const bothAll =
      myOwed > 0 &&
      partnerOwed > 0 &&
      myDone === myOwed &&
      partnerDone === partnerOwed;

    if (bothAll) {
      inSync += 1;
      run += 1;
      if (run > bestRun) bestRun = run;
    } else {
      run = 0;
    }
  }

  return { bestRun, inSyncDays: inSync };
}

/**
 * Habits cred row. Narrative order: current momentum → peak streak → depth
 * (in-sync days across the trailing window).
 */
function HabitsCredInfographic(props: {
  jointStreak: number;
  bestRun: number;
  inSyncDays: number;
}) {
  return (
    <CredStatRow
      accessibilityLabel={`habits: best run ${props.bestRun}, ${props.inSyncDays} in-sync days in last ${HABIT_WINDOW_DAYS} days, ${props.jointStreak} day streak`}
      items={[
        { value: props.bestRun, label: 'best run' },
        { value: props.inSyncDays, label: 'in sync' },
        { value: props.jointStreak, label: 'day streak' },
      ]}
    />
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

type Props = {
  profile: UserProfile;
  couple: Couple | null;
  reasons: Reason[];
  nominations: Nomination[];
  reasonStreak: number;
};

/**
 * Relationship Cred panel. Sections follow the canonical app feature order:
 *   mood → habits → reasons → awards
 * `decide` has no cumulative cred surface (it's a momentary action), so it's
 * intentionally absent.
 */
export function ProfileSoftStats({
  profile,
  couple,
  reasons,
  nominations,
  reasonStreak,
}: Props) {
  const myUid = profile.uid;
  const partnerUid = resolvePartnerUid(profile, couple);

  // Habits + mood data come from their respective stores (subscribed in
  // the tabs layout) so we don't bloat this component's prop surface.
  const habits = useHabitStore((s) => s.habits);
  const rangeDailyCheckins = useHabitStore((s) => s.rangeDailyCheckins);
  const moodFeed = useMoodStore((s) => s.feedEntries);

  // Reasons + nominations
  const forYou = useMemo(
    () => countReasonsForYou(reasons, myUid),
    [reasons, myUid],
  );
  const byYou = useMemo(
    () => countReasonsByYouForPartner(reasons, myUid, partnerUid),
    [reasons, myUid, partnerUid],
  );
  const received = useMemo(
    () => tallyNomineeReceivedBreakdown(nominations, myUid, partnerUid),
    [nominations, myUid, partnerUid],
  );

  // Habits stats (last 60 days, anchored to today)
  const habitsStats = useMemo(
    () =>
      computeHabitsStatsForWindow(
        habits,
        rangeDailyCheckins,
        myUid,
        partnerUid,
        localDayKey(),
        HABIT_WINDOW_DAYS,
      ),
    [habits, rangeDailyCheckins, myUid, partnerUid],
  );

  // Mood stats (whatever the feed has loaded — recent ~60 entries)
  const moodStats = useMemo(
    () => computeMoodStats(moodFeed, myUid, partnerUid),
    [moodFeed, myUid, partnerUid],
  );

  return (
    <View className="gap-y-2">
      <Text
        className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
        maxFontSizeMultiplier={1.2}
      >
        relationship cred
      </Text>
      <View className="rounded-[20px] border border-hum-border/18 bg-hum-surface/20 px-4 py-3">
        <CredSection title="mood" showTopRule={false}>
          <MoodCredInfographic
            bothLoggedStreak={couple?.bothLoggedDayStreak ?? 0}
            vibeMatches={moodStats.vibeMatches}
            myTop={moodStats.myTop}
            partnerTop={moodStats.partnerTop}
          />
        </CredSection>
        <CredSection title="habits" showTopRule>
          <HabitsCredInfographic
            jointStreak={couple?.jointDailyStreak ?? 0}
            bestRun={habitsStats.bestRun}
            inSyncDays={habitsStats.inSyncDays}
          />
        </CredSection>
        <CredSection title="reasons" showTopRule>
          <RelationshipReasonsInfographic
            byYouForPartner={byYou}
            aboutYou={forYou}
            streakDays={reasonStreak}
          />
        </CredSection>
        <CredSection title="awards" showTopRule>
          <AwardsReceivedInfographic
            forYou={received.forYou}
            forPartner={received.forPartner}
            both={received.both}
          />
        </CredSection>
      </View>
    </View>
  );
}
