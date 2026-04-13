#!/usr/bin/env node
/**
 * Reset one couple to "fresh link" state: clear awards, decisions, reasons,
 * battles, quick-spin lists, XP, and badges. Keeps Auth users, user profiles
 * (display names, invite codes, partner/couple ids), and the couple document
 * identity — only replaces active ceremony with a new nominating season.
 *
 * Requires Firebase Admin (service account):
 *   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
 *
 * Usage:
 *   node scripts/reset-couple-data.mjs --list-couples
 *   node scripts/reset-couple-data.mjs --couple-id UID1_UID2 --dry-run
 *   node scripts/reset-couple-data.mjs --couple-id UID1_UID2 --confirm RESET
 *
 * Repair XP only (no deletes): if a full reset stopped mid-way, use:
 *   node scripts/reset-couple-data.mjs --couple-id UID1_UID2 --xp-only --confirm RESET
 */

import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

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

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    listCouples: false,
    coupleId: null,
    dryRun: false,
    confirm: null,
    xpOnly: false,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--list-couples') out.listCouples = true;
    else if (args[i] === '--couple-id' && args[i + 1]) out.coupleId = args[++i].trim();
    else if (args[i] === '--dry-run') out.dryRun = true;
    else if (args[i] === '--xp-only') out.xpOnly = true;
    else if (args[i] === '--confirm' && args[i + 1]) out.confirm = args[++i];
  }
  return out;
}

/** Recursively delete documents returned by a query (max 500 per batch). */
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

async function main() {
  const { listCouples, coupleId, dryRun, confirm, xpOnly } = parseArgs();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const db = admin.firestore();

  if (listCouples) {
    const snap = await db.collection('couples').get();
    console.log('couples (id, user1Id, user2Id, activeCeremonyId):');
    for (const d of snap.docs) {
      const c = d.data();
      console.log(`  ${d.id}`);
      console.log(`    user1: ${c.user1Id}  user2: ${c.user2Id}`);
      console.log(`    activeCeremonyId: ${c.activeCeremonyId ?? '(null)'}`);
    }
    process.exit(0);
  }

  if (!coupleId) {
    console.error('Pass --couple-id UID1_UID2 or use --list-couples.');
    process.exit(1);
  }

  const coupleRef = db.collection('couples').doc(coupleId);
  const coupleSnap = await coupleRef.get();
  if (!coupleSnap.exists) {
    console.error(`No couple document: couples/${coupleId}`);
    process.exit(1);
  }
  const couple = coupleSnap.data();
  const uidA = couple.user1Id;
  const uidB = couple.user2Id;
  if (!uidA || !uidB) {
    console.error('Couple doc missing user1Id / user2Id');
    process.exit(1);
  }

  const counts = {
    nominations: 0,
    ceremonies: 0,
    decisions: 0,
    reasons: 0,
    battles: 0,
  };

  for (const col of ['nominations', 'ceremonies', 'decisions', 'reasons', 'battles']) {
    const q = db.collection(col).where('coupleId', '==', coupleId);
    const snap = await q.count().get();
    counts[col] = snap.data().count;
  }

  const optSnap = await db.collection('decisionOptions').doc(coupleId).get();
  const hasOptions = optSnap.exists;

  console.log('Couple:', coupleId);
  console.log('Users:', uidA, uidB);
  console.log('Counts to remove:', counts);
  console.log('decisionOptions doc exists:', hasOptions);

  if (dryRun) {
    console.log('\n[dry-run] No writes. Re-run with --confirm RESET to apply.');
    process.exit(0);
  }

  if (confirm !== 'RESET') {
    console.error('Refusing to write without exact flag: --confirm RESET');
    process.exit(1);
  }

  if (xpOnly) {
    const userReset = { xp: 0, level: 1, badges: [] };
    await db.collection('users').doc(uidA).update(userReset);
    await db.collection('users').doc(uidB).update(userReset);
    const [a, b] = await Promise.all([
      db.collection('users').doc(uidA).get(),
      db.collection('users').doc(uidB).get(),
    ]);
    console.log('\n[xp-only] Done. Verified Firestore users/');
    console.log(`  ${uidA}: xp=${a.data()?.xp} level=${a.data()?.level} badges=${(a.data()?.badges ?? []).length}`);
    console.log(`  ${uidB}: xp=${b.data()?.xp} level=${b.data()?.level} badges=${(b.data()?.badges ?? []).length}`);
    process.exit(0);
  }

  counts.nominations = await deleteByQuery(
    db,
    db.collection('nominations').where('coupleId', '==', coupleId),
  );
  counts.decisions = await deleteByQuery(
    db,
    db.collection('decisions').where('coupleId', '==', coupleId),
  );
  counts.reasons = await deleteByQuery(
    db,
    db.collection('reasons').where('coupleId', '==', coupleId),
  );
  counts.battles = await deleteByQuery(
    db,
    db.collection('battles').where('coupleId', '==', coupleId),
  );
  counts.ceremonies = await deleteByQuery(
    db,
    db.collection('ceremonies').where('coupleId', '==', coupleId),
  );

  if (hasOptions) {
    await db.collection('decisionOptions').doc(coupleId).delete();
  }

  const { start, end } = getCalendarHalfYearBounds(new Date());
  const newCeremonyRef = db.collection('ceremonies').doc();
  await newCeremonyRef.set({
    id: newCeremonyRef.id,
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

  await coupleRef.update({
    activeCeremonyId: newCeremonyRef.id,
    activeBattleId: null,
    streaks: {
      decisionStreak: 0,
      nominationStreak: 0,
      ceremonyStreak: 0,
      reasonStreak: 0,
      lastDecisionDayKey: null,
      lastNominationDayKey: null,
      lastCeremonyCompleteDayKey: null,
      lastReasonDayKey: null,
    },
    weeklyChallenge: null,
  });

  const userReset = { xp: 0, level: 1, badges: [] };
  await db.collection('users').doc(uidA).update(userReset);
  await db.collection('users').doc(uidB).update(userReset);
  const [verA, verB] = await Promise.all([
    db.collection('users').doc(uidA).get(),
    db.collection('users').doc(uidB).get(),
  ]);

  console.log('\nDone.');
  console.log('Deleted:', counts);
  console.log('New ceremony:', newCeremonyRef.id, '(nominating)');
  console.log('Verified users/ (xp, level, badge count):');
  console.log(`  ${uidA}: ${verA.data()?.xp}, ${verA.data()?.level}, ${(verA.data()?.badges ?? []).length}`);
  console.log(`  ${uidB}: ${verB.data()?.xp}, ${verB.data()?.level}, ${(verB.data()?.badges ?? []).length}`);
  console.log('Preserved: display names, invite codes, partner link, couple id.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
