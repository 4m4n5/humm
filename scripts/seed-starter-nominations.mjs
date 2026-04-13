#!/usr/bin/env node
/**
 * Writes starter nominations from data/starter-nominations-seed.json for the active ceremony.
 * Categories omitted from the JSON get no starter docs — they stay empty until you add noms in-app;
 * all seven award categories always exist in the app (AWARD_CATEGORIES), nothing is removed.
 * No client / XP path — rows use submittedBy = humm_starter_pack and seeded: true.
 *
 * Map A/P in the JSON to Firebase uids:
 *   export GOOGLE_APPLICATION_CREDENTIALS=...
 *   node scripts/seed-starter-nominations.mjs --couple-id COUPLE --uid-a UID_FOR_A --uid-p UID_FOR_P
 *   node scripts/seed-starter-nominations.mjs ... --dry-run
 *   node scripts/seed-starter-nominations.mjs ... --force   # delete existing seeded rows for this ceremony first
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Must match constants/starterNominations.ts */
const STARTER_SUBMITTED_BY = 'humm_starter_pack';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    coupleId: null,
    uidA: null,
    uidP: null,
    dryRun: false,
    force: false,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--couple-id' && args[i + 1]) out.coupleId = args[++i].trim();
    else if (args[i] === '--uid-a' && args[i + 1]) out.uidA = args[++i].trim();
    else if (args[i] === '--uid-p' && args[i + 1]) out.uidP = args[++i].trim();
    else if (args[i] === '--dry-run') out.dryRun = true;
    else if (args[i] === '--force') out.force = true;
  }
  return out;
}

function nomineeUid(tag, uidForA, uidForP) {
  if (tag === 'A') return uidForA;
  if (tag === 'P') return uidForP;
  throw new Error(`Invalid nominee tag: ${tag}`);
}

async function main() {
  const { coupleId, uidA, uidP, dryRun, force } = parseArgs();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
    process.exit(1);
  }
  if (!coupleId || !uidA || !uidP) {
    console.error(
      'Usage: node scripts/seed-starter-nominations.mjs --couple-id ID --uid-a UID --uid-p UID [--dry-run] [--force]',
    );
    process.exit(1);
  }

  const jsonPath = join(__dirname, '..', 'data', 'starter-nominations-seed.json');
  const rows = JSON.parse(readFileSync(jsonPath, 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const db = admin.firestore();

  const coupleRef = db.collection('couples').doc(coupleId);
  const coupleSnap = await coupleRef.get();
  if (!coupleSnap.exists) {
    console.error(`No couple: couples/${coupleId}`);
    process.exit(1);
  }
  const ceremonyId = coupleSnap.data().activeCeremonyId;
  if (!ceremonyId) {
    console.error('Couple has no activeCeremonyId');
    process.exit(1);
  }

  const existingQ = await db
    .collection('nominations')
    .where('coupleId', '==', coupleId)
    .where('ceremonyId', '==', ceremonyId)
    .get();

  const seededRefs = existingQ.docs.filter((d) => d.data().seeded === true);
  if (seededRefs.length > 0 && !force) {
    console.error(
      `Found ${seededRefs.length} seeded nomination(s) for this ceremony. Re-run with --force to delete them and re-seed, or skip.`,
    );
    process.exit(1);
  }

  const planned = rows.map((r) => ({
    category: r.category,
    title: r.title,
    description: r.description,
    nomineeId: nomineeUid(r.nominee, uidA, uidP),
  }));

  console.log('Ceremony:', ceremonyId);
  console.log('Rows:', planned.length);
  for (const p of planned) {
    console.log(`  [${p.category}] ${p.title} → nominee ${p.nomineeId}`);
  }

  if (dryRun) {
    console.log('\n[dry-run] No writes.');
    process.exit(0);
  }

  if (seededRefs.length > 0 && force) {
    let batch = db.batch();
    let n = 0;
    for (const d of seededRefs) {
      batch.delete(d.ref);
      n++;
      if (n % 450 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    await batch.commit();
    console.log(`Removed ${seededRefs.length} previous seeded row(s).`);
  }

  let batch = db.batch();
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
  console.log(`\nWrote ${planned.length} starter nominations.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
