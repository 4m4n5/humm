#!/usr/bin/env node
/**
 * Seed past mood entries for the demo couple so the "earlier" section on
 * the mood tab has data to render.
 *
 * Targets the demo pair created by scripts/create-demo-accounts.mjs:
 *   - demo@hum.app
 *   - partner.demo@hum.app
 *
 * Today's entry is never touched — only yesterday and earlier.
 *
 * Output is deterministic (seeded RNG), so re-running produces the same set
 * unless --force wipes first.
 *
 * Prerequisites — Firebase Admin JSON (see scripts/create-demo-accounts.mjs).
 *   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/humm-adminsdk.json"
 *
 * Usage:
 *   node scripts/seed-demo-moods.mjs --dry-run
 *   node scripts/seed-demo-moods.mjs --confirm SEED-MOODS
 *   node scripts/seed-demo-moods.mjs --confirm SEED-MOODS --force
 *   node scripts/seed-demo-moods.mjs --confirm SEED-MOODS --days 21
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const DEMO_EMAIL = 'demo@hum.app';
const PARTNER_EMAIL = 'partner.demo@hum.app';
const DEFAULT_DAYS = 14;

/** Mirrors constants/moodStickers.ts. */
const STICKERS = [
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

// ─── Date helpers (mirror lib/dateKeys.ts) ─────────────────────────────────

function localDayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localWeekKey(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return localDayKey(x);
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

function pickSticker(rand) {
  return STICKERS[Math.floor(rand() * STICKERS.length)];
}

// ─── Timeline generation ───────────────────────────────────────────────────

function makeTimeline(rand, dayDate, count) {
  const timeline = [];
  // Spread `count` timestamps roughly between 8am and 10pm, ascending.
  const span = 14; // hours
  for (let i = 0; i < count; i++) {
    const slot = (span / count) * i;
    const hour = 8 + Math.floor(slot + rand() * (span / count));
    const minute = Math.floor(rand() * 60);
    const at = new Date(dayDate);
    at.setHours(Math.min(hour, 23), minute, 0, 0);
    const sticker = pickSticker(rand);
    timeline.push({
      stickerId: sticker.id,
      emoji: sticker.emoji,
      label: sticker.label,
      quadrant: sticker.quadrant,
      at: admin.firestore.Timestamp.fromDate(at),
    });
  }
  return timeline;
}

function overrideLastSticker(timeline, sticker) {
  if (!sticker || timeline.length === 0) return timeline;
  const last = timeline[timeline.length - 1];
  timeline[timeline.length - 1] = {
    stickerId: sticker.id,
    emoji: sticker.emoji,
    label: sticker.label,
    quadrant: sticker.quadrant,
    at: last.at,
  };
  return timeline;
}

function buildEntry(coupleId, uid, dayKey, weekKey, timeline) {
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  return {
    id: `${coupleId}_${uid}_${dayKey}`,
    coupleId,
    uid,
    dayKey,
    weekKey,
    current: last,
    timeline,
    changeCount: timeline.length,
    createdAt: first.at,
    updatedAt: last.at,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    dryRun: false,
    force: false,
    confirm: null,
    credentials: null,
    days: DEFAULT_DAYS,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') out.dryRun = true;
    else if (args[i] === '--force') out.force = true;
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
  npm run demo:seed-moods

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
  const { dryRun, force, confirm, days } = parsed;

  if (dryRun) {
    console.log(
      `[dry-run] would seed ${days} past days of moods for ${DEMO_EMAIL} + ${PARTNER_EMAIL}.`,
    );
    process.exit(0);
  }

  if (confirm !== 'SEED-MOODS') {
    console.error('Refusing to write without: --confirm SEED-MOODS');
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDayKey(today);

  if (force) {
    const snap = await db
      .collection('moodEntries')
      .where('coupleId', '==', coupleId)
      .get();
    let wiped = 0;
    let batch = db.batch();
    let ops = 0;
    for (const d of snap.docs) {
      if (d.data().dayKey !== todayKey) {
        batch.delete(d.ref);
        ops++;
        wiped++;
        if (ops >= 450) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
    }
    if (ops > 0) await batch.commit();
    console.log(`--force: wiped ${wiped} past mood entries for couple ${coupleId}.`);
  }

  // Two independent RNG streams so partner's data drifts from demo's. Seeds
  // are fixed so re-runs produce the same demo timeline.
  const randDemo = seededRandom(0xd1a1);
  const randPartner = seededRandom(0xc2a2);
  const randSync = seededRandom(0x5e1f);

  const writes = [];
  // Walk from oldest → yesterday so each day's data is independent.
  for (let i = days; i >= 1; i--) {
    const dayDate = new Date(today);
    dayDate.setDate(dayDate.getDate() - i);
    const dayKey = localDayKey(dayDate);
    const weekKey = localWeekKey(dayDate);

    const demoLogged = randDemo() < 0.88;
    const partnerLogged = randPartner() < 0.78;
    const bothLogged = demoLogged && partnerLogged;

    // ~25% of "both logged" days end in sync.
    const forceSync = bothLogged && randSync() < 0.25;
    const sharedSticker = forceSync ? pickSticker(randSync) : null;

    if (demoLogged) {
      const count = pickWeighted(randDemo, [1, 2, 3, 4, 5], [3, 4, 5, 2, 1]);
      let timeline = makeTimeline(randDemo, dayDate, count);
      timeline = overrideLastSticker(timeline, sharedSticker);
      writes.push(buildEntry(coupleId, uidDemo, dayKey, weekKey, timeline));
    }
    if (partnerLogged) {
      const count = pickWeighted(randPartner, [1, 2, 3, 4, 5], [4, 4, 4, 2, 1]);
      let timeline = makeTimeline(randPartner, dayDate, count);
      timeline = overrideLastSticker(timeline, sharedSticker);
      writes.push(buildEntry(coupleId, uidPartner, dayKey, weekKey, timeline));
    }
  }

  let batch = db.batch();
  let ops = 0;
  for (const w of writes) {
    const ref = db.collection('moodEntries').doc(w.id);
    batch.set(ref, w);
    ops++;
    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  console.log(`\nSeeded ${writes.length} mood entries across the past ${days} days.`);
  console.log(`  coupleId:        ${coupleId}`);
  console.log(`  ${DEMO_EMAIL.padEnd(22)} → uid ${uidDemo}`);
  console.log(`  ${PARTNER_EMAIL.padEnd(22)} → uid ${uidPartner}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
