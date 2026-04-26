/**
 * Marker stored in `nominations.submittedBy` for starter-pack rows (not a Firebase Auth uid).
 * Shown as the author label in the awards UI; excluded from XP, streaks, and “your vs partner” stats.
 * Value stays `humm_starter_pack` so existing Firestore seeded rows keep matching.
 */
export const STARTER_NOMINATION_SUBMITTED_BY = 'humm_starter_pack';
