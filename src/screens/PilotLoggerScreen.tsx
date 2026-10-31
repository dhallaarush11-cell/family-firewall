import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Download,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { ReadAloudButton } from '../components/ReadAloudButton';
import { db, type PilotLogRecord } from '../db';
import { AVAILABLE_SCENARIOS } from '../scenarios';

interface ObservationRecord {
  participantCode: string;
  ageBand: string;
  round: string;
  scenario: string;
  hungUp: boolean;
  refusedOtp: boolean;
  toldSomeone: boolean;
  usedPause: boolean;
  notes: string;
}

export const PilotLoggerScreen: React.FC = () => {
  // Form state
  const [participantCode, setParticipantCode] = useState('');
  const [ageBand, setAgeBand] = useState('60-69');
  const [round, setRound] = useState('After drill practice');
  const [scenario, setScenario] = useState<string>(AVAILABLE_SCENARIOS[0]?.name || 'Digital Arrest');
  const [hungUp, setHungUp] = useState(false);
  const [refusedOtp, setRefusedOtp] = useState(false);
  const [toldSomeone, setToldSomeone] = useState(false);
  const [usedPause, setUsedPause] = useState(false);
  const [notes, setNotes] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pastObservations, setPastObservations] = useState<PilotLogRecord[]>([]);

  useEffect(() => {
    loadPastObservations();
  }, []);

  const loadPastObservations = async () => {
    try {
      const records = await db.pilotLog
        .where('event')
        .equals('pilot_observation')
        .reverse()
        .sortBy('timestamp');
      setPastObservations(records);
    } catch (e) {
      console.warn('Could not load past pilot observations:', e);
    }
  };

  const handleSaveObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantCode.trim()) return;

    const details: ObservationRecord = {
      participantCode: participantCode.trim().toUpperCase(),
      ageBand,
      round,
      scenario,
      hungUp,
      refusedOtp,
      toldSomeone,
      usedPause,
      notes: notes.trim()
    };

    try {
      await db.pilotLog.add({
        timestamp: Date.now(),
        event: 'pilot_observation',
        details: details as unknown as Record<string, unknown>
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);

      // Reset form
      setParticipantCode('');
      setNotes('');
      setHungUp(false);
      setRefusedOtp(false);
      setToldSomeone(false);
      setUsedPause(false);

      await loadPastObservations();
    } catch (err) {
      console.error('Failed to save pilot record:', err);
    }
  };

  const handleExportCsv = async () => {
    try {
      const records = await db.pilotLog
        .where('event')
        .equals('pilot_observation')
        .sortBy('timestamp');

      if (records.length === 0) {
        alert('No observation sessions recorded to export.');
        return;
      }

      const headers = [
        'Timestamp',
        'Date_Time',
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

      const csvRows = [headers.join(',')];

      records.forEach(r => {
        const d = (r.details as unknown as ObservationRecord) || {};
        const safeNotes = `"${(d.notes || '').replace(/"/g, '""')}"`;
        const row = [
          r.timestamp,
          `"${new Date(r.timestamp).toISOString()}"`,
          `"${d.participantCode || ''}"`,
          `"${d.ageBand || ''}"`,
          `"${d.round || ''}"`,
          `"${d.scenario || ''}"`,
          d.hungUp ? 'YES' : 'NO',
          d.refusedOtp ? 'YES' : 'NO',
          d.toldSomeone ? 'YES' : 'NO',
          d.usedPause ? 'YES' : 'NO',
          safeNotes
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('href', csvContent);
      downloadLink.setAttribute('download', `family-firewall-pilot-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  const handleClearObservations = async () => {
    if (!window.confirm('Delete all recorded pilot observation rows from this phone?')) return;
    try {
      await db.pilotLog.where('event').equals('pilot_observation').delete();
      await loadPastObservations();
    } catch (e) {
      console.warn('Delete error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-16">
      <HeaderBar
        title="Observer Pilot Logger"
        showBack={true}
        showHome={true}
        showSettings={false}
        backTo="/demo"
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        {/* Read-Aloud Guidance */}
        <div className="flex justify-center">
          <ReadAloudButton screenId="pilot_logger" />
        </div>

        {/* MANDATORY TEAM TESTING NOTICE */}
        <section className="bg-white p-5 rounded-card shadow-soft border-2 border-teal-deep/30 space-y-2 text-center">
          <div className="w-12 h-12 rounded-full bg-cream text-teal-deep flex items-center justify-center mx-auto shadow-inner">
            <ClipboardCheck size={26} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-teal-deep leading-tight">
            Observer Pilot Logger
          </h2>
          <div className="p-3 bg-[#E8F8F5] rounded-xl border border-teal-deep text-xs font-bold text-teal-deep flex items-start gap-2 text-left">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>
              This screen is for team testing and observation only. Data is stored locally on this phone and is NEVER synced to any server.
            </span>
          </div>
        </section>

        {savedSuccess && (
          <div className="p-3 bg-[#E8F8F5] border border-teal-deep rounded-xl text-teal-deep font-bold text-sm text-center flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle size={18} />
            <span>Participant observation saved locally on device!</span>
          </div>
        )}

        {/* Observation Form */}
        <form onSubmit={handleSaveObservation} className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-4">
          <h3 className="font-extrabold text-lg text-brown-dark">
            Record Participant Session
          </h3>

          {/* Participant Code (No Names) */}
          <div className="space-y-1">
            <label htmlFor="participant-code" className="block text-sm font-bold text-brown-dark">
              Participant Code (No Names) *
            </label>
            <input
              id="participant-code"
              type="text"
              required
              placeholder="e.g. P-101, OBS-03"
              value={participantCode}
              onChange={e => setParticipantCode(e.target.value)}
              className="w-full min-h-[48px] px-3.5 rounded-lg border border-teal-deep/30 text-base font-bold focus:outline-teal-deep"
            />
            <span className="text-[11px] text-brown-dark/60 block">
              Strictly anonymous. Never type real names.
            </span>
          </div>

          {/* Age Band */}
          <div className="space-y-1">
            <label htmlFor="age-band" className="block text-sm font-bold text-brown-dark">
              Age Band
            </label>
            <select
              id="age-band"
              value={ageBand}
              onChange={e => setAgeBand(e.target.value)}
              className="w-full min-h-[48px] px-3.5 rounded-lg border border-teal-deep/30 text-base font-bold bg-white focus:outline-teal-deep"
            >
              <option value="50-59">50-59 years</option>
              <option value="60-69">60-69 years</option>
              <option value="70-79">70-79 years</option>
              <option value="80+">80+ years</option>
            </select>
          </div>

          {/* Round */}
          <div className="space-y-1">
            <label htmlFor="round-select" className="block text-sm font-bold text-brown-dark">
              Testing Round
            </label>
            <select
              id="round-select"
              value={round}
              onChange={e => setRound(e.target.value)}
              className="w-full min-h-[48px] px-3.5 rounded-lg border border-teal-deep/30 text-base font-bold bg-white focus:outline-teal-deep"
            >
              <option value="Before drill practice">Before drill practice (Baseline)</option>
              <option value="After drill practice">After drill practice (Intervention)</option>
            </select>
          </div>

          {/* Scenario Shown */}
          <div className="space-y-1">
            <label htmlFor="scenario-select" className="block text-sm font-bold text-brown-dark">
              Scenario Shown
            </label>
            <select
              id="scenario-select"
              value={scenario}
              onChange={e => setScenario(e.target.value)}
              className="w-full min-h-[48px] px-3.5 rounded-lg border border-teal-deep/30 text-base font-bold bg-white focus:outline-teal-deep"
            >
              {AVAILABLE_SCENARIOS.map(sc => (
                <option key={sc.id} value={sc.name}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Observed Behaviors Checkboxes */}
          <div className="space-y-2 pt-1">
            <span className="block text-sm font-bold text-brown-dark">
              Observed Protective Behaviors:
            </span>
            <div className="space-y-2 bg-cream/30 p-3 rounded-xl border border-teal-deep/15">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hungUp}
                  onChange={e => setHungUp(e.target.checked)}
                  className="w-5 h-5 rounded border-teal-deep text-teal-deep"
                />
                <span className="text-sm font-bold text-brown-dark">Hung up call</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={refusedOtp}
                  onChange={e => setRefusedOtp(e.target.checked)}
                  className="w-5 h-5 rounded border-teal-deep text-teal-deep"
                />
                <span className="text-sm font-bold text-brown-dark">Refused OTP / credentials</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toldSomeone}
                  onChange={e => setToldSomeone(e.target.checked)}
                  className="w-5 h-5 rounded border-teal-deep text-teal-deep"
                />
                <span className="text-sm font-bold text-brown-dark">Told someone / reached family</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usedPause}
                  onChange={e => setUsedPause(e.target.checked)}
                  className="w-5 h-5 rounded border-teal-deep text-teal-deep"
                />
                <span className="text-sm font-bold text-brown-dark">Used the Pause button</span>
              </label>
            </div>
          </div>

          {/* Free-text Notes */}
          <div className="space-y-1">
            <label htmlFor="notes-textarea" className="block text-sm font-bold text-brown-dark">
              Observer Notes
            </label>
            <textarea
              id="notes-textarea"
              rows={3}
              placeholder="e.g. hesitated on court crest, tapped pause immediately upon threat"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 rounded-lg border border-teal-deep/30 text-sm font-medium focus:outline-teal-deep"
            />
          </div>

          {/* Save Button (min 56px) */}
          <button
            type="submit"
            className="w-full min-h-[56px] py-3.5 px-4 rounded-card bg-teal-deep hover:bg-[#073632] text-cream font-bold text-lg shadow-elevated transition-card flex items-center justify-center gap-2"
          >
            <ClipboardCheck size={20} />
            <span>Save Observation Record</span>
          </button>
        </form>

        {/* CSV Export & Historical Log */}
        <section className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-deep font-extrabold text-lg">
              <FileSpreadsheet size={22} />
              <h3>Saved Observations ({pastObservations.length})</h3>
            </div>
            {pastObservations.length > 0 && (
              <button
                type="button"
                onClick={handleClearObservations}
                className="text-xs font-bold text-brown-dark/60 hover:text-terracotta flex items-center gap-1"
              >
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* EXPORT CSV BUTTON (min 56px) */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={pastObservations.length === 0}
            className="w-full min-h-[56px] py-3.5 px-4 rounded-card bg-cream hover:bg-[#FFE8A8] border-2 border-teal-deep/30 text-teal-deep font-bold text-lg shadow-soft transition-card flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download size={22} />
            <span>Export CSV</span>
          </button>

          {pastObservations.length > 0 ? (
            <div className="space-y-2 pt-2 max-h-60 overflow-y-auto">
              {pastObservations.map(obs => {
                const d = (obs.details as unknown as ObservationRecord) || {};
                return (
                  <div
                    key={obs.id}
                    className="p-3 bg-cream/30 rounded-xl border border-teal-deep/15 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-teal-deep">
                      <span>{d.participantCode} &bull; {d.ageBand}</span>
                      <span className="text-brown-dark/60">
                        {new Date(obs.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-brown-dark/80 font-medium">
                      Round: {d.round}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {d.hungUp && <span className="px-1.5 py-0.5 rounded bg-teal-deep/15 text-teal-deep font-bold">Hung up</span>}
                      {d.refusedOtp && <span className="px-1.5 py-0.5 rounded bg-teal-deep/15 text-teal-deep font-bold">Refused OTP</span>}
                      {d.toldSomeone && <span className="px-1.5 py-0.5 rounded bg-teal-deep/15 text-teal-deep font-bold">Told Someone</span>}
                      {d.usedPause && <span className="px-1.5 py-0.5 rounded bg-terracotta/20 text-terracotta font-bold">Used Pause</span>}
                    </div>
                    {d.notes && (
                      <p className="text-[11px] text-brown-dark/70 italic pt-1">
                        "{d.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs font-semibold text-brown-dark/60 bg-cream/20 rounded-xl">
              No observations recorded yet.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
