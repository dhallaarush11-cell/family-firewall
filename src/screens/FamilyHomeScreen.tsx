import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  CheckCircle,
  LogOut,
  RefreshCw,
  QrCode,
  ArrowRight,
  Flame,
  Clock,
  KeyRound,
  FileText,
  CalendarCheck2
} from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { ReadAloudButton } from '../components/ReadAloudButton';
import {
  db,
  getTrustedContacts,
  addTrustedContact,
  saveProfile,
  type TrustedContact
} from '../db';
import {
  getCurrentMembership,
  leaveCurrentFamily,
  supabase
} from '../db/supabase';
import {
  calculateReadinessScore,
  calculateDrillStreak,
  isWeeklyBoosterDue
} from '../engine/readiness';

interface SafetyEvent {
  id: string;
  type: 'pause_pressed' | 'drill_completed' | 'booster_due';
  created_at: string;
  payload: Record<string, unknown>;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

interface LastDrillSession {
  id: string;
  scenario_id: string;
  outcome: 'safe' | 'almost' | 'retry';
  hung_up: boolean;
  refused_money: boolean;
  refused_otp: boolean;
  pause_used: boolean;
  created_at: string;
  is_sample?: boolean;
}

// Deterministic Web Audio synthesizer for emergency alert sound
function playEmergencyAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(587.33, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.warn('Audio alert notice:', e);
  }
}

export const FamilyHomeScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language as 'en' | 'hi' | 'hing') || 'en';

  const [membership, setMembership] = useState<{
    id: string;
    family_id: string;
    role: 'elder' | 'guardian';
    display_name: string;
  } | null>(null);

  const [elderName, setElderName] = useState<string>('Parent');
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [drillSessions, setDrillSessions] = useState<LastDrillSession[]>([]);
  const [lastDrill, setLastDrill] = useState<LastDrillSession | null>(null);
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<SafetyEvent | null>(null);

  // Phone input modal for Quick Call when no local contact saved
  const [showAddContactPrompt, setShowAddContactPrompt] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  const hasUserInteractedRef = useRef<boolean>(false);

  // User gesture tracker for Web Audio policy
  useEffect(() => {
    const onUserGesture = () => {
      hasUserInteractedRef.current = true;
    };
    window.addEventListener('click', onUserGesture, { once: true });
    window.addEventListener('touchstart', onUserGesture, { once: true });
    return () => {
      window.removeEventListener('click', onUserGesture);
      window.removeEventListener('touchstart', onUserGesture);
    };
  }, []);

  // Initial data loading
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const contacts = await getTrustedContacts();
      setTrustedContacts(contacts);

      const mem = await getCurrentMembership();
      setMembership(mem);

      if (mem) {
        await loadFamilyMembers(mem.family_id);
        await loadEvents(mem.family_id);
        await loadDrillSessions(mem.family_id);
      } else {
        await loadLocalDrillsFallback();
      }
    } catch (e) {
      console.warn('Data load error:', e);
    }
  };

  const loadLocalDrillsFallback = async () => {
    try {
      const localDrills = await db.drillHistory.reverse().sortBy('timestamp');
      if (localDrills.length > 0) {
        const mapped: LastDrillSession[] = localDrills.map(d => ({
          id: String(d.id || Math.random()),
          scenario_id: d.scenarioId,
          outcome: d.outcome,
          hung_up: d.flags.includes('hung_up'),
          refused_money: !d.flags.includes('moved_money'),
          refused_otp: !d.flags.includes('shared_otp'),
          pause_used: d.flags.includes('used_pause'),
          created_at: new Date(d.timestamp).toISOString(),
          is_sample: d.notes === 'sample data (demo only)' || d.flags.includes('sample_data_demo_only')
        }));
        setDrillSessions(mapped);
        setLastDrill(mapped[0]);
      }
    } catch (e) {
      console.warn('Local drills fallback load notice:', e);
    }
  };

  const loadFamilyMembers = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, role, display_name')
        .eq('family_id', familyId);

      if (!error && data) {
        const elder = data.find(m => m.role === 'elder');
        if (elder) {
          setElderName(elder.display_name);
        }
      }
    } catch (e) {
      console.warn('Member fetch notice:', e);
    }
  };

  const loadEvents = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, type, created_at, payload, acknowledged_by, acknowledged_at')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setEvents(data as SafetyEvent[]);
      }
    } catch (err) {
      console.warn('Events load error:', err);
    }
  };

  const loadDrillSessions = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('drill_sessions')
        .select('id, scenario_id, outcome, hung_up, refused_money, refused_otp, pause_used, created_at')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data && data.length > 0) {
        const sessions = data as LastDrillSession[];
        setDrillSessions(sessions);
        setLastDrill(sessions[0]);
      } else {
        await loadLocalDrillsFallback();
      }
    } catch (err) {
      console.warn('Drill sessions load error:', err);
      await loadLocalDrillsFallback();
    }
  };

  // Supabase Realtime Subscription for pause_pressed and drill_completed
  useEffect(() => {
    if (!membership?.family_id) return;

    const channelName = `realtime_family_${membership.family_id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `family_id=eq.${membership.family_id}`
        },
        payload => {
          const newEvent = payload.new as SafetyEvent;
          setEvents(prev => [newEvent, ...prev.filter(e => e.id !== newEvent.id)]);

          if (newEvent.type === 'pause_pressed') {
            setActiveEmergencyAlert(newEvent);
            if (hasUserInteractedRef.current) {
              playEmergencyAlertSound();
            }
          } else if (newEvent.type === 'drill_completed') {
            loadDrillSessions(membership.family_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [membership?.family_id]);

  const handleQuickCall = () => {
    if (trustedContacts.length > 0 && trustedContacts[0].phone) {
      const cleanPhone = trustedContacts[0].phone.replace(/\s+/g, '');
      window.location.href = `tel:${cleanPhone}`;
    } else {
      setShowAddContactPrompt(true);
    }
  };

  const handleSaveContactAndCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhoneNumber.trim()) return;

    setIsSavingContact(true);
    try {
      await addTrustedContact({
        name: elderName || 'Parent',
        relation: 'Parent',
        phone: newPhoneNumber.trim(),
        priority: 1
      });

      const updated = await getTrustedContacts();
      setTrustedContacts(updated);
      setShowAddContactPrompt(false);

      const cleanPhone = newPhoneNumber.trim().replace(/\s+/g, '');
      window.location.href = `tel:${cleanPhone}`;
    } catch (e) {
      console.warn('Could not save contact locally:', e);
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleAcknowledgeAlert = async (eventId: string) => {
    if (!membership) return;
    try {
      const now = new Date().toISOString();
      await supabase
        .from('events')
        .update({
          acknowledged_by: membership.id,
          acknowledged_at: now
        })
        .eq('id', eventId);

      setEvents(prev =>
        prev.map(ev =>
          ev.id === eventId
            ? { ...ev, acknowledged_by: membership.id, acknowledged_at: now }
            : ev
        )
      );
      setActiveEmergencyAlert(null);
    } catch (err) {
      console.warn('Failed to acknowledge alert:', err);
    }
  };

  const handleLeaveFamily = async () => {
    try {
      await leaveCurrentFamily();
      setMembership(null);
      setEvents([]);
      setLastDrill(null);
      setDrillSessions([]);
    } catch (err) {
      console.warn('Leave family notice:', err);
    }
  };

  const handleSwitchToParent = async () => {
    await saveProfile('parent', lang);
    navigate('/elder');
  };

  // Calculate Readiness Band & Streak using Requirement 5 heuristics
  const readiness = calculateReadinessScore(
    drillSessions.map(d => ({
      hung_up: d.hung_up,
      refused_money: d.refused_money,
      refused_otp: d.refused_otp,
      pause_used: d.pause_used,
      created_at: d.created_at
    }))
  );

  const streak = calculateDrillStreak(
    drillSessions.map(d => new Date(d.created_at).getTime())
  );

  const boosterDue = isWeeklyBoosterDue(
    lastDrill ? new Date(lastDrill.created_at).getTime() : null
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-16">
      <HeaderBar
        title={t('familyHome.title', 'Family Dashboard')}
        showBack={true}
        showHome={false}
        showSettings={true}
        backTo="/welcome"
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        {/* Read-Aloud Guidance */}
        <div className="flex justify-center">
          <ReadAloudButton screenId="family_home" />
        </div>

        {/* If user hasn't joined a family yet */}
        {!membership ? (
          <section className="bg-white p-6 rounded-card shadow-soft border-2 border-teal-deep/20 text-center space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-cream text-teal-deep flex items-center justify-center mx-auto shadow-inner">
              <Users size={34} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-teal-deep">
                {t('familyHome.notConnectedTitle', 'Connect with Your Parent')}
              </h2>
              <p className="text-lg text-brown-dark/80 font-medium">
                {t('familyHome.notConnectedSub', 'Pair your phone to receive instant Pause alerts and see drill practice outcomes.')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/pair')}
              className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-black text-xl shadow-elevated transition-card flex items-center justify-center gap-3"
            >
              <QrCode size={24} />
              <span>{t('familyHome.pairNowButton', 'Pair with Parent Phone')}</span>
            </button>
          </section>
        ) : (
          /* When joined to a family: REPLACED WITH REAL DATA */
          <>
            {/* 1. PARENT'S DISPLAY NAME & FAMILY STATUS */}
            <section className="bg-white p-5 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-cream text-teal-deep flex items-center justify-center shadow-inner">
                    <Users size={26} className="text-teal-deep" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-brown-dark/70 block">
                      {t('familyDashboard.parentProtected', 'Parent Protected')}
                    </span>
                    <h2 className="text-2xl font-black text-teal-deep leading-tight">
                      {elderName}
                    </h2>
                    <span className="text-xs text-brown-dark/75 font-semibold">
                      Guardian: {membership.display_name}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLeaveFamily}
                  className="min-h-[44px] px-3 py-1.5 rounded-full bg-cream text-terracotta hover:bg-terracotta hover:text-white border border-terracotta/30 text-xs font-bold transition-card flex items-center gap-1"
                >
                  <LogOut size={14} />
                  <span>{t('familyHome.leave', 'Leave')}</span>
                </button>
              </div>

              {/* Weekly Booster Due Indicator */}
              {boosterDue ? (
                <div className="p-3.5 bg-[#FFF5F2] rounded-xl border border-terracotta/40 flex items-start gap-2.5">
                  <CalendarCheck2 size={20} className="text-terracotta shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-black text-sm text-terracotta">
                      {t('familyDashboard.boosterDueBadge', 'Weekly Booster Due')}
                    </span>
                    <p className="text-xs font-semibold text-brown-dark/80 mt-0.5">
                      {t(
                        'familyDashboard.boosterDueDesc',
                        'Last drill practice was over 7 days ago. Rehearse together to maintain confidence.'
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-[#E8F8F5] rounded-xl border border-teal-deep/20 flex items-center gap-2 text-xs font-bold text-teal-deep">
                  <CheckCircle size={16} />
                  <span>{t('familyDashboard.boosterUpToDate', 'Practice up to date this week')}</span>
                </div>
              )}
            </section>

            {/* 2. READINESS BAND & STREAK COUNTER */}
            <section className="bg-white p-5 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Readiness Band Card */}
                <div className="p-4 bg-cream/30 rounded-xl border border-teal-deep/15 space-y-1.5 text-center">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-brown-dark/70 block">
                    {t('familyDashboard.readinessTitle', 'Readiness Band')}
                  </span>
                  <div
                    className={`inline-block px-3 py-1 rounded-full text-base font-black ${
                      readiness.band === 'Ready'
                        ? 'bg-teal-deep text-cream'
                        : readiness.band === 'Building'
                        ? 'bg-amber-600 text-white'
                        : 'bg-terracotta text-white'
                    }`}
                  >
                    {readiness.band}
                  </div>
                  <p className="text-[11px] font-bold text-brown-dark/70 italic block pt-1">
                    "{readiness.caption}"
                  </p>
                </div>

                {/* Streak Counter Card */}
                <div className="p-4 bg-cream/30 rounded-xl border border-teal-deep/15 space-y-1.5 text-center flex flex-col justify-center">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-brown-dark/70 block">
                    {t('familyDashboard.streakTitle', 'Practice Streak')}
                  </span>
                  <div className="flex items-center justify-center gap-1.5 text-terracotta">
                    <Flame size={24} className="fill-terracotta" />
                    <span className="text-2xl font-black text-brown-dark">
                      {streak > 0 ? `${streak}` : '0'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-brown-dark/70">
                    {streak > 0 ? t('familyDashboard.streakWeeks', 'consecutive weeks') : t('familyDashboard.streakZero', '0 weeks')}
                  </span>
                </div>
              </div>

              {/* 3. RUN A DRILL TOGETHER BUTTON */}
              <button
                type="button"
                onClick={() => navigate('/drill?watching=true')}
                className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-black text-xl shadow-elevated transition-card flex items-center justify-center gap-3"
              >
                <Users size={24} />
                <span>{t('familyDashboard.runDrillTogether', 'Run a drill together')}</span>
              </button>
            </section>

            {/* 4. LATEST DRILL OUTCOME AND TIME */}
            <section className="bg-white p-5 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-lg text-teal-deep">
                  {t('familyHome.lastDrillTitle', 'Latest Practice Drill')}
                </h3>
                {lastDrill && (
                  <span className="text-xs font-semibold text-brown-dark/60 flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(lastDrill.created_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>

              {lastDrill ? (
                <div className="p-4 bg-cream/30 rounded-card border border-teal-deep/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-brown-dark text-base">
                        Digital Arrest Simulation
                      </span>
                      {lastDrill.is_sample && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          sample data (demo only)
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        lastDrill.outcome === 'safe'
                          ? 'bg-teal-deep text-cream'
                          : lastDrill.outcome === 'almost'
                          ? 'bg-amber-600 text-white'
                          : 'bg-terracotta text-white'
                      }`}
                    >
                      {lastDrill.outcome === 'safe'
                        ? t('outcomes.safe', 'Safe')
                        : lastDrill.outcome === 'almost'
                        ? t('outcomes.almost', 'Almost')
                        : t('outcomes.tryAgain', "Let's try again")}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-brown-dark/80">
                    {lastDrill.hung_up && (
                      <span className="px-2.5 py-1 rounded-md bg-white border border-teal-deep/20">
                        &bull; Hung up call
                      </span>
                    )}
                    {lastDrill.refused_money && (
                      <span className="px-2.5 py-1 rounded-md bg-white border border-teal-deep/20">
                        &bull; Refused money transfer
                      </span>
                    )}
                    {lastDrill.refused_otp && (
                      <span className="px-2.5 py-1 rounded-md bg-white border border-teal-deep/20">
                        &bull; Kept OTPs secret
                      </span>
                    )}
                    {lastDrill.pause_used && (
                      <span className="px-2.5 py-1 rounded-md bg-white border border-teal-deep/20">
                        &bull; Used Pause button
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-brown-dark/70 bg-cream/40 rounded-xl">
                  {t('familyHome.noDrillsYet', 'No practice drills recorded yet. Your parent can practice anytime.')}
                </div>
              )}
            </section>

            {/* QUICK ACTIONS: SAFE WORD & PACT CARD */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate('/safeword')}
                className="p-4 bg-white rounded-card shadow-soft border-2 border-teal-deep/20 hover:border-teal-deep text-left space-y-1.5 transition-card"
              >
                <div className="w-10 h-10 rounded-full bg-cream text-teal-deep flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <h4 className="font-extrabold text-base text-teal-deep leading-tight">
                  {t('familyDashboard.safeWordCardTitle', 'Family Safe Word')}
                </h4>
                <p className="text-xs text-brown-dark/70 font-medium line-clamp-2">
                  {t('familyDashboard.safeWordCardSub', 'Set secret phrase to verify callers claiming to be relatives')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate('/pact')}
                className="p-4 bg-white rounded-card shadow-soft border-2 border-teal-deep/20 hover:border-teal-deep text-left space-y-1.5 transition-card"
              >
                <div className="w-10 h-10 rounded-full bg-cream text-teal-deep flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <h4 className="font-extrabold text-base text-teal-deep leading-tight">
                  {t('familyDashboard.pactCardTitle', 'Family Pact Card')}
                </h4>
                <p className="text-xs text-brown-dark/70 font-medium line-clamp-2">
                  {t('familyDashboard.pactCardSub', 'Download printable PDF card with rules & contacts')}
                </p>
              </button>
            </div>

            {/* 5. LIST OF RECENT ALERTS */}
            <section className="bg-white p-5 rounded-card shadow-soft border border-teal-deep/15 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-lg text-teal-deep">
                  {t('familyHome.recentEvents', 'Recent Safety Events')}
                </h3>
                <button
                  type="button"
                  onClick={() => membership && loadEvents(membership.family_id)}
                  className="p-1.5 rounded-full hover:bg-cream text-teal-deep transition-card"
                  title="Refresh"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              {events.length === 0 ? (
                <div className="p-4 text-center text-sm text-brown-dark/70 bg-cream/40 rounded-xl">
                  {t('familyHome.noEvents', 'No alerts recorded yet. Family is safe.')}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.map(ev => {
                    const isPause = ev.type === 'pause_pressed';
                    const isAcked = !!ev.acknowledged_at;
                    return (
                      <div
                        key={ev.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                          isPause
                            ? 'bg-[#FFF5F2] border-terracotta/40'
                            : 'bg-[#F0FAF7] border-teal-deep/20'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isPause
                                ? 'bg-terracotta text-white'
                                : 'bg-teal-deep text-white'
                            }`}
                          >
                            {isPause ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                          </div>
                          <div>
                            <span className="block font-bold text-sm text-brown-dark leading-tight">
                              {isPause
                                ? t('familyHome.pauseAlertTitle', 'Emergency Pause Triggered')
                                : t('familyHome.drillCompletedTitle', 'Practice Drill Completed')}
                            </span>
                            <span className="block text-xs text-brown-dark/60 mt-0.5">
                              {new Date(ev.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })} &bull; {new Date(ev.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {isPause && !isAcked && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeAlert(ev.id)}
                            className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-terracotta text-white font-bold text-xs shadow-sm hover:bg-[#C96443] transition-card"
                          >
                            {t('familyHome.acknowledge', 'Acknowledge')}
                          </button>
                        )}
                        {isAcked && (
                          <span className="text-xs font-semibold text-teal-deep flex items-center gap-1">
                            <CheckCircle size={14} /> Ack
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* Switch Role Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSwitchToParent}
            className="w-full min-h-[56px] py-4 px-6 rounded-card bg-cream hover:bg-[#FFE8B2] active:scale-[0.98] text-teal-deep font-extrabold text-lg border-2 border-teal-deep/30 shadow-soft transition-card flex items-center justify-center gap-3"
          >
            <span>{t('familyHome.switchRole', 'Switch to Parent Role')}</span>
            <ArrowRight size={22} className="text-teal-deep" />
          </button>
        </div>
      </main>

      {/* FULL-SCREEN HIGH-VISIBILITY EMERGENCY ALERT MODAL */}
      {activeEmergencyAlert && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#B83E20]/95 backdrop-blur-md flex flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-300 text-white"
        >
          <div className="space-y-6 pt-4 text-center max-w-md mx-auto">
            <div className="w-24 h-24 rounded-full bg-white text-terracotta flex items-center justify-center mx-auto shadow-elevated animate-bounce">
              <ShieldAlert size={56} className="text-terracotta" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 text-white font-black text-sm uppercase tracking-widest">
                Immediate Action Required
              </span>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight text-white">
                {t('alert.emergencyTitle', 'Pause Button Pressed!')}
              </h2>
              <p className="text-xl sm:text-2xl font-bold text-cream">
                {elderName} {t('alert.elderPressedPause', 'activated the Safety Pause button.')}
              </p>
              <p className="text-base text-white/80 font-medium">
                {new Date(activeEmergencyAlert.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>

            <div className="p-4 bg-white/10 rounded-card border border-white/20 text-base text-white/90 font-medium">
              Your parent may be on a suspicious call or feeling pressured. Speak with them right now.
            </div>
          </div>

          <div className="space-y-3 max-w-md mx-auto w-full pb-4">
            <button
              type="button"
              onClick={handleQuickCall}
              className="w-full min-h-[56px] py-4 px-6 rounded-card bg-white hover:bg-cream text-terracotta font-black text-xl shadow-elevated transition-card flex items-center justify-center gap-3"
            >
              <PhoneCall size={26} className="text-terracotta" />
              <span>{t('alert.quickCallButton', 'Quick Call')} ({elderName})</span>
            </button>

            <button
              type="button"
              onClick={() => handleAcknowledgeAlert(activeEmergencyAlert.id)}
              className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] text-cream font-black text-xl shadow-elevated transition-card flex items-center justify-center gap-3 border-2 border-white/30"
            >
              <CheckCircle size={26} />
              <span>{t('alert.callingNowButton', "I'm Calling Now")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEmergencyAlert(null)}
              className="w-full min-h-[48px] py-2 text-white/75 hover:text-white font-bold text-base transition-card"
            >
              {t('alert.dismiss', 'Dismiss alert')}
            </button>
          </div>
        </div>
      )}

      {/* Inline Modal to Add Parent's Phone Number if not saved */}
      {showAddContactPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-brown-dark/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-card p-6 max-w-sm w-full text-center shadow-elevated border-2 border-teal-deep/20 space-y-4">
            <div className="w-14 h-14 rounded-full bg-cream text-teal-deep flex items-center justify-center mx-auto">
              <PhoneCall size={30} />
            </div>
            <h3 className="text-2xl font-black text-teal-deep">
              {t('alert.addPhoneTitle', "Add Parent's Phone")}
            </h3>
            <p className="text-sm text-brown-dark/80 font-medium">
              Enter {elderName}'s phone number to call directly. Saved privately on this device only.
            </p>

            <form onSubmit={handleSaveContactAndCall} className="space-y-3">
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={newPhoneNumber}
                onChange={e => setNewPhoneNumber(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-lg border border-teal-deep/30 text-lg font-bold text-center"
              />
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSavingContact}
                  className="w-full min-h-[56px] py-3 rounded-card bg-teal-deep text-cream font-bold text-lg shadow-elevated"
                >
                  {t('alert.saveAndCall', 'Save & Call Now')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddContactPrompt(false)}
                  className="w-full min-h-[48px] py-2 rounded-card bg-cream text-brown-dark font-semibold text-base"
                >
                  {t('nav.close', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
