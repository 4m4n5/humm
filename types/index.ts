import { Timestamp } from 'firebase/firestore';

// ─── Users ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  partnerId: string | null;
  coupleId: string | null;
  /** Expo push token (Expo Push API); set by `registerExpoPushToken` when OS permission is granted. */
  fcmToken: string | null;
  inviteCode: string | null;
  xp: number;
  level: number;
  badges: string[];
  createdAt: Timestamp;
  /**
   * Reasons tab (legacy): draw count under the old stacking model.
   * Used only to infer checkpoint when partner count checkpoints are absent.
   */
  becauseDrawsConsumed?: number;
  /** Reasons tab: “by you for partner” count after your last “deal three” (canonical Firestore field). */
  reasonPartnerCountAtLastDraw?: number;
  /** @deprecated Legacy field; prefer `reasonPartnerCountAtLastDraw` (still read for old docs). */
  becausePartnerReasonCountAtLastDraw?: number;
  /** @deprecated Legacy field; migrated to `moodEntries` collection. Kept for migration read. */
  moodSticker?: { id: string; emoji: string; label: string; updatedAt: Timestamp } | null;
  /** @deprecated Migrated to `moodEntries`. */
  moodUpdateCount?: number;
  /** Per-feature push notification preferences (null = all enabled). */
  notificationPreferences?: NotificationPreferences | null;
}

export interface NotificationPreferences {
  reasons: boolean;
  mood: boolean;
  nominations: boolean;
  battles: boolean;
  decisions: boolean;
}

// ─── Mood Entries ───────────────────────────────────────────────────────────

export type MoodQuadrant =
  | 'pleasantHigh'
  | 'pleasantLow'
  | 'unpleasantHigh'
  | 'unpleasantLow';

export interface MoodStickerOption {
  id: string;
  emoji: string;
  label: string;
  quadrant: MoodQuadrant;
}

export interface MoodTimelinePoint {
  stickerId: string;
  emoji: string;
  label: string;
  quadrant: MoodQuadrant;
  at: Timestamp;
}

export interface MoodEntry {
  id: string;
  coupleId: string;
  uid: string;
  dayKey: string;
  weekKey: string;
  current: MoodTimelinePoint;
  timeline: MoodTimelinePoint[];
  changeCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Couple ─────────────────────────────────────────────────────────────────

/** ISO local date key for streak day boundaries, e.g. 2026-04-05 */
export type DayKeyString = string;

export type WeeklyChallengeKind =
  | 'both_nomination'
  | 'both_quickspin'
  | 'both_reason'
  | 'both_mood_three_days'
  | 'both_habit_allday';

export interface CoupleStreaksState {
  decisionStreak: number;
  nominationStreak: number;
  ceremonyStreak: number;
  /** Consecutive local days the couple added at least one reason (either partner). */
  reasonStreak: number;
  lastDecisionDayKey: DayKeyString | null;
  lastNominationDayKey: DayKeyString | null;
  lastCeremonyCompleteDayKey: DayKeyString | null;
  lastReasonDayKey: DayKeyString | null;
}

export interface CoupleWeeklyChallengeState {
  kind: WeeklyChallengeKind;
  weekKey: string;
  description: string;
  completedBy: string[];
  xpGranted: boolean;
  /**
   * For `both_habit_allday`: local day keys (YYYY-MM-DD) in the challenge week where both
   * partners completed every habit scheduled for them that day.
   */
  habitJointDayKeysThisWeek?: string[];
}

/** Per-user daily completion streak (shared + personal dailies owed that day). */
export interface CoupleDailyStreakRow {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDayKey: string | null;
}

export interface Couple {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: Timestamp;
  activeCeremonyId: string | null;
  /** In-progress battle bracket session, if any (omit on legacy couple docs) */
  activeBattleId?: string | null;
  /** Custom award categories; merged with app defaults when missing — see mergeCoupleAwardCategoryDefaults */
  awardCategories?: CoupleAwardCategoryRow[];
  /** Category ids that appeared in at least one completed ceremony (nominations); drives disable vs delete */
  awardCategoryIdsUsedInCompleteSeasons?: string[];
  /** Optional; merged with defaults when read */
  streaks?: CoupleStreaksState;
  weeklyChallenge?: CoupleWeeklyChallengeState | null;
  /** Habits v2: 2 after legacy purge. Omitted = not migrated yet. */
  habitsModelVersion?: number;
  /** uid → daily streak (shared + personal dailies owed). */
  dailyStreaks?: Record<string, CoupleDailyStreakRow>;
  /** Consecutive local days every shared daily was both-done */
  jointDailyStreak?: number;
  lastJointDailyDayKey?: string | null;
  /** Mood: consecutive days both partners logged a mood entry. */
  bothLoggedDayStreak?: number;
  lastBothLoggedDayKey?: string | null;
}

// ─── Habits v2 (partner habits) ───────────────────────────────────────────

export type HabitCadence = 'daily' | 'weekly';
export type HabitScope = 'shared' | 'personal';

export interface Habit {
  id: string;
  coupleId: string;
  createdBy: string;
  title: string;
  emoji: string;
  cadence: HabitCadence;
  scope: HabitScope;
  /** Monday key of first week this weekly habit counts (next week after create). */
  weeklyStartWeekKey?: string | null;
  /**
   * XP idempotency for shared habits (Firestore). Prevents duplicate self/joint grants after
   * undo + re-check the same calendar day or week. Cleared when the habit is edited.
   */
  lastJointDailyBonusDayKey?: string | null;
  lastSelfDailyXpByUid?: Record<string, string>;
  lastJointWeeklyBonusWeekKey?: string | null;
  lastSelfWeeklyXpByUid?: Record<string, string>;
  createdAt: Timestamp;
  archived: boolean;
}

export interface HabitCheckin {
  id: string;
  habitId: string;
  coupleId: string;
  uid: string;
  cadence: HabitCadence;
  /** Present when cadence === 'daily' */
  dayKey?: string;
  /** Present when cadence === 'weekly' */
  weekKey?: string;
  createdAt: Timestamp;
}

// ─── Decisions ──────────────────────────────────────────────────────────────

export type DecisionCategory = 'food' | 'activity' | 'movie' | 'other';

export type DecisionMode = 'quickspin' | 'battle';

export interface DecisionOption {
  id: string;
  label: string;
  tags: string[];
  lastPickedAt: Timestamp | null;
}

export interface Decision {
  id: string;
  coupleId: string;
  category: DecisionCategory;
  mode: DecisionMode;
  options: string[];
  result: string;
  vetoedOptions: string[];
  createdAt: Timestamp;
  /** User who saved this decision (Quick Spin / client); optional on legacy docs */
  createdByUserId?: string;
}

// ─── Battle mode (realtime bracket) ─────────────────────────────────────────

export type BattleStatus = 'collecting' | 'battling' | 'complete';

export interface BattleMatchup {
  round: number;
  position: number;
  optionA: string;
  /** null = first-round bye slot (non-null side advances without voting) */
  optionB: string | null;
  votesByUser: Record<string, string>;
  /** 0 = first vote attempt; increments on each disagree cycle; coin after 2 */
  revoteRound: number;
  winner: string | null;
  decidedByCoinFlip: boolean;
}

export interface BattleSession {
  id: string;
  coupleId: string;
  category: DecisionCategory;
  status: BattleStatus;
  /** Combined pool of option labels (order = insertion order, deduped) */
  options: string[];
  /** uid → labels that user added (for remove + attribution) */
  optionsByUser: Record<string, string[]>;
  readyByUser: Record<string, boolean>;
  bracket: BattleMatchup[];
  /** Index into bracket for the matchup that needs votes (or next to resolve) */
  currentMatchupIndex: number;
  winner: string | null;
  createdAt: Timestamp;
}

// ─── Awards ─────────────────────────────────────────────────────────────────

/** Stable Firestore id for an award category (legacy defaults match AWARD_CATEGORIES ids). */
export type AwardCategory = string;

/** Per-couple award category; both partners can add or edit. */
export interface CoupleAwardCategoryRow {
  id: AwardCategory;
  label: string;
  emoji: string;
  enabled: boolean;
}

export interface Nomination {
  id: string;
  coupleId: string;
  ceremonyId: string;
  category: AwardCategory;
  nomineeId: string | 'both';
  submittedBy: string;
  title: string;
  description: string;
  photoUrl: string | null;
  eventDate: Timestamp | null;
  createdAt: Timestamp;
  /**
   * When true, row was seeded by tooling — not a user add. Excluded from XP, weekly challenge,
   * streak bumps, badge thresholds, and “your vs partner” submission stats; still shown in browse/alignment.
   */
  seeded?: boolean;
}

/** Stored on `ceremonies/{id}`. Product copy maps these to nominate · align · cheer — see docs/CEREMONY_TERMINOLOGY.md */
export type CeremonyStatus =
  | 'nominating'
  | 'deliberating'
  | 'voting'
  | 'complete';

export interface CeremonyWinner {
  nominationId: string;
  agreedBy: string[];
  nomineeId: string | 'both';
}

export interface Ceremony {
  id: string;
  coupleId: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  status: CeremonyStatus;
  ceremonyDate: Timestamp | null;
  winners: Partial<Record<AwardCategory, CeremonyWinner>>;
  createdAt: Timestamp;
  /** uid → category → nominationId (top pick per category) */
  picksByUser?: Record<string, Partial<Record<AwardCategory, string>>>;
  /** uid → true once picks are submitted for alignment (private picks phase) */
  picksSubmitted?: Record<string, boolean>;
  /** uid → category → nominationId while resolving disagreements */
  resolutionPicksByUser?: Record<string, Partial<Record<AwardCategory, string>>>;
}

// ─── Reasons ────────────────────────────────────────────────────────────────

export type MediaType = 'photo' | 'video';

export interface Reason {
  id: string;
  coupleId: string;
  authorId: string;
  aboutId: string;
  text: string;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  createdAt: Timestamp;
}

// ─── Gamification ───────────────────────────────────────────────────────────

export interface XpLogEntry {
  userId: string;
  amount: number;
  reason: string;
  earnedAt: Timestamp;
}

export interface Streaks {
  decisionStreak: number;
  nominationStreak: number;
  ceremonyStreak: number;
  lastDecisionDate: Timestamp | null;
  lastNominationDate: Timestamp | null;
  lastCeremonyCompleteDate?: Timestamp | null;
}

export interface WeeklyChallenge {
  id: string;
  description: string;
  issuedAt: Timestamp;
  expiresAt: Timestamp;
  completedBy: string[];
  coupleReward: number;
}

export interface Gamification {
  coupleId: string;
  xpLog: XpLogEntry[];
  streaks: Streaks;
  weeklyChallenge: WeeklyChallenge | null;
}
