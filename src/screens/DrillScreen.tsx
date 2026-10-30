import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LogOut,
  PhoneCall,
  PhoneOff,
  Volume2,
  Users,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Home,
  AlertCircle
} from 'lucide-react';
import { DrillEngine } from '../engine';
import { DIGITAL_ARREST_SCENARIO } from '../scenarios';
import { PressureMeter } from '../components/PressureMeter';
import { DrillPathMap } from '../components/DrillPathMap';
import { PauseShieldButton } from '../components/PauseShieldButton';
import { PauseModal } from '../components/PauseModal';
import { saveDrillResult } from '../db';
import type { Outcome, Tactic } from '../engine/types';

type DrillPhase = 'pre' | 'incoming' | 'call' | 'declined' | 'debrief';

export const DrillScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language as 'en' | 'hi' | 'hing') || 'en';

  // State
  const [phase, setPhase] = useState<DrillPhase>('pre');
  const [familyWatching, setFamilyWatching] = useState<boolean>(false);
  const [engine, setEngine] = useState<DrillEngine>(() => new DrillEngine(DIGITAL_ARREST_SCENARIO));
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [audioError, setAudioError] = useState<boolean>(false);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const [finalOutcome, setFinalOutcome] = useState<Outcome>('safe');

  const scenario = engine.getScenario();
  const currentNode = engine.getCurrentNode();
  const currentNodeId = engine.getCurrentNodeId();
  const pressure = engine.getPressure();
  const band = engine.getPressureBand();

  // Cleanup audio playback on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleExit = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    navigate('/elder');
  };

  const handleStartPractice = () => {
    startTimeRef.current = Date.now();
    setPhase('incoming');
  };

  const handleAcceptCall = () => {
    setPhase('call');
  };

  const handleDeclineCall = async () => {
    const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    setFinalOutcome('safe');
    setPhase('declined');

    // Save declined drill as safe practice
    try {
      await saveDrillResult({
        scenarioId: scenario.id,
        version: scenario.version,
        outcome: 'safe',
        flags: ['hung_up'],
        tactics: [],
        finalPressure: 20,
        duration,
        familyMemberWatching: familyWatching,
        timestamp: Date.now(),
        notes: 'Declined suspicious incoming video call immediately'
      });
    } catch (e) {
      console.error('Failed to save declined drill result:', e);
    }
  };

  const handlePlayAudio = () => {
    if (!currentNode) return;
    const langKey = lang === 'hing' ? 'hi' : lang;
    const audioPath = `/audio/${langKey}/${scenario.id}_${currentNodeId}.mp3`;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioPath);
    audioRef.current = audio;
    setAudioPlaying(true);

    audio.onended = () => {
      setAudioPlaying(false);
    };

    audio.onerror = () => {
      setAudioPlaying(false);
      setAudioError(true);
    };

    audio.play().catch(() => {
      setAudioPlaying(false);
      setAudioError(true);
    });
  };

  const handleSelectOption = async (optionId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const result = engine.chooseOption(optionId);

    if (result.isComplete) {
      const outcome = result.outcome || 'safe';
      setFinalOutcome(outcome);
      const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

      // Save drill history to Dexie IndexedDB
      try {
        await saveDrillResult({
          scenarioId: scenario.id,
          version: scenario.version,
          outcome,
          flags: engine.getFlags(),
          tactics: engine.getTacticsSeen(),
          finalPressure: engine.getPressure(),
          duration,
          familyMemberWatching: familyWatching,
          timestamp: Date.now(),
          notes: `Completed path with final pressure ${engine.getPressure()}`
        });
      } catch (err) {
        console.error('Failed to save completed drill history:', err);
      }

      setPhase('debrief');
    } else {
      setAudioError(false);
      setAudioPlaying(false);
      // Force re-render with next node
      setEngine(Object.assign(Object.create(Object.getPrototypeOf(engine)), engine));
    }
  };

  const handleRestart = () => {
    const newEngine = new DrillEngine(DIGITAL_ARREST_SCENARIO);
    setEngine(newEngine);
    startTimeRef.current = Date.now();
    setPhase('incoming');
  };

  // Helper for "What you did well"
  const getWellFeedback = () => {
    const flags = engine.getFlags();
    if (flags.includes('hung_up')) {
      return t('drill.feedback.wellHungUp', 'You disconnected the call promptly when things felt suspicious.');
    }
    if (flags.includes('told_someone')) {
      return t('drill.feedback.wellToldSomeone', 'You insisted on involving your family instead of staying isolated.');
    }
    if (flags.includes('used_pause')) {
      return t('drill.feedback.wellUsedPause', 'You took a protective pause to think clearly before reacting.');
    }
    return t('drill.feedback.wellCalm', "You stayed calm and observed the caller's tactics.");
  };

  // Helper for "One thing to try next time"
  const getNextTimeFeedback = () => {
    const flags = engine.getFlags();
    if (flags.includes('moved_money')) {
      return t(
        'drill.feedback.nextMoney',
        'Never send money or transfer funds to any account during an unsolicited call. Real police never ask for money transfers.'
      );
    }
    if (flags.includes('shared_otp') || flags.includes('shared_info')) {
      return t(
        'drill.feedback.nextInfo',
        'Never share OTPs or personal identity details like Aadhaar over a call.'
      );
    }
    if (!flags.includes('hung_up') && !flags.includes('used_pause')) {
      return t(
        'drill.feedback.nextHangUp',
        'You can hang up immediately and press Pause or contact your trusted family member.'
      );
    }
    return t(
      'drill.feedback.nextKeepPracticing',
      'Keep practicing! Hanging up early and consulting family is always the safest move.'
    );
  };

  // Localized caller name
  const localizedCaller = scenario.caller[lang] || scenario.caller.en;

  return (
    <div className="min-h-screen bg-cream text-brown-dark flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Top Header: HARD RULE 4 - Always visible 'Practice call' tag & always visible 'Exit' button */}
      <header className="flex items-center justify-between pb-3 border-b-2 border-teal-deep/15">
        {/* Visible 'Practice call' tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-deep text-cream font-extrabold text-sm sm:text-base tracking-wide border border-teal-deep/30 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-terracotta animate-pulse" />
          <span>{t('drill.practiceTag', 'Practice call')}</span>
        </div>

        {/* Always-visible Exit button */}
        <button
          type="button"
          onClick={handleExit}
          className="min-h-[44px] px-4 py-2 rounded-full bg-white text-terracotta hover:bg-terracotta hover:text-white border-2 border-terracotta/40 font-bold text-base transition-card flex items-center gap-1.5 shadow-sm active:scale-95"
          aria-label={t('drill.exit', 'Exit')}
        >
          <LogOut size={18} />
          <span>{t('drill.exit', 'Exit')}</span>
        </button>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 my-4 flex flex-col justify-center">
        {/* PHASE 1: PRE-DRILL */}
        {phase === 'pre' && (
          <div className="bg-white rounded-card p-6 shadow-soft border-2 border-teal-deep/20 space-y-6 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-cream text-teal-deep flex items-center justify-center mx-auto shadow-inner border-2 border-teal-deep/20">
              <PhoneCall size={40} className="text-teal-deep" />
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-black text-teal-deep leading-tight">
                {scenario.title[lang] || scenario.title.en}
              </h1>

              {/* Two short lines */}
              <p className="text-lg text-brown-dark/90 leading-relaxed font-medium">
                {t('drill.preDrill.line1', 'This is a safe practice call to rehearse how to handle pressure.')}
              </p>
              <p className="text-lg text-brown-dark/90 leading-relaxed font-medium">
                {t('drill.preDrill.line2', 'A family member can watch and practice along with you.')}
              </p>
            </div>

            {/* Optional toggle: Family member is watching */}
            <div className="pt-2">
              <label className="flex items-center justify-between p-4 rounded-xl bg-cream/70 border-2 border-teal-deep/20 cursor-pointer hover:bg-cream transition-card">
                <div className="flex items-center gap-3 text-left">
                  <Users size={24} className="text-teal-deep shrink-0" />
                  <span className="font-bold text-base sm:text-lg text-brown-dark">
                    {t('drill.preDrill.familyWatching', 'Family member is watching')}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={familyWatching}
                  onChange={e => setFamilyWatching(e.target.checked)}
                  className="w-6 h-6 rounded border-teal-deep text-teal-deep focus:ring-teal-deep cursor-pointer"
                />
              </label>
            </div>

            {/* Big "Start practice" button (min-h 56px) */}
            <button
              type="button"
              onClick={handleStartPractice}
              className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] text-cream font-black text-xl shadow-elevated active:scale-[0.98] transition-card"
            >
              {t('drill.preDrill.start', 'Start practice')}
            </button>
          </div>
        )}

        {/* PHASE 2: FAKE INCOMING VIDEO CALL */}
        {phase === 'incoming' && (
          <div className="bg-brown-dark text-white rounded-card p-6 sm:p-8 shadow-elevated border-2 border-teal-deep/40 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-teal-deep/30 animate-ping" />
              <div className="w-24 h-24 rounded-full bg-teal-deep border-4 border-cream flex items-center justify-center shadow-elevated">
                <PhoneCall size={44} className="text-cream animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-cream text-sm font-semibold tracking-wider">
                {t('drill.incoming.callTitle', 'Incoming Video Call')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-cream leading-tight">
                {localizedCaller}
              </h2>
              <p className="text-sm sm:text-base text-cream/70">
                (Fictional Simulation Organization)
              </p>
            </div>

            {/* Large Accept and Decline buttons (min-h 56px) */}
            <div className="space-y-3 pt-4">
              <button
                type="button"
                onClick={handleAcceptCall}
                className="w-full min-h-[56px] py-4 px-6 rounded-card bg-[#15803D] hover:bg-[#166534] text-white font-black text-xl shadow-elevated active:scale-[0.98] transition-card flex items-center justify-center gap-3"
              >
                <PhoneCall size={24} />
                <span>{t('drill.incoming.accept', 'Accept Call')}</span>
              </button>

              <button
                type="button"
                onClick={handleDeclineCall}
                className="w-full min-h-[56px] py-4 px-6 rounded-card bg-terracotta hover:bg-[#C96443] text-white font-black text-xl shadow-elevated active:scale-[0.98] transition-card flex items-center justify-center gap-3"
              >
                <PhoneOff size={24} />
                <span>{t('drill.incoming.decline', 'Decline Call')}</span>
              </button>
            </div>
          </div>
        )}

        {/* PHASE 2B: DECLINED IMMEDIATE REASSURANCE */}
        {phase === 'declined' && (
          <div className="bg-white rounded-card p-6 shadow-soft border-2 border-teal-deep/20 space-y-6 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-[#E6F4EA] text-teal-deep flex items-center justify-center mx-auto border-2 border-teal-deep/30">
              <ShieldCheck size={44} className="text-teal-deep" />
            </div>

            <div className="space-y-3">
              <div className="inline-block px-4 py-1.5 rounded-full bg-teal-deep text-cream text-sm font-black uppercase">
                {t('outcomes.safe', 'Safe')}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-teal-deep">
                {t('drill.incoming.declineTitle', 'Call Declined')}
              </h2>
              <p className="text-lg text-brown-dark/90 leading-relaxed font-medium">
                {t('drill.incoming.declineMessage')}
              </p>
            </div>

            <DrillPathMap
              scenario={scenario}
              history={[]}
              outcome="safe"
              declinedAtStart={true}
            />

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] text-cream font-black text-xl shadow-elevated active:scale-[0.98] transition-card flex items-center justify-center gap-2"
              >
                <RotateCcw size={22} />
                <span>{t('drill.debrief.tryAgain', 'Try again')}</span>
              </button>

              <button
                type="button"
                onClick={handleExit}
                className="w-full min-h-[56px] py-4 px-6 rounded-card bg-cream hover:bg-[#FFE8B2] text-brown-dark font-black text-lg border-2 border-teal-deep/20 active:scale-[0.98] transition-card flex items-center justify-center gap-2"
              >
                <Home size={22} />
                <span>{t('drill.debrief.home', 'Home')}</span>
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: ACTIVE DRILL CALL SCREEN */}
        {phase === 'call' && currentNode && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Pressure Meter */}
            <PressureMeter pressure={pressure} band={band} />

            {/* Simulated Video & Caller Dialogue Card */}
            <div className="bg-white rounded-card p-5 sm:p-6 shadow-soft border-2 border-teal-deep/20 space-y-4">
              <div className="flex items-center justify-between border-b border-teal-deep/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-teal-deep/15 text-teal-deep flex items-center justify-center font-bold text-sm">
                    ●
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-teal-deep leading-tight">
                      {localizedCaller}
                    </h3>
                    <span className="text-xs text-brown-dark/60 font-semibold">
                      Simulation Caller
                    </span>
                  </div>
                </div>

                {/* Audio controls */}
                <div className="flex items-center gap-2">
                  {audioError && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-200 text-gray-700 font-semibold">
                      {t('drill.call.audioNotRecorded', 'audio not recorded')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    className="min-h-[40px] px-3 py-1.5 rounded-full bg-cream hover:bg-[#FFE8B2] text-teal-deep border border-teal-deep/30 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-card active:scale-95"
                    aria-label={t('drill.call.replayAudio', 'Replay audio')}
                  >
                    <Volume2 size={16} className={audioPlaying ? 'animate-pulse text-terracotta' : ''} />
                    <span>{t('drill.call.replayAudio', 'Replay audio')}</span>
                  </button>
                </div>
              </div>

              {/* Large Captions: Caller's line */}
              <div className="p-4 rounded-xl bg-cream/60 border border-teal-deep/15">
                <p className="text-lg sm:text-xl font-bold text-brown-dark leading-relaxed">
                  "{currentNode.text[lang] || currentNode.text.en}"
                </p>
              </div>
            </div>

            {/* 2 to 4 Large Answer Buttons (each at least 56px tall) */}
            <div className="space-y-3 pt-2" aria-label="Response options">
              {currentNode.options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full min-h-[56px] p-4 rounded-card text-left font-extrabold text-lg sm:text-xl shadow-soft border-2 transition-card active:scale-[0.98] flex items-center justify-between gap-3 ${
                    option.calm
                      ? 'bg-white hover:bg-[#F0FAF7] text-teal-deep border-teal-deep/40 hover:border-teal-deep'
                      : option.flags.includes('hung_up') || option.flags.includes('used_pause')
                      ? 'bg-white hover:bg-[#FFF5F2] text-terracotta border-terracotta/40 hover:border-terracotta'
                      : 'bg-white hover:bg-cream text-brown-dark border-teal-deep/20 hover:border-teal-deep'
                  }`}
                >
                  <span className="leading-snug">
                    <span className="inline-block w-7 font-black opacity-60">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option.label[lang] || option.label.en}
                  </span>
                  {option.calm && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-teal-deep/15 text-teal-deep font-bold shrink-0">
                      Calm
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PHASE 4: DEBRIEF */}
        {phase === 'debrief' && (
          <div className="space-y-5 animate-in fade-in duration-300 pb-4">
            {/* Outcome Badge Card - HARD RULE: Never use 'failed' or 'wrong' */}
            <div
              className={`rounded-card p-6 text-center border-2 shadow-soft space-y-3 ${
                finalOutcome === 'safe'
                  ? 'bg-[#E6F4EA] border-teal-deep text-teal-deep'
                  : finalOutcome === 'almost'
                  ? 'bg-[#FEF3C7] border-[#D97706] text-[#92400E]'
                  : 'bg-[#FDF2EE] border-terracotta text-[#C05621]'
              }`}
            >
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-white/80 shadow-sm">
                {finalOutcome === 'safe' ? (
                  <CheckCircle size={40} className="text-teal-deep" />
                ) : finalOutcome === 'almost' ? (
                  <AlertCircle size={40} className="text-[#D97706]" />
                ) : (
                  <AlertTriangle size={40} className="text-terracotta" />
                )}
              </div>

              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider opacity-80">
                  {t('drill.debrief.title', 'Drill Debrief')}
                </span>
                <h2 className="text-3xl sm:text-4xl font-black">
                  {finalOutcome === 'safe'
                    ? t('outcomes.safe', 'Safe')
                    : finalOutcome === 'almost'
                    ? t('outcomes.almost', 'Almost')
                    : t('outcomes.tryAgain', "Let's try again")}
                </h2>
              </div>

              {/* Calm Outcome Message */}
              <p className="text-lg font-medium leading-relaxed">
                {finalOutcome === 'safe'
                  ? t('drill.debrief.safeMessage')
                  : finalOutcome === 'almost'
                  ? t('drill.debrief.almostMessage')
                  : t('drill.debrief.tryAgainMessage')}
              </p>
            </div>

            {/* Tactics the caller used */}
            {engine.getTacticsSeen().length > 0 && (
              <div className="bg-white rounded-card p-5 border-2 border-teal-deep/20 shadow-soft space-y-3">
                <h3 className="font-black text-lg text-teal-deep">
                  {t('drill.debrief.tacticsTitle', 'Tactics the caller used')}
                </h3>
                <div className="space-y-2.5">
                  {engine.getTacticsSeen().map((tactic: Tactic) => (
                    <div
                      key={tactic}
                      className="p-3 rounded-xl bg-cream/70 border border-teal-deep/15 flex items-start gap-3"
                    >
                      <span className="px-2 py-0.5 rounded-full bg-teal-deep text-cream text-xs font-bold shrink-0 mt-0.5 uppercase tracking-wide">
                        {tactic.replace('_', ' ')}
                      </span>
                      <p className="text-sm sm:text-base text-brown-dark/90 leading-snug">
                        {t(`drill.tactics.${tactic}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What you did well & One thing to try next time */}
            <div className="space-y-3">
              <div className="bg-white rounded-card p-4 sm:p-5 border-2 border-teal-deep/20 shadow-soft space-y-1.5">
                <div className="flex items-center gap-2 text-teal-deep font-extrabold text-base">
                  <CheckCircle size={20} />
                  <span>{t('drill.debrief.whatYouDidWell', 'What you did well')}</span>
                </div>
                <p className="text-base sm:text-lg text-brown-dark/90 leading-relaxed font-medium pl-7">
                  {getWellFeedback()}
                </p>
              </div>

              <div className="bg-white rounded-card p-4 sm:p-5 border-2 border-terracotta/30 shadow-soft space-y-1.5">
                <div className="flex items-center gap-2 text-terracotta font-extrabold text-base">
                  <AlertTriangle size={20} />
                  <span>{t('drill.debrief.nextTime', 'One thing to try next time')}</span>
                </div>
                <p className="text-base sm:text-lg text-brown-dark/90 leading-relaxed font-medium pl-7">
                  {getNextTimeFeedback()}
                </p>
              </div>
            </div>

            {/* SVG Path Map (The Butterfly Effect) */}
            <DrillPathMap
              scenario={scenario}
              history={engine.getHistory()}
              outcome={finalOutcome}
            />

            {/* Buttons: Try again and Home (min-h 56px) */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] text-cream font-black text-xl shadow-elevated active:scale-[0.98] transition-card flex items-center justify-center gap-2"
              >
                <RotateCcw size={22} />
                <span>{t('drill.debrief.tryAgain', 'Try again')}</span>
              </button>

              <button
                type="button"
                onClick={handleExit}
                className="w-full min-h-[56px] py-4 px-6 rounded-card bg-cream hover:bg-[#FFE8B2] text-brown-dark font-black text-lg border-2 border-teal-deep/20 active:scale-[0.98] transition-card flex items-center justify-center gap-2"
              >
                <Home size={22} />
                <span>{t('drill.debrief.home', 'Home')}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Visible Pause button on drill screen (source="drill") */}
      <PauseShieldButton onClick={() => setIsPauseOpen(true)} />

      {/* Pause Modal */}
      <PauseModal
        isOpen={isPauseOpen}
        onClose={() => setIsPauseOpen(false)}
        source="drill"
      />
    </div>
  );
};
