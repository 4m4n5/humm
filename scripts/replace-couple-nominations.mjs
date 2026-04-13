#!/usr/bin/env node
/**
 * Replace ALL nominations for a couple's active ceremony with rows from a JSON file.
 * JSON shape matches seed-starter-nominations: { category, title, description, nominee: "A"|"P" }.
 *
 * A = --uid-a (or email lookup user); P = partner uid.
 *
 * Also resets ceremony alignment state so old nomination ids are not referenced:
 *   status → nominating, winners / picksByUser / picksSubmitted / resolutionPicksByUser cleared.
 *
 *   export GOOGLE_APPLICATION_CREDENTIALS=.../serviceAccount.json
 *   node scripts/replace-couple-nominations.mjs --lookup-email aman@... --json data/aman-pree-nominations-seed.json --dry-run
 *   node scripts/replace-couple-nominations.mjs --couple-id ID --uid-a UID_A --uid-p UID_P --json data/foo.json
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const __dirname = dirname(fileURLToPath(import.meta.url));
const STARTER_SUBMITTED_BY = 'humm_starter_pack';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    coupleId: null,
    uidA: null,
    uidP: null,
    lookupEmail: null,
    jsonPath: join(__dirname, '..', 'data', 'aman-pree-nominations-seed.json'),
    dryRun: false,
    skipCeremonyReset: false,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--couple-id' && args[i + 1]) out.coupleId = args[++i].trim();
    else if (args[i] === '--uid-a' && args[i + 1]) out.uidA = args[++i].trim();
    else if (args[i] === '--uid-p' && args[i + 1]) out.uidP = args[++i].trim();
    else if (args[i] === '--lookup-email' && args[i + 1]) out.lookupEmail = args[++i].trim().toLowerCase();
    else if (args[i] === '--json' && args[i + 1]) out.jsonPath = args[++i].trim();
    else if (args[i] === '--dry-run') out.dryRun = true;
    else if (args[i] === '--skip-ceremony-reset') out.skipCeremonyReset = true;
  }
  return out;
}

function nomineeUid(tag, uidForA, uidForP) {
  if (tag === 'A') return uidForA;
  if (tag === 'P') return uidForP;
  throw new Error(`Invalid nominee tag: ${tag}`);
}

async function resolveCoupleAndUids(db, { coupleId, uidA, uidP, lookupEmail }) {
  if (lookupEmail) {
    const authUser = await admin.auth().getUserByEmail(lookupEmail);
    const profSnap = await db.collection('users').doc(authUser.uid).get();
    if (!profSnap.exists) throw new Error(`No users/${authUser.uid} profile`);
    const cid = profSnap.data().coupleId;
    if (!cid) throw new Error(`User ${lookupEmail} has no coupleId`);
    const coupleSnap = await db.collection('couples').doc(cid).get();
    if (!coupleSnap.exists) throw new Error(`No couples/${cid}`);
    const u1 = coupleSnap.data().user1Id;
    const u2 = coupleSnap.data().user2Id;
    const partnerUid = authUser.uid === u1 ? u2 : u1;
    return {
      coupleId: cid,
      uidA: authUser.uid,
      uidP: partnerUid,
    };
  }
  if (!coupleId || !uidA || !uidP) {
    throw new Error('Provide --lookup-email EMAIL or all of --couple-id, --uid-a, --uid-p');
  }
  return { coupleId, uidA, uidP };
}

async function main() {
  const args = parseArgs();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const db = admin.firestore();

  const { coupleId, uidA, uidP } = await resolveCoupleAndUids(db, args);
  const rows = JSON.parse(readFileSync(args.jsonPath, 'utf8'));
  if (!Array.isArray(rows)) {
    console.error('JSON must be an array');
    process.exit(1);
  }

  const coupleRef = db.collection('couples').doc(coupleId);
  const coupleSnap = await coupleRef.get();
  const ceremonyId = coupleSnap.data()?.activeCeremonyId;
  if (!ceremonyId) {
    console.error('Couple has no activeCeremonyId');
    process.exit(1);
  }

  const existingQ = await db
    .collection('nominations')
    .where('coupleId', '==', coupleId)
    .where('ceremonyId', '==', ceremonyId)
    .get();

  const planned = rows.map((r) => ({
    category: r.category,
    title: String(r.title ?? '').trim(),
    description: String(r.description ?? '').trim(),
    nomineeId: nomineeUid(r.nominee, uidA, uidP),
  }));

  console.log('coupleId:', coupleId);
  console.log('uid A (from email or --uid-a):', uidA);
  console.log('uid P (partner):', uidP);
  console.log('ceremonyId:', ceremonyId);
  console.log('Delete', existingQ.size, 'existing nomination(s)');
  console.log('Write', planned.length, 'nomination(s) from', args.jsonPath);
  for (const p of planned) {
    console.log(`  [${p.category}] "${p.title}" → nominee ${p.nomineeId}`);
  }

  if (args.dryRun) {
    console.log('\n[dry-run] No writes.');
    process.exit(0);
  }

  let batch = db.batch();
  let n = 0;
  for (const d of existingQ.docs) {
    batch.delete(d.ref);
    n++;
    if (n % 450 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log('Deleted', existingQ.size, 'doc(s).');

  batch = db.batch();
  let ops = 0;
  for (const p of planned) {
    const ref = db.collection('nominations').doc();
    batch.set(ref, {
      id: ref.id,
      coupleId,
      ceremonyId,
      category: p.category,
      nomineeId: p.nomineeId,
      submittedBy: STARTER_SUBMITTED_BY,
      title: p.title,
      description: p.description,
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
  console.log('Wrote', planned.length, 'nomination(s).');

  if (!args.skipCeremonyReset) {
    await db.collection('ceremonies').doc(ceremonyId).update({
      status: 'nominating',
      winners: {},
      picksByUser: {},
      picksSubmitted: {},
      resolutionPicksByUser: {},
    });
    console.log(
      'Reset ceremonies/' + ceremonyId + ' to nominating (cleared winners & alignment picks).',
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
