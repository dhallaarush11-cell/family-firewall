import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Database,
  Radio,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { ReadAloudButton } from '../components/ReadAloudButton';
import {
  subscribeToPrivacyLog,
  clearPrivacyLog,
  getLocalPrivacyCounts,
  type PrivacyLogEntry,
  type LocalPrivacyCounts
} from '../db/privacy';

export const PrivacyProofScreen: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<PrivacyLogEntry[]>([]);
  const [counts, setCounts] = useState<LocalPrivacyCounts>({
    contactsCount: 0,
    drillsCount: 0,
    hasSafeWord: false
  });

  useEffect(() => {
    const unsubscribe = subscribeToPrivacyLog(newLogs => {
      setLogs(newLogs);
    });

    getLocalPrivacyCounts().then(setCounts);

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-16">
      <HeaderBar
        title={t('privacyProof.title', 'Privacy Proof')}
        showBack={true}
        showHome={true}
        showSettings={false}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        {/* Read-Aloud Guidance */}
        <div className="flex justify-center">
          <ReadAloudButton screenId="privacy_proof" />
        </div>

        {/* Hero Banner */}
        <section className="bg-white p-6 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-3 text-center">
          <div className="w-16 h-16 rounded-full bg-cream text-teal-deep flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck size={36} className="text-teal-deep" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-teal-deep leading-tight">
            {t('privacyProof.heading', 'Zero Cloud Leak Guarantee')}
          </h2>
          <p className="text-base text-brown-dark/80 font-medium">
            {t(
              'privacyProof.subheading',
              'Inspect every outbound network request and realtime message leaving this device in real time.'
            )}
          </p>
        </section>

        {/* Local Storage Counts (Never Leaves Device) */}
        <section className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-3">
          <div className="flex items-center gap-2 text-teal-deep font-extrabold text-lg">
            <Database size={22} />
            <h3>{t('privacyProof.localDataTitle', 'Items Stored Only On This Phone')}</h3>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-cream/50 rounded-xl border border-teal-deep/10">
              <span className="block text-2xl font-black text-teal-deep">{counts.contactsCount}</span>
              <span className="text-xs font-bold text-brown-dark/70">
                {t('privacyProof.contacts', 'Contacts')}
              </span>
            </div>

            <div className="p-3 bg-cream/50 rounded-xl border border-teal-deep/10">
              <span className="block text-2xl font-black text-teal-deep">{counts.drillsCount}</span>
              <span className="text-xs font-bold text-brown-dark/70">
                {t('privacyProof.drills', 'Practice Drills')}
              </span>
            </div>

            <div className="p-3 bg-cream/50 rounded-xl border border-teal-deep/10">
              <span className="block text-xl font-black text-teal-deep">
                {counts.hasSafeWord ? 'Yes' : 'No'}
              </span>
              <span className="text-xs font-bold text-brown-dark/70">
                {t('privacyProof.safeWordSet', 'Safe Word')}
              </span>
            </div>
          </div>
        </section>

        {/* Plain statement of what leaves the device */}
        <section className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-4">
          <div className="space-y-2">
            <h3 className="font-extrabold text-lg text-teal-deep flex items-center gap-2">
              <CheckCircle size={20} className="text-teal-deep shrink-0" />
              <span>{t('privacyProof.whatLeavesTitle', 'What Leaves This Device')}</span>
            </h3>
            <ul className="text-sm font-medium text-brown-dark/85 space-y-1.5 pl-6 list-disc">
              <li>{t('privacyProof.leavesAuth', 'Anonymous account token (Supabase Auth)')}</li>
              <li>{t('privacyProof.leavesPair', 'Family link pairing codes & membership cluster ID')}</li>
              <li>{t('privacyProof.leavesPause', 'Safety Pause alert signal (timestamp & trigger source)')}</li>
              <li>{t('privacyProof.leavesOutcome', 'Practice drill outcome summary (Safe / Almost / Let\'s try again, refusal checks)')}</li>
            </ul>
          </div>

          <div className="pt-3 border-t border-teal-deep/10 space-y-2">
            <h3 className="font-extrabold text-lg text-terracotta flex items-center gap-2">
              <XCircle size={20} className="text-terracotta shrink-0" />
              <span>{t('privacyProof.whatNeverLeavesTitle', 'What NEVER Leaves This Device')}</span>
            </h3>
            <ul className="text-sm font-bold text-brown-dark/90 space-y-1.5 pl-6 list-disc">
              <li>{t('privacyProof.neverSafeWord', 'Secret family safe word')}</li>
              <li>{t('privacyProof.neverPhone', 'Phone numbers and trusted contact names')}</li>
              <li>{t('privacyProof.neverAudio', 'Microphone audio, voice recordings, or call sounds')}</li>
              <li>{t('privacyProof.neverScreenshots', 'Screenshots or camera images')}</li>
              <li>{t('privacyProof.neverDetailed', 'Detailed drill pressure tactics, notes, and local event logs')}</li>
            </ul>
          </div>
        </section>

        {/* Live Outbound Request Log */}
        <section className="bg-white p-5 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-deep font-extrabold text-lg">
              <Radio size={22} className="text-teal-deep animate-pulse" />
              <h3>{t('privacyProof.liveLogTitle', 'Live Outbound Request Log')}</h3>
            </div>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={clearPrivacyLog}
                className="text-xs font-bold text-brown-dark/60 hover:text-terracotta flex items-center gap-1 p-1"
              >
                <Trash2 size={14} />
                <span>{t('privacyProof.clearLog', 'Clear')}</span>
              </button>
            )}
          </div>

          {/* MANDATORY NOTE */}
          <div className="p-3 bg-cream/60 rounded-xl border border-teal-deep/15 flex items-start gap-2 text-xs font-semibold text-brown-dark/80">
            <AlertCircle size={16} className="text-teal-deep shrink-0 mt-0.5" />
            <span>
              {t(
                'privacyProof.appCodeNotice',
                'Note: This log displays outbound requests and events initiated by the application code.'
              )}
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-6 text-center text-sm font-medium text-brown-dark/60 bg-cream/30 rounded-xl">
              {t('privacyProof.noRequestsYet', 'No outbound requests recorded in this session yet.')}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-teal-deep/20 bg-cream/20 space-y-1.5 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold px-2 py-0.5 rounded bg-teal-deep text-cream text-[11px]">
                      {log.method}
                    </span>
                    <span className="text-brown-dark/60">
                      {new Date(log.time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="text-brown-dark font-semibold break-all">
                    {log.destination}
                  </div>

                  <div className="text-[11px] text-teal-deep font-sans">
                    <strong className="text-brown-dark font-mono">Sent fields: </strong>
                    {log.fieldNames.length > 0 ? (
                      log.fieldNames.map(f => `"${f}"`).join(', ')
                    ) : (
                      <em className="text-brown-dark/60">(none / read request)</em>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
