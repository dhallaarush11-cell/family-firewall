import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Trash2,
  WifiOff,
  History,
  Info,
  CheckCircle,
  ClipboardList,
  AlertTriangle
} from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { ReadAloudButton } from '../components/ReadAloudButton';
import { db } from '../db';
import { isForceOfflineActive, setForceOfflineActive } from '../components/OfflineBanner';

export const DemoScreen: React.FC = () => {
  const navigate = useNavigate();

  const [forceOffline, setForceOffline] = useState<boolean>(isForceOfflineActive);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [sampleDrillCount, setSampleDrillCount] = useState<number>(0);

  useEffect(() => {
    const handleDemoChange = () => setForceOffline(isForceOfflineActive());
    window.addEventListener('demo-offline-change', handleDemoChange);
    loadSampleCount();
    return () => {
      window.removeEventListener('demo-offline-change', handleDemoChange);
    };
  }, []);

  const loadSampleCount = async () => {
    try {
      const records = await db.drillHistory.toArray();
      const samples = records.filter(
        r => r.notes === 'sample data (demo only)' || r.flags.includes('sample_data_demo_only')
      );
      setSampleDrillCount(samples.length);
    } catch (e) {
      console.warn('Could not count sample drills:', e);
    }
  };

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleResetAllData = async () => {
    try {
      await Promise.all([
        db.profile.clear(),
        db.trustedContacts.clear(),
        db.safeWord.clear(),
        db.drillHistory.clear(),
        db.outbox.clear(),
        db.settings.clear(),
        db.pilotLog.clear()
      ]);
      localStorage.clear();
      setForceOfflineActive(false);
      setSampleDrillCount(0);
      showStatus('All local database records and settings have been reset!');
    } catch (e) {
      console.error('Reset error:', e);
      showStatus('Could not reset data. Please try again.');
    }
  };

  const handleToggleForceOffline = () => {
    const nextState = !forceOffline;
    setForceOfflineActive(nextState);
    setForceOffline(nextState);
    showStatus(
      nextState
        ? 'FORCE OFFLINE active. App will simulate offline behavior for event dispatching.'
        : 'Force offline disabled. Normal network detection restored.'
    );
  };

  const handleCreateSampleDrillHistory = async () => {
    try {
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;

      // Sample drills demonstrating valid outcomes (Safe, Almost, Let's try again)
      // HARD REQUIREMENT: Labeled clearly as 'sample data (demo only)'. Stays strictly on this device and never sent to server.
      const samples = [
        {
          scenarioId: 'digital_arrest',
          version: 1,
          outcome: 'safe' as const,
          flags: ['hung_up', 'told_someone', 'used_pause', 'sample_data_demo_only'],
          tactics: ['Urgency', 'Fake Authority'],
          finalPressure: 20,
          duration: 48,
          familyMemberWatching: true,
          timestamp: now - 3600000, // 1 hour ago
          notes: 'sample data (demo only)'
        },
        {
          scenarioId: 'digital_arrest',
          version: 1,
          outcome: 'almost' as const,
          flags: ['hung_up', 'sample_data_demo_only'],
          tactics: ['Isolation', 'Fear'],
          finalPressure: 45,
          duration: 65,
          familyMemberWatching: false,
          timestamp: now - 2 * ONE_DAY, // 2 days ago
          notes: 'sample data (demo only)'
        },
        {
          scenarioId: 'digital_arrest',
          version: 1,
          outcome: 'safe' as const,
          flags: ['hung_up', 'used_pause', 'sample_data_demo_only'],
          tactics: ['Urgency'],
          finalPressure: 15,
          duration: 35,
          familyMemberWatching: true,
          timestamp: now - 5 * ONE_DAY, // 5 days ago
          notes: 'sample data (demo only)'
        },
        {
          scenarioId: 'digital_arrest',
          version: 1,
          outcome: 'safe' as const,
          flags: ['hung_up', 'told_someone', 'sample_data_demo_only'],
          tactics: ['Fake Official'],
          finalPressure: 25,
          duration: 52,
          familyMemberWatching: false,
          timestamp: now - 11 * ONE_DAY, // 11 days ago
          notes: 'sample data (demo only)'
        }
      ];

      for (const sample of samples) {
        // Direct local IndexedDB insertion only - NEVER touches Supabase or outbox
        await db.drillHistory.add(sample);
      }

      await loadSampleCount();
      showStatus('Created 4 sample drills labeled as "sample data (demo only)". Stored locally on this device only.');
    } catch (e) {
      console.error('Error creating sample drills:', e);
      showStatus('Could not create sample drill history.');
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-16">
      <HeaderBar
        title="Demo Mode (Developer)"
        showBack={true}
        showHome={true}
        showSettings={false}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        {/* Read-Aloud Guidance */}
        <div className="flex justify-center">
          <ReadAloudButton screenId="demo" />
        </div>

        {/* Hero Card */}
        <section className="bg-white p-5 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-2 text-center">
          <div className="w-14 h-14 rounded-full bg-cream text-teal-deep flex items-center justify-center mx-auto shadow-inner">
            <Wrench size={30} />
          </div>
          <h2 className="text-2xl font-black text-teal-deep">Hidden Demo Mode</h2>
          <p className="text-sm font-semibold text-brown-dark/75">
            Evaluator controls for testing offline behavior, mock telemetry, and resets.
          </p>
        </section>

        {statusMessage && (
          <div className="p-4 bg-[#E8F8F5] border-2 border-teal-deep rounded-card text-teal-deep font-bold text-sm text-center flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle size={18} className="shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* 1. FORCE OFFLINE TOGGLE */}
        <section className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  forceOffline ? 'bg-terracotta text-white' : 'bg-cream text-brown-dark'
                }`}
              >
                <WifiOff size={20} />
              </div>
              <div>
                <span className="font-extrabold text-base text-brown-dark block leading-tight">
                  FORCE OFFLINE (demo)
                </span>
                <span className="text-xs text-brown-dark/70 font-medium">
                  Simulates disconnected state for event dispatching
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleForceOffline}
              role="switch"
              aria-checked={forceOffline}
              aria-label="Toggle force offline demo mode"
              className={`w-14 h-8 rounded-full transition-colors relative flex items-center p-1 ${
                forceOffline ? 'bg-terracotta' : 'bg-brown-dark/20'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                  forceOffline ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* 2. CREATE SAMPLE DRILL HISTORY (sample data - demo only) */}
        <section className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-cream text-teal-deep flex items-center justify-center shrink-0">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-base text-brown-dark block leading-tight">
                  Sample Drill History
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  sample data (demo only)
                </span>
              </div>
              <span className="text-xs text-brown-dark/70 font-medium mt-1 block">
                Generates 4 practice records labeled as "sample data (demo only)". Stored strictly on this device in local IndexedDB only; never sent to the server.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateSampleDrillHistory}
            className="w-full min-h-[56px] py-3.5 px-4 rounded-card bg-teal-deep hover:bg-[#073632] text-cream font-bold text-base shadow-elevated transition-card flex items-center justify-center gap-2"
          >
            <History size={20} />
            <span>Create Sample Drill History (sample data (demo only))</span>
          </button>

          {sampleDrillCount > 0 && (
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <span className="font-semibold">
                {sampleDrillCount} sample drill records on this device
              </span>
              <span className="font-bold text-[10px] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-amber-300">
                demo only &bull; local only
              </span>
            </div>
          )}
        </section>

        {/* 3. RESET ALL LOCAL DATA (With Confirmation Step) */}
        <section className="bg-white p-5 rounded-card shadow-soft border-2 border-terracotta/30 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFF5F2] text-terracotta flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <span className="font-extrabold text-base text-terracotta block leading-tight">
                Reset All Local Data
              </span>
              <span className="text-xs text-brown-dark/70 font-medium">
                Erases all Dexie IndexedDB tables, safe words, contacts, outbox, and settings.
              </span>
            </div>
          </div>

          {!confirmResetOpen ? (
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="w-full min-h-[56px] py-3.5 px-4 rounded-card bg-[#FFF5F2] hover:bg-terracotta hover:text-white border-2 border-terracotta text-terracotta font-bold text-lg shadow-sm transition-card flex items-center justify-center gap-2"
            >
              <Trash2 size={20} />
              <span>Reset All Local Data</span>
            </button>
          ) : (
            <div className="p-4 rounded-card bg-[#FFF5F2] border-2 border-terracotta space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5 text-terracotta">
                <AlertTriangle size={24} className="shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-black text-base text-terracotta">Confirm Local Reset</h3>
                  <p className="text-sm font-semibold text-brown-dark mt-0.5 leading-snug">
                    Are you sure? This will permanently erase all local tables (safe word, contacts, rehearsal history, outbox logs) and settings on this device.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(false)}
                  className="min-h-[48px] py-2 px-3 rounded-lg bg-white border-2 border-teal-deep/30 text-brown-dark font-bold text-base hover:bg-cream"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmResetOpen(false);
                    await handleResetAllData();
                  }}
                  className="min-h-[48px] py-2 px-3 rounded-lg bg-terracotta text-white font-black text-base shadow-sm hover:bg-[#C96443]"
                >
                  Yes, Erase All
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 4. LINK TO OBSERVER PILOT LOGGER */}
        <section className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-cream text-teal-deep flex items-center justify-center shrink-0">
              <ClipboardList size={20} />
            </div>
            <div>
              <span className="font-extrabold text-base text-brown-dark block leading-tight">
                Observer Pilot Logger
              </span>
              <span className="text-xs text-brown-dark/70 font-medium">
                Record participant testing observation sessions and export CSV.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/pilot-logger')}
            className="w-full min-h-[56px] py-3.5 px-4 rounded-card bg-cream hover:bg-[#FFE8A8] border-2 border-teal-deep/30 text-teal-deep font-bold text-lg shadow-soft transition-card flex items-center justify-center gap-2"
          >
            <ClipboardList size={20} />
            <span>Open Observer Pilot Logger</span>
          </button>
        </section>

        {/* 5. APP VERSION */}
        <section className="bg-white p-4 rounded-card border border-teal-deep/10 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-teal-deep">
            <Info size={16} />
            <span>Version: Family Firewall v1.0.0-prototype</span>
          </div>
          <p className="text-[11px] text-brown-dark/60 font-mono">
            Build 2026.10 &bull; Offline PWA &bull; Dexie IndexedDB &bull; Supabase RLS
          </p>
        </section>
      </main>
    </div>
  );
};
