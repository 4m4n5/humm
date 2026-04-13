#!/usr/bin/env node
/**
 * Clears gamification on every user document: badges = [], xp = 0, level = 1.
 * Does not delete Auth accounts, couples, ceremonies, or any other collections.
 *
 *   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
 *   node scripts/reset-all-user-gamification.mjs --dry-run
 *   node scripts/reset-all-user-gamification.mjs --confirm RESET-ALL-GAMIFICATION
 */

import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const CONFIRM_PHRASE = 'RESET-ALL-GAMIFICATION';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    confirm: (() => {
      const i = args.indexOf('--confirm');
      return i >= 0 && args[i + 1] ? args[i + 1] : null;
    })(),
  };
}

async function main() {
  const { dryRun, confirm } = parseArgs();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
    process.exit(1);
  }

  if (!dryRun && confirm !== CONFIRM_PHRASE) {
    console.error(
      `Refusing to run without --dry-run or --confirm ${CONFIRM_PHRASE} (exact phrase).`,
    );
    process.exit(1);
  }

  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();

  let updated = 0;
  let batch = db.batch();
  let inBatch = 0;

  async function flush() {
    if (inBatch === 0) return;
    if (!dryRun) await batch.commit();
    updated += inBatch;
    batch = db.batch();
    inBatch = 0;
  }

  const snap = await db.collection('users').get();
  console.log(`Found ${snap.size} user documents.`);

  for (const doc of snap.docs) {
    const ref = doc.ref;
    if (dryRun) {
      updated += 1;
      continue;
    }
    batch.update(ref, { badges: [], xp: 0, level: 1 });
    inBatch += 1;
    if (inBatch >= 450) await flush();
  }

  await flush();

  if (dryRun) {
    console.log(`Dry run: would reset badges + xp + level on ${snap.size} users.`);
  } else {
    console.log(`Reset badges + xp + level on ${updated} users.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
