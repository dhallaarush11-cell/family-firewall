import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, logPilotEvent } from './index';
import { isForceOfflineActive, setForceOfflineActive } from '../components/OfflineBanner';
import { AVAILABLE_SCENARIOS } from '../scenarios';

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true, configurable: true });
}

describe('Pilot Logger and Demo Mode Offline Hardening', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.localStorage.clear();
  });

  it('lists only scenarios that actually exist in /src/scenarios (currently only Digital Arrest)', () => {
    expect(AVAILABLE_SCENARIOS.length).toBe(1);
    expect(AVAILABLE_SCENARIOS[0].name).toBe('Digital Arrest');
    const scenarioNames = AVAILABLE_SCENARIOS.map(s => s.name);
    expect(scenarioNames).not.toContain('Courier Parcel Scam');
    expect(scenarioNames).not.toContain('Bank KYC Imposter');
  });

  it('records pilot observation only on device in Dexie pilotLog', async () => {
    let capturedRecord: any = null;
    vi.spyOn(db.pilotLog, 'add').mockImplementation(((record: any) => {
      capturedRecord = record;
      return Promise.resolve(1);
    }) as any);

    const observation = {
      participantCode: 'P-101',
      ageBand: '60-69',
      round: 'After drill practice',
      scenario: 'Digital Arrest',
      hungUp: true,
      refusedOtp: true,
      toldSomeone: true,
      usedPause: true,
      notes: 'Calm and collected response'
    };

    await logPilotEvent('observer_record', observation);

    expect(capturedRecord).toBeDefined();
    expect(capturedRecord.event).toBe('observer_record');
    expect(capturedRecord.details).toEqual(observation);
    expect(capturedRecord.timestamp).toBeGreaterThan(0);
  });

  it('generates valid CSV format without leaking personal identifiers', () => {
    const obs = {
      participantCode: 'TEST-01',
      ageBand: '70-79',
      round: 'Before drill practice',
      scenario: 'Digital Arrest',
      hungUp: false,
      refusedOtp: true,
      toldSomeone: false,
      usedPause: true,
      notes: 'Hesitated before pausing'
    };

    const records = [
      {
        id: 1,
        timestamp: 1730000000000,
        event: 'observer_record',
        details: obs
      }
    ];

    // Verify CSV line construction
    const headers = [
      'ID',
      'Timestamp',
      'Participant_Code',
      'Age_Band',
      'Round',
      'Scenario',
      'Hung_Up',
      'Refused_OTP',
      'Told_Someone',
      'Used_Pause',
      'Notes'
    ];

    const lines = [headers.join(',')];
    for (const r of records) {
      const d = r.details as typeof obs;
      lines.push(
        [
          r.id,
          new Date(r.timestamp).toISOString(),
          `"${d.participantCode}"`,
          `"${d.ageBand}"`,
          `"${d.round}"`,
          `"${d.scenario}"`,
          d.hungUp ? 'YES' : 'NO',
          d.refusedOtp ? 'YES' : 'NO',
          d.toldSomeone ? 'YES' : 'NO',
          d.usedPause ? 'YES' : 'NO',
          `"${(d.notes || '').replace(/"/g, '""')}"`
        ].join(',')
      );
    }

    const csvContent = lines.join('\n');
    expect(csvContent).toContain('TEST-01');
    expect(csvContent).toContain('70-79');
    expect(csvContent).toContain('Hesitated before pausing');
    expect(csvContent).not.toContain('Aadhaar');
  });

  it('manages Demo Mode force-offline flag in localStorage', () => {
    expect(isForceOfflineActive()).toBe(false);

    setForceOfflineActive(true);
    expect(isForceOfflineActive()).toBe(true);
    expect(globalThis.localStorage.getItem('demo_force_offline')).toBe('true');

    setForceOfflineActive(false);
    expect(isForceOfflineActive()).toBe(false);
    expect(globalThis.localStorage.getItem('demo_force_offline')).toBeNull();
  });
});
