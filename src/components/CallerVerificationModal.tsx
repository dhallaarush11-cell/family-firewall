import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, PhoneCall, X } from 'lucide-react';
import { ReadAloudButton } from './ReadAloudButton';
import type { TrustedContact } from '../db';

interface CallerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trustedContact?: TrustedContact;
}

export const CallerVerificationModal: React.FC<CallerVerificationModalProps> = ({
  isOpen,
  onClose,
  trustedContact
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleCallPerson = () => {
    if (trustedContact?.phone) {
      const cleanPhone = trustedContact.phone.replace(/\s+/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="caller-verify-title"
      className="fixed inset-0 z-50 bg-brown-dark/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-card p-6 sm:p-8 max-w-md w-full shadow-elevated border-2 border-teal-deep/30 space-y-6 text-center">
        {/* Top bar with audio button and close */}
        <div className="flex items-center justify-between">
          <ReadAloudButton screenId="verify_caller" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.close', 'Close')}
            className="w-12 h-12 rounded-full bg-cream text-brown-dark flex items-center justify-center hover:bg-[#FFE8B2] transition-card"
          >
            <X size={24} />
          </button>
        </div>

        {/* Shield Icon */}
        <div className="w-20 h-20 rounded-full bg-cream text-teal-deep flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert size={44} className="text-teal-deep" />
        </div>

        <div className="space-y-3">
          <h2 id="caller-verify-title" className="text-2xl sm:text-3xl font-black text-teal-deep">
            {t('verifyCaller.title', 'Verify This Caller')}
          </h2>

          {/* THE EXACT LARGE INSTRUCTION */}
          <div className="p-5 bg-cream/60 rounded-card border-2 border-teal-deep/20 shadow-sm">
            <p className="text-xl sm:text-2xl font-black text-brown-dark leading-snug">
              {t(
                'verifyCaller.largeInstruction',
                'Ask the caller for the family safe word. If they cannot say it, hang up and call your person.'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons: 1 Action per Screen focus */}
        <div className="space-y-3 pt-2">
          {trustedContact?.phone ? (
            <button
              type="button"
              onClick={handleCallPerson}
              className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-black text-xl shadow-elevated transition-card flex items-center justify-center gap-3"
            >
              <PhoneCall size={26} />
              <span>
                {t('verifyCaller.callNow', 'Call')} {trustedContact.name}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] text-cream font-black text-xl shadow-elevated transition-card"
            >
              {t('verifyCaller.understood', 'I Will Ask For The Safe Word')}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] py-2 rounded-card bg-cream hover:bg-[#FFE8B2] text-brown-dark font-bold text-base transition-card"
          >
            {t('nav.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
