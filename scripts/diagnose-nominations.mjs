#!/usr/bin/env node
/**
 * Read-only diagnostic — prints the current nomination + ceremony + gamification
 * state for a couple, so we can decide what to reset before touching anything.
 *
 *   export GOOGLE_APPLICATION_CREDENTIALS=.../serviceAccount.json
 *   node scripts/diagnose-nominations.mjs --uid SBYZ27R2hGQgj4h0NxBhDLL8x0C3
 */
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { uid: null, coupleId: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--uid' && args[i + 1]) out.uid = args[++i];
    if (args[i] === '--couple-id' && args[i + 1]) out.coupleId = args[++i];
  }
  return out;
}

async function main() {
  const { uid, coupleId: argCoupleId } = parseArgs();
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();

  let coupleId = argCoupleId;
  let uidA = null;
  let uidB = null;

  if (uid && !coupleId) {
    const profSnap = await db.collection('users').doc(uid).get();
    if (!profSnap.exists) {
      console.error('No user profile for', uid);
      process.exit(1);
    }
    coupleId = profSnap.data().coupleId;
    if (!coupleId) {
      console.error('User has no coupleId');
      process.exit(1);
    }
  }

  const coupleSnap = await db.collection('couples').doc(coupleId).get();
  if (!coupleSnap.exists) {
    console.error('No couple', coupleId);
    process.exit(1);
  }
  const couple = coupleSnap.data();
  uidA = couple.user1Id;
  uidB = couple.user2Id;
  const activeCeremonyId = couple.activeCeremonyId;

  console.log('═══ couple ═══');
  console.log('coupleId:', coupleId);
  console.log('user1Id (A):', uidA);
  console.log('user2Id (B):', uidB);
  console.log('activeCeremonyId:', activeCeremonyId ?? '(none)');
  console.log('awardCategories enabled:',
    (couple.awardCategories ?? []).filter((c) => c.enabled).map((c) => c.id));

  console.log('\n═══ ceremonies (all) ═══');
  const cerSnap = await db.collection('ceremonies').where('coupleId', '==', coupleId).get();
  cerSnap.forEach((d) => {
    const c = d.data();
    const pe = c.periodEnd?.toDate?.()?.toISOString?.() ?? '?';
    console.log(`  ${d.id}  status=${c.status}  periodEnd=${pe}  winners=${Object.keys(c.winners ?? {}).length}`);
  });

  console.log('\n═══ nominations (all for couple, grouped by ceremonyId) ═══');
  const nomSnap = await db.collection('nominations').where('coupleId', '==', coupleId).get();
  const byCeremony = {};
  nomSnap.forEach((d) => {
    const n = d.data();
    if (!byCeremony[n.ceremonyId]) byCeremony[n.ceremonyId] = [];
    byCeremony[n.ceremonyId].push(n);
  });
  for (const cid of Object.keys(byCeremony)) {
    const items = byCeremony[cid];
    const isActive = cid === activeCeremonyId;
    console.log(`  ceremonyId=${cid}${isActive ? '  ← ACTIVE' : ''}  (${items.length} nominations)`);
    for (const n of items) {
      const seeded = n.seeded ? ' [seeded]' : '';
      const nominee = n.nomineeId === 'both' ? 'both' : n.nomineeId === uidA ? 'A' : n.nomineeId === uidB ? 'B' : '?';
      const author = n.submittedBy === uidA ? 'A' : n.submittedBy === uidB ? 'B' : n.submittedBy;
      console.log(`    [${n.category}] "${n.title}"  by ${author} → ${nominee}${seeded}`);
    }
  }
  if (Object.keys(byCeremony).length === 0) {
    console.log('  (no nominations at all for this couple)');
  }

  console.log('\n═══ user profile stats ═══');
  for (const u of [uidA, uidB]) {
    const p = (await db.collection('users').doc(u).get()).data() ?? {};
    console.log(`  ${u === uidA ? 'A' : 'B'} (${p.displayName ?? '?'})  xp=${p.xp ?? 0}  level=${p.level ?? '?'}  badges=${(p.badges ?? []).length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
