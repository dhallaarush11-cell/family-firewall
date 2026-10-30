import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PhoneCall, AlertTriangle, PhoneForwarded, ShieldCheck, HeartHandshake, Users, QrCode } from 'lucide-react';
import { HeaderBar } from '../components/HeaderBar';
import { PauseShieldButton } from '../components/PauseShieldButton';
import { PauseModal } from '../components/PauseModal';
import { PracticeCallPlaceholderModal } from '../components/PracticeCallPlaceholderModal';
import { PressureReassuranceModal } from '../components/PressureReassuranceModal';
import { getTrustedContacts, type TrustedContact } from '../db';
import { getCurrentMembership } from '../db/supabase';

export const ElderHomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isPressureOpen, setIsPressureOpen] = useState(false);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [showNoContactModal, setShowNoContactModal] = useState(false);
  const [membership, setMembership] = useState<{ id: string; family_id: string; display_name: string } | null>(null);

  useEffect(() => {
    getTrustedContacts().then(setContacts);
    getCurrentMembership().then(mem => {
      if (mem && mem.role === 'elder') {
        setMembership(mem);
      }
    });
  }, []);

  const handleCallMyPerson = () => {
    if (contacts.length > 0 && contacts[0].phone) {
      const cleanPhone = contacts[0].phone.replace(/\s+/g, '');
      window.location.href = `tel:${cleanPhone}`;
    } else {
      setShowNoContactModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-36">
      {/* Header with Navigation and Reachable Language Switcher */}
      <HeaderBar showBack={false} showHome={false} showSettings={true} />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4 sm:pt-6 space-y-6">
        {/* Friendly Reassuring Greeting Card */}
        <section aria-labelledby="greeting-heading" className="bg-white p-6 rounded-card shadow-soft border-2 border-teal-deep/15 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cream text-teal-deep mb-3 shadow-inner">
            <HeartHandshake size={36} className="text-teal-deep" />
          </div>
          <h2 id="greeting-heading" className="text-2xl sm:text-3xl font-extrabold text-teal-deep leading-tight">
            {t('elderHome.greeting')}
          </h2>
          <p className="text-base sm:text-lg text-brown-dark/85 mt-2 leading-relaxed">
            {t('elderHome.subtitle')}
          </p>
        </section>

        {/* Family Connection Status Card */}
        <section className="bg-white p-4 sm:p-5 rounded-card shadow-soft border-2 border-teal-deep/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cream text-teal-deep flex items-center justify-center shrink-0 shadow-inner">
              <Users size={24} className="text-teal-deep" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-teal-deep leading-tight">
                {membership ? t('elderHome.familyConnected', 'Family Connected') : t('elderHome.familyConnectTitle', 'Connect with Family')}
              </h3>
              <p className="text-xs sm:text-sm text-brown-dark/70 font-medium mt-0.5">
                {membership ? `${membership.display_name} • ${t('elderHome.alertsActive', 'Safety alerts active')}` : t('elderHome.familyConnectSubtitle', 'Link your family member to receive Pause alerts')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/elder/pair')}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-cream hover:bg-[#FFE8B2] text-teal-deep font-bold text-sm border-2 border-teal-deep/20 transition-card shrink-0 flex items-center gap-1.5"
          >
            <QrCode size={18} />
            <span>{membership ? t('elderHome.viewQR', 'Show QR') : t('elderHome.pairButton', 'Connect')}</span>
          </button>
        </section>

        {/* Three Huge Buttons */}
        <section aria-label="Action options" className="space-y-4">
          {/* Button 1: Practice a call */}
          <button
            type="button"
            onClick={() => navigate('/drill')}
            className="w-full min-h-[72px] p-5 rounded-card bg-teal-deep hover:bg-[#073632] active:scale-[0.98] text-cream font-extrabold text-xl shadow-elevated border-2 border-teal-deep transition-card flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-14 h-14 rounded-full bg-cream/15 flex items-center justify-center shrink-0">
                <PhoneCall size={32} className="text-cream" />
              </div>
              <div>
                <span className="block text-2xl font-black leading-tight">
                  {t('elderHome.practiceButton')}
                </span>
                <span className="block text-sm font-normal text-cream/80 mt-1">
                  {t('elderHome.practiceSub')}
                </span>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-terracotta text-white text-xs font-bold shrink-0">
              {t('practiceModal.tag')}
            </div>
          </button>

          {/* Button 2: I feel pressured */}
          <button
            type="button"
            onClick={() => setIsPressureOpen(true)}
            className="w-full min-h-[72px] p-5 rounded-card bg-white hover:bg-[#FFF8E7] active:scale-[0.98] text-brown-dark font-extrabold text-xl shadow-soft border-2 border-terracotta/40 hover:border-terracotta transition-card flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-14 h-14 rounded-full bg-terracotta/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={32} className="text-terracotta" />
              </div>
              <div>
                <span className="block text-2xl font-black text-brown-dark leading-tight">
                  {t('elderHome.pressureButton')}
                </span>
                <span className="block text-sm font-normal text-brown-dark/70 mt-1">
                  {t('elderHome.pressureSub')}
                </span>
              </div>
            </div>
          </button>

          {/* Button 3: Call my person */}
          <button
            type="button"
            onClick={handleCallMyPerson}
            className="w-full min-h-[72px] p-5 rounded-card bg-white hover:bg-[#EBF7F2] active:scale-[0.98] text-teal-deep font-extrabold text-xl shadow-soft border-2 border-teal-deep/30 hover:border-teal-deep transition-card flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-14 h-14 rounded-full bg-teal-deep/10 flex items-center justify-center shrink-0">
                <PhoneForwarded size={32} className="text-teal-deep" />
              </div>
              <div>
                <span className="block text-2xl font-black leading-tight">
                  {t('elderHome.callPersonButton')}
                </span>
                <span className="block text-sm font-normal text-brown-dark/70 mt-1">
                  {contacts.length > 0
                    ? `${contacts[0].name} (${contacts[0].relation})`
                    : t('elderHome.callPersonSub')}
                </span>
              </div>
            </div>
          </button>
        </section>

        {/* Reassurance Reminder Card */}
        <div className="p-4 bg-white/70 rounded-card border border-teal-deep/15 text-center flex items-center justify-center gap-2 text-sm text-brown-dark/80">
          <ShieldCheck size={20} className="text-teal-deep shrink-0" />
          <span>Tap the big orange Pause button below at any moment if a call feels strange.</span>
        </div>
      </main>

      {/* Persistent Round Pause Shield Button (Always visible at bottom) */}
      <PauseShieldButton onClick={() => setIsPauseOpen(true)} />

      {/* Pause Modal Overlay */}
      <PauseModal
        isOpen={isPauseOpen}
        onClose={() => setIsPauseOpen(false)}
        source="home"
      />

      {/* Practice Call Placeholder Modal */}
      <PracticeCallPlaceholderModal
        isOpen={isPracticeOpen}
        onClose={() => setIsPracticeOpen(false)}
      />

      {/* Pressure Reassurance Modal */}
      <PressureReassuranceModal
        isOpen={isPressureOpen}
        onClose={() => setIsPressureOpen(false)}
      />

      {/* No Contact Alert Modal */}
      {showNoContactModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-brown-dark/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-card p-6 max-w-sm w-full text-center shadow-elevated border-2 border-teal-deep/20 space-y-4">
            <div className="w-14 h-14 rounded-full bg-terracotta/15 text-terracotta flex items-center justify-center mx-auto">
              <PhoneForwarded size={32} />
            </div>
            <h3 className="text-2xl font-extrabold text-brown-dark">
              {t('callModal.noContactTitle')}
            </h3>
            <p className="text-base text-brown-dark/80 leading-relaxed">
              {t('callModal.noContactMessage')}
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowNoContactModal(false);
                  navigate('/settings');
                }}
                className="w-full min-h-[56px] py-3 px-6 rounded-card bg-teal-deep text-cream font-bold text-lg shadow-elevated"
              >
                {t('callModal.goToSettings')}
              </button>
              <button
                type="button"
                onClick={() => setShowNoContactModal(false)}
                className="w-full min-h-[48px] py-2 px-4 rounded-card bg-cream text-brown-dark font-semibold text-base"
              >
                {t('nav.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
