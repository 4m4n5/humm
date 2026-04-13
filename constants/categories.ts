import { AwardCategory, DecisionCategory } from '@/types';

export const DECISION_CATEGORIES: {
  id: DecisionCategory;
  label: string;
  emoji: string;
  defaultOptions: string[];
}[] = [
  {
    id: 'food',
    label: 'food',
    emoji: '🍜',
    defaultOptions: [
      'italian',
      'thai',
      'mexican',
      'japanese',
      'indian',
      'american',
      'korean',
      'mediterranean',
      'chinese',
      'vietnamese',
    ],
  },
  {
    id: 'activity',
    label: 'activity',
    emoji: '🎯',
    defaultOptions: [
      'movie at home',
      'walk outside',
      'board game',
      'cook together',
      'drive around',
    ],
  },
  {
    id: 'movie',
    label: 'movie',
    emoji: '🎬',
    defaultOptions: [
      'rewatchable favorite',
      'something new',
      'comedy',
      'thriller',
      'romance',
      'sci-fi',
      'documentary',
      'horror',
      'animation',
    ],
  },
  {
    id: 'other',
    label: 'other',
    emoji: '✨',
    defaultOptions: [],
  },
];

export const AWARD_CATEGORIES: {
  id: AwardCategory;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    id: 'best_found_food',
    label: 'best found food',
    emoji: '🍽️',
    description: 'a meal, dish, or spot one or both of you discovered',
  },
  {
    id: 'best_purchase',
    label: 'best purchase',
    emoji: '🛍️',
    description: 'a buy that turned out great — any size',
  },
  {
    id: 'sexy_time_initiation',
    label: 'sexy time initiation',
    emoji: '🔥',
    description: 'the most memorable “come here” energy',
  },
  {
    id: 'best_planning',
    label: 'best planning',
    emoji: '🗺️',
    description: 'trip, date, event — whoever planned it best',
  },
  {
    id: 'best_surprise',
    label: 'best surprise',
    emoji: '🎁',
    description: 'a gesture, gift, or moment they didn’t see coming',
  },
  {
    id: 'best_movie',
    label: 'best movie',
    emoji: '🎞️',
    description: 'a watch together that still hits',
  },
  {
    id: 'best_fight_resolution',
    label: 'best fight resolution',
    emoji: '🤝',
    description: 'how you bounced back from a rough patch',
  },
];
