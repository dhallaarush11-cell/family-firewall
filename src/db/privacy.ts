import { db } from './index';

export interface PrivacyLogEntry {
  id: string;
  time: string; // ISO string
  type: 'network_request' | 'realtime_event';
  method: string; // 'GET', 'POST', 'PATCH', 'EVENT', etc.
  destination: string; // Host and path, e.g. "tgcunoaxgctpyyesgzzi.supabase.co/rest/v1/events"
  fieldNames: string[]; // Only the NAMES of fields sent, NEVER values
}

// In-memory log of outbound app network requests & events
const inMemoryPrivacyLog: PrivacyLogEntry[] = [];
let logListeners: Array<(entries: PrivacyLogEntry[]) => void> = [];

export function getPrivacyLog(): PrivacyLogEntry[] {
  return [...inMemoryPrivacyLog];
}

export function subscribeToPrivacyLog(callback: (entries: PrivacyLogEntry[]) => void): () => void {
  logListeners.push(callback);
  callback([...inMemoryPrivacyLog]);
  return () => {
    logListeners = logListeners.filter(cb => cb !== callback);
  };
}

export function clearPrivacyLog(): void {
  inMemoryPrivacyLog.length = 0;
  notifyPrivacyListeners();
}

function notifyPrivacyListeners(): void {
  const snapshot = [...inMemoryPrivacyLog];
  logListeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (e) {
      console.warn('Privacy log listener notice:', e);
    }
  });
}

/**
 * Extracts ONLY the field names from a request body (never values).
 */
export function extractFieldNames(body: unknown): string[] {
  if (!body) return [];
  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    if (Array.isArray(parsed)) {
      const keys = new Set<string>();
      for (const item of parsed) {
        if (item && typeof item === 'object') {
          Object.keys(item).forEach(k => keys.add(k));
        }
      }
      return Array.from(keys);
    } else if (parsed && typeof parsed === 'object') {
      return Object.keys(parsed as Record<string, unknown>);
    }
  } catch {
    // Non-JSON or binary payload
  }
  return [];
}

/**
 * Central function to record an outbound network request in memory.
 */
export function logNetworkRequest(options: {
  url: string;
  method: string;
  body?: unknown;
}): void {
  let destination = options.url;
  try {
    const parsedUrl = new URL(options.url, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
    destination = `${parsedUrl.host}${parsedUrl.pathname}`;
  } catch {
    // If not a full URL, destination remains
  }

  const fieldNames = extractFieldNames(options.body);

  const entry: PrivacyLogEntry = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    time: new Date().toISOString(),
    type: 'network_request',
    method: options.method.toUpperCase(),
    destination,
    fieldNames
  };

  inMemoryPrivacyLog.unshift(entry);
  if (inMemoryPrivacyLog.length > 200) {
    inMemoryPrivacyLog.pop();
  }
  notifyPrivacyListeners();
}

/**
 * Single function to send and log realtime safety events
 */
export async function sendEvent(
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  const fieldNames = Object.keys(payload);
  const entry: PrivacyLogEntry = {
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    time: new Date().toISOString(),
    type: 'realtime_event',
    method: 'EVENT',
    destination: `supabase:realtime:${type}`,
    fieldNames
  };

  inMemoryPrivacyLog.unshift(entry);
  if (inMemoryPrivacyLog.length > 200) {
    inMemoryPrivacyLog.pop();
  }
  notifyPrivacyListeners();
}

/**
 * Global fetch wrapper used by Supabase client to inspect and log every outbound request
 */
export function privacyLoggingFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET');
  const body = init?.body;

  logNetworkRequest({
    url,
    method: method || 'GET',
    body
  });

  return fetch(input, init);
}

/**
 * Phone number pattern regex:
 * Covers 10-digit Indian numbers (+91, 0, or raw 6-9xxxxxxxx)
 * and generic 10-digit telephone formats.
 */
export const PHONE_NUMBER_PATTERN = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|(?:\+?91[\s-]?)?[6-9]\d{9}|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b[6-9]\d{9}\b/;

/**
 * Audits a serialized payload string or object against privacy leaks.
 * Throws an error if any phone number pattern or the stored safe word is found.
 */
export function auditPayloadForPrivacyLeak(payload: unknown, safeWord?: string): void {
  if (!payload) return;
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);

  if (PHONE_NUMBER_PATTERN.test(serialized)) {
    throw new Error(`PRIVACY VIOLATION: Phone number pattern detected in outbound payload!`);
  }

  if (safeWord && safeWord.trim().length >= 3) {
    const needle = safeWord.trim().toLowerCase();
    if (serialized.toLowerCase().includes(needle)) {
      throw new Error(`PRIVACY VIOLATION: Stored safe word detected in outbound payload!`);
    }
  }
}

export interface LocalPrivacyCounts {
  contactsCount: number;
  drillsCount: number;
  hasSafeWord: boolean;
}

/**
 * Returns counts of items stored exclusively on the device
 */
export async function getLocalPrivacyCounts(): Promise<LocalPrivacyCounts> {
  try {
    const [contactsCount, drillsCount, safeWordRecord] = await Promise.all([
      db.trustedContacts.count(),
      db.drillHistory.count(),
      db.safeWord.get('current_safeword')
    ]);

    return {
      contactsCount,
      drillsCount,
      hasSafeWord: Boolean(safeWordRecord && safeWordRecord.word?.trim())
    };
  } catch (err) {
    console.warn('Could not read local privacy counts:', err);
    return {
      contactsCount: 0,
      drillsCount: 0,
      hasSafeWord: false
    };
  }
}
