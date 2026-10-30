import Dexie, { type Table } from 'dexie';

export interface UserProfile {
  id: string; // 'user_profile'
  role: 'parent' | 'family';
  language: 'hi' | 'en' | 'hing';
  createdAt: number;
  updatedAt: number;
}

export interface TrustedContact {
  id?: number;
  name: string;
  relation: string;
  phone: string;
  priority: number; // 1, 2, 3
  createdAt: number;
}

export interface SafeWordRecord {
  id: string; // 'current_safeword'
  word: string;
  hint?: string;
  updatedAt: number;
}

export type DrillOutcome = 'safe' | 'almost' | 'retry';

export interface DrillHistoryRecord {
  id?: number;
  scenarioId: string;
  version: number;
  outcome: DrillOutcome; // HARD RULE: Safe, Almost, Let's try again ('retry') - never 'failed' or 'wrong'
  flags: string[];
  tactics: string[];
  finalPressure: number;
  duration: number; // in seconds
  familyMemberWatching: boolean;
  timestamp: number;
  date?: number; // backwards compatibility
  durationSeconds?: number; // backwards compatibility
  notes?: string;
}

export interface OutboxRecord {
  id?: number;
  type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: number;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export interface PilotLogRecord {
  id?: number;
  timestamp: number;
  event: string;
  details?: Record<string, unknown>;
}

export class FamilyFirewallDatabase extends Dexie {
  profile!: Table<UserProfile, string>;
  trustedContacts!: Table<TrustedContact, number>;
  safeWord!: Table<SafeWordRecord, string>;
  drillHistory!: Table<DrillHistoryRecord, number>;
  outbox!: Table<OutboxRecord, number>;
  settings!: Table<SettingRecord, string>;
  pilotLog!: Table<PilotLogRecord, number>;

  constructor() {
    super('FamilyFirewallDB');
    this.version(1).stores({
      profile: 'id, role, language',
      trustedContacts: '++id, priority, name, phone',
      safeWord: 'id',
      drillHistory: '++id, scenarioId, outcome, date',
      outbox: '++id, type, status, createdAt',
      settings: 'key',
      pilotLog: '++id, timestamp, event'
    });
  }
}

export const db = new FamilyFirewallDatabase();

// Helper database operations
export async function getProfile(): Promise<UserProfile | undefined> {
  return await db.profile.get('user_profile');
}

export async function saveProfile(role: 'parent' | 'family', language: 'hi' | 'en' | 'hing'): Promise<UserProfile> {
  const existing = await getProfile();
  const now = Date.now();
  const profile: UserProfile = {
    id: 'user_profile',
    role,
    language,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  await db.profile.put(profile);
  return profile;
}

export async function getTrustedContacts(): Promise<TrustedContact[]> {
  return await db.trustedContacts.orderBy('priority').toArray();
}

export async function addTrustedContact(contact: Omit<TrustedContact, 'id' | 'createdAt'>): Promise<number> {
  const count = await db.trustedContacts.count();
  if (count >= 3) {
    throw new Error('Maximum of 3 trusted contacts allowed');
  }
  return (await db.trustedContacts.add({
    ...contact,
    createdAt: Date.now()
  })) as number;
}

export async function deleteTrustedContact(id: number): Promise<void> {
  await db.trustedContacts.delete(id);
}

export async function updateTrustedContact(id: number, changes: Partial<TrustedContact>): Promise<number> {
  return await db.trustedContacts.update(id, changes);
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const item = await db.settings.get(key);
  if (!item) return defaultValue;
  return item.value as T;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getSafeWord(): Promise<SafeWordRecord | undefined> {
  return await db.safeWord.get('current_safeword');
}

export async function saveSafeWord(word: string, hint?: string): Promise<SafeWordRecord> {
  const record: SafeWordRecord = {
    id: 'current_safeword',
    word: word.trim(),
    hint: hint?.trim(),
    updatedAt: Date.now()
  };
  await db.safeWord.put(record);
  return record;
}

export async function deleteSafeWord(): Promise<void> {
  await db.safeWord.delete('current_safeword');
}

export async function logPilotEvent(event: string, details?: Record<string, unknown>): Promise<void> {
  try {
    await db.pilotLog.add({
      timestamp: Date.now(),
      event,
      details
    });
  } catch (e) {
    console.error('Failed to log pilot event:', e);
  }
}

export async function saveDrillResult(record: Omit<DrillHistoryRecord, 'id'>): Promise<number> {
  // Detailed record (tactics, finalPressure, notes) saved on device only
  const id = (await db.drillHistory.add(record)) as number;
  // Offline-first: attempt cloud sync to drill_sessions & events (never drill_history)
  try {
    const { syncDrillSessionToSupabase } = await import('./supabase');
    syncDrillSessionToSupabase(record).catch(err => {
      console.warn('Background Supabase drill session sync failed (offline-first):', err);
    });
  } catch (e) {
    // Supabase optional
  }
  return id;
}
