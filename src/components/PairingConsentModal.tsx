import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Eye, EyeOff, CheckCircle2, X } from 'lucide-react';

interface PairingConsentModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onCancel: () => void;
  role?: 'elder' | 'guardian';
}

export const PairingConsentModal: React.FC<PairingConsentModalProps> = ({
  isOpen,
  onAgree,
  onCancel,
  role = 'elder'
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-brown-dark/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-cream rounded-card shadow-elevated border-2 border-teal-deep/30 p-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-teal-deep/15">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-deep text-cream font-extrabold text-sm sm:text-base">
            <ShieldCheck size={20} className="text-cream" />
            <span>{t('consent.badge', 'Family Privacy Promise')}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('nav.close', 'Close')}
            className="w-11 h-11 rounded-full bg-white text-brown-dark hover:bg-cream border border-teal-deep/20 flex items-center justify-center transition-card shadow-sm"
          >
            <X size={24} />
          </button>
        </div>

        {/* Title */}
        <div className="mt-4 text-center space-y-2">
          <h2 id="consent-modal-title" className="text-2xl sm:text-3xl font-black text-teal-deep">
            {t('consent.title', 'Before You Connect Family')}
          </h2>
          <p className="text-lg text-brown-dark/85 font-medium leading-snug">
            {role === 'elder'
              ? t('consent.elderSubtitle', 'You stay in complete control. Your personal phone calls and safe word NEVER leave this phone.')
              : t('consent.guardianSubtitle', 'Family Firewall connects you for safety alerts and practice outcomes only. Personal conversations are never shared.')}
          </p>
        </div>

        {/* What Family WILL See */}
        <div className="mt-5 bg-white p-4 sm:p-5 rounded-card border-2 border-teal-deep/20 shadow-soft space-y-3">
          <div className="flex items-center gap-2 text-teal-deep font-black text-xl">
            <Eye size={24} className="text-teal-deep shrink-0" />
            <span>{t('consent.willSeeTitle', 'What your family will see:')}</span>
          </div>
          <ul className="space-y-2.5 text-lg text-brown-dark font-medium pl-1">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={22} className="text-teal-deep shrink-0 mt-0.5" />
              <span>{t('consent.willSeePause', 'When you tap the orange Pause button')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={22} className="text-teal-deep shrink-0 mt-0.5" />
              <span>{t('consent.willSeeDrill', 'Practice drill outcomes (Safe, Almost, Let\'s try again)')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={22} className="text-teal-deep shrink-0 mt-0.5" />
              <span>{t('consent.willSeeTime', 'Date and time of safety alerts')}</span>
            </li>
          </ul>
        </div>

        {/* What Family will NEVER See */}
        <div className="mt-4 bg-[#FFF5F2] p-4 sm:p-5 rounded-card border-2 border-terracotta/30 shadow-soft space-y-3">
          <div className="flex items-center gap-2 text-terracotta font-black text-xl">
            <EyeOff size={24} className="text-terracotta shrink-0" />
            <span>{t('consent.willNotSeeTitle', 'What your family will NEVER see:')}</span>
          </div>
          <ul className="space-y-2.5 text-lg text-brown-dark font-medium pl-1">
            <li className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-terracotta shrink-0 mt-2" />
              <span>{t('consent.willNotSeeCalls', 'Phone calls or who you talk to')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-terracotta shrink-0 mt-2" />
              <span>{t('consent.willNotSeeAudio', 'Audio recordings or call transcripts')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-terracotta shrink-0 mt-2" />
              <span>{t('consent.willNotSeeContacts', 'Your safe word, contacts, or phone numbers')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-terracotta shrink-0 mt-2" />
              <span>{t('consent.willNotSeeMessages', 'Private messages, chats, or passwords')}</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onAgree}
            className="w-full min-h-[56px] px-6 py-3.5 bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-black text-xl rounded-card shadow-elevated flex items-center justify-center gap-3 transition-card"
          >
            <span>{t('consent.agreeButton', 'I Agree & Continue')}</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[56px] py-3 bg-white hover:bg-cream active:scale-[0.98] text-brown-dark font-bold text-lg rounded-card border-2 border-teal-deep/20 transition-card"
          >
            {t('consent.cancelButton', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
