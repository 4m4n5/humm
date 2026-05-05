/**
 * Habit badge ladders that complement the existing personal/joint streak badges.
 * Adds depth-of-use rewards (total check-ins, count of active habits) and a long
 * joint-streak tier so habits has a similar number of badges as Awards/Reasons.
 */

export type HabitTierMeta = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  count: number;
};

/** Per user — total habit check-ins (across shared + personal habits). */
export const HABIT_CHECKIN_TIERS: HabitTierMeta[] = [
  { count: 14, id: 'habit_checkins_14', name: 'two weeks in', description: '14 check-ins logged', emoji: '🌱' },
  { count: 60, id: 'habit_checkins_60', name: 'rooted', description: '60 check-ins — habit is sticking', emoji: '🌿' },
  { count: 200, id: 'habit_checkins_200', name: 'tended garden', description: '200 check-ins logged', emoji: '🪴' },
  { count: 500, id: 'habit_checkins_500', name: 'forest tender', description: '500 check-ins — devoted', emoji: '🌳' },
];

/** Per user — number of active (non-archived) habits at once. */
export const HABIT_COLLECTOR_TIERS: HabitTierMeta[] = [
  { count: 3, id: 'habit_collector_3', name: 'habit collector', description: '3 active habits at once', emoji: '🧺' },
  { count: 6, id: 'habit_collector_6', name: 'habit curator', description: '6 active habits at once', emoji: '🗂️' },
];
