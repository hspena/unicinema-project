/**
 * SEED ADMIN USER
 * ─────────────────────────────────────────────────────────────────
 * Run this ONCE to create the first Admin account in Firebase.
 * After running, remove the call from index.tsx immediately.
 *
 * How to use:
 * 1. Add this to index.tsx temporarily:
 *      import { runSeedAdmin } from './app/utils/seedAdmin';
 *      runSeedAdmin();
 * 2. Run npm start — check the browser console for "✅ Admin created"
 * 3. Remove the import and call from index.tsx
 * 4. Log in with the credentials you set below
 */

import { createUser } from '../services/userService';

export const runSeedAdmin = async () => {
  // ── Change these before running ────────────────────────────────
  const ADMIN_NAME     = 'Admin Master';
  const ADMIN_EMAIL    = 'admin@unicinema.com';
  const ADMIN_PASSWORD = 'Admin@123456';
  // ───────────────────────────────────────────────────────────────

  try {
    await createUser({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role:     'Admin',
    });
    console.log('✅ Admin user created successfully!');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('   ⚠️  Remove runSeedAdmin() from index.tsx now!');
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Admin already exists — no action needed.');
    } else {
      console.error('❌ Seed failed:', err.message);
    }
  }
};
