#!/usr/bin/env node
/**
 * Change a Firebase Auth user's primary email while keeping the same uid
 * (Firestore users/{uid}, couples, reasons, etc. stay linked).
 *
 * Prerequisites:
 * 1. Firebase Console → Project settings → Service accounts → Generate new private key
 * 2. Save JSON and point GOOGLE_APPLICATION_CREDENTIALS at it, e.g.:
 *    export GOOGLE_APPLICATION_CREDENTIALS="$PWD/humm-firebase-adminsdk.json"
 *
 * The NEW email must NOT already be registered to another Firebase user.
 * If it is, delete that duplicate (empty) account in Console first, or merge manually.
 *
 * Usage:
 *   node scripts/migrate-auth-email.mjs --from old@email.com --to new@email.com
 *
 * Optional: --dry-run (only print what would happen)
 */

import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { from: null, to: null, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) out.from = args[++i].trim().toLowerCase();
    else if (args[i] === '--to' && args[i + 1]) out.to = args[++i].trim().toLowerCase();
    else if (args[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

async function main() {
  const { from, to, dryRun } = parseArgs();
  if (!from || !to) {
    console.error('Usage: node scripts/migrate-auth-email.mjs --from OLD@EMAIL --to NEW@EMAIL [--dry-run]');
    process.exit(1);
  }
  if (from === to) {
    console.error('from and to are the same; nothing to do.');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  const auth = admin.auth();

  let sourceUser;
  try {
    sourceUser = await auth.getUserByEmail(from);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.error(`No Firebase user with email: ${from}`);
      process.exit(1);
    }
    throw e;
  }

  try {
    const existing = await auth.getUserByEmail(to);
    console.error(
      `Target email ${to} is already used by uid ${existing.uid}.\n` +
        'Remove or rename that Auth user in Firebase Console first, then re-run.',
    );
    process.exit(1);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }

  console.log('Source user:', {
    uid: sourceUser.uid,
    email: sourceUser.email,
    emailVerified: sourceUser.emailVerified,
    disabled: sourceUser.disabled,
  });

  if (dryRun) {
    console.log('[dry-run] Would call updateUser(uid, { email:', to, ', emailVerified: true })');
    process.exit(0);
  }

  await auth.updateUser(sourceUser.uid, {
    email: to,
    emailVerified: true,
  });

  const after = await auth.getUser(sourceUser.uid);
  console.log('Done. User now:', {
    uid: after.uid,
    email: after.email,
    emailVerified: after.emailVerified,
  });
  console.log('\nPrerana should sign in with the new email and existing password.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
