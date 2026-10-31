import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import {
  Users,
  RotateCcw,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { PairingConsentModal } from '../components/PairingConsentModal';
import { ReadAloudButton } from '../components/ReadAloudButton';
import {
  getCurrentMembership,
  createFamilyCluster,
  generatePairingCode
} from '../db/supabase';

export const ParentPairingScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language as 'en' | 'hi' | 'hing') || 'en';

  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [parentName, setParentName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [timeLeftSec, setTimeLeftSec] = useState<number>(600); // 10 minutes
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isFamilyCreated, setIsFamilyCreated] = useState<boolean>(false);

  const expiryTimestampRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if family already exists on mount
  useEffect(() => {
    checkExistingMembership();
  }, []);

  const checkExistingMembership = async () => {
    try {
      const membership = await getCurrentMembership();
      if (membership && membership.role === 'elder') {
        setIsFamilyCreated(true);
        setParentName(membership.display_name);
        setHasConsented(true);
        // Automatically generate a pairing code for existing family
        await fetchNewCode();
      }
    } catch (err) {
      console.warn('Membership check notice:', err);
    }
  };

  // Timer countdown handler
  useEffect(() => {
    if (pairingCode && expiryTimestampRef.current > 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiryTimestampRef.current - Date.now()) / 1000));
        setTimeLeftSec(remaining);
        if (remaining <= 0 && timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [pairingCode]);

  const fetchNewCode = async () => {
    setErrorMessage('');
    try {
      const code = await generatePairingCode();
      setPairingCode(code);
      expiryTimestampRef.current = Date.now() + 10 * 60 * 1000;
      setTimeLeftSec(600);

      // Generate QR code encoding {origin}/pair?code=XXXXXX
      const pairUrl = `${window.location.origin}/pair?code=${code}`;
      const url = await QRCode.toDataURL(pairUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#0B4F4A',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(url);
    } catch (err: any) {
      setErrorMessage(err.message || t('pairing.codeError', 'Could not generate pairing code. Please check your internet connection.'));
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim()) {
      setErrorMessage(t('pairing.nameRequired', 'Please enter your first name or nickname'));
      return;
    }

    setErrorMessage('');
    setIsCreating(true);
    try {
      await createFamilyCluster(parentName.trim(), 'elder', lang);
      setIsFamilyCreated(true);
      await fetchNewCode();
    } catch (err: any) {
      setErrorMessage(err.message || t('pairing.createError', 'Could not create family. Please check connection.'));
    } finally {
      setIsCreating(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-16">
      <HeaderBar
        title={t('pairing.parentTitle', 'Connect with Family')}
        showBack={true}
        showHome={true}
        showSettings={false}
        backTo="/elder"
      />

      {/* Consent Modal shown before first pairing */}
      <PairingConsentModal
        isOpen={!hasConsented}
        role="elder"
        onAgree={() => setHasConsented(true)}
        onCancel={() => navigate('/elder')}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        <div className="flex justify-center">
          <ReadAloudButton screenId="parent_pairing" />
        </div>

        {errorMessage && (
          <div className="p-4 bg-terracotta/15 border-2 border-terracotta rounded-card text-terracotta font-bold text-base text-center">
            {errorMessage}
          </div>
        )}

        {/* STEP 1: Ask for Parent's Name/Nickname (First Time Only) */}
        {!isFamilyCreated && hasConsented && (
          <section className="bg-white p-6 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-cream text-teal-deep flex items-center justify-center mx-auto shadow-inner">
              <Users size={34} />
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-teal-deep">
                {t('pairing.parentNameTitle', 'What should your family call you?')}
              </h2>
              <p className="text-lg text-brown-dark/80 font-medium">
                {t('pairing.parentNameSub', 'Enter your first name or a nickname like Dad, Papa, or Mataji.')}
              </p>
            </div>

            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div>
                <label className="block text-lg font-bold text-teal-deep mb-2">
                  {t('pairing.nameLabel', 'Your name or nickname')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('pairing.namePlaceholder', 'e.g. Papa, Ramesh, Dad')}
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                  className="w-full min-h-[56px] px-4 rounded-card border-2 border-teal-deep/30 bg-cream/30 text-brown-dark text-xl font-bold focus:outline-teal-deep"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-black text-xl shadow-elevated transition-card flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <span>{t('pairing.creating', 'Setting up family...')}</span>
                ) : (
                  <span>{t('pairing.createFamilyButton', 'Create Family & Show Code')}</span>
                )}
              </button>
            </form>
          </section>
        )}

        {/* STEP 2: Show QR Code and 6-Character Code */}
        {isFamilyCreated && (
          <section className="bg-white p-6 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-5 text-center animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream text-teal-deep text-sm font-extrabold border border-teal-deep/20">
                <CheckCircle2 size={16} />
                <span>{t('pairing.familyReady', 'Family Connected')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-teal-deep pt-1">
                {t('pairing.scanPrompt', 'Ask your family member to scan this QR code')}
              </h2>
              <p className="text-base sm:text-lg text-brown-dark/80 font-medium">
                {t('pairing.scanSub', 'Or ask them to type the 6-character code below.')}
              </p>
            </div>

            {/* QR Code Display */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border-2 border-teal-deep/20 shadow-inner max-w-xs mx-auto">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Pairing QR Code"
                  width={256}
                  height={256}
                  className="w-64 h-64 object-contain rounded-xl"
                />
              ) : (
                <div className="w-64 h-64 bg-cream/50 rounded-xl flex items-center justify-center text-brown-dark/60 font-bold">
                  {t('pairing.loadingQR', 'Generating QR Code...')}
                </div>
              )}
            </div>

            {/* 6-Character Pairing Code */}
            <div className="p-4 bg-cream rounded-card border-2 border-dashed border-teal-deep/40 space-y-1">
              <span className="text-sm font-bold uppercase tracking-wider text-teal-deep">
                {t('pairing.codeLabel', '6-Character Code')}
              </span>
              <div className="text-4xl sm:text-5xl font-mono font-black text-teal-deep tracking-widest py-1 select-all">
                {pairingCode || '------'}
              </div>
              <span className="text-sm text-brown-dark/70 font-medium block">
                {t('pairing.codeTypeHelper', 'They can type this in Family Member mode.')}
              </span>
            </div>

            {/* 10-Minute Expiry Countdown */}
            <div className="flex items-center justify-center gap-2 text-base sm:text-lg font-bold">
              <Clock size={20} className={timeLeftSec > 60 ? 'text-teal-deep' : 'text-terracotta'} />
              {timeLeftSec > 0 ? (
                <span className={timeLeftSec > 60 ? 'text-brown-dark' : 'text-terracotta'}>
                  {t('pairing.expiresIn', 'Code expires in')}: <strong className="font-mono font-black">{formatTimer(timeLeftSec)}</strong>
                </span>
              ) : (
                <span className="text-terracotta font-black">
                  {t('pairing.codeExpired', 'Code expired. Tap "New code" below.')}
                </span>
              )}
            </div>

            {/* Action Buttons: New code and Done */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={fetchNewCode}
                className="w-full min-h-[56px] py-4 px-6 rounded-card bg-white hover:bg-cream active:scale-[0.98] text-teal-deep font-black text-lg border-2 border-teal-deep/40 shadow-soft transition-card flex items-center justify-center gap-2"
              >
                <RotateCcw size={22} />
                <span>{t('pairing.newCodeButton', 'New code')}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/elder')}
                className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-black text-xl shadow-elevated transition-card flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={22} />
                <span>{t('pairing.doneButton', 'Done / Back to Home')}</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
