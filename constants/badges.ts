import {
  AWARDS_FILED_TIERS,
  AWARDS_JAR_COUPLE_TIERS,
  AWARDS_PHOTO_COUPLE_TIERS,
  AWARDS_SPOTLIGHT_TIERS,
  BATTLE_DECISION_TIERS,
  SEASONS_VAULT_COUPLE_TIERS,
} from './awardsBadgeTiers';
import { REASONS_LINE_COUNT_BADGES, REASONS_STREAK_DAY_BADGES } from './reasonsBadgeTiers';
import { ALL_DECISIONS_COUPLE_TIERS, QUICKSPIN_COUPLE_TIERS } from './decideBadgeTiers';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

function tierToDef(meta: { id: string; name: string; description: string; emoji: string }): BadgeDefinition {
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    emoji: meta.emoji,
  };
}

export const BADGES: BadgeDefinition[] = [
  // Decide — light ladder + classics
  { id: 'first_spin', name: 'first spin', description: 'your first quick spin saved', emoji: '🎰' },
  ...QUICKSPIN_COUPLE_TIERS.map(tierToDef),
  ...ALL_DECISIONS_COUPLE_TIERS.map(tierToDef),
  { id: 'decisive', name: 'decisive', description: '100 calls made together', emoji: '⚡' },
  { id: 'foodie', name: 'foodie', description: '50 food picks in the books', emoji: '🍴' },
  { id: 'night_in', name: 'night in', description: '20 movie-category spins', emoji: '🎬' },
  ...BATTLE_DECISION_TIERS.map(tierToDef),

  // Awards — nominations & jar (tiers)
  ...AWARDS_FILED_TIERS.map(tierToDef),
  ...AWARDS_SPOTLIGHT_TIERS.map(tierToDef),
  ...AWARDS_JAR_COUPLE_TIERS.map(tierToDef),
  ...AWARDS_PHOTO_COUPLE_TIERS.map(tierToDef),
  { id: 'category_completionist', name: 'completionist', description: 'nominated in every category one season', emoji: '✅' },
  { id: 'early_bird', name: 'early bird', description: 'all active categories filled with 2 months to spare', emoji: '🐦' },

  // Awards — ceremony & vault
  { id: 'opening_night', name: 'opening night', description: 'first ceremony in the books', emoji: '🎭' },
  ...SEASONS_VAULT_COUPLE_TIERS.map(tierToDef),
  { id: 'clean_sweep', name: 'clean sweep', description: 'one of you swept every category that season', emoji: '🧹' },
  { id: 'full_agreement', name: 'full agreement', description: 'alignment: zero contested categories', emoji: '💯' },
  { id: 'overtime', name: 'overtime', description: '3+ contested categories resolved in one season', emoji: '⏰' },
  { id: 'back_to_back', name: 'back-to-back', description: 'two ceremonies on schedule in a row', emoji: '🔁' },

  // Awards — alignment
  {
    id: 'first_alignment_sheet',
    name: 'private picks in',
    description: 'first time you submitted your alignment sheet',
    emoji: '📋',
  },

  // Award wins — per category (dynamic ids won_${cat})
  {
    id: 'won_best_found_food',
    name: 'found food crown',
    description: 'took best found food one season',
    emoji: '🍽️',
  },
  {
    id: 'won_best_purchase',
    name: 'purchase crown',
    description: 'took best purchase one season',
    emoji: '🛍️',
  },
  {
    id: 'won_sexy_time_initiation',
    name: 'spark crown',
    description: 'took sexy time initiation one season',
    emoji: '🔥',
  },
  {
    id: 'won_best_planning',
    name: 'planning crown',
    description: 'took best planning one season',
    emoji: '🗺️',
  },
  {
    id: 'won_best_surprise',
    name: 'surprise crown',
    description: 'took best surprise one season',
    emoji: '🎁',
  },
  {
    id: 'won_best_movie',
    name: 'movie crown',
    description: 'took best movie one season',
    emoji: '🎞️',
  },
  {
    id: 'won_best_fight_resolution',
    name: 'peace crown',
    description: 'took best fight resolution one season',
    emoji: '🤝',
  },
  {
    id: 'category_threepeat',
    name: 'three-peat',
    description: 'same category win three seasons running',
    emoji: '🎯',
  },
  {
    id: 'all_seven_crowns',
    name: 'full shelf',
    description: 'won every active category at least once, lifetime',
    emoji: '🏆',
  },

  // Reasons
  {
    id: 'first_quill',
    name: 'first quill',
    description: 'your first reason for them',
    emoji: '✒️',
  },
  {
    id: 'both_pouring',
    name: 'both pouring in',
    description: 'you each wrote at least one reason about the other',
    emoji: '💞',
  },
  ...REASONS_STREAK_DAY_BADGES.map(tierToDef),
  ...REASONS_LINE_COUNT_BADGES.map(tierToDef),
  { id: 'dedicated', name: 'dedicated', description: 'at least 1 reason a month for 3 months', emoji: '💌' },
];

export function getBadge(id: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.id === id);
}
