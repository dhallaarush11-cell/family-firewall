import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderBarProps {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
  showSettings?: boolean;
  backTo?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  showBack = true,
  showHome = true,
  showSettings = true,
  backTo
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isWelcome = location.pathname === '/' || location.pathname === '/welcome';
  const isSettings = location.pathname === '/settings';

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/elder');
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-cream/95 backdrop-blur border-b border-teal-deep/10 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Navigation Action: Back or Home */}
        <div className="flex items-center gap-1">
          {showBack && !isWelcome && (
            <button
              type="button"
              onClick={handleBack}
              aria-label={t('nav.back')}
              className="min-h-[48px] min-w-[48px] p-2.5 rounded-full bg-white text-teal-deep hover:bg-cream border border-teal-deep/20 shadow-sm flex items-center justify-center transition-card"
            >
              <ArrowLeft size={22} />
            </button>
          )}

          {showHome && !isWelcome && location.pathname !== '/elder' && (
            <button
              type="button"
              onClick={() => navigate('/elder')}
              aria-label={t('nav.home')}
              className="min-h-[48px] min-w-[48px] p-2.5 rounded-full bg-white text-teal-deep hover:bg-cream border border-teal-deep/20 shadow-sm flex items-center justify-center transition-card"
            >
              <Home size={22} />
            </button>
          )}

          {isWelcome && (
            <div className="flex items-center gap-2 text-teal-deep font-bold text-lg">
              <div className="w-10 h-10 rounded-full bg-teal-deep text-cream flex items-center justify-center shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <span className="leading-tight text-xl">Family Firewall</span>
            </div>
          )}
        </div>

        {/* Center Title if provided */}
        {title && !isWelcome && (
          <h1 className="text-xl font-bold text-brown-dark truncate text-center flex-1 px-1">
            {title}
          </h1>
        )}

        {/* Right Side: Language Switcher and Settings */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="compact" />

          {showSettings && !isSettings && !isWelcome && (
            <button
              type="button"
              onClick={() => navigate('/settings')}
              aria-label={t('nav.settings')}
              className="min-h-[48px] min-w-[48px] p-2.5 rounded-full bg-white text-teal-deep hover:bg-cream border border-teal-deep/20 shadow-sm flex items-center justify-center transition-card"
            >
              <SettingsIcon size={22} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
