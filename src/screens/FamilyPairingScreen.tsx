import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  KeyRound,
  ArrowRight,
  CameraOff
} from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { PairingConsentModal } from '../components/PairingConsentModal';
import { ReadAloudButton } from '../components/ReadAloudButton';
import { saveProfile } from '../db';
import { redeemPairingCode } from '../db/supabase';

export const FamilyPairingScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lang = (i18n.language as 'en' | 'hi' | 'hing') || 'en';

  const initialCode = searchParams.get('code') || '';

  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'scan' | 'type'>(initialCode ? 'type' : 'scan');
  const [inputCode, setInputCode] = useState<string>(initialCode.toUpperCase());
  const [guardianName, setGuardianName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cameraBlocked, setCameraBlocked] = useState<boolean>(false);
  const [isScannerRunning, setIsScannerRunning] = useState<boolean>(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // If URL has code, prefill it
    if (initialCode) {
      setInputCode(initialCode.toUpperCase());
      setActiveTab('type');
    }
  }, [initialCode]);

  // Clean up scanner on unmount or tab switch
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // When tab changes to 'scan' and consent given, initialize scanner
  useEffect(() => {
    if (hasConsented && activeTab === 'scan') {
      startScanner();
    } else {
      stopScanner();
    }
  }, [hasConsented, activeTab]);

  const startScanner = async () => {
    stopScanner();
    setCameraBlocked(false);

    // Short timeout to ensure #qr-reader is mounted in DOM
    setTimeout(async () => {
      const element = document.getElementById('qr-reader');
      if (!element) return;

      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        qrScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 }
          },
          (decodedText) => {
            // Check if scanned text contains URL or raw code
            let code = decodedText.trim();
            try {
              const url = new URL(decodedText);
              const codeParam = url.searchParams.get('code');
              if (codeParam) {
                code = codeParam;
              }
            } catch {
              // Not a full URL, treat as raw code
            }

            if (code) {
              setInputCode(code.toUpperCase());
              stopScanner();
              setActiveTab('type');
            }
          },
          () => {
            // Normal scan frame dropped, ignore
          }
        );
        setIsScannerRunning(true);
      } catch (err: any) {
        console.warn('Camera scanner error:', err);
        setCameraBlocked(true);
        setIsScannerRunning(false);
        setActiveTab('type'); // Fall back to typing code
      }
    }, 150);
  };

  const stopScanner = () => {
    if (qrScannerRef.current && isScannerRunning) {
      qrScannerRef.current
        .stop()
        .then(() => {
          qrScannerRef.current?.clear();
          qrScannerRef.current = null;
          setIsScannerRunning(false);
        })
        .catch(() => {
          qrScannerRef.current = null;
          setIsScannerRunning(false);
        });
    }
  };

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!guardianName.trim()) {
      setErrorMessage(t('pairing.nameRequired', 'Please enter your first name or relation (e.g. Beta, Priya)'));
      return;
    }

    if (!inputCode.trim() || inputCode.trim().length !== 6) {
      setErrorMessage(t('pairing.validCodeRequired', 'Please enter a valid 6-character pairing code'));
      return;
    }

    setIsSubmitting(true);
    try {
      await redeemPairingCode(inputCode.trim(), guardianName.trim(), 'guardian', lang);
      // Save local profile role as family
      await saveProfile('family', lang);
      navigate('/family');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('invalid or expired')) {
        setErrorMessage(t('pairing.codeExpiredError', 'This pairing code is invalid, expired, or already used. Please ask your parent to generate a fresh code.'));
      } else if (msg.includes('already in a family')) {
        setErrorMessage(t('pairing.alreadyInFamilyError', 'You are already connected to a family.'));
      } else {
        setErrorMessage(msg || t('pairing.connectError', 'Could not connect to family. Please check your connection.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-16">
      <HeaderBar
        title={t('pairing.guardianTitle', 'Join Family')}
        showBack={true}
        showHome={false}
        showSettings={false}
        backTo="/welcome"
      />

      {/* Consent Modal shown before pairing */}
      <PairingConsentModal
        isOpen={!hasConsented}
        role="guardian"
        onAgree={() => setHasConsented(true)}
        onCancel={() => navigate('/welcome')}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        <div className="flex justify-center">
          <ReadAloudButton screenId="family_pairing" />
        </div>

        {errorMessage && (
          <div className="p-4 bg-terracotta/15 border-2 border-terracotta rounded-card text-terracotta font-bold text-base text-center">
            {errorMessage}
          </div>
        )}

        {cameraBlocked && (
          <div className="p-4 bg-terracotta/15 border-2 border-terracotta/30 rounded-card flex items-center gap-3 text-brown-dark text-base font-medium">
            <CameraOff size={24} className="text-terracotta shrink-0" />
            <span>{t('pairing.cameraBlockedNotice', 'Camera access was blocked or unavailable. You can easily type the 6-character code below.')}</span>
          </div>
        )}

        <section className="bg-white p-6 rounded-card shadow-soft border-2 border-teal-deep/20 space-y-5 animate-in fade-in duration-300">
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-teal-deep">
              {t('pairing.joinTitle', 'Connect with Parent')}
            </h2>
            <p className="text-base sm:text-lg text-brown-dark/80 font-medium">
              {t('pairing.joinSub', 'Scan the QR code on your parent’s screen, or type their 6-character code.')}
            </p>
          </div>

          {/* Tab Switcher: Scan QR vs Type Code */}
          <div className="grid grid-cols-2 gap-2 bg-cream/70 p-1.5 rounded-card border border-teal-deep/15">
            <button
              type="button"
              onClick={() => {
                setActiveTab('scan');
                setErrorMessage('');
              }}
              className={`min-h-[48px] rounded-lg font-bold text-base transition-card flex items-center justify-center gap-2 ${
                activeTab === 'scan'
                  ? 'bg-teal-deep text-cream shadow-sm'
                  : 'bg-transparent text-brown-dark hover:bg-white/50'
              }`}
            >
              <Camera size={18} />
              <span>{t('pairing.tabScan', 'Scan QR')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('type');
                setErrorMessage('');
              }}
              className={`min-h-[48px] rounded-lg font-bold text-base transition-card flex items-center justify-center gap-2 ${
                activeTab === 'type'
                  ? 'bg-teal-deep text-cream shadow-sm'
                  : 'bg-transparent text-brown-dark hover:bg-white/50'
              }`}
            >
              <KeyRound size={18} />
              <span>{t('pairing.tabType', 'Type Code')}</span>
            </button>
          </div>

          {/* TAB 1: Camera Scanner */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              <div
                id="qr-reader"
                className="w-full max-w-[280px] h-[280px] mx-auto rounded-card overflow-hidden border-2 border-teal-deep/30 bg-black/5"
              />
              <p className="text-sm text-center text-brown-dark/70 font-medium">
                {t('pairing.scanHelp', 'Point your camera at the QR code on the parent’s phone.')}
              </p>
            </div>
          )}

          {/* FORM: Guardian Details & Code */}
          <form onSubmit={handlePairSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-lg font-bold text-teal-deep mb-1.5">
                {t('pairing.guardianNameLabel', 'Your name or relation')} *
              </label>
              <input
                type="text"
                required
                placeholder={t('pairing.guardianNamePlaceholder', 'e.g. Beta, Priya, Son')}
                value={guardianName}
                onChange={e => setGuardianName(e.target.value)}
                className="w-full min-h-[56px] px-4 rounded-card border-2 border-teal-deep/30 bg-cream/30 text-brown-dark text-xl font-bold focus:outline-teal-deep"
              />
            </div>

            <div>
              <label className="block text-lg font-bold text-teal-deep mb-1.5">
                {t('pairing.codePrompt', '6-Character Code from Parent')} *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="XXXXXX"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                className="w-full min-h-[56px] px-4 rounded-card border-2 border-teal-deep/30 bg-cream/30 text-brown-dark text-2xl font-mono font-black uppercase tracking-widest text-center focus:outline-teal-deep"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-black text-xl shadow-elevated transition-card flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <span>{t('pairing.joining', 'Connecting...')}</span>
              ) : (
                <>
                  <span>{t('pairing.connectButton', 'Connect to Family')}</span>
                  <ArrowRight size={22} />
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};
