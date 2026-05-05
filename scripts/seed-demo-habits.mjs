#!/usr/bin/env node
/**
 * Seed daily habits + 6 weeks of past check-ins for the demo couple so the
 * habits adherence log on the habits tab has data to render.
 *
 * Targets the demo pair created by scripts/create-demo-accounts.mjs:
 *   - demo@hum.app
 *   - partner.demo@hum.app
 *
 * Wipes ALL existing habits + check-ins for the demo couple before reseeding,
 * so the demo state is deterministic. Today's row is left empty so the demo
 * user can still toggle today's check-ins fresh; the couple's joint /
 * per-user streak aggregates are recomputed against the seeded check-ins so
 * the action bar streak chip and the "best run" stat both look real.
 *
 * Output is deterministic (seeded RNG) — re-running produces the same data.
 *
 * Prerequisites — Firebase Admin JSON (see scripts/create-demo-accounts.mjs).
 *   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/humm-adminsdk.json"
 *
 * Usage:
 *   node scripts/seed-demo-habits.mjs --dry-run
 *   node scripts/seed-demo-habits.mjs --confirm SEED-HABITS
 *   node scripts/seed-demo-habits.mjs --confirm SEED-HABITS --days 42
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const DEMO_EMAIL = 'demo@hum.app';
const PARTNER_EMAIL = 'partner.demo@hum.app';
const DEFAULT_DAYS = 42; // 6 weeks → matches the heatmap window in HabitsAdherenceLog

// Habit set seeded for the demo couple. Shared habits are owed by both,
// personal habits are owed only by their creator. Three each → 0..3 cells of
// completion per partner per day, which gives the heatmap a clean gradient.
const SHARED_HABITS = [
  { title: 'morning checkin', emoji: '🌅' },
  { title: 'no phones at dinner', emoji: '🍽️' },
];
const DEMO_PERSONAL_HABIT = { title: 'read 10 pages', emoji: '📖' };
const PARTNER_PERSONAL_HABIT = { title: 'stretch 5 min', emoji: '🧘' };

// ─── Date helpers (mirror lib/dateKeys.ts) ─────────────────────────────────

function localDayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function previousDayKey(dk) {
  const [y, m, d] = dk.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localDayKey(dt);
}

// ─── RNG ────────────────────────────────────────────────────────────────────

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pickWeighted(rand, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function shuffleInPlace(rand, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandomSubset(rand, items, k) {
  if (k >= items.length) return [...items];
  if (k <= 0) return [];
  return shuffleInPlace(rand, [...items]).slice(0, k);
}

// ─── Firestore helpers ─────────────────────────────────────────────────────

async function commitInBatches(db, ops) {
  let batch = db.batch();
  let n = 0;
  for (const op of ops) {
    op(batch);
    n += 1;
    if (n >= 450) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
}

async function wipeCoupleHabitsAndCheckins(db, coupleId) {
  const habitsSnap = await db
    .collection('habits')
    .where('coupleId', '==', coupleId)
    .get();
  const checkinsSnap = await db
    .collection('habitCheckins')
    .where('coupleId', '==', coupleId)
    .get();
  const ops = [
    ...habitsSnap.docs.map((d) => (b) => b.delete(d.ref)),
    ...checkinsSnap.docs.map((d) => (b) => b.delete(d.ref)),
  ];
  await commitInBatches(db, ops);
  return { habitsWiped: habitsSnap.size, checkinsWiped: checkinsSnap.size };
}

async function createDemoHabits(db, coupleId, demoUid, partnerUid) {
  // CreatedAt is set ~50 days ago so the habits feel "established" relative
  // to the 42-day check-in window we'll seed below.
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - 50);
  const ts = admin.firestore.Timestamp.fromDate(createdAt);

  const habits = [];
  for (const def of SHARED_HABITS) {
    const ref = db.collection('habits').doc();
    habits.push({
      ref,
      data: {
        id: ref.id,
        coupleId,
        createdBy: demoUid,
        title: def.title,
        emoji: def.emoji,
        cadence: 'daily',
        scope: 'shared',
        archived: false,
        createdAt: ts,
      },
    });
  }
  {
    const ref = db.collection('habits').doc();
    habits.push({
      ref,
      data: {
        id: ref.id,
        coupleId,
        createdBy: demoUid,
        title: DEMO_PERSONAL_HABIT.title,
        emoji: DEMO_PERSONAL_HABIT.emoji,
        cadence: 'daily',
        scope: 'personal',
        archived: false,
        createdAt: ts,
      },
    });
  }
  {
    const ref = db.collection('habits').doc();
    habits.push({
      ref,
      data: {
        id: ref.id,
        coupleId,
        createdBy: partnerUid,
        title: PARTNER_PERSONAL_HABIT.title,
        emoji: PARTNER_PERSONAL_HABIT.emoji,
        cadence: 'daily',
        scope: 'personal',
        archived: false,
        createdAt: ts,
      },
    });
  }

  await commitInBatches(
    db,
    habits.map(({ ref, data }) => (b) => b.set(ref, data)),
  );
  return habits.map((h) => h.data);
}

// ─── Adherence pattern ─────────────────────────────────────────────────────

/**
 * For each day from oldest → yesterday, decide how many of each partner's
 * owed habits got checked. The window is shaped to give the demo heatmap a
 * believable rhythm with three planted features:
 *
 *   1. A mid-window 6-day in-sync streak so "best run" is meaningful
 *   2. A "warming up" tail (most recent 7 days) that biases higher than the
 *      window average so this/last week stats look encouraging
 *   3. Otherwise organic noise: most days at least partial, some empty
 *
 * Counts are absolute (not fractions) so we don't over-weight one habit.
 */
function chooseDailyCounts(rand, dayIdx, days, owedCount) {
  const SYNC_START = Math.max(0, days - 25);
  const SYNC_LEN = 6;
  const inForcedStreak = dayIdx >= SYNC_START && dayIdx < SYNC_START + SYNC_LEN;
  const inRecentWeeks = dayIdx >= days - 14;

  if (inForcedStreak) {
    return { demo: owedCount, partner: owedCount };
  }

  // Buckets are counts of habits checked (0..owedCount). Weights skew toward
  // "did most" / "did all" with a small tail of misses.
  const baseDemoWeights = [1, 2, 3, 5];
  const basePartnerWeights = [2, 3, 3, 4];
  const recentDemoWeights = [1, 2, 4, 6];
  const recentPartnerWeights = [1, 2, 4, 5];

  const demoWeights = inRecentWeeks ? recentDemoWeights : baseDemoWeights;
  const partnerWeights = inRecentWeeks ? recentPartnerWeights : basePartnerWeights;

  const demo = pickWeighted(rand, [0, 1, 2, 3], demoWeights);
  const partner = pickWeighted(rand, [0, 1, 2, 3], partnerWeights);
  return { demo: Math.min(demo, owedCount), partner: Math.min(partner, owedCount) };
}

async function seedCheckins(db, coupleId, habits, demoUid, partnerUid, days, rand) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sharedHabits = habits.filter((h) => h.scope === 'shared');
  const demoOwes = [
    ...sharedHabits,
    ...habits.filter((h) => h.scope === 'personal' && h.createdBy === demoUid),
  ];
  const partnerOwes = [
    ...sharedHabits,
    ...habits.filter((h) => h.scope === 'personal' && h.createdBy === partnerUid),
  ];

  const writes = [];
  // Walk oldest → yesterday (skip today; demo user toggles today live).
  for (let i = days; i >= 1; i--) {
    const dayDate = new Date(today);
    dayDate.setDate(dayDate.getDate() - i);
    const dayKey = localDayKey(dayDate);
    const dayIdx = days - i; // 0 = oldest

    const { demo: demoCount, partner: partnerCount } = chooseDailyCounts(
      rand,
      dayIdx,
      days,
      demoOwes.length,
    );

    const demoChecked = pickRandomSubset(rand, demoOwes, demoCount);
    const partnerChecked = pickRandomSubset(rand, partnerOwes, partnerCount);

    const hourDemo = 8 + Math.floor(rand() * 12);
    const hourPartner = 8 + Math.floor(rand() * 12);
    const baseDemoTs = new Date(dayDate);
    baseDemoTs.setHours(hourDemo, Math.floor(rand() * 60), 0, 0);
    const basePartnerTs = new Date(dayDate);
    basePartnerTs.setHours(hourPartner, Math.floor(rand() * 60), 0, 0);

    for (const h of demoChecked) {
      const id = `${h.id}_${demoUid}_${dayKey}`;
      writes.push({
        ref: db.collection('habitCheckins').doc(id),
        data: {
          id,
          habitId: h.id,
          coupleId,
          uid: demoUid,
          cadence: 'daily',
          dayKey,
          createdAt: admin.firestore.Timestamp.fromDate(baseDemoTs),
        },
      });
    }
    for (const h of partnerChecked) {
      const id = `${h.id}_${partnerUid}_${dayKey}`;
      writes.push({
        ref: db.collection('habitCheckins').doc(id),
        data: {
          id,
          habitId: h.id,
          coupleId,
          uid: partnerUid,
          cadence: 'daily',
          dayKey,
          createdAt: admin.firestore.Timestamp.fromDate(basePartnerTs),
        },
      });
    }
  }

  await commitInBatches(
    db,
    writes.map(({ ref, data }) => (b) => b.set(ref, data)),
  );
  return writes.length;
}

// ─── Streak aggregates ─────────────────────────────────────────────────────

/**
 * Mirrors lib/habitStreakLogic.ts: walk backwards from `endDk` while the
 * predicate holds; count consecutive matches.
 */
function streakEndingAt(predicate, endDk, max = 400) {
  let s = 0;
  let d = endDk;
  for (let i = 0; i < max; i++) {
    if (predicate(d)) {
      s += 1;
      d = previousDayKey(d);
    } else break;
  }
  return s;
}

function findMostRecentDay(predicate, fromDk, max = 400) {
  let d = fromDk;
  for (let i = 0; i < max; i++) {
    if (predicate(d)) return d;
    d = previousDayKey(d);
  }
  return null;
}

async function recomputeAndPersistStreaks(
  db,
  coupleId,
  habits,
  demoUid,
  partnerUid,
  days,
) {
  const snap = await db
    .collection('habitCheckins')
    .where('coupleId', '==', coupleId)
    .where('cadence', '==', 'daily')
    .get();

  const keys = new Set();
  for (const doc of snap.docs) {
    const c = doc.data();
    if (c.dayKey) keys.add(`${c.habitId}|${c.uid}|${c.dayKey}`);
  }

  const dailies = habits.filter((h) => h.cadence === 'daily' && !h.archived);
  const sharedDailies = dailies.filter((h) => h.scope === 'shared');

  function userOwes(h, uid) {
    if (h.scope === 'shared') return true;
    return h.scope === 'personal' && h.createdBy === uid;
  }
  function userAllOwedDone(uid, dk) {
    const owed = dailies.filter((h) => userOwes(h, uid));
    if (owed.length === 0) return false;
    return owed.every((h) => keys.has(`${h.id}|${uid}|${dk}`));
  }
  function jointSharedDone(dk) {
    if (sharedDailies.length === 0) return false;
    return sharedDailies.every(
      (h) => keys.has(`${h.id}|${demoUid}|${dk}`) && keys.has(`${h.id}|${partnerUid}|${dk}`),
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDayKey(today);
  // Compute "as of yesterday" — today's row is left empty by the seed so the
  // demo user can interact with it; yesterday is the meaningful endpoint.
  const yesterdayKey = previousDayKey(todayKey);

  const demoCurrent = streakEndingAt((d) => userAllOwedDone(demoUid, d), yesterdayKey);
  const partnerCurrent = streakEndingAt((d) => userAllOwedDone(partnerUid, d), yesterdayKey);
  const jointCurrent = streakEndingAt(jointSharedDone, yesterdayKey);

  const demoLast = findMostRecentDay((d) => userAllOwedDone(demoUid, d), yesterdayKey);
  const partnerLast = findMostRecentDay((d) => userAllOwedDone(partnerUid, d), yesterdayKey);
  const lastJoint = findMostRecentDay(jointSharedDone, yesterdayKey);

  // Longest joint run inside the seeded window (powers the "best run" stat).
  let longestJoint = 0;
  let runJoint = 0;
  let demoLongest = 0;
  let runDemo = 0;
  let partnerLongest = 0;
  let runPartner = 0;
  for (let i = days; i >= 1; i--) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - i);
    const dk = localDayKey(dt);
    if (jointSharedDone(dk)) {
      runJoint += 1;
      if (runJoint > longestJoint) longestJoint = runJoint;
    } else runJoint = 0;
    if (userAllOwedDone(demoUid, dk)) {
      runDemo += 1;
      if (runDemo > demoLongest) demoLongest = runDemo;
    } else runDemo = 0;
    if (userAllOwedDone(partnerUid, dk)) {
      runPartner += 1;
      if (runPartner > partnerLongest) partnerLongest = runPartner;
    } else runPartner = 0;
  }

  await db.collection('couples').doc(coupleId).update({
    jointDailyStreak: jointCurrent,
    lastJointDailyDayKey: lastJoint,
    dailyStreaks: {
      [demoUid]: {
        currentStreak: demoCurrent,
        longestStreak: Math.max(demoCurrent, demoLongest),
        lastCompletedDayKey: demoLast,
      },
      [partnerUid]: {
        currentStreak: partnerCurrent,
        longestStreak: Math.max(partnerCurrent, partnerLongest),
        lastCompletedDayKey: partnerLast,
      },
    },
    habitsModelVersion: 2,
  });

  return {
    demoCurrent,
    partnerCurrent,
    jointCurrent,
    longestJoint,
  };
}

// ─── CLI plumbing (mirrors seed-demo-moods) ────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    dryRun: false,
    confirm: null,
    credentials: null,
    days: DEFAULT_DAYS,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') out.dryRun = true;
    else if (args[i] === '--confirm' && args[i + 1]) out.confirm = args[++i];
    else if (args[i] === '--credentials' && args[i + 1]) out.credentials = args[++i].trim();
    else if (args[i] === '--days' && args[i + 1]) {
      const n = Number(args[++i]);
      if (Number.isFinite(n) && n > 0) out.days = Math.min(n, 90);
    }
  }
  return out;
}

function resolveCredentialsPath(parsed) {
  return (parsed.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
}

function assertServiceAccountFile(credPath) {
  if (!credPath) {
    console.error(`
Missing Firebase Admin service account JSON.

  export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/your-project-adminsdk.json"
  npm run demo:seed-habits

Or pass --credentials explicitly. See scripts/create-demo-accounts.mjs for details.
`);
    process.exit(1);
  }
  if (!existsSync(credPath) || !statSync(credPath).isFile()) {
    console.error('Service account file not found or not a file:', credPath);
    process.exit(1);
  }
  try {
    JSON.parse(readFileSync(credPath, 'utf8'));
  } catch (e) {
    console.error('Credentials file is not valid JSON:', credPath, e?.message || e);
    process.exit(1);
  }
}

function initFirebaseAdmin(credPath) {
  if (admin.apps.length) return;
  const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function tryGetUidByEmail(auth, email) {
  try {
    const u = await auth.getUserByEmail(email);
    return u.uid;
  } catch (e) {
    if (e.code === 'auth/user-not-found') return null;
    throw e;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const parsed = parseArgs();
  const { dryRun, confirm, days } = parsed;

  if (dryRun) {
    console.log(
      `[dry-run] would seed ${days} past days of habit check-ins for ${DEMO_EMAIL} + ${PARTNER_EMAIL}.`,
    );
    process.exit(0);
  }

  if (confirm !== 'SEED-HABITS') {
    console.error('Refusing to write without: --confirm SEED-HABITS');
    process.exit(1);
  }

  const credPath = resolveCredentialsPath(parsed);
  assertServiceAccountFile(credPath);
  initFirebaseAdmin(credPath);
  const db = admin.firestore();
  const auth = admin.auth();

  const uidDemo = await tryGetUidByEmail(auth, DEMO_EMAIL);
  const uidPartner = await tryGetUidByEmail(auth, PARTNER_EMAIL);
  if (!uidDemo || !uidPartner) {
    console.error('Demo accounts not found. Run npm run demo:create first.');
    process.exit(1);
  }

  const userSnap = await db.collection('users').doc(uidDemo).get();
  const coupleId = userSnap.exists ? userSnap.data().coupleId : null;
  if (!coupleId) {
    console.error(`Demo user ${uidDemo} has no coupleId set. Re-run npm run demo:create.`);
    process.exit(1);
  }

  console.log('Wiping existing habits + check-ins for demo couple…');
  const wiped = await wipeCoupleHabitsAndCheckins(db, coupleId);
  console.log(`  removed ${wiped.habitsWiped} habits and ${wiped.checkinsWiped} check-ins.`);

  console.log('Creating demo habits…');
  const habits = await createDemoHabits(db, coupleId, uidDemo, uidPartner);
  for (const h of habits) {
    console.log(`  ${h.scope.padEnd(8)} ${h.emoji} ${h.title}`);
  }

  console.log(`Seeding ${days} days of past daily check-ins…`);
  // One RNG stream — same seed each run → deterministic demo data.
  const rand = seededRandom(0xb1ad);
  const checkinsCount = await seedCheckins(
    db,
    coupleId,
    habits,
    uidDemo,
    uidPartner,
    days,
    rand,
  );
  console.log(`  wrote ${checkinsCount} habit check-ins.`);

  console.log('Recomputing couple streak aggregates…');
  const streaks = await recomputeAndPersistStreaks(
    db,
    coupleId,
    habits,
    uidDemo,
    uidPartner,
    days,
  );

  console.log(`\nDone.`);
  console.log(`  coupleId:        ${coupleId}`);
  console.log(`  ${DEMO_EMAIL.padEnd(22)} → uid ${uidDemo}`);
  console.log(`  ${PARTNER_EMAIL.padEnd(22)} → uid ${uidPartner}`);
  console.log(`  joint streak:    ${streaks.jointCurrent} (longest in window: ${streaks.longestJoint})`);
  console.log(`  ${DEMO_EMAIL.padEnd(22)} streak: ${streaks.demoCurrent}`);
  console.log(`  ${PARTNER_EMAIL.padEnd(22)} streak: ${streaks.partnerCurrent}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
