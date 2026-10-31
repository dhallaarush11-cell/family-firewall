import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  extractFieldNames,
  logNetworkRequest,
  getPrivacyLog,
  clearPrivacyLog,
  sendEvent,
  auditPayloadForPrivacyLeak,
  setPrivacyAuditCache,
  PHONE_NUMBER_PATTERN,
  normalizePhoneNumber
} from './privacy';

describe('Privacy Proof and Leak Prevention', () => {
  beforeEach(() => {
    clearPrivacyLog();
    setPrivacyAuditCache(null, []);
    vi.restoreAllMocks();
  });

  it('extracts ONLY field names and never their values from JSON objects', () => {
    const sensitivePayload = {
      family_id: 'fam_12345',
      type: 'pause_pressed',
      source: 'home',
      secret_value_must_not_appear: 'SUPER_SECRET_123456789'
    };

    const fieldNames = extractFieldNames(sensitivePayload);
    expect(fieldNames).toEqual(['family_id', 'type', 'source', 'secret_value_must_not_appear']);

    // Log the request
    logNetworkRequest({
      url: 'https://tgcunoaxgctpyyesgzzi.supabase.co/rest/v1/events',
      method: 'POST',
      body: JSON.stringify(sensitivePayload)
    });

    const logs = getPrivacyLog();
    expect(logs).toHaveLength(1);
    expect(logs[0].method).toBe('POST');
    expect(logs[0].destination).toContain('/rest/v1/events');
    expect(logs[0].fieldNames).toEqual(['family_id', 'type', 'source', 'secret_value_must_not_appear']);

    // Ensure the raw log entry does not store the secret value
    const logString = JSON.stringify(logs[0]);
    expect(logString).not.toContain('SUPER_SECRET_123456789');
    expect(logString).not.toContain('fam_12345');
  });

  it('logs realtime events through single sendEvent() with field names only', async () => {
    await sendEvent('drill_completed', {
      scenarioId: 'digital_arrest',
      outcome: 'safe',
      duration: 42
    });

    const logs = getPrivacyLog();
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('realtime_event');
    expect(logs[0].destination).toBe('supabase:realtime:drill_completed');
    expect(logs[0].fieldNames).toEqual(['scenarioId', 'outcome', 'duration']);

    const logString = JSON.stringify(logs[0]);
    expect(logString).not.toContain('digital_arrest');
  });

  it('never blocks legitimate Supabase requests: normal events, anonymous auth, RPC calls, timestamps and UUIDs', () => {
    const storedSafeWord = 'mango blossom';
    const storedPhones = ['9876543210', '+91 98765 43210'];
    setPrivacyAuditCache(storedSafeWord, storedPhones);

    // 1. Normal pause event with UUIDs and timestamp
    const normalPauseEvent = {
      id: 'd9b73b5a-45e2-411a-8c29-87a2c6d48291',
      family_id: '9e64ce23-fae1-4a59-bb7e-5c6c69a5d915',
      member_id: 'd490daa6-e784-4ac3-b983-15b0a35e1d9b',
      type: 'pause_pressed',
      created_at: 1730381234567,
      payload: { source: 'home' }
    };
    expect(() => auditPayloadForPrivacyLeak(normalPauseEvent, { safeWord: storedSafeWord, storedPhones })).not.toThrow();

    // 2. Normal drill completed session payload with flags and duration
    const normalDrillSession = {
      family_id: '9e64ce23-fae1-4a59-bb7e-5c6c69a5d915',
      member_id: 'd490daa6-e784-4ac3-b983-15b0a35e1d9b',
      scenario_id: 'digital_arrest',
      scenario_version: 1,
      outcome: 'safe',
      hung_up: true,
      refused_money: true,
      refused_otp: true,
      told_someone: true,
      pause_used: false,
      pressure_flags: ['urgency', 'police_crest'],
      duration_sec: 45,
      timestamp: 1730389999000
    };
    expect(() => auditPayloadForPrivacyLeak(normalDrillSession, { safeWord: storedSafeWord, storedPhones })).not.toThrow();

    // 3. Supabase anonymous authentication payloads and tokens
    const anonymousAuthPayload = {
      gotrue_meta_security: {},
      timestamp: 1730381234567,
      anon_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.1234567890'
    };
    expect(() => auditPayloadForPrivacyLeak(anonymousAuthPayload, { safeWord: storedSafeWord, storedPhones })).not.toThrow();

    // 4. Supabase RPC calls (e.g. create_family, redeem_pairing_code, leave_family)
    const createFamilyRpc = {
      p_name: 'Test Elder',
      p_role: 'elder',
      p_lang: 'en'
    };
    expect(() => auditPayloadForPrivacyLeak(createFamilyRpc, { safeWord: storedSafeWord, storedPhones })).not.toThrow();

    const redeemPairingRpc = {
      p_code: 'FW8291',
      p_name: 'Priya',
      p_role: 'guardian'
    };
    expect(() => auditPayloadForPrivacyLeak(redeemPairingRpc, { safeWord: storedSafeWord, storedPhones })).not.toThrow();

    // 5. Arbitrary numeric IDs, timestamps, and UUIDs (which contain random hex digits)
    const payloadWithTimestampsAndUuids = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      client_timestamp_ms: 1730381234567,
      server_timestamp: '2026-10-31T08:00:00.123Z',
      duration_ms: 98765,
      // Random 10-digit number that does NOT match any stored contact phone:
      unrelated_reference_id: '1234567890'
    };
    expect(() => auditPayloadForPrivacyLeak(payloadWithTimestampsAndUuids, { safeWord: storedSafeWord, storedPhones })).not.toThrow();
  });

  it('blocks payloads containing the exact stored safe word', () => {
    const storedSafeWord = 'mango blossom';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Payload containing exact safe word in text notes
    const payloadWithSafeWord = {
      family_id: 'fam_abc123',
      notes: 'Caller asked for mango blossom which is our safe word'
    };

    expect(() =>
      auditPayloadForPrivacyLeak(payloadWithSafeWord, { safeWord: storedSafeWord, storedPhones: [] })
    ).toThrow(/Stored safe word detected in outbound payload/);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Privacy Audit Blocked]')
    );
  });

  it('blocks payloads containing a stored contact phone number (exact or normalized)', () => {
    const storedSafeWord = 'river dolphin';
    const storedPhones = ['+91 98765 43210'];
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 1. Raw normalized 10-digit number
    const payloadWithNormalizedDigits = {
      family_id: 'fam_abc123',
      contact: '9876543210'
    };
    expect(() =>
      auditPayloadForPrivacyLeak(payloadWithNormalizedDigits, { safeWord: storedSafeWord, storedPhones })
    ).toThrow(/Stored contact phone number detected in outbound payload/);

    // 2. Formatted phone number with country code and spaces
    const payloadWithFormattedPhone = {
      family_id: 'fam_abc123',
      phone: '+91 98765 43210'
    };
    expect(() =>
      auditPayloadForPrivacyLeak(payloadWithFormattedPhone, { safeWord: storedSafeWord, storedPhones })
    ).toThrow(/Stored contact phone number detected in outbound payload/);

    // 3. Formatted phone number with hyphens
    const payloadWithHyphenatedPhone = {
      family_id: 'fam_abc123',
      phone: '+91-98765-43210'
    };
    expect(() =>
      auditPayloadForPrivacyLeak(payloadWithHyphenatedPhone, { safeWord: storedSafeWord, storedPhones })
    ).toThrow(/Stored contact phone number detected in outbound payload/);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Privacy Audit Blocked]')
    );
  });

  it('normalizes phone numbers correctly', () => {
    expect(normalizePhoneNumber('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhoneNumber('+91-98765-43210')).toBe('9876543210');
    expect(normalizePhoneNumber('09876543210')).toBe('9876543210');
    expect(normalizePhoneNumber('9876543210')).toBe('9876543210');
  });

  it('scans logged payloads and fails test if genuine outbox event schemas ever contain phone numbers or safe words', () => {
    const testSafeWord = 'river dolphin';
    const fakePhone = '9876543210';

    // Verify legitimate pause event schema
    const pausePayload = {
      family_id: 'd9b73b5a-0000-0000-0000-000000000000',
      member_id: 'a1b2c3d4-0000-0000-0000-000000000000',
      type: 'pause_pressed',
      payload: { source: 'home' }
    };
    expect(() => auditPayloadForPrivacyLeak(pausePayload, { safeWord: testSafeWord, storedPhones: [fakePhone] })).not.toThrow();

    // Verify legitimate drill completed session schema
    const drillSessionPayload = {
      family_id: 'd9b73b5a-0000-0000-0000-000000000000',
      member_id: 'a1b2c3d4-0000-0000-0000-000000000000',
      scenario_id: 'digital_arrest',
      scenario_version: 1,
      outcome: 'safe',
      hung_up: true,
      refused_money: true,
      refused_otp: true,
      told_someone: true,
      pause_used: false,
      pressure_flags: ['urgency', 'police_crest'],
      duration_sec: 45
    };
    expect(() => auditPayloadForPrivacyLeak(drillSessionPayload, { safeWord: testSafeWord, storedPhones: [fakePhone] })).not.toThrow();

    // Injecting either should immediately trigger failure
    const leakedPayload = {
      ...drillSessionPayload,
      contact_number: fakePhone
    };
    expect(() => auditPayloadForPrivacyLeak(leakedPayload, { safeWord: testSafeWord, storedPhones: [fakePhone] })).toThrow(
      /Stored contact phone number detected in outbound payload/
    );

    // Verify PHONE_NUMBER_PATTERN detects generic phone patterns when scanning logged strings
    expect(PHONE_NUMBER_PATTERN.test(JSON.stringify(leakedPayload))).toBe(true);
    expect(PHONE_NUMBER_PATTERN.test(JSON.stringify(pausePayload))).toBe(false);
  });
});
