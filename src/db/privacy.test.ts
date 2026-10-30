import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractFieldNames,
  logNetworkRequest,
  getPrivacyLog,
  clearPrivacyLog,
  sendEvent,
  auditPayloadForPrivacyLeak
} from './privacy';

describe('Privacy Proof and Leak Prevention', () => {
  beforeEach(() => {
    clearPrivacyLog();
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

  it('detects phone number patterns in payloads and triggers privacy violation failure', () => {
    const storedSafeWord = 'mango blossom';

    // 1. Clean payload: must pass without error
    const cleanPayload = {
      family_id: 'fam_abc123',
      type: 'pause_pressed',
      payload: { source: 'home' }
    };
    expect(() => auditPayloadForPrivacyLeak(cleanPayload, storedSafeWord)).not.toThrow();

    // 2. Payload with Indian mobile number: must fail
    const payloadWithIndianPhone = {
      family_id: 'fam_abc123',
      contact: '9876543210'
    };
    expect(() => auditPayloadForPrivacyLeak(payloadWithIndianPhone, storedSafeWord)).toThrow(
      /Phone number pattern detected/
    );

    // 3. Payload with +91 phone number: must fail
    const payloadWithFormattedPhone = {
      family_id: 'fam_abc123',
      phone: '+91 98765 43210'
    };
    expect(() => auditPayloadForPrivacyLeak(payloadWithFormattedPhone, storedSafeWord)).toThrow(
      /Phone number pattern detected/
    );

    // 4. Payload with stored safe word: must fail
    const payloadWithSafeWord = {
      family_id: 'fam_abc123',
      notes: 'Caller asked for mango blossom which is our safe word'
    };
    expect(() => auditPayloadForPrivacyLeak(payloadWithSafeWord, storedSafeWord)).toThrow(
      /Stored safe word detected/
    );
  });

  it('fails test if genuine outbox event schemas ever contain phone numbers or safe words', () => {
    const testSafeWord = 'river dolphin';
    const fakePhone = '9876543210';

    // Verify legitimate pause event schema
    const pausePayload = {
      family_id: 'd9b73b5a-0000-0000-0000-000000000000',
      member_id: 'a1b2c3d4-0000-0000-0000-000000000000',
      type: 'pause_pressed',
      payload: { source: 'home' }
    };
    expect(() => auditPayloadForPrivacyLeak(pausePayload, testSafeWord)).not.toThrow();

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
    expect(() => auditPayloadForPrivacyLeak(drillSessionPayload, testSafeWord)).not.toThrow();

    // Injecting either should immediately trigger failure
    const leakedPayload = {
      ...drillSessionPayload,
      contact_number: fakePhone
    };
    expect(() => auditPayloadForPrivacyLeak(leakedPayload, testSafeWord)).toThrow();
  });
});
