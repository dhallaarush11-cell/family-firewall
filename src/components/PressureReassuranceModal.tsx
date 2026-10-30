import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Heart, PhoneCall, X, Check } from 'lucide-react';
import { getTrustedContacts, type TrustedContact } from '../db';

interface PressureReassuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PressureReassuranceModal: React.FC<PressureReassuranceModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [showNoContact, setShowNoContact] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getTrustedContacts().then(setContacts);
      setShowNoContact(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCall = () => {
    if (contacts.length > 0 && contacts[0].phone) {
      window.location.href = `tel:${contacts[0].phone.replace(/\s+/g, '')}`;
    } else {
      setShowNoContact(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-brown-dark/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-cream rounded-t-[28px] sm:rounded-card shadow-elevated border-2 border-teal-deep/30 p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-teal-deep/15">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-terracotta text-white font-extrabold text-base">
            <ShieldAlert size={20} />
            <span>{t('pressureModal.title')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.close')}
            className="w-11 h-11 rounded-full bg-white text-brown-dark hover:bg-cream border border-teal-deep/20 flex items-center justify-center transition-card"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="p-4 bg-white rounded-card shadow-soft border-l-4 border-l-teal-deep">
            <div className="flex items-center gap-2 text-teal-deep font-bold text-lg mb-1">
              <Heart size={22} className="text-terracotta" />
              <span>Take a breath</span>
            </div>
            <p className="text-lg text-brown-dark leading-relaxed">
              {t('pressureModal.reassurance')}
            </p>
          </div>

          <div className="p-4 bg-white rounded-card shadow-soft space-y-3 border border-teal-deep/10">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-teal-deep/10 text-teal-deep flex items-center justify-center shrink-0 mt-0.5">
                <Check size={18} />
              </div>
              <p className="text-lg font-bold text-brown-dark">
                {t('pressureModal.rule1')}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-teal-deep/10 text-teal-deep flex items-center justify-center shrink-0 mt-0.5">
                <Check size={18} />
              </div>
              <p className="text-lg font-bold text-brown-dark">
                {t('pressureModal.rule2')}
              </p>
            </div>
          </div>

          {showNoContact && (
            <div className="p-4 bg-terracotta/15 border-2 border-terracotta rounded-card text-center">
              <p className="font-bold text-brown-dark text-lg">{t('callModal.noContactTitle')}</p>
              <p className="text-base text-brown-dark/80 mt-1">{t('callModal.noContactMessage')}</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/settings');
                }}
                className="mt-3 min-h-[48px] px-6 py-2 bg-teal-deep text-cream font-bold rounded-full w-full"
              >
                {t('callModal.goToSettings')}
              </button>
            </div>
          )}

          <div className="space-y-3 pt-3">
            <button
              type="button"
              onClick={handleCall}
              className="w-full min-h-[56px] px-6 py-3.5 bg-teal-deep hover:bg-[#073632] text-white font-extrabold text-xl rounded-card shadow-elevated flex items-center justify-center gap-3 transition-card"
            >
              <PhoneCall size={26} className="text-cream" />
              <span>
                {contacts.length > 0
                  ? `${t('elderHome.callPersonButton')} (${contacts[0].name})`
                  : t('elderHome.callPersonButton')}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[56px] px-6 py-3 bg-white hover:bg-cream border-2 border-teal-deep/30 text-brown-dark font-bold text-lg rounded-card transition-card"
            >
              {t('pressureModal.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
