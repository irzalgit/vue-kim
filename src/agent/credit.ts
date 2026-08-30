import { get, ref, update } from 'firebase/database';
import { db } from '../lib/firebase';

/**
 * Path in Firebase Realtime Database where each user's token balance is stored.
 * Expected structure: /users/<uid>
 */
const userPath = (uid: string) => `users/${uid}`;

/**
 * Retrieve the current credit balance for a given user.
 * Returns `null` if the user record does not exist or the field is missing.
 */
export async function getCredits(uid: string): Promise<number | null> {
  try {
    const snapshot = await get(ref(db, userPath(uid)));
    const val = snapshot.val();
    if (!val) return null;
    const tokens = val.tokens ?? val.token_balance ?? val.kuota;
    return typeof tokens === 'number' ? tokens : null;
  } catch (err) {
    console.error('[credit] Gagal membaca kuota:', err);
    return null;
  }
}

/**
 * Ensure that a user has a quota record. If none exists, create it with the
 * default value of 10 credits.
 */
export async function ensureCredits(uid: string, defaultCredits = 10): Promise<number> {
  const current = await getCredits(uid);
  if (current === null) {
    await update(ref(db, userPath(uid)), {
      tokens: defaultCredits,
      token_balance: defaultCredits
    });
    return defaultCredits;
  }
  return current;
}

/**
 * Decrement the user's credit by 1 after a successful AI output.
 * The function guards against negative balances.
 * Returns the new credit balance.
 */
export async function decrementCredit(uid: string): Promise<number> {
  const current = await getCredits(uid);
  const currentBalance = typeof current === 'number' ? current : 0;
  const newValue = currentBalance > 0 ? currentBalance - 1 : 0;
  await update(ref(db, userPath(uid)), {
    tokens: newValue,
    token_balance: newValue
  });
  return newValue;
}

/**
 * Helper that loads the credit into the global window object (used by UI badges).
 * Call this after the user is authenticated.
 */
export async function loadUserCreditsToWindow(uid: string): Promise<void> {
  const credit = await ensureCredits(uid);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof globalThis !== 'undefined' && (globalThis as any).window) {
    (globalThis as any).window._userCredits = credit;
  }
}

