#!/usr/bin/env node
/**
 * Creates Firebase Auth + Firestore demo couple for App Store / internal testing.
 *
 * Primary (sign in first for “you” in copy):
 *   Email:    demo@hum.app
 *   Password: humtumapp@demo
 *
 * Partner (second device / simulator — already linked to demo@hum.app):
 *   Email:    partner.demo@hum.app
 *   Password: humtumapp@demo
 *
 * Prerequisites — Firebase **Admin** JSON (not the same as `.env` web keys):
 *   Firebase Console → Project settings → **Service accounts** → **Generate new private key**
 *   Save the file outside git (e.g. `~/keys/humm-adminsdk.json`).
 *
 *   Option A:  export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/humm-adminsdk.json"
 *   Option B:  npm run demo:create -- --credentials "$HOME/keys/humm-adminsdk.json"
 *
 * Usage:
 *   node scripts/create-demo-accounts.mjs --dry-run
 *   node scripts/create-demo-accounts.mjs --confirm CREATE-DEMO
 *   node scripts/create-demo-accounts.mjs --confirm CREATE-DEMO --force   # delete existing pair, then recreate
 *
 * --force removes Auth users demo@hum.app + partner.demo@hum.app (and their Firestore couple data) if present.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEMO_EMAIL = 'demo@hum.app';
const PARTNER_EMAIL = 'partner.demo@hum.app';
const DEMO_PASSWORD = 'humtumapp@demo';

const DEMO_DISPLAY = 'rahul';
const PARTNER_DISPLAY = 'anjali';

/** Must match scripts/seed-starter-nominations.mjs */
const STARTER_SUBMITTED_BY = 'humm_starter_pack';

function getCalendarHalfYearBounds(referenceDate = new Date()) {
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

/** Mirrors constants/categories.ts AWARD_CATEGORIES for couple doc. */
function defaultAwardCategoryRows() {
  return [
    { id: 'best_found_food', label: 'best found food', emoji: '🍽️', enabled: true },
    { id: 'best_purchase', label: 'best purchase', emoji: '🛍️', enabled: true },
    { id: 'best_planning', label: 'best planning', emoji: '🗺️', enabled: true },
    { id: 'best_surprise', label: 'best surprise', emoji: '🎁', enabled: true },
    { id: 'best_movie', label: 'best movie', emoji: '🎞️', enabled: true },
    { id: 'best_fight_resolution', label: 'best fight resolution', emoji: '🤝', enabled: true },
  ];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dryRun: false, force: false, confirm: null, credentials: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') out.dryRun = true;
    else if (args[i] === '--force') out.force = true;
    else if (args[i] === '--confirm' && args[i + 1]) out.confirm = args[++i];
    else if (args[i] === '--credentials' && args[i + 1]) out.credentials = args[++i].trim();
  }
  return out;
}

/** Resolve path: CLI flag wins, then GOOGLE_APPLICATION_CREDENTIALS. */
function resolveCredentialsPath(parsed) {
  return (parsed.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
}

function assertServiceAccountFile(credPath) {
  if (!credPath) {
    console.error(`
Missing Firebase Admin service account JSON.

  1) Firebase Console → Project settings → Service accounts → Generate new private key
  2) Save the file (keep it out of git), then either:

     export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/your-project-adminsdk.json"
     npm run demo:create

     npm run demo:create -- --credentials "$HOME/keys/your-project-adminsdk.json"

The path must be a real file — not the documentation placeholder "/path/to/serviceAccount.json".
`);
    process.exit(1);
  }
  if (!existsSync(credPath)) {
    console.error(`Service account file not found:
  ${credPath}

If you still see "/path/to/..." you copied the example literally. Use the actual path to the JSON you downloaded from Firebase.
`);
    process.exit(1);
  }
  try {
    if (!statSync(credPath).isFile()) {
      console.error('Credentials path must be a file, not a directory:', credPath);
      process.exit(1);
    }
  } catch (e) {
    console.error('Cannot access credentials path:', credPath, e?.message || e);
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
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function deleteByQuery(db, query) {
  let total = 0;
  for (;;) {
    const snap = await query.limit(500).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
    total += snap.size;
    if (snap.size < 500) break;
  }
  return total;
}

async function wipeCoupleAndUsers(db, auth, coupleId, uidA, uidB) {
  for (const col of ['nominations', 'ceremonies', 'decisions', 'reasons', 'battles']) {
    await deleteByQuery(db, db.collection(col).where('coupleId', '==', coupleId));
  }
  const optSnap = await db.collection('decisionOptions').doc(coupleId).get();
  if (optSnap.exists) await optSnap.ref.delete();
  const cref = db.collection('couples').doc(coupleId);
  if ((await cref.get()).exists) await cref.delete();
  for (const uid of [uidA, uidB]) {
    const uref = db.collection('users').doc(uid);
    if ((await uref.get()).exists) await uref.delete();
    try {
      await auth.deleteUser(uid);
    } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e;
    }
  }
}

/** Only wipe couples where both members are our two demo emails (safety). */
async function assertCoupleIsDemoPair(auth, uidA, uidB) {
  const [a, b] = await Promise.all([auth.getUser(uidA), auth.getUser(uidB)]);
  const emails = new Set([a.email, b.email].filter(Boolean));
  const allowed = new Set([DEMO_EMAIL, PARTNER_EMAIL]);
  for (const e of emails) {
    if (!allowed.has(e)) {
      throw new Error(
        `Refusing --force: couple includes non-demo account (${e}). Unlink or delete manually.`,
      );
    }
  }
  if (emails.size === 0) return;
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

function nomineeUid(tag, uidDemo, uidPartner) {
  if (tag === 'A') return uidDemo;
  if (tag === 'P') return uidPartner;
  throw new Error(`Invalid nominee tag: ${tag}`);
}

async function main() {
  const parsed = parseArgs();
  const { dryRun, force, confirm } = parsed;

  if (dryRun) {
    console.log('[dry-run] Would create / update demo couple:');
    console.log(`  ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    console.log(`  ${PARTNER_EMAIL} / ${DEMO_PASSWORD}`);
    console.log('\n(No Firebase credentials required for --dry-run.)');
    process.exit(0);
  }

  if (confirm !== 'CREATE-DEMO') {
    console.error('Refusing to write without: --confirm CREATE-DEMO');
    process.exit(1);
  }

  const credPath = resolveCredentialsPath(parsed);
  assertServiceAccountFile(credPath);
  initFirebaseAdmin(credPath);
  const db = admin.firestore();
  const auth = admin.auth();

  const existingDemo = await tryGetUidByEmail(auth, DEMO_EMAIL);
  const existingPartner = await tryGetUidByEmail(auth, PARTNER_EMAIL);

  if ((existingDemo || existingPartner) && !force) {
    console.error(
      'One or both demo emails already exist in Auth. Re-run with --force to delete them and their couple data first.',
    );
    process.exit(1);
  }

  if (force) {
    const uids = [];
    if (existingDemo) uids.push(existingDemo);
    if (existingPartner) uids.push(existingPartner);
    const seenCouples = new Set();
    for (const uid of uids) {
      const snap = await db.collection('users').doc(uid).get();
      const cid = snap.exists ? snap.data().coupleId : null;
      if (cid && !seenCouples.has(cid)) {
        seenCouples.add(cid);
        const csnap = await db.collection('couples').doc(cid).get();
        const u1 = csnap.exists ? csnap.data().user1Id : null;
        const u2 = csnap.exists ? csnap.data().user2Id : null;
        if (u1 && u2) {
          await assertCoupleIsDemoPair(auth, u1, u2);
          console.log(`--force: wiping couple ${cid}`);
          await wipeCoupleAndUsers(db, auth, cid, u1, u2);
        }
      }
    }
    for (const uid of uids) {
      const snap = await db.collection('users').doc(uid).get();
      if (snap.exists) await snap.ref.delete();
      try {
        await auth.deleteUser(uid);
      } catch (e) {
        if (e.code !== 'auth/user-not-found') throw e;
      }
    }
  }

  const inviteDemo = 'DEM' + Math.random().toString(36).substring(2, 5).toUpperCase();
  const invitePartner = 'PAR' + Math.random().toString(36).substring(2, 5).toUpperCase();

  const demoUser = await auth.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    displayName: DEMO_DISPLAY,
    emailVerified: true,
  });
  const partnerUser = await auth.createUser({
    email: PARTNER_EMAIL,
    password: DEMO_PASSWORD,
    displayName: PARTNER_DISPLAY,
    emailVerified: true,
  });

  const uidDemo = demoUser.uid;
  const uidPartner = partnerUser.uid;
  const coupleId = `${uidDemo}_${uidPartner}`;
  const { start, end } = getCalendarHalfYearBounds(new Date());

  const ceremonyRef = db.collection('ceremonies').doc();
  const ceremonyId = ceremonyRef.id;

  const batch1 = db.batch();
  batch1.set(db.collection('users').doc(uidDemo), {
    uid: uidDemo,
    displayName: DEMO_DISPLAY,
    avatarUrl: null,
    partnerId: uidPartner,
    coupleId,
    fcmToken: null,
    inviteCode: inviteDemo,
    xp: 180,
    level: 2,
    badges: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch1.set(db.collection('users').doc(uidPartner), {
    uid: uidPartner,
    displayName: PARTNER_DISPLAY,
    avatarUrl: null,
    partnerId: uidDemo,
    coupleId,
    fcmToken: null,
    inviteCode: invitePartner,
    xp: 95,
    level: 1,
    badges: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch1.set(db.collection('couples').doc(coupleId), {
    id: coupleId,
    user1Id: uidDemo,
    user2Id: uidPartner,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    activeCeremonyId: ceremonyId,
    activeBattleId: null,
    awardCategories: defaultAwardCategoryRows(),
    awardCategoryIdsUsedInCompleteSeasons: [],
    streaks: {
      decisionStreak: 2,
      nominationStreak: 1,
      ceremonyStreak: 0,
      reasonStreak: 1,
      lastDecisionDayKey: null,
      lastNominationDayKey: null,
      lastCeremonyCompleteDayKey: null,
      lastReasonDayKey: null,
    },
    weeklyChallenge: null,
  });
  batch1.set(ceremonyRef, {
    id: ceremonyId,
    coupleId,
    periodStart: admin.firestore.Timestamp.fromDate(start),
    periodEnd: admin.firestore.Timestamp.fromDate(end),
    status: 'nominating',
    ceremonyDate: null,
    winners: {},
    picksByUser: {},
    picksSubmitted: {},
    resolutionPicksByUser: {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch1.commit();

  const dec1 = db.collection('decisions').doc();
  const dec2 = db.collection('decisions').doc();
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const batch2 = db.batch();
  batch2.set(dec1, {
    id: dec1.id,
    coupleId,
    category: 'food',
    mode: 'quickspin',
    options: ['thai', 'italian', 'mexican'],
    result: 'thai',
    vetoedOptions: [],
    createdAt: ts,
    createdByUserId: uidDemo,
  });
  batch2.set(dec2, {
    id: dec2.id,
    coupleId,
    category: 'activity',
    mode: 'quickspin',
    options: ['walk outside', 'movie at home'],
    result: 'walk outside',
    vetoedOptions: ['movie at home'],
    createdAt: ts,
    createdByUserId: uidPartner,
  });
  const reasonLines = [
    { authorId: uidDemo, aboutId: uidPartner, text: 'You make ordinary Tuesdays feel like a plan I actually want to keep.' },
    { authorId: uidPartner, aboutId: uidDemo, text: 'The way you laugh at your own jokes before the punchline lands.' },
    { authorId: uidDemo, aboutId: uidPartner, text: 'How you always save the last bite for me (and pretend you were full).' },
    { authorId: uidPartner, aboutId: uidDemo, text: 'Your voice when you say “come here” — instant calm.' },
  ];
  for (const r of reasonLines) {
    const ref = db.collection('reasons').doc();
    batch2.set(ref, {
      id: ref.id,
      coupleId,
      authorId: r.authorId,
      aboutId: r.aboutId,
      text: r.text,
      mediaUrl: null,
      mediaType: null,
      createdAt: ts,
    });
  }
  await batch2.commit();

  const jsonPath = join(__dirname, '..', 'data', 'starter-nominations-seed.json');
  const rows = JSON.parse(readFileSync(jsonPath, 'utf8'));
  let batch = db.batch();
  let ops = 0;
  for (const r of rows) {
    const ref = db.collection('nominations').doc();
    batch.set(ref, {
      id: ref.id,
      coupleId,
      ceremonyId,
      category: r.category,
      nomineeId: nomineeUid(r.nominee, uidDemo, uidPartner),
      submittedBy: STARTER_SUBMITTED_BY,
      title: r.title,
      description: r.description,
      photoUrl: null,
      eventDate: null,
      seeded: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    ops++;
    if (ops % 450 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();

  console.log('\nDone. Demo couple created.');
  console.log('  coupleId:', coupleId);
  console.log('  ceremonyId:', ceremonyId);
  console.log(`  ${DEMO_EMAIL}  →  uid ${uidDemo}`);
  console.log(`  ${PARTNER_EMAIL}  →  uid ${uidPartner}`);
  console.log('  Nominations seeded from data/starter-nominations-seed.json (seeded: true).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
