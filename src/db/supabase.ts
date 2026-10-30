import { createClient } from '@supabase/supabase-js';
import type { DrillHistoryRecord } from './index';
import { queueOutboxEvent } from './outbox';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tgcunoaxgctpyyesgzzi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Ensures the client is signed in via Anonymous Auth.
 * Returns the current authenticated User or null if auth failed/offline.
 */
export async function ensureAuthUser() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      return sessionData.session.user;
    }
    const { data: authData, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('Anonymous sign-in warning:', error.message);
      return null;
    }
    return authData?.user || null;
  } catch (err) {
    console.warn('Supabase auth network notice:', err);
    return null;
  }
}

/**
 * Retrieves the current user's membership and family_id if already joined.
 */
export async function getCurrentMembership() {
  const user = await ensureAuthUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('members')
      .select('id, family_id, role, display_name, language')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) return null;
    return data as {
      id: string;
      family_id: string;
      role: 'elder' | 'guardian';
      display_name: string;
      language: string;
    };
  } catch (err) {
    console.warn('Failed to fetch membership (offline-first):', err);
    return null;
  }
}

/**
 * Creates a new family cluster using the security definer RPC create_family.
 * Parent role creates the family with role 'elder'.
 */
export async function createFamilyCluster(displayName: string, role: 'elder' | 'guardian' = 'elder', language: string = 'hi') {
  const user = await ensureAuthUser();
  if (!user) throw new Error('Not signed in');

  const { data: familyId, error } = await supabase.rpc('create_family', {
    p_name: displayName,
    p_role: role,
    p_lang: language
  });

  if (error) throw error;
  return familyId as string;
}

/**
 * Generates a 6-character short-lived pairing code using create_pairing_code RPC.
 */
export async function generatePairingCode(): Promise<string> {
  const user = await ensureAuthUser();
  if (!user) throw new Error('Not signed in');

  const { data: code, error } = await supabase.rpc('create_pairing_code');
  if (error) throw error;
  return code as string;
}

/**
 * Redeems an unexpired pairing code using redeem_pairing_code RPC.
 * Family member (role 'guardian') redeems the code.
 */
export async function redeemPairingCode(code: string, displayName: string, role: 'elder' | 'guardian' = 'guardian', language: string = 'hi') {
  const user = await ensureAuthUser();
  if (!user) throw new Error('Not signed in');

  const { data: familyId, error } = await supabase.rpc('redeem_pairing_code', {
    p_code: code.trim().toUpperCase(),
    p_name: displayName,
    p_role: role,
    p_lang: language
  });

  if (error) throw error;
  return familyId as string;
}

/**
 * Leave current family using leave_family RPC.
 */
export async function leaveCurrentFamily() {
  const user = await ensureAuthUser();
  if (!user) return;
  const { error } = await supabase.rpc('leave_family');
  if (error) throw error;
}

/**
 * HARD PRIVACY RULES FOR SERVER EVENTS & SESSIONS:
 * - NEVER send phone numbers, safe words, contact names, notes, audio, or raw transcripts.
 * - Pause alerts go into the `events` table (type: 'pause_pressed', payload: {"source": "home" | "drill"}).
 * - Finished drills go into `drill_sessions` table plus a 'drill_completed' event in `events`.
 * - All detailed metrics (tactics list, final pressure score, notes, pilot log) STAY on device in IndexedDB.
 */

/**
 * Triggers a pause_pressed event:
 * 1. Writes immediately to Dexie outbox table.
 * 2. Background outbox worker dispatches to Supabase events table when online.
 */
export async function triggerPausePressed(source: 'home' | 'drill') {
  try {
    await queueOutboxEvent('pause_pressed', { source });
  } catch (err) {
    console.warn('Failed to queue pause_pressed event:', err);
  }
}

/**
 * Syncs a completed drill to outbox (drill_sessions + drill_completed event).
 * A drill completed before joining a family does not crash and stays in local IndexedDB.
 */
export async function syncDrillSessionToSupabase(record: Omit<DrillHistoryRecord, 'id'>) {
  try {
    const flags = new Set(record.flags);
    const hungUp = flags.has('hung_up');
    const toldSomeone = flags.has('told_someone');
    const pauseUsed = flags.has('used_pause');
    const refusedMoney = !flags.has('moved_money');
    const refusedOtp = !flags.has('shared_otp') && !flags.has('shared_info');

    await queueOutboxEvent('drill_completed', {
      scenarioId: record.scenarioId,
      version: record.version,
      outcome: record.outcome,
      hungUp,
      refusedMoney,
      refusedOtp,
      toldSomeone,
      pauseUsed,
      flags: record.flags,
      duration: record.duration
    });
  } catch (err) {
    console.warn('Drill sync queue notice (offline-first):', err);
  }
}
