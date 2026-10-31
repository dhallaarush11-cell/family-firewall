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
  try {
    await ensurePrivacyCacheLoaded();
    auditPayloadForPrivacyLeak(payload);
  } catch (err) {
    if (err instanceof PrivacyViolationError) {
      return Promise.reject(new Error(`Privacy protection blocked event: ${err.message}`));
    }
    throw err;
  }

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

export class PrivacyViolationError extends Error {
  reason: 'safe_word' | 'phone_number';

  constructor(message: string, reason: 'safe_word' | 'phone_number') {
    super(message);
    this.name = 'PrivacyViolationError';
    this.reason = reason;
  }
}

let cachedSafeWord: string | null = null;
let cachedContactPhones: string[] = [];

export function setPrivacyAuditCache(safeWord?: string | null, phones?: string[]): void {
  if (safeWord !== undefined) cachedSafeWord = safeWord;
  if (phones !== undefined) cachedContactPhones = phones;
}

export async function ensurePrivacyCacheLoaded(): Promise<{ safeWord?: string; contactPhones: string[] }> {
  try {
    const [safeWordRecord, contacts] = await Promise.all([
      db.safeWord.get('current_safeword'),
      db.trustedContacts.toArray()
    ]);
    cachedSafeWord = safeWordRecord?.word?.trim() || null;
    cachedContactPhones = contacts.map(c => c.phone).filter(Boolean);
  } catch {
    // Tests or offline fallback
  }
  return {
    safeWord: cachedSafeWord || undefined,
    contactPhones: cachedContactPhones
  };
}

export function showPrivacyBlockedNotification(reason: 'safe_word' | 'phone_number'): void {
  const message =
    reason === 'safe_word'
      ? 'Privacy Alert: Secret family safe word was blocked from being sent to the server.'
      : 'Privacy Alert: Trusted contact phone number was blocked from being sent to the server.';

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('privacy-audit-blocked', {
        detail: { reason, message }
      })
    );
  }
}

/**
 * Normalizes a phone number by stripping all non-digits.
 * If prefixed with Indian country code 91 (12 digits) or trunk 0 (11 digits), strips to 10 digits.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Global fetch wrapper used by Supabase client to inspect and log every outbound request
 */
export async function privacyLoggingFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method || (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET');
  const body = init?.body;

  // Audit outgoing body before sending
  try {
    await ensurePrivacyCacheLoaded();
    auditPayloadForPrivacyLeak(body);
  } catch (err) {
    if (err instanceof PrivacyViolationError) {
      // HARD REQUIREMENT: "On a match it blocks that one request, logs a clear message to the console, and shows a friendly error."
      return Promise.reject(new Error(`Privacy protection blocked request: ${err.message}`));
    }
    throw err;
  }

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
 * Kept for schema tests and log audit checks.
 */
export const PHONE_NUMBER_PATTERN = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|(?:\+?91[\s-]?)?[6-9]\d{9}|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b[6-9]\d{9}\b/;

export interface PrivacyAuditOptions {
  safeWord?: string | null;
  storedPhones?: string[];
}

/**
 * Audits a serialized payload string or object against privacy leaks.
 * HARD RULE:
 * "At runtime it must compare outgoing payloads only against the exact stored safe word
 * and the exact stored contact phone numbers (normalized), not generic digit patterns.
 * On a match it blocks that one request, logs a clear message to the console, and shows a friendly error."
 */
export function auditPayloadForPrivacyLeak(
  payload: unknown,
  optionsOrSafeWord?: string | null | PrivacyAuditOptions,
  storedPhonesArg?: string[]
): void {
  if (!payload) return;
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);

  let safeWordToCheck: string | null = null;
  let phonesToCheck: string[] = [];

  if (typeof optionsOrSafeWord === 'string' || optionsOrSafeWord === null) {
    safeWordToCheck = optionsOrSafeWord;
    phonesToCheck = storedPhonesArg || cachedContactPhones;
  } else if (optionsOrSafeWord && typeof optionsOrSafeWord === 'object') {
    safeWordToCheck = optionsOrSafeWord.safeWord !== undefined ? optionsOrSafeWord.safeWord : cachedSafeWord;
    phonesToCheck = optionsOrSafeWord.storedPhones || cachedContactPhones;
  } else {
    safeWordToCheck = cachedSafeWord;
    phonesToCheck = cachedContactPhones;
  }

  // 1. Check exact stored Safe Word (case-insensitive)
  if (safeWordToCheck && safeWordToCheck.trim().length >= 2) {
    const needle = safeWordToCheck.trim().toLowerCase();
    if (serialized.toLowerCase().includes(needle)) {
      const msg = 'PRIVACY VIOLATION: Stored safe word detected in outbound payload!';
      console.error(`[Privacy Audit Blocked] ${msg} Request blocked from leaving this device.`);
      showPrivacyBlockedNotification('safe_word');
      throw new PrivacyViolationError(msg, 'safe_word');
    }
  }

  // 2. Check stored contact phone numbers (exact & normalized)
  if (phonesToCheck && phonesToCheck.length > 0) {
    for (const rawPhone of phonesToCheck) {
      if (!rawPhone) continue;
      const trimmedRaw = rawPhone.trim();
      const normalized = normalizePhoneNumber(trimmedRaw);

      if (normalized.length >= 7) {
        // Build flexible regex matching normalized digits with optional spacing, dashes, or +91
        const flexibleRegex = new RegExp('(?:\\+?91[\\s-]?)?' + normalized.split('').join('[\\s-]?'));

        if (
          serialized.includes(trimmedRaw) ||
          serialized.includes(normalized) ||
          flexibleRegex.test(serialized)
        ) {
          const msg = 'PRIVACY VIOLATION: Stored contact phone number detected in outbound payload!';
          console.error(`[Privacy Audit Blocked] ${msg} Request blocked from leaving this device.`);
          showPrivacyBlockedNotification('phone_number');
          throw new PrivacyViolationError(msg, 'phone_number');
        }
      }
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
