#!/usr/bin/env node
/**
 * Puts the couple’s **active** ceremony back on the nominating timeline:
 *   status → nominating, clears winners + all alignment / resolution pick maps.
 * **Does not** delete or change `nominations/*` docs.
 *
 *   export GOOGLE_APPLICATION_CREDENTIALS=.../serviceAccount.json
 *   node scripts/reset-active-ceremony-to-nominating.mjs --lookup-email you@...
 *   node scripts/reset-active-ceremony-to-nominating.mjs --couple-id COUPLE_DOC_ID
 *   node ... --dry-run
 */

import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { coupleId: null, lookupEmail: null, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--couple-id' && args[i + 1]) out.coupleId = args[++i].trim();
    else if (args[i] === '--lookup-email' && args[i + 1]) out.lookupEmail = args[++i].trim().toLowerCase();
    else if (args[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

async function resolveCoupleId(db, { coupleId, lookupEmail }) {
  if (lookupEmail) {
    const authUser = await admin.auth().getUserByEmail(lookupEmail);
    const profSnap = await db.collection('users').doc(authUser.uid).get();
    if (!profSnap.exists) throw new Error(`No users/${authUser.uid} profile`);
    const cid = profSnap.data().coupleId;
    if (!cid) throw new Error(`User ${lookupEmail} has no coupleId`);
    const coupleSnap = await db.collection('couples').doc(cid).get();
    if (!coupleSnap.exists) throw new Error(`No couples/${cid}`);
    return cid;
  }
  if (!coupleId) throw new Error('Provide --couple-id or --lookup-email EMAIL');
  const coupleSnap = await db.collection('couples').doc(coupleId).get();
  if (!coupleSnap.exists) throw new Error(`No couples/${coupleId}`);
  return coupleId;
}

async function main() {
  const { coupleId: cidArg, lookupEmail, dryRun } = parseArgs();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const db = admin.firestore();

  const coupleId = await resolveCoupleId(db, { coupleId: cidArg, lookupEmail });
  const coupleSnap = await db.collection('couples').doc(coupleId).get();
  const ceremonyId = coupleSnap.data()?.activeCeremonyId;
  if (!ceremonyId) {
    console.error('Couple has no activeCeremonyId');
    process.exit(1);
  }

  const nomQ = await db
    .collection('nominations')
    .where('coupleId', '==', coupleId)
    .where('ceremonyId', '==', ceremonyId)
    .get();

  console.log('coupleId:', coupleId);
  console.log('ceremonyId:', ceremonyId);
  console.log('nominations (unchanged):', nomQ.size);

  const payload = {
    status: 'nominating',
    winners: {},
    picksByUser: {},
    picksSubmitted: {},
    resolutionPicksByUser: {},
    ceremonyDate: null,
  };

  console.log('Will update ceremonies/' + ceremonyId, payload);

  if (dryRun) {
    console.log('\n[dry-run] No writes.');
    process.exit(0);
  }

  await db.collection('ceremonies').doc(ceremonyId).update(payload);
  console.log('\nDone — ceremony is nominating again; nominations left as-is.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
