import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from './index';
import { queueOutboxEvent } from './outbox';
import { triggerPausePressed, syncDrillSessionToSupabase } from './supabase';

describe('Dexie Outbox & Privacy Rules', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('queues pause_pressed event with pending status and correct payload', async () => {
    let capturedRecord: any = null;
    vi.spyOn(db.outbox, 'add').mockImplementation(((record: any) => {
      capturedRecord = record;
      return Promise.resolve(1);
    }) as any);

    const id = await queueOutboxEvent('pause_pressed', { source: 'home' });
    expect(id).toBe(1);
    expect(capturedRecord).toBeDefined();
    expect(capturedRecord.type).toBe('pause_pressed');
    expect(capturedRecord.status).toBe('pending');
    expect(capturedRecord.payload).toEqual({ source: 'home' });

    // HARD PRIVACY RULE: Payload must NEVER contain phone numbers, safe word, audio, or transcript
    const payloadStr = JSON.stringify(capturedRecord.payload);
    expect(payloadStr).not.toContain('phone');
    expect(payloadStr).not.toContain('word');
    expect(payloadStr).not.toContain('transcript');
  });

  it('queues drill_completed event with safe outcome payload without safe word', async () => {
    let capturedRecord: any = null;
    vi.spyOn(db.outbox, 'add').mockImplementation(((record: any) => {
      capturedRecord = record;
      return Promise.resolve(2);
    }) as any);

    await syncDrillSessionToSupabase({
      scenarioId: 'digital_arrest',
      version: 1,
      outcome: 'safe',
      flags: ['hung_up'],
      tactics: ['authority'],
      finalPressure: 20,
      duration: 35,
      familyMemberWatching: false,
      timestamp: Date.now()
    });

    expect(capturedRecord).toBeDefined();
    expect(capturedRecord.type).toBe('drill_completed');
    expect(capturedRecord.status).toBe('pending');
    expect(capturedRecord.payload.scenarioId).toBe('digital_arrest');
    expect(capturedRecord.payload.outcome).toBe('safe');
    expect(capturedRecord.payload.hungUp).toBe(true);
    expect(capturedRecord.payload.refusedMoney).toBe(true);

    // Hard rule: No safe word, phone numbers, or private notes in server sync payload
    const payloadStr = JSON.stringify(capturedRecord.payload);
    expect(payloadStr).not.toContain('current_safeword');
    expect(payloadStr).not.toContain('safeword');
    expect(payloadStr).not.toContain('notes');
  });

  it('triggerPausePressed queues with drill source without throwing', async () => {
    let capturedRecord: any = null;
    vi.spyOn(db.outbox, 'add').mockImplementation(((record: any) => {
      capturedRecord = record;
      return Promise.resolve(3);
    }) as any);

    await triggerPausePressed('drill');
    expect(capturedRecord).toBeDefined();
    expect(capturedRecord.type).toBe('pause_pressed');
    expect(capturedRecord.payload.source).toBe('drill');
  });
});
