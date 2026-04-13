import { Timestamp } from 'firebase/firestore';
import { Ceremony } from '@/types';

export function timestampToDate(t: Timestamp | null | undefined): Date | null {
  if (!t || typeof t.toDate !== 'function') return null;
  return t.toDate();
}

/** Calendar-year half — same H1/H2 boundaries as the active award season. */
export function calendarHalfLabel(d: Date): { half: 'H1' | 'H2'; range: string } {
  const m = d.getMonth();
  if (m < 6) return { half: 'H1', range: 'Jan – Jun' };
  return { half: 'H2', range: 'Jul – Dec' };
}

/** Hub title style, e.g. `H1 2026`, from the ceremony window (local calendar half + year). */
export function ceremonySeasonShortLabel(ceremony: Ceremony): string {
  const start = timestampToDate(ceremony.periodStart);
  if (!start) return '';
  const { half } = calendarHalfLabel(start);
  return `${half} ${start.getFullYear()}`;
}

/**
 * Civil half-year bounds for `referenceDate`: H1 = Jan 1 – Jun 30, H2 = Jul 1 – Dec 31 (local calendar).
 * Award **season** periods use these bounds so every couple shares the same nomination window.
 */
export function getCalendarHalfYearBounds(referenceDate = new Date()): { start: Date; end: Date } {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();
  if (m < 6) {
    return {
      start: new Date(y, 0, 1, 0, 0, 0, 0),
      end: new Date(y, 5, 30, 23, 59, 59, 999),
    };
  }
  return {
    start: new Date(y, 6, 1, 0, 0, 0, 0),
    end: new Date(y, 11, 31, 23, 59, 59, 999),
  };
}

const HALF_MATCH_TOLERANCE_MS = 2 * 86400000;

/** True if ceremony period matches the half-year for `referenceDate` (±2d for timezone drift). */
export function ceremonyPeriodMatchesHalfYear(
  ceremony: Ceremony,
  referenceDate = new Date(),
): boolean {
  const { start, end } = getCalendarHalfYearBounds(referenceDate);
  const ps = timestampToDate(ceremony.periodStart);
  const pe = timestampToDate(ceremony.periodEnd);
  if (!ps || !pe) return false;
  return (
    Math.abs(ps.getTime() - start.getTime()) < HALF_MATCH_TOLERANCE_MS &&
    Math.abs(pe.getTime() - end.getTime()) < HALF_MATCH_TOLERANCE_MS
  );
}

/** Last N days before `periodEnd` are the alignment window on the season calendar (finish noms + align picks). */
export const ALIGNMENT_WINDOW_DAYS = 14;

export function alignmentWindowStart(periodEnd: Date): Date {
  const d = new Date(periodEnd.getTime());
  d.setDate(d.getDate() - ALIGNMENT_WINDOW_DAYS);
  return d;
}

export type SeasonPhase = 'nominations' | 'alignment' | 'ended';

export function getSeasonPhase(now: Date, ceremony: Ceremony): SeasonPhase {
  const start = timestampToDate(ceremony.periodStart);
  const end = timestampToDate(ceremony.periodEnd);
  if (!start || !end) return 'ended';
  if (now.getTime() >= end.getTime()) return 'ended';
  if (now.getTime() < alignmentWindowStart(end).getTime()) return 'nominations';
  return 'alignment';
}

export interface SeasonBarSegment {
  phase: 'nominations' | 'alignment';
  /** Share of the full season span (0–1), for layout. */
  widthFrac: number;
}

/**
 * Two segments: main nominating stretch, then the fixed-length alignment window ending at `periodEnd`.
 */
export function getSeasonBarSegments(ceremony: Ceremony): SeasonBarSegment[] {
  const start = timestampToDate(ceremony.periodStart);
  const end = timestampToDate(ceremony.periodEnd);
  if (!start || !end) return [];
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return [];
  const alignStart = alignmentWindowStart(end);
  const nomMs = Math.max(0, alignStart.getTime() - start.getTime());
  const alignMs = Math.max(0, end.getTime() - alignStart.getTime());
  const sum = nomMs + alignMs;
  if (sum <= 0) return [{ phase: 'alignment', widthFrac: 1 }];
  return [
    { phase: 'nominations', widthFrac: nomMs / sum },
    { phase: 'alignment', widthFrac: alignMs / sum },
  ];
}

export function seasonElapsedFraction(now: Date, ceremony: Ceremony): number {
  const start = timestampToDate(ceremony.periodStart);
  const end = timestampToDate(ceremony.periodEnd);
  if (!start || !end) return 0;
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / total));
}

/** Progress 0–1 through the civil calendar half (H1 or H2) containing `referenceDate`. */
export function halfYearElapsedFraction(now: Date, referenceDate = new Date()): number {
  const { start, end } = getCalendarHalfYearBounds(referenceDate);
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / total));
}

/**
 * Which day of the alignment window we're in (1-based), or 0 before it starts.
 * After `periodEnd`, returns `totalDays + 1` so callers can treat as "past".
 */
export function alignmentWindowDayIndex(
  now: Date,
  ceremony: Ceremony,
  totalDays = ALIGNMENT_WINDOW_DAYS,
): number {
  const end = timestampToDate(ceremony.periodEnd);
  if (!end) return 0;
  const alignStart = alignmentWindowStart(end);
  const t = now.getTime();
  if (t < alignStart.getTime()) return 0;
  if (t >= end.getTime()) return totalDays + 1;
  const dayMs = 86400000;
  const idx = Math.floor((t - alignStart.getTime()) / dayMs) + 1;
  return Math.min(totalDays, Math.max(1, idx));
}

/**
 * One line for the season card: time until the alignment window starts, or status if already in / ended.
 */
export function alignmentStartsSummary(now: Date, ceremony: Ceremony): string {
  const end = timestampToDate(ceremony.periodEnd);
  if (!end) return '—';
  const alignStart = alignmentWindowStart(end);
  const nt = now.getTime();
  if (nt >= end.getTime()) return 'season ended';
  if (nt >= alignStart.getTime()) {
    return `alignment on · closes ${formatShortDate(end)}`;
  }
  return `${formatRelativeDay(alignStart, now)} · ${formatShortDate(alignStart)}`;
}

export type CeremonyMilestoneKind =
  | 'start'
  | 'mid'
  | 'wrap_up'
  | 'end'
  | 'ceremony_night';

export interface CeremonyMilestone {
  id: string;
  title: string;
  subtitle?: string;
  at: Date;
  kind: CeremonyMilestoneKind;
}

/**
 * Milestones for the active nomination window + optional ceremony night.
 */
export function buildCeremonyMilestones(ceremony: Ceremony): CeremonyMilestone[] {
  const start = timestampToDate(ceremony.periodStart);
  const end = timestampToDate(ceremony.periodEnd);
  if (!start || !end) return [];

  const alignStart = alignmentWindowStart(end);
  const wrap3 = new Date(end);
  wrap3.setDate(wrap3.getDate() - 3);

  const list: CeremonyMilestone[] = [
    {
      id: 'start',
      title: 'Opens',
      subtitle: 'Season starts',
      at: start,
      kind: 'start',
    },
    {
      id: 'alignment_start',
      title: 'Alignment',
      subtitle: `${ALIGNMENT_WINDOW_DAYS}d sprint`,
      at: alignStart,
      kind: 'wrap_up',
    },
    {
      id: 'wrap3',
      title: 'Last call',
      subtitle: '3 days out',
      at: wrap3,
      kind: 'wrap_up',
    },
    {
      id: 'end',
      title: 'Closes',
      subtitle: 'Window ends',
      at: end,
      kind: 'end',
    },
  ];

  const ceremonyNight = timestampToDate(ceremony.ceremonyDate);
  if (ceremonyNight) {
    list.push({
      id: 'ceremony_night',
      title: 'Ceremony night',
      subtitle: 'On the calendar',
      at: ceremonyNight,
      kind: 'ceremony_night',
    });
  }

  return list.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function formatRelativeDay(target: Date, now = new Date()): string {
  const t = new Date(target.getTime());
  const n = new Date(now.getTime());
  t.setHours(0, 0, 0, 0);
  n.setHours(0, 0, 0, 0);
  const diff = Math.round((t.getTime() - n.getTime()) / 86400000);
  if (diff < -1) return `${Math.abs(diff)} days ago`;
  if (diff === -1) return 'yesterday';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff > 1) return `in ${diff} days`;
  return 'today';
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
