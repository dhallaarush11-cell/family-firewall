import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  X,
  ShieldAlert,
  Ban,
  KeyRound,
  PhoneOff,
  UserCheck,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { getTrustedContacts, logPilotEvent, type TrustedContact } from '../db';
import { triggerPausePressed } from '../db/supabase';

interface PauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  source?: 'home' | 'drill';
}

export const PauseModal: React.FC<PauseModalProps> = ({ isOpen, onClose, source = 'home' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [showNoContactAlert, setShowNoContactAlert] = useState(false);
  const [outboxPending, setOutboxPending] = useState(true);

  useEffect(() => {
    if (isOpen) {
      getTrustedContacts().then(setContacts);
      setShowNoContactAlert(false);
      logPilotEvent('pause_shield_activated', { source });

      // RULE 3: One tap, no typing, no confirmation dialog.
      // Immediately queues and sends pause_pressed event with payload {"source": "home" | "drill"}
      triggerPausePressed(source)
        .then(() => setOutboxPending(false))
        .catch(() => setOutboxPending(true));
    }
  }, [isOpen, source]);

  if (!isOpen) return null;

  const handleCallPerson = () => {
    if (contacts.length > 0 && contacts[0].phone) {
      logPilotEvent('pause_call_initiated', { contact: contacts[0].name });
      window.location.href = `tel:${contacts[0].phone.replace(/\s+/g, '')}`;
    } else {
      setShowNoContactAlert(true);
    }
  };

  const handleWhatsAppSend = () => {
    const text = encodeURIComponent('Pause pressed. Please call me.');
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Four large steps translations
  const steps = [
    {
      num: 1,
      icon: Ban,
      text: t('pauseModal.fourSteps.dontPay', "Don't pay."),
      sub: t('pauseModal.fourSteps.dontPaySub', 'Never transfer money to any "safe" account.')
    },
    {
      num: 2,
      icon: KeyRound,
      text: t('pauseModal.fourSteps.dontShareOtp', "Don't share OTP."),
      sub: t('pauseModal.fourSteps.dontShareOtpSub', 'Never read out OTPs or Aadhaar numbers.')
    },
    {
      num: 3,
      icon: PhoneOff,
      text: t('pauseModal.fourSteps.hangUp', 'Hang up.'),
      sub: t('pauseModal.fourSteps.hangUpSub', 'Disconnect now. Real officers never investigate on video call.')
    },
    {
      num: 4,
      icon: UserCheck,
      text: t('pauseModal.fourSteps.callPerson', 'Call your person.'),
      sub: t('pauseModal.fourSteps.callPersonSub', 'Speak directly to your trusted family person.')
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-brown-dark/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-cream rounded-t-[28px] sm:rounded-card shadow-elevated border-2 border-teal-deep/30 p-5 sm:p-6 max-h-[94vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-teal-deep/15">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terracotta text-white font-extrabold text-sm sm:text-base">
            <ShieldAlert size={20} />
            <span>{t('pauseModal.badge', 'Safety Pause Activated')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.close', 'Close')}
            className="w-11 h-11 rounded-full bg-white text-brown-dark hover:bg-cream border border-teal-deep/20 flex items-center justify-center transition-card shadow-sm"
          >
            <X size={24} />
          </button>
        </div>

        {/* Heading & Golden Rule */}
        <div className="mt-4 text-center space-y-2">
          <h2 id="pause-modal-title" className="text-2xl sm:text-3xl font-black text-teal-deep">
            {t('pauseModal.title', 'Take a deep breath. You are safe.')}
          </h2>
          <div className="p-3 bg-terracotta/15 rounded-xl border border-terracotta/30 text-terracotta font-extrabold text-base">
            {t('pauseModal.ruleReminder', "Golden Rule: Real police, CBI, or judges NEVER place anyone under 'digital arrest' or interrogate over video call.")}
          </div>
        </div>

        {/* Four Large Steps */}
        <div className="mt-4 space-y-2.5" aria-label="Four critical steps">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="p-3.5 sm:p-4 bg-white rounded-card shadow-soft border-2 border-teal-deep/15 flex items-center gap-3.5"
              >
                <div className="w-11 h-11 rounded-full bg-teal-deep text-cream font-black text-lg flex items-center justify-center shrink-0">
                  {step.num}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon size={20} className="text-terracotta shrink-0" />
                    <span className="text-lg sm:text-xl font-black text-brown-dark">
                      {step.text}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-brown-dark/75 mt-0.5 font-medium">
                    {step.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Missing Contact Warning */}
        {showNoContactAlert && (
          <div className="mt-4 p-4 bg-terracotta/15 border-2 border-terracotta rounded-card text-center space-y-2">
            <p className="font-extrabold text-brown-dark text-lg">{t('callModal.noContactTitle')}</p>
            <p className="text-sm text-brown-dark/80">{t('callModal.noContactMessage')}</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/settings');
              }}
              className="min-h-[48px] px-6 py-2 bg-teal-deep text-cream font-bold rounded-full w-full"
            >
              {t('callModal.goToSettings')}
            </button>
          </div>
        )}

        {/* Actions Section */}
        <div className="mt-5 space-y-3">
          {/* Primary Action 1: Call Your Person */}
          <button
            type="button"
            onClick={handleCallPerson}
            className="w-full min-h-[56px] px-6 py-3.5 bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-white font-black text-xl rounded-card shadow-elevated flex items-center justify-center gap-3 transition-card"
          >
            <PhoneCall size={26} className="text-cream" />
            <span>
              {contacts.length > 0
                ? `${t('pauseModal.actionCall', 'Call My Person Now')} (${contacts[0].name})`
                : t('pauseModal.actionCall', 'Call My Person Now')}
            </span>
          </button>

          {/* Primary Action 2: Call 1930 Cybercrime Helpline */}
          <a
            href="tel:1930"
            className="w-full min-h-[56px] px-6 py-3 bg-white hover:bg-cream active:scale-[0.98] text-terracotta font-black text-lg sm:text-xl rounded-card shadow-soft border-2 border-terracotta/40 flex items-center justify-center gap-3 transition-card"
          >
            <Phone size={24} className="text-terracotta" />
            <span>{t('pauseModal.helplineButton', 'Call 1930 Cybercrime Helpline')}</span>
          </a>

          {/* Offline Fallback: Send by WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsAppSend}
            className="w-full min-h-[56px] px-6 py-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] font-extrabold text-base sm:text-lg rounded-card border-2 border-[#25D366]/40 flex items-center justify-center gap-2.5 transition-card"
          >
            <MessageCircle size={22} className="text-[#25D366]" />
            <span>{t('pauseModal.sendWhatsApp', 'Send by WhatsApp')}</span>
          </button>

          {/* Alert Delivery Status */}
          <div className="p-2.5 bg-white/60 rounded-xl border border-teal-deep/10 flex items-center justify-center gap-2 text-xs font-semibold text-brown-dark/70">
            {outboxPending ? (
              <>
                <Clock size={16} className="text-terracotta animate-spin" />
                <span>{t('pauseModal.alertPending', 'Alert saved to device & queued to family')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} className="text-teal-deep" />
                <span>{t('pauseModal.alertSent', 'Family notified')}</span>
              </>
            )}
          </div>

          {/* Close / I Am Safe Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[56px] py-3 bg-cream hover:bg-[#FFE8B2] text-brown-dark font-extrabold text-lg rounded-card border border-teal-deep/20 transition-card"
          >
            {t('pauseModal.close', 'I Am Safe Now')}
          </button>
        </div>
      </div>
    </div>
  );
};
