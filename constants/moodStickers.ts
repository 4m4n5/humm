import type { MoodStickerOption, MoodQuadrant } from '@/types';

export type QuadrantMeta = {
  quadrant: MoodQuadrant;
  /** Short section title in the picker (emotional, not clinical). */
  label: string;
  /** One quiet line under the title — sets tone without clutter. */
  blurb: string;
  stickers: MoodStickerOption[];
};

export const MOOD_STICKERS: MoodStickerOption[] = [
  { id: 'energized',   emoji: '🤩', label: 'energized',   quadrant: 'pleasantHigh' },
  { id: 'loving',      emoji: '🥰', label: 'loving',      quadrant: 'pleasantHigh' },
  { id: 'playful',     emoji: '😜', label: 'playful',     quadrant: 'pleasantHigh' },
  { id: 'content',     emoji: '😌', label: 'content',     quadrant: 'pleasantLow' },
  { id: 'cozy',        emoji: '🫶', label: 'cozy',        quadrant: 'pleasantLow' },
  { id: 'grateful',    emoji: '🥹', label: 'grateful',    quadrant: 'pleasantLow' },
  { id: 'wired',       emoji: '😣', label: 'wired',       quadrant: 'unpleasantHigh' },
  { id: 'anxious',     emoji: '😰', label: 'anxious',     quadrant: 'unpleasantHigh' },
  { id: 'angry',       emoji: '😤', label: 'angry',       quadrant: 'unpleasantHigh' },
  { id: 'tired',       emoji: '😴', label: 'tired',       quadrant: 'unpleasantLow' },
  { id: 'meh',         emoji: '😐', label: 'meh',         quadrant: 'unpleasantLow' },
  { id: 'overwhelmed', emoji: '🫠', label: 'overwhelmed', quadrant: 'unpleasantLow' },
];

const QUADRANT_COPY: Record<MoodQuadrant, { label: string; blurb: string }> = {
  pleasantHigh: { label: 'lit up', blurb: 'good energy, turned up' },
  pleasantLow: { label: 'soft glow', blurb: 'calm and held' },
  unpleasantHigh: { label: 'wired', blurb: 'on edge or overloaded' },
  unpleasantLow: { label: 'heavy', blurb: 'low, flat, or drained' },
};

export const MOOD_QUADRANTS: QuadrantMeta[] = (
  ['pleasantHigh', 'pleasantLow', 'unpleasantHigh', 'unpleasantLow'] as MoodQuadrant[]
).map((q) => ({
  quadrant: q,
  label: QUADRANT_COPY[q].label,
  blurb: QUADRANT_COPY[q].blurb,
  stickers: MOOD_STICKERS.filter((s) => s.quadrant === q),
}));

export function getMoodStickerById(id: string | null | undefined): MoodStickerOption | null {
  if (!id) return null;
  return MOOD_STICKERS.find((s) => s.id === id) ?? null;
}
