/**
 * Hex values for APIs that need raw colors (ActivityIndicator, vector icons).
 * Keep in sync with `tailwind.config.js` → theme.extend.colors.hum
 *
 * ─── Accent palette · Wes Anderson "Grand Budapest" (chosen) ────────────────
 * Warm-led, retro-curated, distinctive. Each feature owns a clear hue
 * while staying soft enough for our dark canvas. Mendl's pink is the
 * global signature (ribbon, buttons, profile); Mendl's sky blue anchors
 * the cool side on home so the page rhythm reads warm ↔ cool.
 *   primary   #E8A09A mendl pink · global accent · profile / you / ribbon
 *   secondary #9FB8D2 mendl blue · home (cool anchor)
 *   sage      #B5C68F mustard    · habits
 *   spark     #9FB7BA powder     · decide
 *   gold      #E9C685 mustard yl · awards
 *   crimson   #D27373 madame red · reasons + habits both-done celebration
 *   bloom     #A990C2 heather    · mood
 *   petal     #E89AAE rose       · (legacy / unassigned)
 * ────────────────────────────────────────────────────────────────────────────
 */
export const theme = {
  // Canvas — dark elegant base, locked
  bg: '#0F0E14',
  surface: '#17151E',
  card: '#1E1C27',
  border: '#2E2938',
  ink: '#141218',
  text: '#FAF7F4',
  muted: '#ADA7B3',
  dim: '#767089',
  // Feature accents — Wes Anderson "Grand Budapest"
  primary: '#E8A09A',   // mendl pink (global accent · profile · ribbon)
  secondary: '#9FB8D2', // mendl sky blue (cool anchor · home)
  sage: '#B5C68F',      // mustard sage
  spark: '#9FB7BA',     // powder
  gold: '#E9C685',      // mustard yellow
  petal: '#E89AAE',     // rose
  bloom: '#A990C2',     // heather
  crimson: '#D27373',   // madame d red (celebration · habits both-done)
} as const;
