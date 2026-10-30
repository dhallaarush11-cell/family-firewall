import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';

interface PauseShieldButtonProps {
  onClick: () => void;
  className?: string;
}

export const PauseShieldButton: React.FC<PauseShieldButtonProps> = ({ onClick, className = '' }) => {
  const { t } = useTranslation();

  return (
    <div className={`fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={t('elderHome.pauseButtonLabel') + ' - ' + t('elderHome.pauseButtonSub')}
        className="pointer-events-auto group relative flex items-center justify-center gap-3.5 bg-terracotta hover:bg-[#D46745] active:scale-95 text-white font-extrabold text-2xl tracking-wide px-8 py-4 min-h-[64px] rounded-full shadow-shield border-4 border-cream transition-card"
      >
        <span className="absolute -inset-1 rounded-full bg-terracotta/30 animate-ping opacity-75 pointer-events-none" />
        
        <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
          <ShieldAlert size={28} className="text-white drop-shadow-sm" />
        </div>

        <div className="relative flex flex-col items-start text-left">
          <span className="text-2xl font-black tracking-wider leading-none">
            {t('elderHome.pauseButtonLabel')}
          </span>
          <span className="text-xs font-semibold text-white/90 leading-tight">
            {t('elderHome.pauseButtonSub')}
          </span>
        </div>
      </button>
    </div>
  );
};
