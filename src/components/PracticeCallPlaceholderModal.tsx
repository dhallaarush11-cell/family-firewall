import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, PhoneCall } from 'lucide-react';

interface PracticeCallPlaceholderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PracticeCallPlaceholderModal: React.FC<PracticeCallPlaceholderModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-brown-dark/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-cream rounded-t-[28px] sm:rounded-card shadow-elevated border-2 border-teal-deep/30 p-6 max-h-[92vh] overflow-y-auto">
        {/* Top Bar with 'Practice call' tag and always-visible 'Exit' button */}
        <div className="flex items-center justify-between pb-3 border-b border-teal-deep/15">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-deep text-cream font-extrabold text-sm tracking-wider uppercase border border-teal-deep/40 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-terracotta animate-pulse" />
            <span>{t('drill.practiceTag', 'Practice call')}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('drill.exit', 'Exit')}
            className="min-h-[44px] px-4 py-2 rounded-full bg-white text-terracotta hover:bg-terracotta hover:text-white border-2 border-terracotta/40 font-bold text-base transition-card flex items-center gap-1.5"
          >
            <LogOut size={18} />
            <span>{t('drill.exit', 'Exit')}</span>
          </button>
        </div>

        <div className="mt-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-teal-deep/15 text-teal-deep flex items-center justify-center mx-auto shadow-inner">
            <PhoneCall size={32} />
          </div>
          <h3 className="text-2xl font-black text-teal-deep">
            {t('practiceModal.title', 'Practice Drill Simulation')}
          </h3>
          <p className="text-base sm:text-lg text-brown-dark/85 leading-relaxed">
            {t('practiceModal.body', 'This is a safe training scenario to help you practice hanging up on fake official calls.')}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/drill');
              }}
              className="w-full min-h-[56px] py-4 px-6 rounded-card bg-teal-deep hover:bg-[#073632] text-cream font-black text-xl shadow-elevated transition-card active:scale-[0.98]"
            >
              {t('drill.preDrill.start', 'Start practice')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
